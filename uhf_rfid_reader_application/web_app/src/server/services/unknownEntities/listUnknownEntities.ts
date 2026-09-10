import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type UnknownEntityItem = {
  id: string;
  entityKind: string;
  placeholderRef: string | null;
  status: string;
  assignedGuardName: string | null;
  createdAt: string;
};

/**
 * Identification queue for the Unknown Entities screen (§7.5/§8.5) and the
 * Flutter guard app's notification inbox — `gateId` narrows it to one gate
 * (what the guard app needs); omitted, it's the cross-company admin view.
 */
export async function listUnknownEntities(gateId?: string): Promise<UnknownEntityItem[]> {
  let query = supabaseAdmin
    .from("unknownEntityEvents")
    .select("id, entityKind, placeholderRef, status, createdAt, users(fullName)")
    .order("createdAt", { ascending: false })
    .limit(50);
  if (gateId) query = query.eq("gateId", gateId);

  const { data, error } = await query;
  if (error) throw new Error(`listUnknownEntities: ${error.message}`);

  return (data ?? []).map((row) => {
    const guard = row.users as unknown as { fullName: string } | { fullName: string }[] | null;
    return {
      id: row.id as string,
      entityKind: row.entityKind as string,
      placeholderRef: row.placeholderRef as string | null,
      status: row.status as string,
      assignedGuardName: Array.isArray(guard) ? (guard[0]?.fullName ?? null) : (guard?.fullName ?? null),
      createdAt: row.createdAt as string,
    };
  });
}

/** Marks a placeholder record identified — decoupled from gate operation (§7.7 point 4): the guard can act on the gate regardless of this. */
export async function identifyUnknownEntity(id: string, identifiedAsId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("unknownEntityEvents")
    .update({ status: "identified", identifiedAsId, identifiedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`identifyUnknownEntity: ${error.message}`);
}
