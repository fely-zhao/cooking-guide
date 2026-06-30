import { TTSService } from './tts';

const DEFAULT_MAX_ENTRIES = 10;

/**
 * In-memory LRU cache for pre-fetched TTS audio buffers.
 *
 * Pre-caches the next step's audio while the current step is being
 * announced or awaited, eliminating network latency from step transitions.
 */
export class TTSCache {
  private readonly ttsService: TTSService;
  private readonly maxEntries: number;
  private readonly cache: Map<string, Uint8Array>;

  constructor(ttsService: TTSService, maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.ttsService = ttsService;
    this.maxEntries = maxEntries;
    this.cache = new Map();
  }

  /**
   * Fire-and-forget TTS pre-cache. Returns immediately.
   *
   * Fetches audio for `text` in the background and stores the result
   * in memory. If `text` is already cached, this is a no-op.
   * Errors are silently swallowed — pre-cache failures are non-critical.
   */
  async preCache(text: string, voiceId?: string): Promise<void> {
    if (!text.trim()) return;
    if (this.cache.has(text)) return;

    try {
      const audioData = await this.ttsService.textToSpeech(text, voiceId ? { voiceId } : undefined);
      this.set(text, audioData);
    } catch {
      // Pre-cache failures are non-critical; silently ignore.
    }
  }

  /**
   * Retrieve a cached TTS result.
   *
   * Returns `null` if `text` is not in the cache. Each access promotes
   * the entry to MRU (most recently used) for LRU eviction ordering.
   */
  getCached(text: string): Uint8Array | null {
    const entry = this.cache.get(text);
    if (entry === undefined) {
      return null;
    }
    // Re-insert to mark as most-recently-used (Map insertion order)
    this.cache.delete(text);
    this.cache.set(text, entry);
    return entry;
  }

  /**
   * Clear all cached entries and free memory.
   */
  clear(): void {
    this.cache.clear();
  }

  /** Number of entries currently in the cache. */
  get size(): number {
    return this.cache.size;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private set(text: string, data: Uint8Array): void {
    // Evict the oldest (LRU) entry when at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(text, data);
  }
}
