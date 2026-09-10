// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { redis } from "@/server/cache/redis";
import { publishFanout } from "@/server/realtime/fanout";

export type GateStatus = "available" | "busy";

const statusKey = (gateId: string) => `gate:${gateId}:status`;
/** Safety net — if the "closed" signal is ever missed, the gate un-wedges itself instead of staying busy forever. */
const BUSY_TTL_SECONDS = 15;

export async function getGateStatus(gateId: string): Promise<GateStatus> {
  const value = await redis.get(statusKey(gateId));
  return value === "busy" ? "busy" : "available";
}

/**
 * §7.9 task 3 — atomically flips available -> busy with `SET NX`, so two
 * near-simultaneous authorized detections at the same gate can't both "win"
 * the open. Callers must check `opened` before firing the relay: `false`
 * means the gate was already busy and the relay must NOT be called.
 */
export async function tryOpenGate(gateId: string, siteId?: string): Promise<{ opened: boolean; status: GateStatus }> {
  const result = await redis.set(statusKey(gateId), "busy", "EX", BUSY_TTL_SECONDS, "NX");
  if (result !== "OK") {
    return { opened: false, status: "busy" };
  }
  await broadcastGateStatus(gateId, "busy", siteId);
  return { opened: true, status: "busy" };
}

/** Called on an explicit "gate closed" signal from the relay/reader. */
export async function closeGate(gateId: string, siteId?: string): Promise<void> {
  await redis.del(statusKey(gateId));
  await broadcastGateStatus(gateId, "available", siteId);
}

async function broadcastGateStatus(gateId: string, status: GateStatus, siteId?: string): Promise<void> {
  await publishFanout({
    event: "gate:status",
    targets: [{ scope: "gate", id: gateId }, ...(siteId ? [{ scope: "site" as const, id: siteId }] : [])],
    payload: { gateId, status, at: new Date().toISOString() },
  });
}
