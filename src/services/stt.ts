import {
  AudioRecorder,
  AudioManager,
  FileFormat,
  FileDirectory,
  FilePreset,
} from 'react-native-audio-api';

import { STT_URL } from '../config';
import { STTError } from './stt-error';
import { ensureMicPermission } from './permissions';

const DEFAULT_STT_URL = STT_URL;

// Set audio session options once at module level for concurrent playback + recording.
AudioManager.setAudioSessionOptions({
  iosCategory: 'playAndRecord',
  iosMode: 'default',
  iosOptions: [],
});

// ---------------------------------------------------------------------------
// Microphone permission & recorder singleton
// ---------------------------------------------------------------------------

let recorderInstance: AudioRecorder | null = null;

function getRecorder(): AudioRecorder {
  if (!recorderInstance) {
    recorderInstance = new AudioRecorder();
  }
  return recorderInstance;
}

export function releaseRecorder(): void {
  if (recorderInstance) {
    recorderInstance.clearOnAudioReady();
    recorderInstance.clearOnError();
    recorderInstance.disableFileOutput();
    recorderInstance = null;
  }
}

// ---------------------------------------------------------------------------
// STT Service
// ---------------------------------------------------------------------------

/**
 * Speech-to-Text service connecting to the local stt-server (faster-whisper).
 *
 * Supports two usage modes:
 * 1. **Full dictation** – `speechToText()` for recipe voice input (multi-language)
 * 2. **Short commands** – `speechToTextForCommand()` for cooking voice commands
 *    (Chinese-only, optimised for keywords like "好了/下一步/再说一遍/等一下")
 *
 * The stt-server runs at `http://localhost:5000` and accepts OpenAI Whisper
 * API-compatible multipart uploads.  Requires `adb reverse tcp:5000 tcp:5000`
 * so the Android emulator can reach the host service.
 */
export class STTService {
  private readonly baseUrl: string;

  /**
   * @param baseUrl - stt-server base URL.  Defaults to `http://localhost:5000`.
   *                  Override for custom deployments or port changes.
   */
  constructor(baseUrl: string = DEFAULT_STT_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Check whether the stt-server is reachable and the whisper model is loaded.
   *
   * @returns `true` if the server responds with status `"ok"`.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
      if (!response.ok) return false;
      const body: { status?: string } = await response.json();
      return body.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Transcribe audio to text via the local stt-server (faster-whisper).
   *
   * Reads the WAV file via fetch + arrayBuffer, converts to base64, and
   * sends as JSON body via fetch — avoids Hermes' inability to send
   * ArrayBuffer/FormData bodies in POST requests.
   *
   * @param filePath - Absolute path to the WAV file.
   * @param language - Language hint (`'zh'` or `'en'`).
   * @param model    - Whisper model size (e.g. 'base', 'small', 'medium').
   */
  async speechToText(filePath: string, language: 'zh' | 'en', model: string): Promise<string> {
    try {
      // 1. Read the WAV file via fetch (works on RN with file:// URIs)
      const fileUri = filePath.startsWith('/') ? `file://${filePath}` : filePath;
      const fileResponse = await fetch(fileUri);
      if (!fileResponse.ok) {
        throw new STTError(`无法读取录音文件: HTTP ${fileResponse.status}`);
      }
      const audioData = await fileResponse.arrayBuffer();
      console.log(`[STT] read ${audioData.byteLength} bytes from ${filePath}`);

      const audioBase64 = arrayBufferToBase64(audioData);

      // 3. Send as JSON via fetch (string body — Hermes-safe)
      const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          language,
          model,
        }),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body: { detail?: string } = await response.json();
          if (body?.detail) detail = body.detail;
        } catch {
          // keep fallback
        }
        throw new STTError(`stt-server 返回错误: ${detail}`);
      }

      const result: { text?: string } = await response.json();
      return (result.text ?? '').trim();
    } catch (error) {
      if (error instanceof STTError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown STT error';
      throw new STTError(`stt-server 请求失败: ${message}`, error);
    }
  }

  /**
   * Transcribe a short voice command (Chinese-only).
   * Convenience wrapper that fixes the language to `'zh'` for command recognition.
   */
  async speechToTextForCommand(filePath: string): Promise<string> {
    return this.speechToText(filePath, 'zh', 'base');
  }
}

// ---------------------------------------------------------------------------
// Microphone recording (file output with optional VAD)
// ---------------------------------------------------------------------------

export interface RecordAudioOptions {
  /** Hard limit — stop recording after this many ms regardless of VAD. */
  maxDurationMs: number;
  /**
   * When set, enables voice activity detection.
   * Recording stops after the speaker has been silent for this many ms.
   * Without this, recording runs for the full maxDurationMs.
   */
  silenceTimeoutMs?: number;
  /**
   * If no speech is detected within this many ms, stop early instead of
   * waiting for maxDurationMs.  Only meaningful when silenceTimeoutMs is set.
   */
  noSpeechTimeoutMs?: number;
  /**
   * RMS threshold for silence detection (default 0.005).
   * Float samples are in the range -1.0 ~ 1.0.
   */
  silenceThreshold?: number;
}

