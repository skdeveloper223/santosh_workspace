"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReaderItem, AttachmentOption } from "@/server/services/readers/listReaders";
import { IconWifi, IconMapPin, IconClock, IconNetwork, IconTrash, IconPlus, IconSettings } from "@/components/icons";

function formatLastSeen(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function ReadersGrid({
  initialReaders,
  attachmentOptions,
}: {
  initialReaders: ReaderItem[];
  attachmentOptions: AttachmentOption[];
}) {
  const router = useRouter();
  const [readers, setReaders] = useState(initialReaders);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onlineCount = readers.filter((r) => r.isActive).length;

  async function handleDelete(id: string) {
    if (!confirm("Remove this reader? This can't be undone.")) return;
    setDeletingId(id);
    const prev = readers;
    setReaders((rs) => rs.filter((r) => r.id !== id));
    const res = await fetch(`/api/readers/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) setReaders(prev);
  }

  return (
    <div>
      <div className="toolrow" style={{ justifyContent: "flex-end", marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-muted)", marginRight: "auto" }}>
          {onlineCount}/{readers.length} Online
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => router.refresh()}>
          Refresh
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
          <IconPlus /> Add Reader
        </button>
      </div>

      {readers.length === 0 ? (
        <div className="card empty">
          <div className="ei">
            <IconWifi className="icon" />
          </div>
          <b>No Readers Configured</b>
          <p className="sub" style={{ margin: 0 }}>
            Add your first RFID reader to start tracking tags at a gate or checkpoint.
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {readers.map((r) => (
            <div className="card card-pad" key={r.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div className={`reader-card-icon${r.isActive ? " online" : ""}`}>
                  <IconWifi className="icon" />
                </div>
                <span className={`pill ${r.isActive ? "pill-green" : "pill-gray"}`}>{r.isActive ? "Online" : "Offline"}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 10 }}>{r.name}</div>
              <div className="reader-meta-row">
                <IconNetwork />
                <span className="mono">
                  {r.ipAddress ?? "—"}
                  {r.port ? `:${r.port}` : ""}
                </span>
              </div>
              <div className="reader-meta-row">
                <IconMapPin />
                {r.locationName}
              </div>
              <div className="reader-meta-row">
                <IconClock />
                Last ping: {formatLastSeen(r.lastSeenAt)}
              </div>
              <div className="reader-card-foot">
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled title="Full edit form is a follow-up module">
                  <IconSettings /> Configure
                </button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}>
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <AddReaderModal
          attachmentOptions={attachmentOptions}
          onClose={() => setModalOpen(false)}
          onCreated={(reader) => {
            setReaders((rs) => [...rs, reader].sort((a, b) => a.name.localeCompare(b.name)));
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddReaderModal({
  attachmentOptions,
  onClose,
  onCreated,
}: {
  attachmentOptions: AttachmentOption[];
  onClose: () => void;
  onCreated: (reader: ReaderItem) => void;
}) {
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("192.168.1.100");
  const [port, setPort] = useState("9000");
  const [locationType, setLocationType] = useState("entryPoint");
  const [attachValue, setAttachValue] = useState(() => {
    const firstSite = attachmentOptions.find((s) => s.gates.length > 0 || s.checkpoints.length > 0);
    const firstGate = firstSite?.gates[0];
    const firstCheckpoint = firstSite?.checkpoints[0];
    return firstGate ? `gate:${firstGate.id}` : firstCheckpoint ? `checkpoint:${firstCheckpoint.id}` : "";
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attachValue) {
      setError("This company has no gates or checkpoints yet — create one under Organization first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const [kind, id] = attachValue.split(":") as ["gate" | "checkpoint", string];

    const res = await fetch("/api/readers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ipAddress, port: Number(port), locationType, attachTo: { kind, id } }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't add reader — please check the details and try again.");
      return;
    }
    const { data } = await res.json();
    const locationName =
      attachmentOptions.flatMap((s) => [...s.gates, ...s.checkpoints]).find((g) => g.id === id)?.name ?? "—";
    onCreated({ id: data.id, name, ipAddress, port: Number(port), locationType, locationName, isActive: false, lastSeenAt: null });
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>Add New Reader</h3>
            <p>Configure a new RFID reader for your system</p>
          </div>
          <button className="xbtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="reader-name">Reader Name</label>
              <input id="reader-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Entrance Reader" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="reader-ip">IP Address</label>
                <input id="reader-ip" required value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="reader-port">Port</label>
                <input id="reader-port" type="number" required value={port} onChange={(e) => setPort(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="reader-location">Location</label>
              <select id="reader-location" value={attachValue} onChange={(e) => setAttachValue(e.target.value)}>
                {attachmentOptions.map((site) => (
                  <optgroup label={site.siteName} key={site.siteId}>
                    {site.gates.map((g) => (
                      <option key={`gate:${g.id}`} value={`gate:${g.id}`}>
                        {g.name} (Gate)
                      </option>
                    ))}
                    {site.checkpoints.map((c) => (
                      <option key={`checkpoint:${c.id}`} value={`checkpoint:${c.id}`}>
                        {c.name} (Checkpoint)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="reader-loctype">Location Type</label>
              <select id="reader-loctype" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                <option value="entryPoint">Entry Point</option>
                <option value="exitPoint">Exit Point</option>
              </select>
            </div>
            {error && (
              <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: 0 }} role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add Reader"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
