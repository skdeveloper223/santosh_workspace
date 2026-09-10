import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type VehicleVisit = {
  id: string;
  siteName: string;
  gateName: string | null;
  arrivalAt: string;
  dispatchAt: string | null;
  status: "onSite" | "departed";
  durationMinutes: number | null;
};

/** §7.9 task 4 — arrival/dispatch pairs with dwell time, for the Vehicles detail screen. */
export async function listVehicleVisits(vehicleId: string, limit = 20): Promise<VehicleVisit[]> {
  const { data, error } = await supabaseAdmin
    .from("vehicleVisits")
    .select("id, arrivalAt, dispatchAt, status, sites(name), gates(name)")
    .eq("vehicleId", vehicleId)
    .order("arrivalAt", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listVehicleVisits: ${error.message}`);

  return (data ?? []).map((row) => {
    const site = row.sites as unknown as { name: string } | { name: string }[] | null;
    const gate = row.gates as unknown as { name: string } | { name: string }[] | null;
    const arrivalAt = row.arrivalAt as string;
    const dispatchAt = row.dispatchAt as string | null;
    return {
      id: row.id as string,
      siteName: Array.isArray(site) ? (site[0]?.name ?? "—") : (site?.name ?? "—"),
      gateName: Array.isArray(gate) ? (gate[0]?.name ?? null) : (gate?.name ?? null),
      arrivalAt,
      dispatchAt,
      status: row.status as "onSite" | "departed",
      durationMinutes: dispatchAt
        ? Math.round((new Date(dispatchAt).getTime() - new Date(arrivalAt).getTime()) / 60000)
        : null,
    };
  });
}
