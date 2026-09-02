import {
  AudioRecorder,
  AudioManager,
  FileFormat,
  FileDirectory,
  FilePreset,
} from 'react-native-audio-api';

import { AZURE_REGION } from '../config';
import { STTError } from './stt-error';
import { ensureMicPermission } from './permissions';
import { getVoiceConfig } from '../i18n/voiceMap';

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
 * Speech-to-Text service connecting to Azure AI Speech (REST, short-audio API).
 *
 * Endpoint: POST https://{region}.stt.speech.microsoft.com/speech/recognition/
 *           conversation/cognitiveservices/v1?language={locale}
 *   - Auth: Ocp-Apim-Subscription-Key header (key stored in MMKV via Settings)
 *   - Body: raw WAV bytes (≤ 60 s — hard limit of the short-audio API)
 *
 * Two usage modes:
 * 1. **Full dictation** – `speechToText()` for recipe voice input (multi-language)
 * 2. **Short commands** – `speechToTextForCommand()` for cooking voice commands
 *    (language follows UI language via voiceMap, matching per-language keywords)
 *
 * ---------------------------------------------------------------------------
 * LOCAL IMPLEMENTATION (commented out 2026-08-27, switch back if needed):
 * The original implementation connected to the local stt-server (faster-whisper,
 * OpenAI Whisper-compatible JSON+base64 API at http://localhost:5000). To restore:
 *   1. Uncomment the blocks marked "LOCAL STT" below
 *   2. In config.ts uncomment TTS_URL/STT_URL and remove AZURE_REGION usage
 *   3. In cooking-machine-shared.ts restore the commented constructor lines
 *   4. In types/settings.ts & SettingsScreen.tsx re-enable sttUrl/ttsUrl wiring
 * ---------------------------------------------------------------------------
 */
export class STTService {
  private readonly subscriptionKey: string;
  private readonly region: string;

  /**
   * @param subscriptionKey - Azure Speech resource key (from settings storage).
   * @param region          - Azure region, defaults to AZURE_REGION in config.ts.
   */
  constructor(subscriptionKey: string, region: string = AZURE_REGION) {
    this.subscriptionKey = subscriptionKey;
    this.region = region;
  }

  /*
   * --- LOCAL STT (commented out 2026-08-27) --------------------------------
   * Check whether the local stt-server is reachable and the whisper model is loaded.
   *
   * @returns `true` if the server responds with status `"ok"`.
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
   * --- END LOCAL STT --------------------------------------------------------
   */

  /**
   * Transcribe a WAV recording to text via Azure AI Speech (short-audio API).
   *
   * Reads the WAV file via fetch → Blob and sends it as the raw request body
   * (Azure only accepts binary audio, not base64 JSON).
   *
   * @param filePath - Absolute path to the WAV file (22050 Hz, 16-bit, mono).
   * @param language - Language hint (`'zh'` → zh-CN, `'en'` → en-US).
   */
  async speechToText(filePath: string, language: 'zh' | 'en'): Promise<string> {
    if (!this.subscriptionKey) {
      throw new STTError('未配置 Azure Speech Key，请在设置页填写');
    }

    const locale = language === 'en' ? 'en-US' : 'zh-CN';
    // eslint-disable-next-line prettier/prettier -- 单行长 URL，模板串无法自动折行
    const url = `https://${this.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}`;

    try {
      // 1. Read the WAV file via fetch (works on RN with file:// URIs)
      const fileUri = filePath.startsWith('/') ? `file://${filePath}` : filePath;
      const fileResponse = await fetch(fileUri);
      if (!fileResponse.ok) {
        throw new STTError(`无法读取录音文件: HTTP ${fileResponse.status}`);
      }
      // Blob body is the reliable way to send raw audio from RN/Hermes.
      const audioBlob = await fileResponse.blob();
      console.log(`[STT] uploading ${audioBlob.size} bytes from ${filePath}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=22050',
          Accept: 'application/json;text/xml',
        },
        body: audioBlob,
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const bodyText = await response.text();
          if (bodyText) detail += ` — ${bodyText.slice(0, 200)}`;
        } catch {
          // keep fallback
        }
        throw new STTError(`Azure STT 返回错误: ${detail}`);
      }

      const result: { RecognitionStatus?: string; DisplayText?: string } = await response.json();
      if (result.RecognitionStatus && result.RecognitionStatus !== 'Success') {
        // NoSpeech / InitialSilenceTimeout / Babble — treat as empty result so
        // callers can show "未识别到语音" without an exception.
        console.log(`[STT] Azure recognition not successful: ${result.RecognitionStatus}`);
        return '';
      }
      return (result.DisplayText ?? '').trim();
    } catch (error) {
      if (error instanceof STTError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown STT error';
      throw new STTError(`Azure STT 请求失败: ${message}`, error);
    }
  }

  /**
   * Transcribe a short voice command (Chinese-only).
   * Convenience wrapper that fixes the language to `'zh'` for command recognition.
   */
  async speechToTextForCommand(filePath: string): Promise<string> {
    // 转写语言随 UI 语言走（voiceMap 枢纽），语音命令关键词表同步按语言切换
    return this.speechToText(filePath, getVoiceConfig().sttLanguage);
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
// NOTE: arrayBufferToBase64()/base64Encode() 已随本地 stt-server 一同停用。
// 本地实现走 base64-JSON 绕过 Hermes 不支持二进制 body 的限制；Azure 只收
// 二进制音频，改用 Blob body（见上方 speechToText）。如需切回本地服务且需要
// 这些工具函数，可从 git 历史恢复（stt.ts 切换前的版本）。
