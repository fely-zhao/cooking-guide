import { TTSProvider, TTSProviderOptions } from './tts-provider';

/**
 * TTS provider that calls the local Windows SAPI TTS server.
 *
 * Server: tts-server/local-tts-server.js (Express + PowerShell SAPI)
 *   POST /tts  { text, voice?, rate? }  →  audio/wav stream
 *
 * Field mapping:
 *   TTSProviderOptions.voiceId  →  body.voice  (VOICE_MAP key, e.g. 'zh-cn-female-xiaoxiao')
 *   TTSProviderOptions.rate     →  body.rate   (SAPI speech rate, -10 to 10)
 */
export class LocalTTSProvider implements TTSProvider {
  constructor(private readonly baseUrl: string) {}

  private static readonly TIMEOUT_MS = 15_000;

  /**
   * Check whether the TTS server is reachable and healthy.
   * Returns `true` if the server responds with `{ code: 0 }` at GET /health.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/health`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3_000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return false;
      const body = await response.json();
      return body && body.code === 0;
    } catch {
      return false;
    }
  }

  async synthesize(text: string, options?: TTSProviderOptions): Promise<Uint8Array> {
    const url = `${this.baseUrl}/tts`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LocalTTSProvider.TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: options?.voiceId,
          rate: options?.rate,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body && body.message) detail += ` — ${body.message}`;
      } catch {
        // Response body is not JSON; keep HTTP status as detail.
      }
      throw new Error(`LocalTTSProvider: ${detail} from ${url}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }
}
