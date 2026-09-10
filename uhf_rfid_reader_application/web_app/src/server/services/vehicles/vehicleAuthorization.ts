import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

/**
 * Grants or revokes a vehicle's access to an entire site (§7.4). Revoking a
 * site also revokes every gate authorization within it — a gate can never be
 * authorized without its parent site, so there is nothing meaningful left to
 * keep once the site grant is gone.
 */
export async function setVehicleSiteAuthorization(
  vehicleId: string,
  siteId: string,
  authorized: boolean,
  grantedBy: string,
): Promise<void> {
  if (authorized) {
    const { error } = await supabaseAdmin
      .from("vehicleSiteAuthorizations")
      .upsert({ vehicleId, siteId, grantedBy }, { onConflict: "vehicleId,siteId" });
    if (error) throw new Error(`setVehicleSiteAuthorization: ${error.message}`);
    return;
  }

  const { data: gates } = await supabaseAdmin.from("gates").select("id").eq("siteId", siteId);
  const gateIds = (gates ?? []).map((g) => g.id as string);
  if (gateIds.length > 0) {
    await supabaseAdmin.from("vehicleGateAuthorizations").delete().eq("vehicleId", vehicleId).in("gateId", gateIds);
  }
  const { error } = await supabaseAdmin
    .from("vehicleSiteAuthorizations")
    .delete()
    .eq("vehicleId", vehicleId)
    .eq("siteId", siteId);
  if (error) throw new Error(`setVehicleSiteAuthorization: ${error.message}`);
}

/**
 * Grants or revokes a vehicle's access to one gate. Granting is rejected —
 * server-side, not just a disabled UI control — unless the gate's site is
 * already authorized for this vehicle (§7.4: owning a vehicle, or even
 * having site access, never implies gate access is automatic, but a gate
 * grant with no site grant underneath it would be meaningless and unreachable).
 */
export async function setVehicleGateAuthorization(
  vehicleId: string,
  gateId: string,
  authorized: boolean,
  grantedBy: string,
): Promise<void> {
  if (!authorized) {
    const { error } = await supabaseAdmin
      .from("vehicleGateAuthorizations")
      .delete()
      .eq("vehicleId", vehicleId)
      .eq("gateId", gateId);
    if (error) throw new Error(`setVehicleGateAuthorization: ${error.message}`);
    return;
  }

  const { data: gate, error: gateErr } = await supabaseAdmin.from("gates").select("siteId").eq("id", gateId).single();
  if (gateErr || !gate) throw new Error("setVehicleGateAuthorization: unknown gate");

  const { data: siteAuth } = await supabaseAdmin
    .from("vehicleSiteAuthorizations")
    .select("siteId")
    .eq("vehicleId", vehicleId)
    .eq("siteId", gate.siteId)
    .maybeSingle();
  if (!siteAuth) {
    throw new Error("setVehicleGateAuthorization: authorize the site before authorizing one of its gates");
  }

  const { error } = await supabaseAdmin
    .from("vehicleGateAuthorizations")
    .upsert({ vehicleId, gateId, grantedBy }, { onConflict: "vehicleId,gateId" });
  if (error) throw new Error(`setVehicleGateAuthorization: ${error.message}`);
}
