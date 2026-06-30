import { TTSProvider, TTSProviderOptions } from './tts-provider';

/**
 * TTS-specific error wrapper.
 */
export class TTSError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'TTSError';
    this.cause = cause;
  }
}

/**
 * Options for TTS synthesis requests.
 */
export interface TTSOptions {
  voiceId?: string;
  /** Speech rate (-10 to 10). Supported by LocalTTSProvider (Windows SAPI). */
  rate?: number;
}

/** Size of each streaming chunk in bytes. */
const STREAM_CHUNK_SIZE = 4096;

/** Delay between simulated streaming chunks in milliseconds. */
const STREAM_CHUNK_DELAY_MS = 50;

/**
 * Text-to-Speech service wrapping a TTSProvider.
 *
 * Provides both a direct full-buffer API and a simulated streaming
 * async generator for progressive audio playback.
 *
 * To switch TTS backends, pass a different TTSProvider implementation:
 *   new TTSService(new LocalTTSProvider('http://...'))
 *   new TTSService(new MiniMaxTTSProvider('Bearer ...'))
 *   new TTSService(new MockTTSProvider())
 */
export class TTSService {
  private readonly provider: TTSProvider;

  constructor(provider: TTSProvider) {
    this.provider = provider;
  }

  /**
   * Synthesise the full audio buffer for `text` and return it as a single
   * `Uint8Array`.  Suitable for short utterances where latency is acceptable.
   */
  async textToSpeech(text: string, options?: TTSOptions): Promise<Uint8Array> {
    const providerOptions: TTSProviderOptions = {
      voiceId: options?.voiceId,
      rate: options?.rate,
    };

    try {
      return await this.provider.synthesize(text, providerOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown TTS error';
      throw new TTSError(message, error);
    }
  }

  /**
   * Synthesise speech and yield progressive 4 KiB chunks to enable
   * streaming playback.
   *
   * **Current behaviour** — the provider always returns the full audio
   * buffer.  This generator chunks that buffer into 4 KiB pieces and
   * yields them with a 50 ms delay between each chunk to simulate a
   * streaming response.  Once a provider supports true chunked transfer
   * this method can be updated to yield real chunks as they arrive.
   */
  async *textToSpeechStream(
    text: string,
    options?: TTSOptions,
  ): AsyncGenerator<Uint8Array, void, unknown> {
    let buffer: Uint8Array;
    try {
      buffer = await this.provider.synthesize(text, {
        voiceId: options?.voiceId,
        rate: options?.rate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown TTS error';
      throw new TTSError(message, error);
    }

    for (let offset = 0; offset < buffer.length; offset += STREAM_CHUNK_SIZE) {
      yield buffer.subarray(offset, offset + STREAM_CHUNK_SIZE);

      if (offset + STREAM_CHUNK_SIZE < buffer.length) {
        await this.delay(STREAM_CHUNK_DELAY_MS);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
