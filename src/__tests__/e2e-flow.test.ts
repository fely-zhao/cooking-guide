/**
 * End-to-End Integration Test — Full Cooking Flow
 *
 * Covers:
 *   A) Manual recipe → FSM cooking → session completion
 *   B) Voice command triggers (WAITING_USER → ASK, WAITING_TIMER → ASK)
 *   C) Error/degradation paths (TTS failure, timer skip, network error)
 */
import { createActor, fromPromise } from 'xstate';
import { cookingMachine } from '../machines/cooking-machine';
import type { Recipe, Step } from '../types/cooking';
import { VoiceCommandService } from '../services/voice-commands';
import type { STTService } from '../services/stt';

// ---------------------------------------------------------------------------
// Mock: @op-engineering/op-sqlite (in-memory)
// ---------------------------------------------------------------------------

interface MockRow {
  [key: string]: unknown;
}
type MockBindParams = (string | number | null)[];

function createMockDb() {
  const tables: Record<string, MockRow[]> = {
    recipes: [],
    ingredients: [],
    steps: [],
    cook_sessions: [],
  };

  function executeSync(
    sql: string,
    params: MockBindParams = [],
  ): { rows: MockRow[]; rowsAffected: number } {
    const t = sql.trim();

    if (t.startsWith('INSERT INTO')) {
      const tbl = t.match(/INSERT INTO (\w+)/)![1];
      const cols = t
        .match(/\(([^)]+)\)\s+VALUES/)![1]
        .split(',')
        .map(c => c.trim());
      const row: MockRow = {};
      for (let i = 0; i < cols.length && i < params.length; i++) row[cols[i]] = params[i];
      tables[tbl].push(row);
      return { rows: [], rowsAffected: 1 };
    }

    if (t.startsWith('SELECT')) {
      const tbl = t.match(/FROM (\w+)/)![1];
      let rows = [...tables[tbl]];
      const wm = t.match(/WHERE\s+(\w+)\s*=\s*\?/);
      if (wm && params.length > 0) rows = rows.filter(r => r[wm[1]] === params[0]);
      const om = t.match(/ORDER BY\s+(\w+)(?:\s+(DESC|ASC))?/);
      if (om) {
        const col = om[1],
          desc = om[2] === 'DESC';
        rows.sort((a, b) => {
          const av = a[col] ?? 0,
            bv = b[col] ?? 0;
          return desc ? (bv > av ? 1 : -1) : av > bv ? 1 : -1;
        });
      }
      return { rows, rowsAffected: 0 };
    }

    if (t.startsWith('UPDATE')) {
      const tbl = t.match(/UPDATE (\w+)/)![1];
      const wm = t.match(/WHERE\s+(\w+)\s*=\s*\?/);
      if (!wm) return { rows: [], rowsAffected: 0 };
      const sm = t.match(/SET\s+(.+?)\s+WHERE/);
      if (!sm) return { rows: [], rowsAffected: 0 };
      const setCols = sm[1].split(',').map(s => s.trim().split('=')[0].trim());
      let affected = 0;
      for (const row of tables[tbl]) {
        if (row[wm[1]] === params[params.length - 1]) {
          for (let i = 0; i < setCols.length && i < params.length - 1; i++)
            row[setCols[i]] = params[i];
          affected++;
        }
      }
      return { rows: [], rowsAffected: affected };
    }

    if (t.startsWith('DELETE')) {
      const tbl = t.match(/DELETE FROM (\w+)/)![1];
      const wm = t.match(/WHERE\s+(\w+)\s*=\s*\?/);
      if (!wm) {
        const n = tables[tbl].length;
        tables[tbl] = [];
        return { rows: [], rowsAffected: n };
      }
      const before = tables[tbl].length;
      tables[tbl] = tables[tbl].filter(r => r[wm[1]] !== params[0]);
      return { rows: [], rowsAffected: before - tables[tbl].length };
    }

    return { rows: [], rowsAffected: 0 };
  }

  const db = {
    executeSync,
    prepareStatement(sql: string) {
      let bound: MockBindParams = [];
      return {
        bindSync(p: MockBindParams) {
          bound = p;
        },
        execute() {
          executeSync(sql, bound);
        },
      };
    },
    close() {},
    _tables: tables,
    _reset() {
      for (const k of Object.keys(tables)) tables[k] = [];
    },
  };
  return db;
}

