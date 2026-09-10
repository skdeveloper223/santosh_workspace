import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { redis } from "@/server/cache/redis";

/** Readiness probe — this process can actually serve traffic (its dependencies respond). */
export const GET = withApiMiddleware(async () => {
  const checks: Record<string, "ok" | "down"> = { database: "down", redis: "down" };

  try {
    const { error } = await supabaseAdmin.from("companies").select("id").limit(1);
    checks.database = error ? "down" : "ok";
  } catch {
    checks.database = "down";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "down"; // non-fatal — withApiMiddleware's rate limiter fails open when this is down
  }

  const allCriticalUp = checks.database === "ok";
  return allCriticalUp ? ok({ status: "ready", checks }) : fail(503, "Not ready", checks);
});
