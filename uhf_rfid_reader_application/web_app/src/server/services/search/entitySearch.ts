import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type SearchResult =
  | { kind: "employee"; id: string; label: string; epc: string }
  | { kind: "accessory"; id: string; label: string; epc: string }
  | { kind: "material"; id: string; label: string; epc: string }
  | { kind: "vehicle"; id: string; label: string; plateNumber: string };

export type HistoryEvent = { at: string; detail: string };

/**
 * §7.9 task 5 — search by a human identifier (employee name/code, accessory
 * label, material name, vehicle plate) instead of requiring the raw EPC.
 * Each result carries the key `getEntityHistory` actually needs: `epc` for
 * everything UHF-tagged, `plateNumber` for vehicles (ANPR/plate-identified,
 * not EPC-tagged — §7.6).
 */
export async function searchEntities(companyId: string, query: string, limit = 8): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const like = `%${trimmed}%`;

  const [employeesRes, vehiclesRes, sitesRes, companyUsersRes] = await Promise.all([
    supabaseAdmin
      .from("employees")
      .select("id, name, employeeCode, tagEpc")
      .eq("companyId", companyId)
      .not("tagEpc", "is", null)
      .or(`name.ilike.${like},employeeCode.ilike.${like}`)
      .limit(limit),
    supabaseAdmin.from("vehicles").select("id, plateNumber").eq("companyId", companyId).ilike("plateNumber", like).limit(limit),
    supabaseAdmin.from("sites").select("id").eq("companyId", companyId),
    supabaseAdmin.from("users").select("id").eq("companyId", companyId),
  ]);

  const results: SearchResult[] = [];

  for (const e of employeesRes.data ?? []) {
    if (e.tagEpc) results.push({ kind: "employee", id: e.id, label: `${e.name} (${e.employeeCode})`, epc: e.tagEpc });
  }
  for (const v of vehiclesRes.data ?? []) {
    results.push({ kind: "vehicle", id: v.id, label: v.plateNumber, plateNumber: v.plateNumber });
  }

  const siteIds = (sitesRes.data ?? []).map((s) => s.id as string);
  if (siteIds.length > 0) {
    const { data: warehouses } = await supabaseAdmin.from("warehouses").select("id").in("siteId", siteIds);
    const warehouseIds = (warehouses ?? []).map((w) => w.id as string);
    if (warehouseIds.length > 0) {
      const { data: materials } = await supabaseAdmin
        .from("materials")
        .select("id, name, tagEpc")
        .in("warehouseId", warehouseIds)
        .not("tagEpc", "is", null)
        .ilike("name", like)
        .limit(limit);
      for (const m of materials ?? []) {
        if (m.tagEpc) results.push({ kind: "material", id: m.id, label: m.name, epc: m.tagEpc });
      }
    }
  }

  const userIds = (companyUsersRes.data ?? []).map((u) => u.id as string);
  if (userIds.length > 0) {
    const { data: accessories } = await supabaseAdmin
      .from("accessories")
      .select("id, label, tagEpc")
      .in("userId", userIds)
      .not("tagEpc", "is", null)
      .ilike("label", like)
      .limit(limit);
    for (const a of accessories ?? []) {
      if (a.tagEpc) results.push({ kind: "accessory", id: a.id, label: a.label ?? a.tagEpc, epc: a.tagEpc });
    }
  }

  return results.slice(0, limit);
}

/** Fetches raw detection history behind a search result's key — transparently EPC-based or plate-based. */
export async function getEntityHistory(result: SearchResult, limit = 50): Promise<HistoryEvent[]> {
  if (result.kind === "vehicle") {
    const { data, error } = await supabaseAdmin
      .from("vehicleDetections")
      .select("detectedAt, direction")
      .eq("plateNumber", result.plateNumber)
      .order("detectedAt", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`getEntityHistory: ${error.message}`);
    return (data ?? []).map((d) => ({
      at: d.detectedAt as string,
      detail: d.direction ? `${d.direction === "entryPoint" ? "Arrived" : "Departed"}` : "Detected",
    }));
  }

  const { data, error } = await supabaseAdmin
    .from("tagDetections")
    .select("detectedAt, signal, uhfReaders(name)")
    .eq("epc", result.epc)
    .order("detectedAt", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getEntityHistory: ${error.message}`);

  return (data ?? []).map((d) => {
    const reader = d.uhfReaders as unknown as { name: string } | { name: string }[] | null;
    const readerName = Array.isArray(reader) ? reader[0]?.name : reader?.name;
    const signal = d.signal != null ? ` · ${d.signal}%` : "";
    return { at: d.detectedAt as string, detail: `${readerName ?? "Unknown reader"}${signal}` };
  });
}
