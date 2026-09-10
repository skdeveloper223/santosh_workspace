import { requireUser } from "@/server/auth/requireUser";
import { listUnknownEntities } from "@/server/services/unknownEntities/listUnknownEntities";
import { IconAlertTriangle } from "@/components/icons";

const KIND_PILL: Record<string, string> = {
  vehicle: "pill-amber",
  employee: "pill-blue",
  accessory: "pill-blue",
  material: "pill-green",
};

export default async function UnknownEntitiesPage() {
  await requireUser();
  const events = await listUnknownEntities();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Identification Queue</h1>
          <div className="sub">Placeholder records created the instant an unknown tag or plate is scanned — nothing is ever lost (§7.5).</div>
        </div>
      </div>

      <div className="card">
        {events.length === 0 ? (
          <div className="empty">
            <div className="ei">
              <IconAlertTriangle className="icon" />
            </div>
            <b>Queue is empty</b>
            <p className="sub" style={{ margin: 0 }}>
              Unknown detections from readers and ANPR cameras will appear here (wired up in Phase 5).
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kind</th>
                <th>Placeholder</th>
                <th>Assigned Guard</th>
                <th>Detected</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} style={{ opacity: e.status === "identified" ? 0.55 : 1 }}>
                  <td>
                    <span className={`pill ${KIND_PILL[e.entityKind] ?? "pill-gray"}`} style={{ textTransform: "capitalize" }}>
                      {e.entityKind}
                    </span>
                  </td>
                  <td className="mono">{e.placeholderRef ?? "—"}</td>
                  <td>{e.assignedGuardName ?? "—"}</td>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                  <td>
                    {e.status === "pending" ? (
                      <span className="pill pill-gray">Pending</span>
                    ) : (
                      <span className="pill pill-green">Identified</span>
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
