import { requireUser } from "@/server/auth/requireUser";
import { getDashboardStats } from "@/server/services/dashboard/getDashboardStats";
import { IconRadio, IconCar, IconAlertTriangle, IconUser } from "@/components/icons";

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats(user.companyId);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Good to see you, {user.fullName.split(" ")[0]}</h1>
          <div className="sub">Real-time overview across your company</div>
        </div>
        <span className="livepill">
          <span className="dot" />
          Live
        </span>
      </div>

      <div className="grid4" style={{ marginBottom: 14 }}>
        <div className="card stat">
          <div className="stat-top">
            <span className="lbl">Tags Detected Today</span>
            <span className="stat-icon">
              <IconRadio className="icon" />
            </span>
          </div>
          <div className="stat-num">{stats.tagsDetectedToday}</div>
          <div className="stat-foot">Last 24 hours</div>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="lbl">Vehicles Authorized</span>
            <span className="stat-icon">
              <IconCar className="icon" />
            </span>
          </div>
          <div className="stat-num">
            {stats.vehiclesAuthorized}/{stats.vehiclesTotal}
          </div>
          <div className="stat-foot">Company registry</div>
        </div>
        <div className={`card stat${stats.unknownEntitiesPending > 0 ? " warn" : ""}`}>
          <div className="stat-top">
            <span className="lbl">Unknown Entities</span>
            <span className="stat-icon">
              <IconAlertTriangle className="icon" />
            </span>
          </div>
          <div className="stat-num">{stats.unknownEntitiesPending}</div>
          <div className="stat-foot">Awaiting guard identification</div>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="lbl">Your Roles</span>
            <span className="stat-icon">
              <IconUser className="icon" />
            </span>
          </div>
          <div className="stat-num" style={{ fontSize: 16 }}>
            {user.roleNames.join(", ") || "—"}
          </div>
          <div className="stat-foot">{user.email}</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="sect-title">
            <h3>
              <IconRadio /> Recent Tag Detections
            </h3>
          </div>
          {stats.recentDetections.length === 0 ? (
            <div className="empty">
              <div className="ei">
                <IconRadio className="icon" />
              </div>
              <b>No detections yet</b>
              <p className="sub" style={{ margin: 0 }}>
                Events appear here once hardware-engine is wired up in Phase 3.
              </p>
            </div>
          ) : (
            <div className="rowlist">
              {stats.recentDetections.map((d, i) => (
                <div className="row" key={i}>
                  <div className="avatar">
                    <IconRadio className="icon" />
                  </div>
                  <div className="rmain">
                    <div className="rname mono">{d.epc}</div>
                    <div className="rmeta">{d.readerName ?? "Unknown reader"}</div>
                  </div>
                  <div className="rtime">
                    <b>{new Date(d.detectedAt).toLocaleTimeString()}</b>
                    {new Date(d.detectedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="sect-title">
            <h3>
              <IconAlertTriangle /> Unknown Entity Alerts
            </h3>
          </div>
          {stats.unknownEntityAlerts.length === 0 ? (
            <div className="empty">
              <div className="ei">
                <IconAlertTriangle className="icon" />
              </div>
              <b>Nothing pending</b>
              <p className="sub" style={{ margin: 0 }}>
                Every scanned tag and plate currently resolves to a known record.
              </p>
            </div>
          ) : (
            <div className="rowlist">
              {stats.unknownEntityAlerts.map((a) => (
                <div className="row" key={a.id}>
                  <div className="avatar" style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}>
                    <IconAlertTriangle className="icon" />
                  </div>
                  <div className="rmain">
                    <div className="rname" style={{ textTransform: "capitalize" }}>
                      Unregistered {a.entityKind}
                    </div>
                    <div className="rmeta mono">{a.placeholderRef ?? "—"}</div>
                  </div>
                  <a href="/unknown-entities" className="btn btn-ghost btn-sm">
                    Identify
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