/**
 * Record audio to a WAV file using `AudioRecorder.enableFileOutput`.
 *
 * When `silenceTimeoutMs` is provided, recording stops as soon as the user
 * stops speaking (after the silence timeout elapses), instead of waiting
 * for the full `maxDurationMs`. This makes short commands much faster.
 *
 * The returned `filePath` has a `file://` prefix and can be directly passed
 * to `STTService.speechToText()` / `STTService.speechToTextForCommand()`.
 */
export async function recordAudio(options: RecordAudioOptions): Promise<{ filePath: string }> {
  const { maxDurationMs, silenceTimeoutMs, silenceThreshold = 0.005 } = options;

  await ensureMicPermission();
  const recorder = getRecorder();

  recorder.clearOnAudioReady();

  const enableResult = recorder.enableFileOutput({
    format: FileFormat.Wav,
    directory: FileDirectory.Cache,
    fileNamePrefix: 'stt_recording',
    channelCount: 1,
    preset: FilePreset.Low,
  });
  if (enableResult.status === 'error') {
    throw new STTError(`文件输出设置失败: ${enableResult.message}`);
  }

  await AudioManager.setAudioSessionActivity(true);

  let stopTrigger: (() => void) | null = null;

  if (silenceTimeoutMs) {
    const frameDurationMs = 100;
    let silenceFrames = 0;
    const silenceFrameLimit = Math.ceil(silenceTimeoutMs / frameDurationMs);
    let hasSeenVoice = false;

    let noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
    if (options.noSpeechTimeoutMs) {
      noSpeechTimer = setTimeout(() => {
        if (!hasSeenVoice) stopTrigger?.();
      }, options.noSpeechTimeoutMs);
    }

    const vadResult = recorder.onAudioReady(
      { sampleRate: 22050, bufferLength: 4096, channelCount: 1 },
      event => {
        const data = event.buffer.getChannelData(0);
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          sumSq += data[i] * data[i];
        }
        const rms = Math.sqrt(sumSq / data.length);

        if (rms > silenceThreshold) {
          if (!hasSeenVoice && noSpeechTimer) {
            clearTimeout(noSpeechTimer);
            noSpeechTimer = null;
          }
          hasSeenVoice = true;
          silenceFrames = 0;
        } else if (hasSeenVoice) {
          silenceFrames++;
          if (silenceFrames >= silenceFrameLimit) {
            stopTrigger?.();
          }
        }
      },
    );

    if (vadResult.status === 'error') {
      recorder.disableFileOutput();
      throw new STTError(`VAD 回调设置失败: ${vadResult.message}`);
    }
  }

  const startResult = recorder.start({ fileNameOverride: 'stt_recording.wav' });
  if (startResult.status === 'error') {
    recorder.disableFileOutput();
    recorder.clearOnAudioReady();
    throw new STTError(`录音启动失败: ${startResult.message}`);
  }

  if (silenceTimeoutMs) {
    await new Promise<void>(resolve => {
      stopTrigger = resolve;
      setTimeout(resolve, maxDurationMs);
    });
  } else {
    await new Promise<void>(resolve => setTimeout(resolve, maxDurationMs));
  }

  const stopResult = recorder.stop();
  recorder.disableFileOutput();
  recorder.clearOnAudioReady();

  if (stopResult.status === 'error') {
    throw new STTError(`录音停止失败: ${stopResult.message}`);
  }

  const { paths, size, duration } = stopResult;
  if (!paths || paths.length === 0 || !paths[0]) {
    throw new STTError('录音文件路径为空');
  }

  console.log(
    `[recordAudio] path=${paths[0]} size=${size.toFixed(2)}MB duration=${duration.toFixed(1)}s`,
  );

  return { filePath: paths[0] };
}

// ---------------------------------------------------------------------------
// Base64 helper
// ---------------------------------------------------------------------------

/**
 * Convert an ArrayBuffer to a base64 string.
 *
 * Pure-JS implementation — no `btoa` dependency, works in any Hermes
 * environment without DOM type declarations.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars: string[] = [];
  for (let i = 0; i < bytes.byteLength; i++) {
    chars.push(String.fromCharCode(bytes[i]));
  }
  const binary = chars.join('');
  return base64Encode(binary);
}

/**
 * Encode a Latin-1 string to base64 without using `btoa`.
 *
 * Base64 alphabet: A-Z a-z 0-9 + /
 * Pads with `=` to multiples of 4.
 */
function base64Encode(input: string): string {
  const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let i = 0;
  const len = input.length;

  while (i < len) {
    const c1 = input.charCodeAt(i++);
    const hasC2 = i < len;
    const c2 = hasC2 ? input.charCodeAt(i++) : 0;
    const hasC3 = i < len;
    const c3 = hasC3 ? input.charCodeAt(i++) : 0;

    const triplet = (c1 << 16) | (c2 << 8) | c3;

    output += BASE64.charAt((triplet >> 18) & 0x3f);
    output += BASE64.charAt((triplet >> 12) & 0x3f);

    if (!hasC2) {
      output += '==';
    } else if (!hasC3) {
      output += BASE64.charAt((triplet >> 6) & 0x3f) + '=';
    } else {
      output += BASE64.charAt((triplet >> 6) & 0x3f);
      output += BASE64.charAt(triplet & 0x3f);
    }
  }

  return output;
}
