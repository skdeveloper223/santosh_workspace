import { requireUser } from "@/server/auth/requireUser";
import { listSites } from "@/server/services/organization/listSites";
import { IconBuilding } from "@/components/icons";

export default async function OrganizationPage() {
  const user = await requireUser();
  const sites = await listSites(user.companyId);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Sites &amp; Assets</h1>
          <div className="sub">Company → Sites → Gates, Warehouses, Security Checkpoints (§7.3).</div>
        </div>
      </div>

      <div className="card">
        {sites.length === 0 ? (
          <div className="empty">
            <div className="ei">
              <IconBuilding className="icon" />
            </div>
            <b>No sites yet</b>
            <p className="sub" style={{ margin: 0 }}>
              Run <code className="tag-code">npm run seed</code> against a live Supabase project to populate demo data.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Gates</th>
                <th>Warehouses</th>
                <th>Checkpoints</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>{s.name}</td>
                  <td>{s.gateCount}</td>
                  <td>{s.warehouseCount}</td>
                  <td>{s.checkpointCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
