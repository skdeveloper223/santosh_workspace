import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";
import { getGateStatus } from "@/server/services/gates/gateStatus";

export const GET = withApiMiddleware<{ id: string }>(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const status = await getGateStatus(id);
    return ok({ gateId: id, status });
  },
  { rateLimit: { points: 120, durationSeconds: 60 }, permission: { module: "gates", action: "read" } },
);
