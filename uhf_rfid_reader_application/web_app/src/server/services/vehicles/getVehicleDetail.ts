import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type VehicleGateAuth = { gateId: string; name: string; authorized: boolean };
export type VehicleSiteAuth = { siteId: string; name: string; authorized: boolean; gates: VehicleGateAuth[] };

export type VehicleDetail = {
  id: string;
  plateNumber: string;
  type: string;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
  sites: VehicleSiteAuth[];
};

/** Full site/gate authorization state for the Vehicles detail screen (§7.4). */
export async function getVehicleDetail(companyId: string, vehicleId: string): Promise<VehicleDetail | null> {
  // "vehicles" has three FKs into "users" (ownerUserId, createdBy, updatedBy) —
  // the embed must name the column explicitly (!ownerUserId) or PostgREST
  // can't tell which relationship "users(...)" is supposed to mean.
  const { data: vehicle, error } = await supabaseAdmin
    .from("vehicles")
    .select("id, plateNumber, type, createdAt, updatedAt, users!ownerUserId(fullName)")
    .eq("companyId", companyId)
    .eq("id", vehicleId)
    .maybeSingle();
  if (error) throw new Error(`getVehicleDetail: ${error.message}`);
  if (!vehicle) return null;

  const [{ data: sites }, { data: siteAuths }, { data: gateAuths }] = await Promise.all([
    supabaseAdmin.from("sites").select("id, name, gates(id, name)").eq("companyId", companyId).order("name"),
    supabaseAdmin.from("vehicleSiteAuthorizations").select("siteId").eq("vehicleId", vehicleId),
    supabaseAdmin.from("vehicleGateAuthorizations").select("gateId").eq("vehicleId", vehicleId),
  ]);

  const authorizedSiteIds = new Set((siteAuths ?? []).map((s) => s.siteId as string));
  const authorizedGateIds = new Set((gateAuths ?? []).map((g) => g.gateId as string));

  const owner = vehicle.users as unknown as { fullName: string } | { fullName: string }[] | null;

  return {
    id: vehicle.id as string,
    plateNumber: vehicle.plateNumber as string,
    type: vehicle.type as string,
    ownerName: Array.isArray(owner) ? (owner[0]?.fullName ?? null) : (owner?.fullName ?? null),
    createdAt: vehicle.createdAt as string,
    updatedAt: vehicle.updatedAt as string,
    sites: (sites ?? []).map((site) => ({
      siteId: site.id as string,
      name: site.name as string,
      authorized: authorizedSiteIds.has(site.id as string),
      gates: ((site.gates as { id: string; name: string }[]) ?? []).map((gate) => ({
        gateId: gate.id,
        name: gate.name,
        authorized: authorizedGateIds.has(gate.id),
      })),
    })),
  };
}
