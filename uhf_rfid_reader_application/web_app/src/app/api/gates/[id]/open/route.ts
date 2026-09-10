import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";
import { tryOpenGate } from "@/server/services/gates/gateStatus";
import { getGateSiteId } from "@/server/services/organization/mobileDirectory";

/**
 * Guard app "Open Gate" button (§7.9 task 3). Deliberately does NOT accept a
 * "force" option — if the gate is already busy, `opened: false` comes back
 * and the relay is never called, same as an automated authorized detection.
 */
export const POST = withApiMiddleware<{ id: string }>(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const siteId = await getGateSiteId(id);
    const result = await tryOpenGate(id, siteId ?? undefined);
    return ok(result);
  },
  { rateLimit: { points: 30, durationSeconds: 60 }, permission: { module: "gates", action: "update" } },
);
