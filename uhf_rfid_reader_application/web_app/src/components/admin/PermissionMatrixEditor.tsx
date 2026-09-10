"use client";

import { useState } from "react";
import type { RoleMatrix } from "@/server/services/permissions/getRoleMatrix";

const ACTIONS = ["create", "read", "update", "delete"] as const;
const VEHICLE_ACTIONS = ["manageSiteAuth", "manageGateAuth"] as const;
const ACTION_LABEL: Record<string, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
  manageSiteAuth: "Site Auth",
  manageGateAuth: "Gate Auth",
};

export function PermissionMatrixEditor({ matrix }: { matrix: RoleMatrix }) {
  const [selectedRoleId, setSelectedRoleId] = useState(matrix.roles[0]?.id ?? "");
  const [cellsByRoleId, setCellsByRoleId] = useState(matrix.cellsByRoleId);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const selectedRole = matrix.roles.find((r) => r.id === selectedRoleId);
  const isMasterAdmin = selectedRole?.name === "master_admin";

  async function toggle(moduleKey: string, action: string, nextChecked: boolean) {
    const current = cellsByRoleId[selectedRoleId]?.[moduleKey] ?? [];
    const nextActions = nextChecked ? [...new Set([...current, action])] : current.filter((a) => a !== action);

    // Optimistic update, rolled back on failure.
    setCellsByRoleId((prev) => ({ ...prev, [selectedRoleId]: { ...prev[selectedRoleId], [moduleKey]: nextActions } }));
    setSavingKey(`${moduleKey}:${action}`);

    const res = await fetch(`/api/roles/${selectedRoleId}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey, actions: nextActions }),
    });
    setSavingKey(null);

    if (!res.ok) {
      setCellsByRoleId((prev) => ({ ...prev, [selectedRoleId]: { ...prev[selectedRoleId], [moduleKey]: current } }));
    }
  }

  return (
    <div>
      <div className="toolrow" style={{ alignItems: "center" }}>
        <select className="select" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} style={{ appearance: "auto" }}>
          {matrix.roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <p className="hint" style={{ margin: 0 }}>
          {isMasterAdmin
            ? "master_admin always has full access — this row is locked by design."
            : "Toggle Create / Read / Update / Delete per module. Vehicles carries two extra delegable actions."}
        </p>
      </div>

      <div className="card matrix-wrap" style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Module</th>
              {ACTIONS.map((a) => (
                <th key={a} style={{ textAlign: "center" }}>
                  {ACTION_LABEL[a]}
                </th>
              ))}
              {VEHICLE_ACTIONS.map((a) => (
                <th key={a} style={{ textAlign: "center" }}>
                  {ACTION_LABEL[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.modules.map((mod) => {
              const grantedActions = cellsByRoleId[selectedRoleId]?.[mod.key] ?? [];
              const showVehicleActions = mod.key === "vehicles";
              return (
                <tr key={mod.key} style={isMasterAdmin ? { opacity: 0.55 } : undefined}>
                  <td style={{ fontWeight: 700 }}>{mod.label}</td>
                  {ACTIONS.map((action) => (
                    <td key={action} style={{ textAlign: "center" }}>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={isMasterAdmin || grantedActions.includes(action)}
                          disabled={isMasterAdmin || savingKey === `${mod.key}:${action}`}
                          onChange={(e) => toggle(mod.key, action, e.target.checked)}
                        />
                        <span className="slider" />
                      </label>
                    </td>
                  ))}
                  {VEHICLE_ACTIONS.map((action) =>
                    showVehicleActions ? (
                      <td key={action} style={{ textAlign: "center" }}>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={isMasterAdmin || grantedActions.includes(action)}
                            disabled={isMasterAdmin || savingKey === `${mod.key}:${action}`}
                            onChange={(e) => toggle(mod.key, action, e.target.checked)}
                          />
                          <span className="slider" />
                        </label>
                      </td>
                    ) : (
                      <td key={action} style={{ textAlign: "center", color: "var(--color-text-faint)" }}>
                        —
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
