"use client";

import { PALETTES, useTheme, type Mode } from "./ThemeProvider";

const MODES: { key: Mode; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

export function ThemeSwitcher() {
  const { palette, mode, setPalette, setMode } = useTheme();

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
            onClick={() => setPalette(p.key)}
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
          <button key={m.key} type="button" className={mode === m.key ? "active" : ""} onClick={() => setMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
