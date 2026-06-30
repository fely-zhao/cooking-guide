import {
  AudioContext,
  AudioBufferSourceNode,
  AudioBuffer,
  AudioManager,
} from 'react-native-audio-api';

export type TTSPlayerEventCallback = () => void;

export interface TTSPlayerInterface {
  play(audioData: Uint8Array): Promise<void>;
  stop(): void;
  readonly isPlaying: boolean;
  onFinished: TTSPlayerEventCallback | null;
}

export class TTSPlayer implements TTSPlayerInterface {
  private readonly ctx: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;
  private playing = false;
  private finishedCallback: TTSPlayerEventCallback | null = null;

  constructor() {
    this.ctx = new AudioContext();
    // Request transient audio focus with ducking so Android knows
    // this app is playing audio.  Without this, concurrent playback
    // from other apps (music, notification sounds) causes stuttering
    // because the audio HAL shares the output buffer.
    // 'gainTransientMayDuck' is the correct semantic for short TTS
    // utterances: other apps' audio lowers while the recipe step plays.
    AudioManager.observeAudioInterruptions('gainTransientMayDuck');
  }

  async play(audioData: Uint8Array): Promise<void> {
    this.stopInternal();

    if (this.ctx.state === 'suspended') {
      console.log('[TTSPlayer] AudioContext was suspended — resuming');
      await this.ctx.resume();
    }

    const arrayBuffer = audioData.buffer.slice(
      audioData.byteOffset,
      audioData.byteOffset + audioData.byteLength,
    );

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.error('[TTSPlayer] decodeAudioData failed:', err);
      throw new Error(
        `TTSPlayer: decodeAudioData failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.ctx.destination);

    this.currentSource = source;
    this.playing = true;

    return new Promise<void>((resolve, _reject) => {
      const cleanup = () => {
        source.onEnded = null;
        if (this.currentSource === source) {
          this.currentSource = null;
          this.playing = false;
        }
      };

      source.onEnded = () => {
        cleanup();
        this.finishedCallback?.();
        resolve();
      };

      source.start(this.ctx.currentTime);

      // If the buffer is extremely short (< 1 sample frame), start may
      // complete synchronously — onEnded still fires in that case.
    });
  }

  stop(): void {
    this.stopInternal();
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  set onFinished(callback: TTSPlayerEventCallback | null) {
    this.finishedCallback = callback;
  }

  get onFinished(): TTSPlayerEventCallback | null {
    return this.finishedCallback;
  }

  /**
   * Close the underlying AudioContext and release native resources.
   * Call this on component unmount.  After calling, the instance must
   * not be used again.
   */
  async close(): Promise<void> {
    this.stopInternal();
    AudioManager.observeAudioInterruptions(null);
    await this.ctx.close();
  }

  // -------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------

  private stopInternal(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped — safe to ignore.
      }
      this.currentSource = null;
    }
    this.playing = false;
  }
}
