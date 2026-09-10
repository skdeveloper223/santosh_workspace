import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { invalidatePermissionCache } from "@/server/permissions/getPermissions";
import type { ModuleKey } from "@/server/permissions/modules";

/**
 * Replaces a role's granted actions for one module. Every user holding this
 * role has their permission cache invalidated so their *next* request (not
 * next login) reflects the change — the exact behavior §8.7's Phase 1
 * verification checks for.
 */
export async function updateRolePermission(roleId: string, moduleKey: ModuleKey, actions: string[]): Promise<void> {
  const { data: module, error: moduleErr } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("key", moduleKey)
    .single();
  if (moduleErr || !module) throw new Error(`updateRolePermission: unknown module "${moduleKey}"`);

  const { error } = await supabaseAdmin
    .from("permissions")
    .upsert(
      { roleId, moduleId: module.id, actions, scopeType: "company", scopeIds: [] },
      { onConflict: "roleId,moduleId" },
    );
  if (error) throw new Error(`updateRolePermission: ${error.message}`);

  const { data: affectedUsers } = await supabaseAdmin.from("userRoles").select("userId").eq("roleId", roleId);
  await Promise.all((affectedUsers ?? []).map((u) => invalidatePermissionCache(u.userId as string)));
}
