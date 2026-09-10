import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type ReaderItem = {
  id: string;
  name: string;
  ipAddress: string | null;
  port: number | null;
  locationType: string;
  locationName: string;
  isActive: boolean;
  lastSeenAt: string | null;
};

export type AttachmentOption = {
  siteId: string;
  siteName: string;
  gates: { id: string; name: string }[];
  checkpoints: { id: string; name: string }[];
};

/** Reader Configuration screen data — one row per uhfReaders row across the company's gates/checkpoints. */
export async function listReaders(companyId: string): Promise<ReaderItem[]> {
  const { attachmentOptions } = await getAttachmentOptions(companyId);
  const gateNameById = new Map(attachmentOptions.flatMap((s) => s.gates.map((g) => [g.id, g.name] as const)));
  const checkpointNameById = new Map(
    attachmentOptions.flatMap((s) => s.checkpoints.map((c) => [c.id, c.name] as const)),
  );
  const gateIds = [...gateNameById.keys()];
  const checkpointIds = [...checkpointNameById.keys()];
  if (gateIds.length === 0 && checkpointIds.length === 0) return [];

  const orFilter = [
    gateIds.length > 0 ? `gateId.in.(${gateIds.join(",")})` : null,
    checkpointIds.length > 0 ? `checkpointId.in.(${checkpointIds.join(",")})` : null,
  ]
    .filter(Boolean)
    .join(",");

  const { data, error } = await supabaseAdmin
    .from("uhfReaders")
    .select("id, name, ipAddress, port, locationType, isActive, lastSeenAt, gateId, checkpointId")
    .or(orFilter)
    .order("name");
  if (error) throw new Error(`listReaders: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    ipAddress: row.ipAddress as string | null,
    port: row.port as number | null,
    locationType: row.locationType as string,
    locationName: row.gateId ? (gateNameById.get(row.gateId as string) ?? "—") : (checkpointNameById.get(row.checkpointId as string) ?? "—"),
    isActive: row.isActive as boolean,
    lastSeenAt: row.lastSeenAt as string | null,
  }));
}

/** Site → {gates, checkpoints} options for the Add Reader form's location picker. */
export async function getAttachmentOptions(companyId: string): Promise<{ attachmentOptions: AttachmentOption[] }> {
  const { data: sites, error } = await supabaseAdmin
    .from("sites")
    .select("id, name, gates(id, name), securityCheckpoints(id, name)")
    .eq("companyId", companyId)
    .order("name");
  if (error) throw new Error(`getAttachmentOptions: ${error.message}`);

  return {
    attachmentOptions: (sites ?? []).map((site) => ({
      siteId: site.id as string,
      siteName: site.name as string,
      gates: (site.gates as { id: string; name: string }[]) ?? [],
      checkpoints: (site.securityCheckpoints as { id: string; name: string }[]) ?? [],
    })),
  };
}
