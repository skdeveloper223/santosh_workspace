import { z } from "zod";
import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { setVehicleGateAuthorization } from "@/server/services/vehicles/vehicleAuthorization";

const patchSchema = z.object({ gateId: z.string().uuid(), authorized: z.boolean() });

export const PATCH = withApiMiddleware<{ id: string }>(
  async (req, ctx, { user }) => {
    const { id: vehicleId } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Invalid payload.", parsed.error.flatten());

    try {
      await setVehicleGateAuthorization(vehicleId, parsed.data.gateId, parsed.data.authorized, user!.id);
    } catch (err) {
      return fail(409, err instanceof Error ? err.message : "Could not update gate authorization.");
    }
    return ok({ saved: true });
  },
  {
    rateLimit: { points: 60, durationSeconds: 60 },
    permission: { module: "vehicles", action: "manageGateAuth" },
  },
);
