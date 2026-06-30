import { TTSProvider, TTSProviderOptions } from './tts-provider';

/**
 * MiniMax Speech-02 Turbo TTS provider.
 *
 * ⚠️  Not yet implemented — placeholder for future use.
 *
 * When ready:
 *   1. Fill in the MiniMax API endpoint and authentication
 *   2. Implement the request format per MiniMax docs
 *   3. Handle MP3 decoding if needed (current player expects WAV)
 *
 * Usage:
 *   const provider = new MiniMaxTTSProvider('Bearer <token>');
 *   const audio = await provider.synthesize('你好');
 */
export class MiniMaxTTSProvider implements TTSProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-useless-constructor -- placeholder
  constructor(private readonly _apiKey: string) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async synthesize(_text: string, _options?: TTSProviderOptions): Promise<Uint8Array> {
    throw new Error('MiniMaxTTSProvider not yet implemented');
  }
}
