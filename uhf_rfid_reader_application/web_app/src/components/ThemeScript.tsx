import Script from "next/script";

// Runs before hydration (strategy="beforeInteractive" is inlined into the
// initial HTML by Next.js regardless of where this component sits in the
// tree) so there is no flash of the wrong palette/theme on load. Mirrors the
// data-palette/data-theme contract defined in src/app/globals.css (§8.4.2).
const THEME_BOOTSTRAP_JS = `
(function () {
  try {
    var palette = localStorage.getItem("airis-palette");
    var mode = localStorage.getItem("airis-mode");
    if (palette) document.documentElement.setAttribute("data-palette", palette);
    if (mode && mode !== "system") document.documentElement.setAttribute("data-theme", mode);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  // This component is only ever rendered from app/layout.tsx (the root
  // layout), which is exactly where the App Router docs say beforeInteractive
  // scripts belong — the lint rule below still only recognizes the Pages
  // Router's pages/_document.js location.
  // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
  return <Script id="theme-bootstrap" strategy="beforeInteractive">{THEME_BOOTSTRAP_JS}</Script>;
}
