import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type VehicleListItem = {
  id: string;
  plateNumber: string;
  type: string;
  ownerName: string | null;
  authorizedSiteCount: number;
  authorizedGateCount: number;
};

/** Company-scoped vehicle registry for the Vehicles screen (§7.4/§8.5). */
export async function listVehicles(companyId: string): Promise<VehicleListItem[]> {
  // "vehicles" has three FKs into "users" (ownerUserId, createdBy, updatedBy) —
  // PostgREST can't guess which one "users(...)" means, so the embed must
  // name the column explicitly (!ownerUserId).
  const { data: vehicles, error } = await supabaseAdmin
    .from("vehicles")
    .select("id, plateNumber, type, users!ownerUserId(fullName)")
    .eq("companyId", companyId)
    .order("plateNumber");
  if (error) throw new Error(`listVehicles: ${error.message}`);
  if (!vehicles || vehicles.length === 0) return [];

  const vehicleIds = vehicles.map((v) => v.id as string);
  const [{ data: siteAuths }, { data: gateAuths }] = await Promise.all([
    supabaseAdmin.from("vehicleSiteAuthorizations").select("vehicleId").in("vehicleId", vehicleIds),
    supabaseAdmin.from("vehicleGateAuthorizations").select("vehicleId").in("vehicleId", vehicleIds),
  ]);

  const siteCountByVehicle = countBy(siteAuths ?? [], "vehicleId");
  const gateCountByVehicle = countBy(gateAuths ?? [], "vehicleId");

  return vehicles.map((v) => {
    const owner = v.users as unknown as { fullName: string } | { fullName: string }[] | null;
    return {
      id: v.id as string,
      plateNumber: v.plateNumber as string,
      type: v.type as string,
      ownerName: Array.isArray(owner) ? (owner[0]?.fullName ?? null) : (owner?.fullName ?? null),
      authorizedSiteCount: siteCountByVehicle.get(v.id as string) ?? 0,
      authorizedGateCount: gateCountByVehicle.get(v.id as string) ?? 0,
    };
  });
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Map<unknown, number> {
  const map = new Map<unknown, number>();
  for (const row of rows) map.set(row[key], (map.get(row[key]) ?? 0) + 1);
  return map;
}
