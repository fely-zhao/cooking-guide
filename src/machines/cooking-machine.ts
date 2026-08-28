import { setup, assign, fromPromise } from 'xstate';
import type { Recipe, Step } from '../types/cooking';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Metadata for an active timer in the `timers` context map. */
export interface TimerInfo {
  timerId: string;
  durationSeconds: number;
  startedAt: number;
}

/** Full context carried through the cooking FSM lifecycle. */
export interface MachineContext {
  recipe: Recipe | null;
  currentStepIndex: number;
  steps: Step[];
  timers: Map<string, TimerInfo>;
  isAnswering: boolean;
  lastAnnouncedText: string;
  /** State node name we were in before entering ANSWERING (for back-navigation). */
  previousState: string | null;
}

/** All events the cooking machine accepts. */
export type MachineEvent =
  | { type: 'START'; recipe: Recipe }
  | { type: 'NEXT' }
  | { type: 'REPEAT' }
  | { type: 'CONFIRM' }
  | { type: 'TIMER_DONE'; timerId: string }
  | { type: 'ASK'; question: string }
  | { type: 'ANSWER_DONE' }
  | { type: 'SKIP'; targetIndex: number }
  | { type: 'EXIT' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getCurrentStep = (context: MachineContext): Step | null =>
  context.steps[context.currentStepIndex] ?? null;

// ---------------------------------------------------------------------------
// Machine setup
// ---------------------------------------------------------------------------

export const cookingMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
  },

  // ---- Actions -----------------------------------------------------------

  actions: {
    /** Populate context from the START event payload. */
    initRecipe: assign({
      recipe: ({ event }) => (event.type === 'START' ? event.recipe : null),
      steps: ({ event }) => (event.type === 'START' ? event.recipe.steps : []),
      currentStepIndex: 0,
      timers: () => new Map<string, TimerInfo>(),
      isAnswering: false,
      lastAnnouncedText: '',
      previousState: null,
    }),

    /** Store the current step's text so listeners can display it. */
    announceStep: assign({
      lastAnnouncedText: ({ context }) => getCurrentStep(context)?.text ?? '',
    }),

    /** Snapshot the current state name so we can return after ANSWERING. */
    recordPreviousState: assign({
      previousState: ({ self }) => {
        const value = self.getSnapshot().value;
        if (typeof value === 'string') {
          return value;
        }
        const keys = Object.keys(value);
        return keys.length === 1 ? keys[0] : null;
      },
    }),

    /** Move to the next step. */
    advanceStep: assign({
      currentStepIndex: ({ context }) => context.currentStepIndex + 1,
    }),

    /** Jump to an arbitrary step index (SKIP event). */
    skipToStep: assign({
      currentStepIndex: ({ event }) => (event.type === 'SKIP' ? event.targetIndex : 0),
    }),

    /** Mark that we are answering a user question. */
    setAnswering: assign({ isAnswering: true }),

    /** Clear answering state and return-point after ANSWERING completes. */
    clearAnswering: assign({ isAnswering: false, previousState: null }),

    /** Register a new timer in the context map (entry action of WAITING_TIMER). */
    addTimer: assign({
      timers: ({ context }) => {
        const step = getCurrentStep(context);
        if (!step || step.tag !== 'wait_timer') return context.timers;
        const newTimers = new Map(context.timers);
        const timerId = `timer-${context.currentStepIndex}`;
        newTimers.set(timerId, {
          timerId,
          durationSeconds: step.durationSeconds ?? 60,
          startedAt: Date.now(),
        });
        return newTimers;
      },
    }),

    /** Remove a timer from the context map after it fires. */
    removeTimer: assign({
      timers: ({ context, event }) => {
        if (event.type !== 'TIMER_DONE') return context.timers;
        const newTimers = new Map(context.timers);
        newTimers.delete(event.timerId);
        return newTimers;
      },
    }),

    /** Finalise the session when all steps are done. */
    completeSession: assign({
      lastAnnouncedText: () => '烹饪完成！',
    }),

    /** Vibrate to alert the user that a timer has finished. */
    vibrateAlert: () => {
      // Overridden at runtime via .provide() with Vibration API.
    },
  },

  // ---- Guards ------------------------------------------------------------

  guards: {
    hasSteps: ({ context }) => context.steps.length > 0,

    hasNextStep: ({ context }) =>
      context.steps.length > 0 && context.currentStepIndex < context.steps.length - 1,

    isLastStep: ({ context }) =>
      context.steps.length > 0 && context.currentStepIndex === context.steps.length - 1,

    canSkip: ({ context, event }) =>
      event.type === 'SKIP' && event.targetIndex >= 0 && event.targetIndex < context.steps.length,

    isInstantTag: ({ context }) => getCurrentStep(context)?.tag === 'instant',

    isWaitUserTag: ({ context }) => getCurrentStep(context)?.tag === 'wait_user',

    isWaitTimerTag: ({ context }) => getCurrentStep(context)?.tag === 'wait_timer',

    /** Parameterised guard — true when `previousState` matches the param. */
    wasFromState: ({ context }, params: { state: string }) =>
      context.previousState === params.state,
  },

  // ---- Actors (invoked services) -----------------------------------------

  actors: {
    /** Text-to-Speech — called whenever the machine needs to announce a step. */
    ttsService: fromPromise(async ({ input: _input }: { input: { text: string } }) => {
      // Delegate to TTSService at runtime; placeholder for type-safety.
      return { success: true as const };
    }),

    /** Countdown timer — resolves after `durationSeconds`. */
    timerService: fromPromise(
      async ({ input }: { input: { durationSeconds: number } }) =>
        new Promise<void>(resolve => setTimeout(resolve, input.durationSeconds * 1000)),
    ),

    /** LLM Q&A — answers a cooking question about the current step. */
    llmService: fromPromise(
      async ({
        input: _input,
      }: {
        input: {
          question: string;
          stepText: string;
          recipeName: string;
        };
      }) => {
        // Delegate to LLMService at runtime; placeholder for type-safety.
        return { answer: '' };
      },
    ),
  },

  // ---- Delays ------------------------------------------------------------

  delays: {
    /** Randomised 3-5 s auto-advance delay for `instant` steps. */
    autoDelay: () => Math.floor(Math.random() * 2000) + 3000,
    /** Pause between repeated TTS reminders (ms). */
    reminderPause: 3000,
  },
}).createMachine({
  id: 'cooking',
  initial: 'IDLE',
  context: {
    recipe: null,
    currentStepIndex: 0,
    steps: [],
    timers: new Map(),
    isAnswering: false,
    lastAnnouncedText: '',
    previousState: null,
  },

  states: {
    // --------------------------------------------------------------- IDLE
    IDLE: {
      on: {
        START: {
          target: 'ANNOUNCING_STEP',
          actions: 'initRecipe',
        },
      },
    },

    // --------------------------------------------------- ANNOUNCING_STEP
    ANNOUNCING_STEP: {
      entry: 'announceStep',
      invoke: {
        src: 'ttsService',
        input: ({ context }) => ({
          text: getCurrentStep(context)?.text ?? '',
        }),
        onDone: [
          { guard: 'isLastStep', target: 'COMPLETED' },
          { guard: 'isInstantTag', target: 'WAITING_AUTO' },
          { guard: 'isWaitUserTag', target: 'WAITING_USER' },
          { guard: 'isWaitTimerTag', target: 'WAITING_TIMER' },
        ],
        onError: 'WAITING_USER',
      },
      on: {
        REPEAT: 'ANNOUNCING_STEP',
        ASK: { target: 'ANSWERING', actions: 'recordPreviousState' },
        SKIP: {
          guard: 'canSkip',
          target: 'ANNOUNCING_STEP',
          actions: 'skipToStep',
        },
        EXIT: 'IDLE',
      },
    },

    // ----------------------------------------------------- WAITING_AUTO
    WAITING_AUTO: {
      after: {
        autoDelay: [
          {
            guard: 'hasNextStep',
            target: 'ANNOUNCING_STEP',
            actions: 'advanceStep',
          },
          { guard: 'hasSteps', target: 'COMPLETED' },
          { target: 'COMPLETED' },
        ],
      },
      on: {
        NEXT: [
          {
            guard: 'hasNextStep',
            target: 'ANNOUNCING_STEP',
            actions: 'advanceStep',
          },
          { guard: 'hasSteps', target: 'COMPLETED' },
          { target: 'COMPLETED' },
        ],
        REPEAT: 'ANNOUNCING_STEP',
        ASK: { target: 'ANSWERING', actions: 'recordPreviousState' },
        SKIP: {
          guard: 'canSkip',
          target: 'ANNOUNCING_STEP',
          actions: 'skipToStep',
        },
        EXIT: 'IDLE',
      },
    },

    // ---------------------------------------------------- WAITING_USER
    WAITING_USER: {
      on: {
        CONFIRM: [
          {
            guard: 'hasNextStep',
            target: 'ANNOUNCING_STEP',
            actions: 'advanceStep',
          },
          { guard: 'hasSteps', target: 'COMPLETED' },
          { target: 'COMPLETED' },
        ],
        NEXT: [
          {
            guard: 'hasNextStep',
            target: 'ANNOUNCING_STEP',
            actions: 'advanceStep',
          },
          { guard: 'hasSteps', target: 'COMPLETED' },
          { target: 'COMPLETED' },
        ],
        REPEAT: 'ANNOUNCING_STEP',
        ASK: { target: 'ANSWERING', actions: 'recordPreviousState' },
        SKIP: {
          guard: 'canSkip',
          target: 'ANNOUNCING_STEP',
          actions: 'skipToStep',
        },
        EXIT: 'IDLE',
      },
    },

    // --------------------------------------------------- WAITING_TIMER
    WAITING_TIMER: {
      entry: 'addTimer',
      invoke: {
        src: 'timerService',
        input: ({ context }) => ({
          durationSeconds: getCurrentStep(context)?.durationSeconds ?? 60,
        }),
        onDone: 'ANNOUNCING_REMINDER',
      },
      on: {
        TIMER_DONE: {
          target: 'ANNOUNCING_REMINDER',
          actions: 'removeTimer',
        },
        NEXT: [
          {
            guard: 'hasNextStep',
            target: 'ANNOUNCING_STEP',
            actions: 'advanceStep',
          },
          { guard: 'hasSteps', target: 'COMPLETED' },
          { target: 'COMPLETED' },
        ],
        REPEAT: 'ANNOUNCING_STEP',
        ASK: { target: 'ANSWERING', actions: 'recordPreviousState' },
        SKIP: {
          guard: 'canSkip',
          target: 'ANNOUNCING_STEP',
          actions: 'skipToStep',
        },
        EXIT: 'IDLE',
      },
    },

    // ---------------------------------------------- ANNOUNCING_REMINDER
    ANNOUNCING_REMINDER: {
      initial: 'playing',
      states: {
        playing: {
          entry: 'vibrateAlert',
          invoke: {
            src: 'ttsService',
            input: ({ context }) => ({
              text: `计时结束！${getCurrentStep(context)?.text ?? ''}`,
            }),
            onDone: 'pausing',
          },
        },
        pausing: {
          after: {
            reminderPause: 'playing',
          },
        },
      },
      on: {
        NEXT: [
          {
            guard: 'hasNextStep',
            target: 'ANNOUNCING_STEP',
            actions: 'advanceStep',
          },
          { guard: 'hasSteps', target: 'COMPLETED' },
          { target: 'COMPLETED' },
        ],
        REPEAT: 'ANNOUNCING_REMINDER',
        ASK: { target: 'ANSWERING', actions: 'recordPreviousState' },
        EXIT: 'IDLE',
      },
    },

    // ----------------------------------------------------- ANSWERING
    ANSWERING: {
      entry: 'setAnswering',
      exit: 'clearAnswering',
      invoke: {
        src: 'llmService',
        input: ({ context, event }) => ({
          question: event.type === 'ASK' ? event.question : '',
          stepText: getCurrentStep(context)?.text ?? '',
          recipeName: context.recipe?.name ?? '',
        }),
        onDone: [
          {
            guard: { type: 'wasFromState', params: { state: 'ANNOUNCING_STEP' } },
            target: 'ANNOUNCING_STEP',
          },
          {
            guard: { type: 'wasFromState', params: { state: 'WAITING_AUTO' } },
            target: 'WAITING_AUTO',
          },
          {
            guard: { type: 'wasFromState', params: { state: 'WAITING_USER' } },
            target: 'WAITING_USER',
          },
          {
            guard: { type: 'wasFromState', params: { state: 'WAITING_TIMER' } },
            target: 'WAITING_TIMER',
          },
          {
            guard: {
              type: 'wasFromState',
              params: { state: 'ANNOUNCING_REMINDER' },
            },
            target: 'ANNOUNCING_REMINDER',
          },
          { target: 'ANNOUNCING_STEP' },
        ],
      },
      on: {
        ANSWER_DONE: [
          {
            guard: {
              type: 'wasFromState',
              params: { state: 'ANNOUNCING_STEP' },
            },
            target: 'ANNOUNCING_STEP',
          },
          {
            guard: { type: 'wasFromState', params: { state: 'WAITING_AUTO' } },
            target: 'WAITING_AUTO',
          },
          {
            guard: { type: 'wasFromState', params: { state: 'WAITING_USER' } },
            target: 'WAITING_USER',
          },
          {
            guard: { type: 'wasFromState', params: { state: 'WAITING_TIMER' } },
            target: 'WAITING_TIMER',
          },
          {
            guard: {
              type: 'wasFromState',
              params: { state: 'ANNOUNCING_REMINDER' },
            },
            target: 'ANNOUNCING_REMINDER',
          },
          { target: 'ANNOUNCING_STEP' },
        ],
        EXIT: 'IDLE',
      },
    },

    // ----------------------------------------------------- COMPLETED
    COMPLETED: {
      entry: 'completeSession',
      invoke: {
        src: 'ttsService',
        input: () => ({ text: '烹饪完成！' }),
      },
      on: {
        EXIT: 'IDLE',
      },
    },
  },
});
