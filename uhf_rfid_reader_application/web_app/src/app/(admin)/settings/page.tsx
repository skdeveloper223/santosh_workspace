import { requireUser } from "@/server/auth/requireUser";
import { getUserPreferences, paletteDbToToken } from "@/server/services/preferences/userPreferences";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { Mode, Palette } from "@/components/ThemeProvider";

export default async function SettingsPage() {
  const user = await requireUser();
  const prefs = await getUserPreferences(user.id);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Appearance</h1>
          <div className="sub">
            Data-driven per-user theme — palette, mode and font choice persist to <span className="tag-code">userPreferences</span>.
          </div>
        </div>
      </div>

      {/* Nested ThemeProvider syncs to the server for this signed-in user; the
          root layout's ThemeProvider still governs pages before this loads. */}
      <ThemeProvider
        initialPalette={paletteDbToToken(prefs.themePalette) as Palette}
        initialMode={prefs.themeMode as Mode}
        syncToServer
      >
        <ThemeSwitcher />
      </ThemeProvider>
    </div>
  );
}
