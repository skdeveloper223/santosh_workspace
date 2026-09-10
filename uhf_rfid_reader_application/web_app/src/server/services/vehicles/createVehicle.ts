import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type CreateVehicleInput = {
  companyId: string;
  plateNumber: string;
  type: "4-wheeler" | "2-wheeler" | "other";
  createdBy: string;
  siteId: string;
  gateId?: string;
  grantGateAccess: boolean;
  parkingSlot?: string;
  uhfTagNo?: string;
};

/**
 * Guard-app "Register New Vehicle" (§7.7 point 2). Registration happens at
 * company level (§7.4) — the site/gate here only control whether this guard's
 * "Gate Access Allowed" toggle immediately authorizes THIS site (+ this gate,
 * if one is selected), never blanket access everywhere.
 */
export async function createVehicle(input: CreateVehicleInput): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from("vehicles")
    .upsert(
      {
        companyId: input.companyId,
        plateNumber: input.plateNumber,
        type: input.type,
        driverInfo: { parkingSlot: input.parkingSlot ?? null, uhfTagNo: input.uhfTagNo ?? null },
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      },
      { onConflict: "companyId,plateNumber" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`createVehicle: ${error.message}`);
  const vehicleId = data.id as string;

  if (input.grantGateAccess) {
    await supabaseAdmin
      .from("vehicleSiteAuthorizations")
      .upsert({ vehicleId, siteId: input.siteId, grantedBy: input.createdBy }, { onConflict: "vehicleId,siteId" });
    if (input.gateId) {
      await supabaseAdmin
        .from("vehicleGateAuthorizations")
        .upsert({ vehicleId, gateId: input.gateId, grantedBy: input.createdBy }, { onConflict: "vehicleId,gateId" });
    }
  }

  return { id: vehicleId };
}
