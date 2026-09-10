import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type SiteOption = { id: string; name: string };
export type GateOption = { id: string; name: string; siteId: string };

/** Flat site list for the Flutter guard app's "Select Site" screen (§7.7 point 2). */
export async function listSitesBasic(companyId: string): Promise<SiteOption[]> {
  const { data, error } = await supabaseAdmin.from("sites").select("id, name").eq("companyId", companyId).order("name");
  if (error) throw new Error(`listSitesBasic: ${error.message}`);
  return (data ?? []) as SiteOption[];
}

/** Flat gate list for the "Select Gate" screen — scoped to one site (and this company, via the siteId check). */
export async function listGatesForSite(companyId: string, siteId: string): Promise<GateOption[]> {
  const { data: site } = await supabaseAdmin.from("sites").select("id").eq("id", siteId).eq("companyId", companyId).maybeSingle();
  if (!site) return [];
  const { data, error } = await supabaseAdmin.from("gates").select("id, name, siteId").eq("siteId", siteId).order("name");
  if (error) throw new Error(`listGatesForSite: ${error.message}`);
  return (data ?? []) as GateOption[];
}

/** Looks up a gate's siteId — needed to fan a gate-status change out to its site's room too (§7.9 task 3). */
export async function getGateSiteId(gateId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("gates").select("siteId").eq("id", gateId).maybeSingle();
  return (data?.siteId as string | undefined) ?? null;
}
