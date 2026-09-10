import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { MODULE_KEYS, type ModuleKey } from "@/server/permissions/modules";

export type RoleSummary = { id: string; name: string; isSystemRole: boolean };
export type ModuleRow = { key: ModuleKey; label: string };
export type MatrixCell = { moduleKey: ModuleKey; actions: string[] };

export type RoleMatrix = {
  roles: RoleSummary[];
  modules: ModuleRow[];
  /** cellsByRoleId[roleId][moduleKey] -> actions currently granted */
  cellsByRoleId: Record<string, Record<string, string[]>>;
};

/** Data for the Users & Roles → Roles & Permissions matrix screen (§8.2/§8.5). */
export async function getRoleMatrix(companyId: string): Promise<RoleMatrix> {
  const [{ data: roles, error: rolesErr }, { data: modules, error: modulesErr }] = await Promise.all([
    supabaseAdmin.from("roles").select("id, name, isSystemRole").eq("companyId", companyId).order("name"),
    supabaseAdmin.from("modules").select("id, key, label"),
  ]);
  if (rolesErr) throw new Error(`getRoleMatrix: ${rolesErr.message}`);
  if (modulesErr) throw new Error(`getRoleMatrix: ${modulesErr.message}`);

  const moduleLabelByKey = new Map((modules ?? []).map((m) => [m.id as string, m.key as string]));
  const roleIds = (roles ?? []).map((r) => r.id as string);

  const cellsByRoleId: Record<string, Record<string, string[]>> = {};
  for (const roleId of roleIds) cellsByRoleId[roleId] = {};

  if (roleIds.length > 0) {
    const { data: rows, error } = await supabaseAdmin
      .from("permissions")
      .select("roleId, actions, moduleId")
      .in("roleId", roleIds);
    if (error) throw new Error(`getRoleMatrix: ${error.message}`);

    for (const row of rows ?? []) {
      const moduleKey = moduleLabelByKey.get(row.moduleId as string);
      if (!moduleKey) continue;
      cellsByRoleId[row.roleId as string][moduleKey] = (row.actions as string[]) ?? [];
    }
  }

  const orderedModules = MODULE_KEYS.map((key) => {
    const found = (modules ?? []).find((m) => m.key === key);
    return { key, label: found?.label ?? key };
  });

  return {
    roles: (roles ?? []) as RoleSummary[],
    modules: orderedModules,
    cellsByRoleId,
  };
}
