import { z } from "zod";
import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { listVehicles } from "@/server/services/vehicles/listVehicles";
import { createVehicle } from "@/server/services/vehicles/createVehicle";

/** Sample real, permission-guarded route — the shape every future module follows (§8.3.2). */
export const GET = withApiMiddleware(
  async (_req, _ctx, { user }) => {
    const vehicles = await listVehicles(user!.companyId);
    return ok(vehicles);
  },
  {
    rateLimit: { points: 60, durationSeconds: 60 },
    permission: { module: "vehicles", action: "read" },
  },
);

const createSchema = z.object({
  plateNumber: z.string().min(1),
  type: z.enum(["4-wheeler", "2-wheeler", "other"]),
  siteId: z.string().uuid(),
  gateId: z.string().uuid().optional(),
  grantGateAccess: z.boolean(),
  parkingSlot: z.string().optional(),
  uhfTagNo: z.string().optional(),
});

/** Flutter guard app's "Register New Vehicle" (§7.7 point 2). */
export const POST = withApiMiddleware(
  async (req, _ctx, { user }) => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Invalid vehicle payload.", parsed.error.flatten());

    const { id } = await createVehicle({ ...parsed.data, companyId: user!.companyId, createdBy: user!.id });
    return ok({ id }, 201);
  },
  {
    rateLimit: { points: 20, durationSeconds: 60 },
    permission: { module: "vehicles", action: "create" },
  },
);
