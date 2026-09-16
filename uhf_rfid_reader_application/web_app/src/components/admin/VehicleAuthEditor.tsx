"use client";

import { useState } from "react";
import type { VehicleDetail } from "@/server/services/vehicles/getVehicleDetail";
import { useToast } from "@/components/ui/Toast";

export function VehicleAuthEditor({ vehicleId, initial }: { vehicleId: string; initial: VehicleDetail }) {
  const [sites, setSites] = useState(initial.sites);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const toast = useToast();

  async function toggleSite(siteId: string, siteName: string, authorized: boolean) {
    setError(null);
    setPendingKey(`site:${siteId}`);
    const prev = sites;
    setSites((s) =>
      s.map((site) =>
        site.siteId === siteId
          ? { ...site, authorized, gates: authorized ? site.gates : site.gates.map((g) => ({ ...g, authorized: false })) }
          : site,
      ),
    );

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/site-authorizations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, authorized }),
      });
      setPendingKey(null);
      if (!res.ok) {
        setSites(prev);
        const errMsg = "Couldn't update site authorization — please try again.";
        setError(errMsg);
        toast.error("Site Access Error", errMsg);
      } else {
        toast.success(
          authorized ? "Site Access Granted" : "Site Access Revoked",
          `Updated authorization for site "${siteName}".`,
        );
      }
    } catch {
      setPendingKey(null);
      setSites(prev);
      const errMsg = "Network error. Failed to reach authorization endpoint.";
      setError(errMsg);
      toast.error("Network Error", errMsg);
    }
  }

  async function toggleGate(siteId: string, gateId: string, gateName: string, authorized: boolean) {
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

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/gate-authorizations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateId, authorized }),
      });
      setPendingKey(null);
      if (!res.ok) {
        setSites(prev);
        const body = await res.json().catch(() => null);
        const errMsg = body?.error?.message ?? "Couldn't update gate authorization — please try again.";
        setError(errMsg);
        toast.error("Gate Access Error", errMsg);
      } else {
        toast.success(
          authorized ? "Gate Access Granted" : "Gate Access Revoked",
          `Updated gate access for "${gateName}".`,
        );
      }
    } catch {
      setPendingKey(null);
      setSites(prev);
      const errMsg = "Network error. Failed to reach gate authorization endpoint.";
      setError(errMsg);
      toast.error("Network Error", errMsg);
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
                onChange={(e) => toggleSite(site.siteId, site.name, e.target.checked)}
              />
              <span>{site.name}</span>
              {pendingKey === `site:${site.siteId}` && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Updating…</span>}
            </label>

            <div style={{ paddingLeft: 24, marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {site.gates.map((gate) => (
                <label key={gate.gateId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--color-text-muted)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={gate.authorized}
                    disabled={!site.authorized || pendingKey === `gate:${gate.gateId}`}
                    onChange={(e) => toggleGate(site.siteId, gate.gateId, gate.name, e.target.checked)}
                  />
                  <span>{gate.name}</span>
                  {pendingKey === `gate:${gate.gateId}` && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Updating…</span>}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: 12.5, marginTop: 10 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
