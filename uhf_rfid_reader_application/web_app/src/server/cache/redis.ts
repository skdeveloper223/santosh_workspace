// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import Redis from "ioredis";

/**
 * Single shared ioredis connection, reused by the permission cache (§8.2
 * point 1) and rate limiting (§8.3.2 point 3). Lazy-connects so importing
 * this module never throws when Redis isn't reachable yet (e.g. this repo's
 * current dev environment, per plans/my_hole_project_plan.md §8.9) — callers
 * must still handle command failures themselves.
 */
declare global {
  var __airisRedis: Redis | undefined;
}

export const redis: Redis =
  global.__airisRedis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't hang requests retrying a down Redis
  });

if (process.env.NODE_ENV !== "production") {
  global.__airisRedis = redis;
}

redis.on("error", (err) => {
  console.warn("[redis] connection error (falling back to Postgres/memory):", err.message);
});
