// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { redis } from "@/server/cache/redis";
import type { FanoutMessage } from "./types";

const FANOUT_CHANNEL = "airis:realtime:fanout";

/** Called by hardware-engine/workers (tag & vehicle events) and gate-status changes — anything the Realtime Gateway should relay to browsers/Flutter. */
export async function publishFanout(message: FanoutMessage): Promise<void> {
  await redis.publish(FANOUT_CHANNEL, JSON.stringify(message));
}

/**
 * Subscribes to the fanout channel and invokes `onMessage` for each one.
 * ioredis requires a dedicated connection for subscriber mode — the shared
 * `redis` client stays free for normal commands (cache, rate limiting).
 * Returns an unsubscribe function.
 */
export function subscribeFanout(onMessage: (message: FanoutMessage) => void): () => void {
  const subscriber = redis.duplicate();

  subscriber.subscribe(FANOUT_CHANNEL).catch((err) => {
    console.error("[realtime] failed to subscribe to fanout channel:", err);
  });

  subscriber.on("message", (_channel, raw) => {
    try {
      onMessage(JSON.parse(raw) as FanoutMessage);
    } catch (err) {
      console.error("[realtime] malformed fanout message, dropped:", err);
    }
  });

  return () => {
    subscriber.disconnect();
  };
}
