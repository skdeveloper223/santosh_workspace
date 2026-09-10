import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type DashboardStats = {
  tagsDetectedToday: number;
  vehiclesAuthorized: number;
  vehiclesTotal: number;
  unknownEntitiesPending: number;
  recentDetections: { epc: string; readerName: string | null; detectedAt: string }[];
  unknownEntityAlerts: { id: string; entityKind: string; placeholderRef: string | null; createdAt: string }[];
};

/** Company-scoped overview for the Dashboard screen (§8.5). */
export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: tagsDetectedToday },
    { data: vehicles },
    { count: unknownEntitiesPending },
    { data: recentDetections },
    { data: unknownEntityAlerts },
  ] = await Promise.all([
    supabaseAdmin
      .from("tagDetections")
      .select("id", { count: "exact", head: true })
      .gte("detectedAt", startOfToday.toISOString()),
    supabaseAdmin.from("vehicles").select("id").eq("companyId", companyId),
    supabaseAdmin
      .from("unknownEntityEvents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("tagDetections")
      .select("epc, detectedAt, uhfReaders(name)")
      .order("detectedAt", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("unknownEntityEvents")
      .select("id, entityKind, placeholderRef, createdAt")
      .eq("status", "pending")
      .order("createdAt", { ascending: false })
      .limit(3),
  ]);

  const vehicleIds = (vehicles ?? []).map((v) => v.id as string);
  let vehiclesAuthorized = 0;
  if (vehicleIds.length > 0) {
    const { data: authorized } = await supabaseAdmin
      .from("vehicleSiteAuthorizations")
      .select("vehicleId")
      .in("vehicleId", vehicleIds);
    vehiclesAuthorized = new Set((authorized ?? []).map((a) => a.vehicleId)).size;
  }

  return {
    tagsDetectedToday: tagsDetectedToday ?? 0,
    vehiclesAuthorized,
    vehiclesTotal: vehicleIds.length,
    unknownEntitiesPending: unknownEntitiesPending ?? 0,
    recentDetections: (recentDetections ?? []).map((d) => {
      const reader = d.uhfReaders as unknown as { name: string } | { name: string }[] | null;
      return {
        epc: d.epc as string,
        readerName: Array.isArray(reader) ? (reader[0]?.name ?? null) : (reader?.name ?? null),
        detectedAt: d.detectedAt as string,
      };
    }),
    unknownEntityAlerts: (unknownEntityAlerts ?? []) as DashboardStats["unknownEntityAlerts"],
  };
}
