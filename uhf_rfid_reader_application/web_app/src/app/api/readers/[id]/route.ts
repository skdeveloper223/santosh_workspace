import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";
import { deleteReader } from "@/server/services/readers/createReader";

export const DELETE = withApiMiddleware<{ id: string }>(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    await deleteReader(id);
    return ok({ deleted: true });
  },
  { rateLimit: { points: 20, durationSeconds: 60 }, permission: { module: "readers", action: "delete" } },
);
