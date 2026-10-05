"use client";

import { useState, useSyncExternalStore } from "react";
import { PALETTES, useTheme, type Mode } from "./ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { IconSettings, IconX } from "@/components/icons";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const MODES: { key: Mode; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

export function HeaderThemeModal() {
  const [open, setOpen] = useState(false);
  const { palette, mode, setPalette, setMode } = useTheme();
  const toast = useToast();
  const mounted = useIsMounted();

  const activePalette = mounted ? palette : "ocean";
  const activeMode = mounted ? mode : "system";
  const currentPaletteObj = PALETTES.find((p) => p.key === activePalette) ?? PALETTES[0];

  function handlePaletteChange(key: (typeof PALETTES)[number]["key"], label: string) {
    setPalette(key);
    toast.info("Theme Palette", `Switched to ${label}`);
  }

  function handleModeChange(key: Mode, label: string) {
    setMode(key);
    toast.info("Display Mode", `Switched to ${label} mode`);
  }

  return (
    <>
      <button
        type="button"
        className="profile-badge-btn"
        onClick={() => setOpen(true)}
        title="Manage Theme & Palette"
        aria-label="Manage Theme & Palette"
        suppressHydrationWarning
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: currentPaletteObj.hex,
            boxShadow: `0 0 6px ${currentPaletteObj.hex}`,
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 700 }}>Theme</span>
      </button>

      {open && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-primary-soft)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSettings style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>Manage Appearance</h3>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
                    Select your theme palette and display mode
                  </p>
                </div>
              </div>
              <button className="xbtn" onClick={() => setOpen(false)} aria-label="Close dialog">
                <IconX style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="side-label" style={{ paddingLeft: 0, marginBottom: 8, display: "block" }}>
                  Color Palette
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {PALETTES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className={`palette-card${activePalette === p.key ? " active" : ""}`}
                      onClick={() => handlePaletteChange(p.key, p.label)}
                      style={{ padding: "8px 10px" }}
                      suppressHydrationWarning
                    >
                      <span className="pc-dot" style={{ background: p.hex }} />
                      <span>
                        <span className="pc-name" style={{ display: "block", fontSize: 12, fontWeight: 700 }}>
                          {p.label}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="side-label" style={{ paddingLeft: 0, marginBottom: 6, display: "block" }}>
                  Display Mode
                </label>
                <div className="seg">
                  {MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className={activeMode === m.key ? "active" : ""}
                      onClick={() => handleModeChange(m.key, m.label)}
                      suppressHydrationWarning
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn btn-primary" onClick={() => setOpen(false)} style={{ width: "100%" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
