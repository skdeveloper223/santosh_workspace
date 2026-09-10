import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type SiteSummary = {
  id: string;
  name: string;
  gateCount: number;
  warehouseCount: number;
  checkpointCount: number;
};

/** Company → Sites overview for the Organization screen (§7.3/§8.5). */
export async function listSites(companyId: string): Promise<SiteSummary[]> {
  const { data: sites, error } = await supabaseAdmin
    .from("sites")
    .select("id, name")
    .eq("companyId", companyId)
    .order("name");
  if (error) throw new Error(`listSites: ${error.message}`);
  if (!sites || sites.length === 0) return [];

  const siteIds = sites.map((s) => s.id as string);
  const [{ data: gates }, { data: warehouses }, { data: checkpoints }] = await Promise.all([
    supabaseAdmin.from("gates").select("siteId").in("siteId", siteIds),
    supabaseAdmin.from("warehouses").select("siteId").in("siteId", siteIds),
    supabaseAdmin.from("securityCheckpoints").select("siteId").in("siteId", siteIds),
  ]);

  const countBySite = (rows: { siteId: string }[] | null) => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) map.set(r.siteId, (map.get(r.siteId) ?? 0) + 1);
    return map;
  };
  const gateCounts = countBySite(gates);
  const warehouseCounts = countBySite(warehouses);
  const checkpointCounts = countBySite(checkpoints);

  return sites.map((s) => ({
    id: s.id as string,
    name: s.name as string,
    gateCount: gateCounts.get(s.id as string) ?? 0,
    warehouseCount: warehouseCounts.get(s.id as string) ?? 0,
    checkpointCount: checkpointCounts.get(s.id as string) ?? 0,
  }));
}
