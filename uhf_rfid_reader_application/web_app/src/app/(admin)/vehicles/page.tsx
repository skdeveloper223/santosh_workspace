import Link from "next/link";
import { requireUser } from "@/server/auth/requireUser";
import { listVehicles } from "@/server/services/vehicles/listVehicles";
import { IconCar } from "@/components/icons";

export default async function VehiclesPage() {
  const user = await requireUser();
  const vehicles = await listVehicles(user.companyId);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Company Vehicle Registry</h1>
          <div className="sub">Registered once at company level — access is granted per site, then per gate (§7.4).</div>
        </div>
      </div>

      <div className="card">
        {vehicles.length === 0 ? (
          <div className="empty">
            <div className="ei">
              <IconCar className="icon" />
            </div>
            <b>No vehicles yet</b>
            <p className="sub" style={{ margin: 0 }}>
              Run <code className="tag-code">npm run seed</code> against a live Supabase project to populate demo data.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plate</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Sites</th>
                <th>Gates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="clickable" style={{ cursor: "pointer" }}>
                  <td className="mono">
                    <Link href={`/vehicles/${v.id}`} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
                      {v.plateNumber}
                    </Link>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{v.type}</td>
                  <td>{v.ownerName ?? "—"}</td>
                  <td>{v.authorizedSiteCount}</td>
                  <td>{v.authorizedGateCount}</td>
                  <td>
                    {v.authorizedSiteCount > 0 ? (
                      <span className="pill pill-green">Authorized</span>
                    ) : (
                      <span className="pill pill-amber">Not Authorized</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
