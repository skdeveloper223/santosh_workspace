import "server-only";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "@/server/cache/redis";

export type RateLimitOptions = { points: number; durationSeconds: number };

const limitersByConfig = new Map<string, RateLimiterRedis>();

function getLimiter(opts: RateLimitOptions): RateLimiterRedis {
  const key = `${opts.points}:${opts.durationSeconds}`;
  let limiter = limitersByConfig.get(key);
  if (!limiter) {
    limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${key}`,
      points: opts.points,
      duration: opts.durationSeconds,
    });
    limitersByConfig.set(key, limiter);
  }
  return limiter;
}

/**
 * §8.3.2 point 3 — Redis-backed sliding window, per-userId when authenticated
 * else per-IP. Fails OPEN (logs and allows the request through) if Redis is
 * unreachable, rather than taking the whole API down over a cache outage —
 * this repo's current dev environment has no Redis running yet (§8.9).
 */
export async function checkRateLimit(
  identifier: string,
  opts: RateLimitOptions,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  try {
    await getLimiter(opts).consume(identifier);
    return { allowed: true };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return { allowed: false, retryAfterSeconds: Math.ceil(err.msBeforeNext / 1000) };
    }
    console.warn("[rateLimit] backend unavailable, failing open:", err);
    return { allowed: true };
  }
}
