/**
 * TTS provider interface — pluggable backend for speech synthesis.
 *
 * Implement this interface to add support for different TTS engines:
 *   class MiniMaxTTSProvider implements TTSProvider { ... }
 *   class AzureTTSProvider implements TTSProvider { ... }
 *
 * The active provider is selected at service construction time in
 * `useCookingMachine.ts` (or a central config).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TTSProviderOptions {
  voiceId?: string;
  /** Speech rate (-10 to 10). Supported by LocalTTSProvider (Windows SAPI). */
  rate?: number;
}

export interface TTSProvider {
  /** Synthesise text to audio data (WAV/PCM via Uint8Array). */
  synthesize(text: string, options?: TTSProviderOptions): Promise<Uint8Array>;
}

// ---------------------------------------------------------------------------
// Mock provider — silent WAV for development / testing
// ---------------------------------------------------------------------------

export class MockTTSProvider implements TTSProvider {
  async synthesize(_text: string, _options?: TTSProviderOptions): Promise<Uint8Array> {
    await delay(200);
    const sampleRate = 44100;
    const durationSec = 0.5;
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataSize = numSamples * 2;
    return createWav(dataSize, sampleRate);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build a valid WAV in an Uint8Array from silent PCM data.
 * 44.1 kHz, 16-bit, mono — matches MiniMax TTS output so the player
 * (decodeAudioData) handles both mock and real API without special-casing.
 */
function createWav(dataSize: number, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF chunk descriptor
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');

  // fmt sub-chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM data starts at offset 44, already zeroed (silence)
  return new Uint8Array(buffer);
}
