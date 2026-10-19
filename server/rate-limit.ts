export interface RateLimitOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(): void;
}

/**
 * In-memory fixed-window limiter. Adequate for a single-instance portfolio
 * deployment; swap for a shared store if the app is scaled horizontally.
 */
export function createRateLimiter({
  windowMs,
  max,
  now = Date.now,
}: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();

  function sweep(currentTime: number) {
    if (buckets.size < 500) return;
    for (const [key, bucket] of buckets) {
      if (currentTime >= bucket.resetAt) buckets.delete(key);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      sweep(currentTime);
      const existing = buckets.get(key);

      if (!existing || currentTime >= existing.resetAt) {
        buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
        return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
      }

      if (existing.count >= max) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, max - existing.count),
        retryAfterSeconds: 0,
      };
    },
    reset() {
      buckets.clear();
    },
  };
}
