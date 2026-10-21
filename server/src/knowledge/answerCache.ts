/**
 * Small TTL cache for grounded answers.
 *
 * Only used for company-grounded replies to *identical* questions, which are
 * non-personal by construction (the corpus holds company information only).
 * It is invalidated whenever the knowledge base is reloaded and can be disabled
 * with ANSWER_CACHE_TTL_MS=0.
 */
export interface CachedAnswer {
  reply: string;
  sources: string[];
  provider: string;
  model: string;
  isMock: boolean;
}

interface Entry extends CachedAnswer {
  expiresAt: number;
}

export class AnswerCache {
  private readonly entries = new Map<string, Entry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(maxEntries: number, ttlMs: number, now: () => number = Date.now) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = now;
  }

  get enabled(): boolean {
    return this.ttlMs > 0 && this.maxEntries > 0;
  }

  get(key: string): CachedAnswer | null {
    if (!this.enabled) return null;
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return {
      reply: entry.reply,
      sources: entry.sources,
      provider: entry.provider,
      model: entry.model,
      isMock: entry.isMock,
    };
  }

  set(key: string, value: CachedAnswer): void {
    if (!this.enabled) return;
    if (this.entries.size >= this.maxEntries) {
      // Cheap FIFO eviction; Map preserves insertion order.
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    this.entries.set(key, { ...value, expiresAt: this.now() + this.ttlMs });
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}
