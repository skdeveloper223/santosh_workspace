import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";
import { closeGate } from "@/server/services/gates/gateStatus";
import { getGateSiteId } from "@/server/services/organization/mobileDirectory";

export const POST = withApiMiddleware<{ id: string }>(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const siteId = await getGateSiteId(id);
    await closeGate(id, siteId ?? undefined);
    return ok({ gateId: id, status: "available" });
  },
  { rateLimit: { points: 30, durationSeconds: 60 }, permission: { module: "gates", action: "update" } },
);
