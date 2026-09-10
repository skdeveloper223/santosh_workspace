import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { getEntityHistory, type SearchResult } from "@/server/services/search/entitySearch";

export const GET = withApiMiddleware(
  async (req, _ctx, { user }) => {
    if (!user) return fail(401, "Sign in required.");
    const params = req.nextUrl.searchParams;
    const kind = params.get("kind") as SearchResult["kind"] | null;
    const epc = params.get("epc");
    const plateNumber = params.get("plateNumber");

    let result: SearchResult;
    if (kind === "vehicle" && plateNumber) {
      result = { kind: "vehicle", id: "", label: plateNumber, plateNumber };
    } else if ((kind === "employee" || kind === "accessory" || kind === "material") && epc) {
      result = { kind, id: "", label: epc, epc };
    } else {
      return fail(400, "Provide kind + (epc or plateNumber).");
    }

    const history = await getEntityHistory(result);
    return ok(history);
  },
  { rateLimit: { points: 60, durationSeconds: 60 } },
);
