"use client";

import { useState } from "react";
import type { VehicleDetail } from "@/server/services/vehicles/getVehicleDetail";

export function VehicleAuthEditor({ vehicleId, initial }: { vehicleId: string; initial: VehicleDetail }) {
  const [sites, setSites] = useState(initial.sites);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function toggleSite(siteId: string, authorized: boolean) {
    setError(null);
    setPendingKey(`site:${siteId}`);
    const prev = sites;
    // Revoking a site also drops every gate under it — mirror that locally so the UI never shows a stale "authorized" gate.
    setSites((s) =>
      s.map((site) =>
        site.siteId === siteId
          ? { ...site, authorized, gates: authorized ? site.gates : site.gates.map((g) => ({ ...g, authorized: false })) }
          : site,
      ),
    );

    const res = await fetch(`/api/vehicles/${vehicleId}/site-authorizations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, authorized }),
    });
    setPendingKey(null);
    if (!res.ok) {
      setSites(prev);
      setError("Couldn't update site authorization — please try again.");
    }
  }

  async function toggleGate(siteId: string, gateId: string, authorized: boolean) {
    setError(null);
    setPendingKey(`gate:${gateId}`);
    const prev = sites;
    setSites((s) =>
      s.map((site) =>
        site.siteId === siteId
          ? { ...site, gates: site.gates.map((g) => (g.gateId === gateId ? { ...g, authorized } : g)) }
          : site,
      ),
    );

    const res = await fetch(`/api/vehicles/${vehicleId}/gate-authorizations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gateId, authorized }),
    });
    setPendingKey(null);
    if (!res.ok) {
      setSites(prev);
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't update gate authorization — please try again.");
    }
  }

  return (
    <div className="card card-pad">
      <div className="side-label" style={{ paddingLeft: 0 }}>
        Site &amp; Gate Authorization
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {sites.map((site) => (
          <div key={site.siteId} className="card" style={{ padding: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={site.authorized}
                disabled={pendingKey === `site:${site.siteId}`}
                onChange={(e) => toggleSite(site.siteId, e.target.checked)}
              />
              {site.name}
            </label>
            {site.gates.map((gate) => (
              <div
                key={gate.gateId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 4px 7px 26px",
                  fontSize: 12.5,
                  color: site.authorized ? "var(--color-text-muted)" : "var(--color-text-faint)",
                }}
              >
                <span>{gate.name}</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={gate.authorized}
                    disabled={!site.authorized || pendingKey === `gate:${gate.gateId}`}
                    onChange={(e) => toggleGate(site.siteId, gate.gateId, e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Gate toggles unlock only once their site is authorized — owning a vehicle never implies access.
      </p>
      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: 12.5, marginTop: 6 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
