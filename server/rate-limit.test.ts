import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows requests up to the limit and blocks the next', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now: () => 1_000 });
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);

    const blocked = limiter.check('ip');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    let now = 0;
    const limiter = createRateLimiter({ windowMs: 1_000, max: 1, now: () => now });
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(false);

    now = 1_001;
    expect(limiter.check('ip').allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now: () => 0 });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
  });

  it('can be reset explicitly', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now: () => 0 });
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(false);
    limiter.reset();
    expect(limiter.check('ip').allowed).toBe(true);
  });
});
