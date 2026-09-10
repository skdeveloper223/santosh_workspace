import { requireUser } from "@/server/auth/requireUser";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [{ data: company }, { count: unknownEntitiesPending }] = await Promise.all([
    supabaseAdmin.from("companies").select("name").eq("id", user.companyId).single(),
    supabaseAdmin
      .from("unknownEntityEvents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return (
    <AdminShell
      companyName={company?.name ?? "AIRIS"}
      fullName={user.fullName}
      unknownEntitiesPending={unknownEntitiesPending ?? 0}
    >
      {children}
    </AdminShell>
  );
}
