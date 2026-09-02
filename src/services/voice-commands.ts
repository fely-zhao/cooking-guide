import type { STTService } from './stt';
import { recordAudio } from './stt';
import i18n from '../i18n';
import type { AppLanguage } from '../i18n';

export type VoiceCommand = 'next' | 'repeat' | 'ask';

/**
 * Per-language ordered keyword-to-command mappings.
 *
 * `ask` entries are checked first to prevent short `next` keywords like
 * "下一步" / "next" from consuming question utterances such as
 * "我想问下一步要做什么" / "I have a question about the next step".
 */
const KEYWORD_MAPS: Record<AppLanguage, Array<{ keywords: string[]; command: VoiceCommand }>> = {
  zh: [
    {
      keywords: ['我想问', '我问个问题', '有个问题'],
      command: 'ask',
    },
    {
      keywords: ['再说一遍', '重复', '再来一次'],
      command: 'repeat',
    },
    {
      keywords: ['好了', '下一步', '继续', '完成', '已完成'],
      command: 'next',
    },
  ],
  en: [
    {
      keywords: ['question', 'ask you'],
      command: 'ask',
    },
    {
      keywords: ['repeat', 'say it again', 'one more time', 'again'],
      command: 'repeat',
    },
    {
      keywords: ['next', 'done', 'continue', 'go on', 'ok', 'okay'],
      command: 'next',
    },
  ],
};

/** dispatch 时按当前语言取词表（服务实例被 useCookingServices 缓存，切语言不重建） */
function getKeywordMap(): Array<{ keywords: string[]; command: VoiceCommand }> {
  return KEYWORD_MAPS[i18n.language === 'en' ? 'en' : 'zh'];
}

const DEFAULT_DEBOUNCE_MS = 2000;

/**
 * Translates voice commands (Chinese keywords) into FSM events.
 *
 * Uses the provided `STTService` to transcribe short audio chunks, matches
 * recognised text against known Chinese keywords, then fires an `onCommand`
 * callback that the FSM layer wires up to `NEXT` / `REPEAT` / `ASK` events.
 *
 * The listening loop is continuous: record → transcribe → match → fire → repeat.
 */
export class VoiceCommandService {
  private readonly sttService: STTService;
  private readonly debounceMs: number;
  private _listening = false;
  private _paused = false;
  private _pauseResolve: (() => void) | null = null;
  private _lastCommandTime = 0;

  // Track recording phase to distinguish between "mic open" and "mic closed"
  // when TTS starts. Only discard transcriptions that were recorded while the
  // mic was still open (TTS playback could have leaked into the recording).
  private _recordingPhase: 'idle' | 'recording' | 'transcribing' = 'idle';
  private _pauseDiscard = false;

  /**
   * External callback invoked when a keyword is matched.
   *
   * @param command  - The resolved FSM event name.
   * @param question - (optional) Free-text question extracted from the utterance,
   *                   set only when `command === 'ask'`.
   */
  onCommand: ((command: VoiceCommand, question?: string) => void) | null = null;

  constructor(sttService: STTService, debounceMs: number = DEFAULT_DEBOUNCE_MS) {
    this.sttService = sttService;
    this.debounceMs = debounceMs;
  }

