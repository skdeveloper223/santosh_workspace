// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type UserProfile = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  roleNames: string[];
};

/**
 * Loads the `users` row + role names for an already-verified Supabase Auth
 * user id. Shared by src/server/auth/session.ts (cookie-based, Next.js
 * request context) and src/server/realtime/auth.ts (raw-JWT-based, the
 * standalone realtime gateway process has no cookies()/request context) so
 * the two auth paths agree on what a "signed-in user" looks like.
 */
export async function loadUserProfile(authUserId: string): Promise<UserProfile | null> {
  const { data: userRow, error } = await supabaseAdmin
    .from("users")
    .select("id, companyId, fullName, email, isActive, userRoles(roles(name))")
    .eq("id", authUserId)
    .single();
  if (error || !userRow || !userRow.isActive) return null;

  const roleNames = (
    (userRow.userRoles as unknown as { roles: { name: string } | { name: string }[] | null }[]) ?? []
  )
    .map((ur) => (Array.isArray(ur.roles) ? ur.roles[0]?.name : ur.roles?.name))
    .filter((n): n is string => Boolean(n));

  return {
    id: userRow.id,
    companyId: userRow.companyId,
    fullName: userRow.fullName,
    email: userRow.email,
    roleNames,
  };
}
