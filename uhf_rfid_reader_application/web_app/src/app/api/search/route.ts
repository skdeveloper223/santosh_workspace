import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { searchEntities } from "@/server/services/search/entitySearch";

/**
 * §7.9 task 5 — signed-in only, not module-permission-gated: it searches
 * across four modules (employees/accessories/materials/vehicles) at once,
 * and per-module read filtering of results is a follow-up refinement, not
 * yet implemented.
 */
export const GET = withApiMiddleware(
  async (req, _ctx, { user }) => {
    if (!user) return fail(401, "Sign in required.");
    const query = req.nextUrl.searchParams.get("q") ?? "";
    const results = await searchEntities(user.companyId, query);
    return ok(results);
  },
  { rateLimit: { points: 60, durationSeconds: 60 } },
);
