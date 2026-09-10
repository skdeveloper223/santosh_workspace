import { z } from "zod";
import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { identifyUnknownEntity } from "@/server/services/unknownEntities/listUnknownEntities";

const patchSchema = z.object({ identifiedAsId: z.string().uuid() });

/** §7.5/§7.7 point 4 — identifying is independent of gate operation; nothing here touches the gate. */
export const PATCH = withApiMiddleware<{ id: string }>(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Invalid payload.", parsed.error.flatten());

    await identifyUnknownEntity(id, parsed.data.identifiedAsId);
    return ok({ id, status: "identified" });
  },
  { rateLimit: { points: 30, durationSeconds: 60 }, permission: { module: "unknownEntities", action: "update" } },
);
