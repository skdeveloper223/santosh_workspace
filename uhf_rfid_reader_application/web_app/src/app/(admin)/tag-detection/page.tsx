import { requireUser } from "@/server/auth/requireUser";
import { listRecentDetections } from "@/server/services/tagDetections/listRecentDetections";
import { IconRadio } from "@/components/icons";
import { EntitySearch } from "@/components/admin/EntitySearch";

export default async function TagDetectionPage() {
  await requireUser();
  const detections = await listRecentDetections();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Tag Detection Monitor</h1>
          <div className="sub">Live UHF tag detection events from every reader.</div>
        </div>
        <span className="livepill">
          <span className="dot" />
          Live
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <EntitySearch />
      </div>

      <div className="card">
        {detections.length === 0 ? (
          <div className="empty">
            <div className="ei">
              <IconRadio className="icon" />
            </div>
            <b>No detections yet</b>
            <p className="sub" style={{ margin: 0 }}>
              Events will stream in here once <code className="tag-code">hardware-engine</code> (Phase 3) is wired to Kafka.
            </p>
          </div>
        ) : (
          <div className="rowlist">
            {detections.map((d) => (
              <div className="row" key={d.id}>
                <div className="avatar">
                  <IconRadio className="icon" />
                </div>
                <div className="rmain">
                  <div className="rname mono">{d.epc}</div>
                  <div className="rmeta">{d.readerName ?? "Unknown reader"}</div>
                </div>
                <div className="rtime">
                  <b>{new Date(d.detectedAt).toLocaleTimeString()}</b>
                  Signal: {d.signal != null ? `${d.signal}%` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
