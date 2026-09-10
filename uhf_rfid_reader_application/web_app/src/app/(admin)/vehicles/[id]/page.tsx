import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/requireUser";
import { getVehicleDetail } from "@/server/services/vehicles/getVehicleDetail";
import { listVehicleVisits } from "@/server/services/vehicles/listVehicleVisits";
import { VehicleAuthEditor } from "@/components/admin/VehicleAuthEditor";
import { IconArrowRight, IconClock } from "@/components/icons";

export default async function VehicleDetailPage({ params }: PageProps<"/vehicles/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const vehicle = await getVehicleDetail(user.companyId, id);
  if (!vehicle) notFound();
  const visits = await listVehicleVisits(vehicle.id);

  const authorizedSiteCount = vehicle.sites.filter((s) => s.authorized).length;

  return (
    <div>
      <Link
        href="/vehicles"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12, textDecoration: "none" }}
      >
        <IconArrowRight style={{ transform: "rotate(180deg)", width: 14, height: 14 }} />
        Back to Vehicles
      </Link>

      <div className="page-head">
        <div>
          <h1 className="mono">{vehicle.plateNumber}</h1>
          <div className="sub" style={{ textTransform: "capitalize" }}>
            {vehicle.type} · Owner: {vehicle.ownerName ?? "—"}
          </div>
        </div>
        {authorizedSiteCount > 0 ? (
          <span className="pill pill-green">Authorized</span>
        ) : (
          <span className="pill pill-amber">Not Authorized</span>
        )}
      </div>

      <div className="grid2">
        <VehicleAuthEditor vehicleId={vehicle.id} initial={vehicle} />

        <div className="card card-pad">
          <div className="side-label" style={{ paddingLeft: 0 }}>
            Audit Trail
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <div>Created {new Date(vehicle.createdAt).toLocaleString()}</div>
            <div>Last updated {new Date(vehicle.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="sect-title">
          <h3>
            <IconClock /> Visit History
          </h3>
        </div>
        {visits.length === 0 ? (
          <div className="empty">
            <p className="sub" style={{ margin: 0 }}>
              No arrivals recorded yet — visits appear here once ANPR/gate detections are wired up (Phase 3/6).
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Site / Gate</th>
                <th>Arrived</th>
                <th>Dispatched</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.siteName}
                    {v.gateName ? ` · ${v.gateName}` : ""}
                  </td>
                  <td>{new Date(v.arrivalAt).toLocaleString()}</td>
                  <td>{v.dispatchAt ? new Date(v.dispatchAt).toLocaleString() : "—"}</td>
                  <td>{v.durationMinutes != null ? `${v.durationMinutes} min` : "—"}</td>
                  <td>
                    {v.status === "onSite" ? (
                      <span className="pill pill-green">On Site</span>
                    ) : (
                      <span className="pill pill-gray">Departed</span>
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
