import { z } from "zod";
import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { listReaders } from "@/server/services/readers/listReaders";
import { createReader } from "@/server/services/readers/createReader";

export const GET = withApiMiddleware(
  async (_req, _ctx, { user }) => {
    const readers = await listReaders(user!.companyId);
    return ok(readers);
  },
  { rateLimit: { points: 60, durationSeconds: 60 }, permission: { module: "readers", action: "read" } },
);

const createSchema = z.object({
  name: z.string().min(1),
  ipAddress: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  locationType: z.enum(["entryPoint", "exitPoint"]),
  attachTo: z.object({ kind: z.enum(["gate", "checkpoint"]), id: z.string().uuid() }),
});

export const POST = withApiMiddleware(
  async (req) => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Invalid reader payload.", parsed.error.flatten());

    const { id } = await createReader(parsed.data);
    return ok({ id }, 201);
  },
  { rateLimit: { points: 20, durationSeconds: 60 }, permission: { module: "readers", action: "create" } },
);
