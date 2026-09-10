// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { redis } from "@/server/cache/redis";
import type { ModuleKey, PermissionAction } from "./modules";

export type PermissionGrant = {
  moduleKey: string;
  actions: string[];
  scopeType: "company" | "site" | "gate" | "warehouse";
  scopeIds: string[];
};

const CACHE_TTL_SECONDS = 60;
const cacheKey = (userId: string) => `perm:${userId}`;

/**
 * Loads every permission row that applies to a user — their roles' defaults
 * plus any per-user override rows — Redis-first, falling back to Postgres on
 * a cache miss or when Redis is unreachable (§8.2 point 1).
 */
export async function getPermissionGrants(userId: string): Promise<PermissionGrant[]> {
  try {
    const cached = await redis.get(cacheKey(userId));
    if (cached) return JSON.parse(cached) as PermissionGrant[];
  } catch {
    // Redis down — fall through to Postgres.
  }

  const grants = await loadPermissionGrantsFromDb(userId);

  try {
    await redis.set(cacheKey(userId), JSON.stringify(grants), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Best-effort cache write only.
  }

  return grants;
}

async function loadPermissionGrantsFromDb(userId: string): Promise<PermissionGrant[]> {
  const { data: userRoles, error: roleErr } = await supabaseAdmin
    .from("userRoles")
    .select("roleId")
    .eq("userId", userId);
  if (roleErr) throw new Error(`loadPermissionGrantsFromDb: ${roleErr.message}`);
  const roleIds = (userRoles ?? []).map((r) => r.roleId as string);

  const orFilter = [
    roleIds.length > 0 ? `roleId.in.(${roleIds.join(",")})` : null,
    `userId.eq.${userId}`,
  ]
    .filter(Boolean)
    .join(",");

  const { data: rows, error } = await supabaseAdmin
    .from("permissions")
    .select("actions, scopeType, scopeIds, modules(key)")
    .or(orFilter);
  if (error) throw new Error(`loadPermissionGrantsFromDb: ${error.message}`);

  return (rows ?? []).map((row) => {
    const moduleRel = row.modules as unknown as { key: string } | { key: string }[] | null;
    const moduleKey = Array.isArray(moduleRel) ? moduleRel[0]?.key : moduleRel?.key;
    return {
      moduleKey: moduleKey ?? "",
      actions: (row.actions as string[]) ?? [],
      scopeType: row.scopeType as PermissionGrant["scopeType"],
      scopeIds: (row.scopeIds as string[]) ?? [],
    };
  });
}

/** Call after any write to `permissions` so the affected user's *next* request (not next login) sees it — §8.7 Phase 1 verification. */
export async function invalidatePermissionCache(userId: string): Promise<void> {
  try {
    await redis.del(cacheKey(userId));
  } catch {
    // Cache will simply expire naturally after CACHE_TTL_SECONDS.
  }
}

/**
 * True if any grant for this user covers `moduleKey`/`action`, scoped to
 * `scopeId` when the grant is site/gate/warehouse-scoped. A grant with an
 * empty scopeIds array is company-wide. Any one matching grant is sufficient
 * — role defaults and per-user overrides are additive, not replacing.
 */
export function grantsInclude(
  grants: PermissionGrant[],
  moduleKey: ModuleKey | string,
  action: PermissionAction | string,
  scopeId?: string,
): boolean {
  return grants.some((g) => {
    if (g.moduleKey !== moduleKey) return false;
    if (!g.actions.includes(action)) return false;
    if (g.scopeIds.length === 0) return true; // company-wide grant
    return scopeId != null && g.scopeIds.includes(scopeId);
  });
}
