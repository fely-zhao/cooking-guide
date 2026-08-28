import { TTSProvider, TTSProviderOptions } from './tts-provider';

/**
 * TTS provider that calls the Azure AI Speech REST API.
 *
 * Endpoint: POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
 *   - Body: SSML with the target voice
 *   - Auth: Ocp-Apim-Subscription-Key header (key stored in MMKV via Settings,
 *           never hardcoded)
 *   - Response: audio stream (riff-24khz-16bit-mono-pcm WAV), directly playable
 *     by the existing TTSPlayer (decodeAudioData).
 *
 * Field mapping:
 *   TTSProviderOptions.voiceId  →  SSML <voice name="...">  (Azure short name,
 *                                  e.g. 'zh-CN-XiaoxiaoNeural')
 *   TTSProviderOptions.rate     →  ignored by Azure (Windows SAPI only)
 */
export class AzureTTSProvider implements TTSProvider {
  private static readonly TIMEOUT_MS = 15_000;

  constructor(
    private readonly subscriptionKey: string,
    private readonly region: string,
  ) {}

  /**
   * Check whether the subscription key is valid by listing available voices.
   * Returns `true` when Azure answers 200.
   */
  async checkHealth(): Promise<boolean> {
    if (!this.subscriptionKey) return false;
    try {
      const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3_000);
      const response = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': this.subscriptionKey },
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response.ok;
    } catch {
      return false;
    }
  }

  async synthesize(text: string, options?: TTSProviderOptions): Promise<Uint8Array> {
    if (!this.subscriptionKey) {
      throw new Error('AzureTTSProvider: 未配置 Azure Speech Key，请在设置页填写');
    }

    const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const voiceName = options?.voiceId || 'zh-CN-XiaoxiaoNeural';
    const ssml =
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">` +
      `<voice name="${escapeXml(voiceName)}">${escapeXml(text)}</voice></speak>`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AzureTTSProvider.TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
          'User-Agent': 'cooking-guide-app',
        },
        body: ssml,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.text();
        if (body) detail += ` — ${body.slice(0, 200)}`;
      } catch {
        // Response body is not readable; keep HTTP status as detail.
      }
      throw new Error(`AzureTTSProvider: ${detail} from ${url}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }
}

/** Escape XML special characters for safe embedding into an SSML document. */
function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