const mockDb = createMockDb();

jest.mock('react-native', () => ({}));
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => mockDb),
}));
jest.mock('../db/init', () => ({
  getDatabase: () => mockDb,
  closeDatabase: () => {},
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_STEPS: Step[] = [
  { id: 's1', text: '番茄切块，鸡蛋打散备用', tag: 'instant', subSteps: [] },
  { id: 's2', text: '热锅凉油，倒入蛋液翻炒至凝固', tag: 'wait_user', subSteps: [] },
  { id: 's3', text: '加入番茄块翻炒出汁', tag: 'instant', subSteps: [] },
  {
    id: 's4',
    text: '小火炖煮3分钟让味道融合',
    tag: 'wait_timer',
    durationSeconds: 180,
    subSteps: [],
  },
  { id: 's5', text: '加入盐和糖调味，撒上葱花出锅', tag: 'instant', subSteps: [] },
];

const TEST_RECIPE: Recipe = {
  id: 'recipe-001',
  name: '番茄炒蛋',
  ingredients: [
    { id: 'i1', name: '番茄', amount: '2个' },
    { id: 'i2', name: '鸡蛋', amount: '3个' },
    { id: 'i3', name: '葱', amount: '适量' },
  ],
  steps: TEST_STEPS,
  servings: 2,
  createdAt: '1700000000000',
  updatedAt: '1700000000000',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush microtasks + macrotasks to let XState promise actors resolve. */
function flush(ms = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getStateValue(actor: ReturnType<typeof createActor<typeof cookingMachine>>): string {
  const v = actor.getSnapshot().value;
  if (typeof v === 'string') {
    return v;
  }
  const keys = Object.keys(v);
  if (keys.length === 1) {
    return keys[0];
  }
  return JSON.stringify(v);
}

/**
 * Create a test machine where all actors resolve instantly.
 * Suitable for most tests where we don't need to hold in invoked-actor states.
 */
function createTestMachine() {
  let ttsCount = 0,
    timerCount = 0,
    llmCount = 0;
  const provided = cookingMachine.provide({
    actors: {
      ttsService: fromPromise(async () => {
        ttsCount++;
        return { success: true as const };
      }),
      timerService: fromPromise(async () => {
        timerCount++;
        return;
      }),
      llmService: fromPromise(async () => {
        llmCount++;
        return { answer: '回答' };
      }),
    },
  });
  const actor = createActor(provided);
  return { actor, counts: () => ({ ttsCount, timerCount, llmCount }) };
}

/**
 * Create a machine with a deferred timer (never auto-resolves).
 * Use `resolveTimer()` to manually advance past WAITING_TIMER.
 */
function createTestMachineWithDeferredTimer() {
  let resolveTimerFn: () => void;
  const timerPending = new Promise<void>(r => {
    resolveTimerFn = r;
  });
  let ttsCount = 0,
    timerCount = 0,
    llmCount = 0;

  const provided = cookingMachine.provide({
    actors: {
      ttsService: fromPromise(async () => {
        ttsCount++;
        return { success: true as const };
      }),
      timerService: fromPromise(async () => {
        timerCount++;
        await timerPending;
      }),
      llmService: fromPromise(async () => {
        llmCount++;
        return { answer: '回答' };
      }),
    },
  });
  const actor = createActor(provided);
  return {
    actor,
    resolveTimer: resolveTimerFn!,
    counts: () => ({ ttsCount, timerCount, llmCount }),
  };
}

// ---------------------------------------------------------------------------
// Scenario A: Manual Input → Cook → Full Flow
// ---------------------------------------------------------------------------

describe('Scenario A: 手动录入 → 开始烹饪 → 全流程完成', () => {
  beforeEach(() => {
    mockDb._reset();
  });

  it('should create recipe in DB and retrieve it correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRecipe, getRecipe } = require('../db/recipes');
    const id = createRecipe({
      name: TEST_RECIPE.name,
      ingredients: TEST_RECIPE.ingredients,
      steps: TEST_RECIPE.steps,
      servings: TEST_RECIPE.servings,
    });
    expect(id).toBeTruthy();

    const r = getRecipe(id);
    expect(r).not.toBeNull();
    expect(r!.name).toBe('番茄炒蛋');
    expect(r!.servings).toBe(2);
    expect(r!.ingredients).toHaveLength(3);
    expect(r!.steps).toHaveLength(5);
    expect(r!.steps[0].tag).toBe('instant');
    expect(r!.steps[1].tag).toBe('wait_user');
    expect(r!.steps[2].tag).toBe('instant');
    expect(r!.steps[3].tag).toBe('wait_timer');
    expect(r!.steps[4].tag).toBe('instant');
  });

  it('should walk through the entire cooking FSM flow', async () => {
    // Use deferred timer so WAITING_TIMER stays until we manually fire TIMER_DONE
    const { actor, counts } = createTestMachineWithDeferredTimer();
    actor.start();

    // IDLE
    expect(getStateValue(actor)).toBe('IDLE');

    // START → ANNOUNCING_STEP (step 0: instant)
    actor.send({ type: 'START', recipe: TEST_RECIPE });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(0);
    expect(actor.getSnapshot().context.lastAnnouncedText).toBe('番茄切块，鸡蛋打散备用');

    // TTS resolves → isInstantTag → WAITING_AUTO
    await flush();
    expect(getStateValue(actor)).toBe('WAITING_AUTO');

    // NEXT → ANNOUNCING_STEP (step 1: wait_user)
    actor.send({ type: 'NEXT' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(1);

    // TTS resolves → isWaitUserTag → WAITING_USER
    await flush();
    expect(getStateValue(actor)).toBe('WAITING_USER');

    // CONFIRM → ANNOUNCING_STEP (step 2: instant)
    actor.send({ type: 'CONFIRM' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(2);

    // TTS resolves → isInstantTag → WAITING_AUTO
    await flush();
    expect(getStateValue(actor)).toBe('WAITING_AUTO');

    // NEXT → ANNOUNCING_STEP (step 3: wait_timer)
    actor.send({ type: 'NEXT' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(3);

    // TTS resolves → isWaitTimerTag → WAITING_TIMER (timer is deferred, stays here)
    await flush();
    expect(getStateValue(actor)).toBe('WAITING_TIMER');
    expect(actor.getSnapshot().context.timers.size).toBe(1);
    expect(actor.getSnapshot().context.timers.get('timer-3')!.durationSeconds).toBe(180);

    // TIMER_DONE → ANNOUNCING_REMINDER
    actor.send({ type: 'TIMER_DONE', timerId: 'timer-3' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_REMINDER');
    expect(actor.getSnapshot().context.timers.size).toBe(0);

    // NEXT → ANNOUNCING_STEP (step 4, last) → TTS resolves → isLastStep → COMPLETED
    actor.send({ type: 'NEXT' });
    await flush();
    expect(getStateValue(actor)).toBe('COMPLETED');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(4);
    expect(actor.getSnapshot().context.lastAnnouncedText).toBe('烹饪完成！');

    const c = counts();
    expect(c.ttsCount).toBe(7); // step 0-4 + ANNOUNCING_REMINDER + COMPLETED
    expect(c.timerCount).toBe(1);
  });

  it('should write cook_sessions table on completion', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createSession, finishSession, getSessionsByRecipe } = require('../db/cook-sessions');
    const sid = createSession(TEST_RECIPE.id);
    expect(sid).toBeTruthy();

    let sessions = getSessionsByRecipe(TEST_RECIPE.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(sid);
    expect(sessions[0].completed).toBe(false);
    expect(sessions[0].finishedAt).toBeNull();

    finishSession(sid, true);
    sessions = getSessionsByRecipe(TEST_RECIPE.id);
    expect(sessions[0].completed).toBe(true);
    expect(sessions[0].finishedAt).not.toBeNull();
  });

  it('should handle REPEAT event from WAITING_USER', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush(); // step 0 instant → WAITING_AUTO
    actor.send({ type: 'NEXT' });
    await flush(); // step 1 → WAITING_USER
    expect(getStateValue(actor)).toBe('WAITING_USER');

    actor.send({ type: 'REPEAT' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(1);
  });

  it('should handle SKIP event', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush(); // step 0 → WAITING_AUTO

    actor.send({ type: 'SKIP', targetIndex: 3 });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(3);
  });

  it('should handle EXIT from WAITING_AUTO', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush(); // → WAITING_AUTO
    expect(getStateValue(actor)).toBe('WAITING_AUTO');

    actor.send({ type: 'EXIT' });
    expect(getStateValue(actor)).toBe('IDLE');
  });

  it('should handle EXIT from WAITING_USER', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush(); // step 1 → WAITING_USER
    expect(getStateValue(actor)).toBe('WAITING_USER');

    actor.send({ type: 'EXIT' });
    expect(getStateValue(actor)).toBe('IDLE');
  });

  it('should handle REPEAT from WAITING_TIMER (restart step)', async () => {
    const { actor } = createTestMachineWithDeferredTimer();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush();
    actor.send({ type: 'CONFIRM' });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush(); // step 3 (wait_timer) → WAITING_TIMER

    expect(getStateValue(actor)).toBe('WAITING_TIMER');
    actor.send({ type: 'REPEAT' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(3);
  });

  it('should handle REPEAT from WAITING_AUTO', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush(); // step 0 instant → WAITING_AUTO
    expect(getStateValue(actor)).toBe('WAITING_AUTO');

    actor.send({ type: 'REPEAT' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(0);
  });

  it('should handle EXIT from WAITING_TIMER', async () => {
    const { actor } = createTestMachineWithDeferredTimer();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush();
    actor.send({ type: 'CONFIRM' });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush(); // step 3 → WAITING_TIMER

    expect(getStateValue(actor)).toBe('WAITING_TIMER');
    actor.send({ type: 'EXIT' });
    expect(getStateValue(actor)).toBe('IDLE');
  });

  it('should handle ASK from ANNOUNCING_STEP → ANSWERING → back', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');

    actor.send({ type: 'ASK', question: '这一步要炒多久？' });
    expect(getStateValue(actor)).toBe('ANSWERING');
    expect(actor.getSnapshot().context.isAnswering).toBe(true);

    actor.send({ type: 'ANSWER_DONE' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.isAnswering).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario B: Voice Command Triggers
// ---------------------------------------------------------------------------

describe('Scenario B: 语音指令触发', () => {
  function dispatch(svc: VoiceCommandService, text: string) {
    (svc as unknown as { _dispatch: (t: string) => void })._dispatch.call(svc, text);
  }

  function mockStt(): STTService {
    return {
      speechToText: async () => '',
      speechToTextForCommand: async () => '',
      checkHealth: async () => true,
    } as unknown as STTService;
  }

  it('should map "好了" to NEXT', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let cmd: string | undefined;
    svc.onCommand = c => {
      cmd = c;
    };
    dispatch(svc, '好了');
    expect(cmd).toBe('next');
  });

  it('should map "下一步" to NEXT', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let cmd: string | undefined;
    svc.onCommand = c => {
      cmd = c;
    };
    dispatch(svc, '下一步');
    expect(cmd).toBe('next');
  });

  it('should map "继续" to NEXT', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let cmd: string | undefined;
    svc.onCommand = c => {
      cmd = c;
    };
    dispatch(svc, '继续');
    expect(cmd).toBe('next');
  });

  it('should map "再说一遍" to REPEAT', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let cmd: string | undefined;
    svc.onCommand = c => {
      cmd = c;
    };
    dispatch(svc, '再说一遍');
    expect(cmd).toBe('repeat');
  });

  // 2026-09-02 代码审计 B2：ask 词条随提问入口临时禁用（见 voice-commands.ts
  // ASK 注释块），以下三用例同步 skip，提问功能恢复时一并恢复。
  it.skip('should map "我想问一下还要多久" to ASK with question', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let cmd: string | undefined, q: string | undefined;
    svc.onCommand = (c, question) => {
      cmd = c;
      q = question;
    };
    dispatch(svc, '我想问一下还要多久');
    expect(cmd).toBe('ask');
    // keyword "我想问" (3 chars), remainder = "一下还要多久"
    expect(q).toBe('一下还要多久');
  });

  it.skip('should map "我问个问题怎么做" to ASK with question', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let cmd: string | undefined, q: string | undefined;
    svc.onCommand = (c, question) => {
      cmd = c;
      q = question;
    };
    dispatch(svc, '我问个问题怎么做');
    expect(cmd).toBe('ask');
    expect(q).toBe('怎么做');
  });

  it.skip('should map "有个问题" to ASK without question', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let cmd: string | undefined, q: string | undefined;
    svc.onCommand = (c, question) => {
      cmd = c;
      q = question;
    };
    dispatch(svc, '有个问题');
    expect(cmd).toBe('ask');
    expect(q).toBeUndefined();
  });

  it('should debounce rapid commands', () => {
    const svc = new VoiceCommandService(mockStt(), 2000);
    let n = 0;
    svc.onCommand = () => {
      n++;
    };
    dispatch(svc, '好了');
    dispatch(svc, '下一步');
    expect(n).toBe(1);
  });

  it('should ignore empty or unrecognized text', () => {
    const svc = new VoiceCommandService(mockStt(), 0);
    let n = 0;
    svc.onCommand = () => {
      n++;
    };
    dispatch(svc, '');
    dispatch(svc, '   ');
    dispatch(svc, '完全不相关的话');
    expect(n).toBe(0);
  });

  it('should integrate voice → CONFIRM in WAITING_USER', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush(); // step 1 → WAITING_USER
    expect(getStateValue(actor)).toBe('WAITING_USER');

    actor.send({ type: 'CONFIRM' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(2);
  });

  it('should integrate voice → ASK in WAITING_TIMER', async () => {
    const { actor } = createTestMachineWithDeferredTimer();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush();
    actor.send({ type: 'CONFIRM' });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush(); // step 3 → WAITING_TIMER
    expect(getStateValue(actor)).toBe('WAITING_TIMER');

    actor.send({ type: 'ASK', question: '还要多久' });
    expect(getStateValue(actor)).toBe('ANSWERING');

    actor.send({ type: 'ANSWER_DONE' });
    expect(getStateValue(actor)).toBe('WAITING_TIMER');
  });
});

// ---------------------------------------------------------------------------
// Scenario C: Error / Degradation Paths
// ---------------------------------------------------------------------------

describe('Scenario C: 异常路径降级', () => {
  beforeEach(() => {
    mockDb._reset();
  });

  it('should fall back to WAITING_USER when TTS fails', async () => {
    const provided = cookingMachine.provide({
      actors: {
        ttsService: fromPromise(async (): Promise<{ success: true }> => {
          throw new Error('TTS error');
        }),
        timerService: fromPromise(async (): Promise<void> => undefined),
        llmService: fromPromise(async (): Promise<{ answer: string }> => ({ answer: '' })),
      },
    });
    const actor = createActor(provided);
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    await flush();
    expect(getStateValue(actor)).toBe('WAITING_USER');
  });

  it('should handle EXIT during ANSWERING', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');

    actor.send({ type: 'ASK', question: '问题？' });
    expect(getStateValue(actor)).toBe('ANSWERING');

    actor.send({ type: 'EXIT' });
    expect(getStateValue(actor)).toBe('IDLE');
  });

  it('should handle SKIP with invalid index', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush(); // → WAITING_AUTO

    actor.send({ type: 'SKIP', targetIndex: -1 });
    expect(actor.getSnapshot().context.currentStepIndex).toBe(0);

    actor.send({ type: 'SKIP', targetIndex: 100 });
    expect(actor.getSnapshot().context.currentStepIndex).toBe(0);
  });

  it('should handle double START by EXIT-ing first', async () => {
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');

    actor.send({ type: 'EXIT' });
    expect(getStateValue(actor)).toBe('IDLE');

    const recipe2: Recipe = { ...TEST_RECIPE, id: 'r2', name: '宫保鸡丁' };
    actor.send({ type: 'START', recipe: recipe2 });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.recipe?.name).toBe('宫保鸡丁');
  });

  it('should handle minimal 1-step recipe → COMPLETED', async () => {
    const recipe: Recipe = {
      ...TEST_RECIPE,
      steps: [{ id: 's1', text: '直接装盘', tag: 'instant', subSteps: [] }],
    };
    const { actor } = createTestMachine();
    actor.start();

    actor.send({ type: 'START', recipe });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    await flush(); // isLastStep → COMPLETED
    expect(getStateValue(actor)).toBe('COMPLETED');
  });

  it('should verify recipe list retrieval', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRecipe, getAllRecipes } = require('../db/recipes');
    createRecipe({
      name: '番茄炒蛋',
      ingredients: TEST_RECIPE.ingredients,
      steps: TEST_RECIPE.steps,
      servings: 2,
    });
    createRecipe({ name: '宫保鸡丁', ingredients: [], steps: [], servings: 1 });

    const all = getAllRecipes();
    expect(all).toHaveLength(2);
    expect(all.map((r: Recipe) => r.name)).toContain('番茄炒蛋');
    expect(all.map((r: Recipe) => r.name)).toContain('宫保鸡丁');
  });

  it('should handle recipe deletion', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRecipe, getRecipe, deleteRecipe } = require('../db/recipes');
    const id = createRecipe({ name: '测试', ingredients: [], steps: [], servings: 1 });
    expect(getRecipe(id)).not.toBeNull();
    expect(deleteRecipe(id)).toBe(true);
    expect(getRecipe(id)).toBeNull();
  });

  it('should handle recipe update', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRecipe, getRecipe, updateRecipe } = require('../db/recipes');
    const id = createRecipe({ name: '原始', ingredients: [], steps: [], servings: 1 });
    expect(updateRecipe(id, { name: '更新', servings: 4 })).toBe(true);
    const r = getRecipe(id);
    expect(r!.name).toBe('更新');
    expect(r!.servings).toBe(4);
  });

  it('should handle EXIT from COMPLETED', async () => {
    const { actor } = createTestMachine();
    actor.start();

    const r: Recipe = {
      ...TEST_RECIPE,
      steps: [{ id: 's1', text: '装盘', tag: 'instant', subSteps: [] }],
    };
    actor.send({ type: 'START', recipe: r });
    await flush(); // isLastStep → COMPLETED
    expect(getStateValue(actor)).toBe('COMPLETED');
    actor.send({ type: 'EXIT' });
    expect(getStateValue(actor)).toBe('IDLE');
  });

  it('should handle ASK from ANNOUNCING_REMINDER', async () => {
    const { actor } = createTestMachineWithDeferredTimer();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush();
    actor.send({ type: 'CONFIRM' });
    await flush();
    await flush();
    actor.send({ type: 'NEXT' });
    await flush(); // step 3 → WAITING_TIMER
    expect(getStateValue(actor)).toBe('WAITING_TIMER');

    actor.send({ type: 'TIMER_DONE', timerId: 'timer-3' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_REMINDER');

    actor.send({ type: 'ASK', question: '还要做什么？' });
    expect(getStateValue(actor)).toBe('ANSWERING');

    actor.send({ type: 'ANSWER_DONE' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_REMINDER');
  });

  it('should handle REPEAT from ANNOUNCING_STEP', async () => {
    const { actor } = createTestMachine();
    actor.start();
    actor.send({ type: 'START', recipe: TEST_RECIPE });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');

    actor.send({ type: 'REPEAT' });
    expect(getStateValue(actor)).toBe('ANNOUNCING_STEP');
    expect(actor.getSnapshot().context.currentStepIndex).toBe(0);
  });

  it('should handle WAITING_AUTO auto-advance with delay override', async () => {
    const provided = cookingMachine.provide({
      actors: {
        ttsService: fromPromise(async (): Promise<{ success: true }> => ({ success: true })),
        timerService: fromPromise(async (): Promise<void> => undefined),
        llmService: fromPromise(async (): Promise<{ answer: string }> => ({ answer: '' })),
      },
      delays: { autoDelay: () => 0 },
    });

    const actor = createActor(provided);
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush(); // step 0 instant → WAITING_AUTO → auto-delay(0) → ANNOUNCING_STEP step 1
    // With 0ms delay, auto-advance fires quickly. After flush, we should be past step 0.
    expect(actor.getSnapshot().context.currentStepIndex).toBeGreaterThanOrEqual(1);
  });

  it('should handle auto-advance to COMPLETED on last step', async () => {
    const recipe: Recipe = {
      ...TEST_RECIPE,
      steps: [{ id: 's1', text: '最后', tag: 'instant', subSteps: [] }],
    };
    const provided = cookingMachine.provide({
      actors: {
        ttsService: fromPromise(async (): Promise<{ success: true }> => ({ success: true })),
        timerService: fromPromise(async (): Promise<void> => undefined),
        llmService: fromPromise(async (): Promise<{ answer: string }> => ({ answer: '' })),
      },
      delays: { autoDelay: () => 0 },
    });
    const actor = createActor(provided);
    actor.start();

    actor.send({ type: 'START', recipe });
    await flush();
    expect(getStateValue(actor)).toBe('COMPLETED');
  });

  it('should verify context consistency across full flow', async () => {
    const { actor } = createTestMachineWithDeferredTimer();
    actor.start();

    actor.send({ type: 'START', recipe: TEST_RECIPE });
    await flush(); // step 0 → WAITING_AUTO

    const ctx = actor.getSnapshot().context;
    expect(ctx.recipe?.id).toBe('recipe-001');
    expect(ctx.recipe?.name).toBe('番茄炒蛋');
    expect(ctx.steps).toHaveLength(5);
    expect(ctx.currentStepIndex).toBe(0);
    expect(ctx.isAnswering).toBe(false);
    expect(ctx.timers.size).toBe(0);

    actor.send({ type: 'NEXT' });
    await flush();
    await flush(); // → WAITING_USER
    actor.send({ type: 'CONFIRM' });
    await flush();
    await flush(); // → WAITING_AUTO
    actor.send({ type: 'NEXT' });
    await flush(); // → WAITING_TIMER
    actor.send({ type: 'TIMER_DONE', timerId: 'timer-3' });
    actor.send({ type: 'NEXT' });
    await flush(); // → ANNOUNCING_STEP (step 4)
    await flush(); // → COMPLETED

    const f = actor.getSnapshot().context;
    expect(f.currentStepIndex).toBe(4);
    expect(f.lastAnnouncedText).toBe('烹饪完成！');
    expect(f.isAnswering).toBe(false);
    expect(f.timers.size).toBe(0);
  });
});
