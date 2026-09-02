import {
  AudioContext,
  AudioBufferSourceNode,
  AudioBuffer,
  AudioManager,
  GainNode,
} from 'react-native-audio-api';

export type TTSPlayerEventCallback = () => void;

export interface TTSPlayerInterface {
  play(audioData: Uint8Array, options?: { boost?: number }): Promise<void>;
  stop(): void;
  /** 用户档位增益（1 = 原始音量）；提醒 boost 由 play() 临时叠加 */
  setVolume(gain: number): void;
  readonly isPlaying: boolean;
  onFinished: TTSPlayerEventCallback | null;
}

export class TTSPlayer implements TTSPlayerInterface {
  private readonly ctx: AudioContext;
  private readonly gainNode: GainNode;
  private currentSource: AudioBufferSourceNode | null = null;
  private playing = false;
  private finishedCallback: TTSPlayerEventCallback | null = null;
  /** 用户档位增益，两级增益中的一级（另一级是提醒 boost） */
  private userVolume = 1;

  constructor() {
    this.ctx = new AudioContext();
    // Playback chain: source → GainNode → destination. The GainNode carries
    // the user volume level only; boost (reminders) is applied per-sample
    // with tanh soft limiting in applySoftLimit() to avoid hard clipping.
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.userVolume;
    this.gainNode.connect(this.ctx.destination);
    // Request transient audio focus with ducking so Android knows
    // this app is playing audio.  Without this, concurrent playback
    // from other apps (music, notification sounds) causes stuttering
    // because the audio HAL shares the output buffer.
    // 'gainTransientMayDuck' is the correct semantic for short TTS
    // utterances: other apps' audio lowers while the recipe step plays.
    AudioManager.observeAudioInterruptions('gainTransientMayDuck');
  }

  async play(audioData: Uint8Array, options?: { boost?: number }): Promise<void> {
    this.stopInternal();

    // GainNode carries only the user level; boost is applied per-sample
    // with soft limiting below (linear gain on near-full-scale TTS audio
    // hard-clips and produces audible buzzing).
    this.gainNode.gain.value = this.userVolume;

    if (this.ctx.state === 'suspended') {
      console.log('[TTSPlayer] AudioContext was suspended — resuming');
      await this.ctx.resume();
      console.log(`[TTSPlayer] state after resume: ${this.ctx.state}`);
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

    const boost = options?.boost ?? 1;
    if (boost > 1) {
      this.applySoftLimit(audioBuffer, boost);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

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

  setVolume(gain: number): void {
    this.userVolume = gain;
    this.gainNode.gain.value = gain;
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

  /**
   * Boost with soft limiting, applied per-sample via copyFrom/ToChannel.
   * tanh is C∞-smooth: peaks asymptotically approach full scale instead of
   * hard-clipping into flat tops (which is what produces buzzing). Only
   * called for boosted playback (reminders); normal announcements skip it.
   */
  private applySoftLimit(audioBuffer: AudioBuffer, boost: number): void {
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const samples = new Float32Array(audioBuffer.length);
      audioBuffer.copyFromChannel(samples, ch);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.tanh(samples[i] * boost);
      }
      audioBuffer.copyToChannel(samples, ch);
    }
  }

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
    this.gainNode.gain.value = this.userVolume;
  }
}
