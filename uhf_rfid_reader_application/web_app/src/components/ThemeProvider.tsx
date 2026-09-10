"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const PALETTES = [
  { key: "ocean", label: "Ocean Blue", hex: "#2563EB" },
  { key: "violet", label: "Royal Violet", hex: "#7C3AED" },
  { key: "indigo", label: "Indigo Fusion", hex: "#4F46E5" },
  { key: "cobalt", label: "Electric Cobalt", hex: "#0EA5E9" },
  { key: "amethyst", label: "Neon Amethyst", hex: "#C026D3" },
] as const;

export type Palette = (typeof PALETTES)[number]["key"];
export type Mode = "light" | "dark" | "system";

type ThemeContextValue = {
  palette: Palette;
  mode: Mode;
  setPalette: (p: Palette) => void;
  setMode: (m: Mode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

/**
 * Applies data-palette/data-theme on <html> (see src/app/globals.css §8.4.2),
 * persists the choice to localStorage for the next load's ThemeScript, and —
 * when a signed-in user is present — syncs it to their `userPreferences` row
 * via PATCH /api/preferences so it follows them across devices.
 */
export function ThemeProvider({
  children,
  initialPalette = "ocean",
  initialMode = "system",
  syncToServer = false,
}: {
  children: React.ReactNode;
  initialPalette?: Palette;
  initialMode?: Mode;
  syncToServer?: boolean;
}) {
  // Pages don't all fetch userPreferences server-side before rendering this
  // provider, so `initialPalette`/`initialMode` are only exact on pages that
  // do (Settings). Elsewhere the true, persisted choice is whatever
  // ThemeScript already stamped onto <html> pre-hydration; read that instead
  // of localStorage directly so this never disagrees with what's on screen.
  const [palette, setPaletteState] = useState<Palette>(
    () => (typeof document !== "undefined" ? (document.documentElement.getAttribute("data-palette") as Palette) : null) ?? initialPalette,
  );
  const [mode, setModeState] = useState<Mode>(
    () => (typeof document !== "undefined" ? (document.documentElement.getAttribute("data-theme") as Mode) : null) ?? initialMode,
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    if (mode === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem("airis-palette", palette);
      localStorage.setItem("airis-mode", mode);
    } catch {
      // Non-fatal — theme still applies for this page view.
    }
  }, [palette, mode]);

  const persist = useCallback(
    (next: { themePalette?: string; themeMode?: string }) => {
      if (!syncToServer) return;
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {
        // Fire-and-forget — localStorage already has the choice for this browser.
      });
    },
    [syncToServer],
  );

  const setPalette = useCallback(
    (p: Palette) => {
      setPaletteState(p);
      persist({ themePalette: p });
    },
    [persist],
  );
  const setMode = useCallback(
    (m: Mode) => {
      setModeState(m);
      persist({ themeMode: m });
    },
    [persist],
  );

  const value = useMemo(() => ({ palette, mode, setPalette, setMode }), [palette, mode, setPalette, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
