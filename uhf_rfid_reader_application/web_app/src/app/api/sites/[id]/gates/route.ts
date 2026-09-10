import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";
import { listGatesForSite } from "@/server/services/organization/mobileDirectory";

/** "Select Gate" screen — Flutter guard app (§7.7 point 2). */
export const GET = withApiMiddleware<{ id: string }>(
  async (_req, ctx, { user }) => {
    const { id } = await ctx.params;
    const gates = await listGatesForSite(user!.companyId, id);
    return ok(gates);
  },
  { rateLimit: { points: 60, durationSeconds: 60 }, permission: { module: "gates", action: "read" } },
);
