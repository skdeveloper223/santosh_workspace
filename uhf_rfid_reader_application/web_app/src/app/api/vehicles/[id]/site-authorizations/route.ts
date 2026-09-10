import { z } from "zod";
import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { setVehicleSiteAuthorization } from "@/server/services/vehicles/vehicleAuthorization";

const patchSchema = z.object({ siteId: z.string().uuid(), authorized: z.boolean() });

export const PATCH = withApiMiddleware<{ id: string }>(
  async (req, ctx, { user }) => {
    const { id: vehicleId } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Invalid payload.", parsed.error.flatten());

    await setVehicleSiteAuthorization(vehicleId, parsed.data.siteId, parsed.data.authorized, user!.id);
    return ok({ saved: true });
  },
  {
    rateLimit: { points: 60, durationSeconds: 60 },
    permission: { module: "vehicles", action: "manageSiteAuth" },
  },
);
