import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok } from "@/server/http/respond";
import { listSitesBasic } from "@/server/services/organization/mobileDirectory";

/** "Select Site" screen — Flutter guard app (§7.7 point 2) and any web screen that needs a flat site picker. */
export const GET = withApiMiddleware(
  async (_req, _ctx, { user }) => {
    const sites = await listSitesBasic(user!.companyId);
    return ok(sites);
  },
  { rateLimit: { points: 60, durationSeconds: 60 }, permission: { module: "sites", action: "read" } },
);
