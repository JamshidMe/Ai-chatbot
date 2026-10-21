/**
 * Minimal in-memory rate limiter (fixed window per key).
 *
 * Deliberately dependency-free and erasable-syntax only. Note the operational
 * limits, which are documented rather than hidden:
 *   - state is per-process, so it does not coordinate across instances;
 *   - restarting the process clears counters;
 *   - use a shared store (Redis) if you run more than one replica.
 */
export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets (>= 1 when blocked). */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 20_000;

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  consume(key: string, rule: RateLimitRule): RateLimitResult {
    const currentTime = this.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= currentTime) {
      if (this.buckets.size >= MAX_TRACKED_KEYS) this.pruneExpired(currentTime);
      if (this.buckets.size >= MAX_TRACKED_KEYS) {
        // Still full of live buckets: drop the oldest to bound memory.
        const oldest = this.buckets.keys().next();
        if (!oldest.done) this.buckets.delete(oldest.value);
      }
      this.buckets.set(key, { count: 1, resetAt: currentTime + rule.windowMs });
      return {
        allowed: true,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - 1),
        retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
      };
    }

    existing.count += 1;
    const remaining = Math.max(0, rule.limit - existing.count);
    const allowed = existing.count <= rule.limit;

    return {
      allowed,
      limit: rule.limit,
      remaining,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
    };
  }

  pruneExpired(currentTime: number = this.now()): number {
    let removed = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= currentTime) {
        this.buckets.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  get size(): number {
    return this.buckets.size;
  }

  reset(): void {
    this.buckets.clear();
  }
}
