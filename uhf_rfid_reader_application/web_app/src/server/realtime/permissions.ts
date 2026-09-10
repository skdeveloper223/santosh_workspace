// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { getPermissionGrants } from "@/server/permissions/getPermissions";
import type { RealtimeScope } from "./types";

/**
 * A room's id isn't always itself a permission scopeId — a reader/camera
 * room resolves up to the gate (or checkpoint's site) it belongs to, since
 * `permissions.scopeType` only knows about 'company' | 'site' | 'gate' |
 * 'warehouse' (§8.2), not individual readers/cameras.
 */
async function resolveRoomScope(
  scope: RealtimeScope,
  id: string,
): Promise<{ scopeType: "site" | "gate"; scopeId: string } | null> {
  if (scope === "site") return { scopeType: "site", scopeId: id };
  if (scope === "gate") return { scopeType: "gate", scopeId: id };

  if (scope === "reader") {
    const { data } = await supabaseAdmin.from("uhfReaders").select("gateId, checkpointId").eq("id", id).single();
    if (!data) return null;
    if (data.gateId) return { scopeType: "gate", scopeId: data.gateId };
    if (data.checkpointId) {
      const { data: checkpoint } = await supabaseAdmin
        .from("securityCheckpoints")
        .select("siteId")
        .eq("id", data.checkpointId)
        .single();
      return checkpoint ? { scopeType: "site", scopeId: checkpoint.siteId } : null;
    }
    return null;
  }

  if (scope === "camera") {
    const { data } = await supabaseAdmin.from("cameras").select("gateId").eq("id", id).single();
    return data ? { scopeType: "gate", scopeId: data.gateId } : null;
  }

  return null;
}

/** §7.9 tasks 1–2 — realtime subscriptions reuse the exact same scoping mechanism as CRUD permissions (§8.2 point 3). */
export async function canJoinRoom(
  userId: string,
  companyId: string,
  scope: RealtimeScope,
  id: string,
): Promise<boolean> {
  if (scope === "company") return id === companyId; // may only watch your own company's firehose

  const resolved = await resolveRoomScope(scope, id);
  if (!resolved) return false;

  const grants = await getPermissionGrants(userId);
  return grants.some((g) => g.scopeIds.length === 0 || g.scopeIds.includes(resolved.scopeId));
}
