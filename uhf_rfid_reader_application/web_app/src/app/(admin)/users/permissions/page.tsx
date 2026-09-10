import { requireUser } from "@/server/auth/requireUser";
import { getRoleMatrix } from "@/server/services/permissions/getRoleMatrix";
import { UsersTabs } from "@/components/admin/UsersTabs";
import { PermissionMatrixEditor } from "@/components/admin/PermissionMatrixEditor";

export default async function RolePermissionsPage() {
  const user = await requireUser();
  const matrix = await getRoleMatrix(user.companyId);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users &amp; Roles</h1>
          <div className="sub">A permission-matrix admin screen — read/edit/delete access can be turned on or off per module, per role (§7.2/§8.2).</div>
        </div>
      </div>

      <UsersTabs />

      {matrix.roles.length === 0 ? (
        <div className="card empty">
          <b>No roles yet</b>
          <p className="sub" style={{ margin: 0 }}>
            Run <code className="tag-code">npm run seed</code> against a live Supabase project to populate the 6 seed roles.
          </p>
        </div>
      ) : (
        <PermissionMatrixEditor matrix={matrix} />
      )}
    </div>
  );
}
