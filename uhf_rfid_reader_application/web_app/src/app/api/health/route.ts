import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";

/** Liveness probe — this process is up. No dependency checks (see /api/ready for those). */
export const GET = withApiMiddleware(async () => {
  return ok({ status: "ok", service: "airis-web", time: new Date().toISOString() });
});
