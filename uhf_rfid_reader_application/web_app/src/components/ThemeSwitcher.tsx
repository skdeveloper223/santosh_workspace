"use client";

import { PALETTES, useTheme, type Mode } from "./ThemeProvider";
import { useToast } from "@/components/ui/Toast";

const MODES: { key: Mode; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

export function ThemeSwitcher() {
  const { palette, mode, setPalette, setMode } = useTheme();
  const toast = useToast();

  function handlePaletteChange(key: (typeof PALETTES)[number]["key"], label: string) {
    setPalette(key);
    toast.info("Theme Updated", `Switched to ${label} palette.`);
  }

  function handleModeChange(key: Mode, label: string) {
    setMode(key);
    toast.info("Display Mode", `Switched to ${label} mode.`);
  }

  return (
    <div className="card card-pad">
      <div className="side-label" style={{ paddingLeft: 0 }}>
        Palette
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 8 }}>
        {PALETTES.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`palette-card${palette === p.key ? " active" : ""}`}
            onClick={() => handlePaletteChange(p.key, p.label)}
          >
            <span className="pc-dot" style={{ background: p.hex }} />
            <span>
              <span className="pc-name" style={{ display: "block" }}>
                {p.label}
              </span>
              <span className="pc-hex">{p.hex}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="side-label" style={{ paddingLeft: 0, marginTop: 16 }}>
        Mode
      </div>
      <div className="seg" style={{ marginTop: 6 }}>
        {MODES.map((m) => (
          <button key={m.key} type="button" className={mode === m.key ? "active" : ""} onClick={() => handleModeChange(m.key, m.label)}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
