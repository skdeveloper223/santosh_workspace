import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";
import { listUnknownEntities } from "@/server/services/unknownEntities/listUnknownEntities";

/** `?gateId=` scopes to one gate — what the Flutter guard app's notification inbox needs (§7.5/§7.7 point 2). */
export const GET = withApiMiddleware(
  async (req) => {
    const gateId = req.nextUrl.searchParams.get("gateId") ?? undefined;
    const events = await listUnknownEntities(gateId);
    return ok(events);
  },
  { rateLimit: { points: 60, durationSeconds: 60 }, permission: { module: "unknownEntities", action: "read" } },
);
