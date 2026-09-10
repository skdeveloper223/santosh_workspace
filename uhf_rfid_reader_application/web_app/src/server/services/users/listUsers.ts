import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type UserListItem = {
  id: string;
  fullName: string;
  email: string;
  roleNames: string[];
  isActive: boolean;
};

/** Company-scoped user directory for the Users & Roles screen (§8.2/§8.5). */
export async function listUsers(companyId: string): Promise<UserListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, fullName, email, isActive, userRoles(roles(name))")
    .eq("companyId", companyId)
    .order("fullName");
  if (error) throw new Error(`listUsers: ${error.message}`);

  return (data ?? []).map((row) => {
    const roles = (row.userRoles as unknown as { roles: { name: string } | { name: string }[] | null }[]) ?? [];
    return {
      id: row.id as string,
      fullName: row.fullName as string,
      email: row.email as string,
      isActive: row.isActive as boolean,
      roleNames: roles
        .map((ur) => (Array.isArray(ur.roles) ? ur.roles[0]?.name : ur.roles?.name))
        .filter((n): n is string => Boolean(n)),
    };
  });
}