  /**
   * Start the continuous listen → transcribe → match loop.
   *
   * Each iteration records ~3 s of audio, sends it to the STT service, and
   * dispatches a command when a keyword is recognised.  The loop runs until
   * `stopListening()` is called.
   */
  async startListening(): Promise<void> {
    if (this._listening) return;
    this._listening = true;
    console.log('[VoiceCommand] startListening: loop started');

    const MAX_CONSECUTIVE_FAILURES = 3;
    let consecutiveFailures = 0;

    while (this._listening) {
      if (this._paused) {
        console.log('[VoiceCommand] startListening: paused, waiting...');
        await new Promise<void>(resolve => {
          this._pauseResolve = resolve;
        });
        this._pauseResolve = null;
        console.log('[VoiceCommand] startListening: resumed');
        continue;
      }

      this._pauseDiscard = false;
      this._recordingPhase = 'recording';

      try {
        const t0 = Date.now();
        console.log('[VoiceCommand] recording...');
        const { filePath } = await recordAudio({
          maxDurationMs: 5000,
          silenceTimeoutMs: 300,
          silenceThreshold: 0.001,
        });
        console.log('[VoiceCommand] recording done, transcribing...');
        this._recordingPhase = 'transcribing';
        const text = await this.sttService.speechToTextForCommand(filePath);
        console.log(
          `[VoiceCommand] transcription: ${JSON.stringify(text)} (${Date.now() - t0}ms from record start)`,
        );

        // Discard if TTS playback started while the mic was still open.
        // The recording likely captured TTS audio from the speaker, which
        // should never be interpreted as a voice command.
        if (this._pauseDiscard) {
          console.log('[VoiceCommand] transcription discarded (recording overlapped with TTS)');
          this._pauseDiscard = false;
          continue;
        }

        consecutiveFailures = 0;
        this._dispatch(text);
      } catch (err) {
        consecutiveFailures++;
        console.error(
          `[VoiceCommand] STT/recording error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`,
          err,
        );
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log('[VoiceCommand] too many failures, stopping listening loop');
          this._listening = false;
        }
      } finally {
        this._recordingPhase = 'idle';
      }
    }
    console.log('[VoiceCommand] startListening: loop ended');
  }

  /**
   * Pause the listening loop so TTS can play without audio conflicts.
   * The in-flight recording (if any) is allowed to finish.
   */
  pauseListening(): void {
    this._paused = true;
    // Only mark discard if TTS starts during recording (mic open, capturing audio).
    // If TTS starts during transcription (mic already closed), the audio was
    // captured before TTS playback began and should be processed normally.
    if (this._recordingPhase === 'recording') {
      this._pauseDiscard = true;
    }
  }

  resumeListening(): void {
    this._paused = false;
    this._pauseResolve?.();
  }

  /**
   * Gracefully stop the listening loop entirely.
   */
  stopListening(): void {
    this._listening = false;
    this._pauseResolve?.();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Match `text` against known keywords and fire `onCommand` if one is found.
   *
   * Debounce: commands fired within `debounceMs` of the last match are silently
   * dropped to avoid duplicate triggers from overlapping audio chunks.
   */
  private _dispatch(text: string): void {
    const now = Date.now();
    if (now - this._lastCommandTime < this.debounceMs) {
      console.log('[VoiceCommand] dispatch: debounced');
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      console.log('[VoiceCommand] dispatch: empty text');
      return;
    }

    // Azure 英文转写带大小写与句尾标点（"Next."），匹配前统一小写；
    // toLowerCase 是 1:1 长度变换，idx 在原文与归一化文本中位置一致，
    // ask 的 question 提取仍用原文切片，不影响。
    // 中文无大小写差异，行为不变。
    const normalized = trimmed.toLowerCase();

    for (const { keywords, command } of getKeywordMap()) {
      for (const kw of keywords) {
        // 英文词用词边界匹配，避免子串误触发（"book" 含 "ok"）；
        // \b 基于 [A-Za-z0-9_]，对 CJK 无效，中文保持 indexOf 子串匹配
        let idx: number;
        if (/[\u4e00-\u9fff]/.test(kw)) {
          idx = normalized.indexOf(kw);
        } else {
          const match = normalized.match(new RegExp(`\\b${kw}\\b`));
          idx = match?.index ?? -1;
        }
        if (idx === -1) continue;

        this._lastCommandTime = now;
        console.log('[VoiceCommand] dispatch: matched', command, 'from', JSON.stringify(text));

        if (command === 'ask') {
          const question = trimmed.slice(idx + kw.length).trim() || undefined;
          this.onCommand?.(command, question);
        } else {
          this.onCommand?.(command);
        }
        return;
      }
    }
    console.log('[VoiceCommand] dispatch: no keyword matched in', JSON.stringify(text));
  }
}
