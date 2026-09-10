import { requireUser } from "@/server/auth/requireUser";
import { listUsers } from "@/server/services/users/listUsers";
import { IconShield } from "@/components/icons";
import { UsersTabs } from "@/components/admin/UsersTabs";

export default async function UsersPage() {
  const user = await requireUser();
  const users = await listUsers(user.companyId);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users &amp; Roles</h1>
          <div className="sub">
            Only master_admin (or a delegate holding <span className="tag-code">users:create</span>) can add accounts — there is no self-signup.
          </div>
        </div>
      </div>

      <UsersTabs />

      <div className="card">
        {users.length === 0 ? (
          <div className="empty">
            <div className="ei">
              <IconShield className="icon" />
            </div>
            <b>No users yet</b>
            <p className="sub" style={{ margin: 0 }}>
              Run <code className="tag-code">npm run seed</code> against a live Supabase project to populate demo data.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.fullName}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {u.email}
                  </td>
                  <td>
                    {u.roleNames.map((r) => (
                      <span key={r} className="pill pill-gray" style={{ marginRight: 4 }}>
                        {r}
                      </span>
                    ))}
                  </td>
                  <td>{u.isActive ? <span className="pill pill-green">Active</span> : <span className="pill pill-red">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
