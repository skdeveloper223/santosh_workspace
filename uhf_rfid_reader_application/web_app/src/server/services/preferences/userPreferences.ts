import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type UserPreferences = { themePalette: string; themeMode: string; fontFamily: string };

const DEFAULTS: UserPreferences = { themePalette: "oceanBlue", themeMode: "light", fontFamily: "inter" };

const PALETTE_DB_TO_TOKEN: Record<string, string> = {
  oceanBlue: "ocean",
  royalViolet: "violet",
  indigoFusion: "indigo",
  electricCobalt: "cobalt",
  neonAmethyst: "amethyst",
};
const PALETTE_TOKEN_TO_DB = Object.fromEntries(Object.entries(PALETTE_DB_TO_TOKEN).map(([k, v]) => [v, k]));

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const { data } = await supabaseAdmin
    .from("userPreferences")
    .select("themePalette, themeMode, fontFamily")
    .eq("userId", userId)
    .maybeSingle();
  return (data as UserPreferences | null) ?? DEFAULTS;
}

/** Accepts the CSS-token spelling used by ThemeProvider ("ocean") and stores the DB spelling ("oceanBlue"). */
export async function updateUserPreferences(
  userId: string,
  patch: { themePalette?: string; themeMode?: string; fontFamily?: string },
): Promise<void> {
  const dbPatch: Record<string, string> = { ...patch };
  if (patch.themePalette && PALETTE_TOKEN_TO_DB[patch.themePalette]) {
    dbPatch.themePalette = PALETTE_TOKEN_TO_DB[patch.themePalette];
  }
  const { error } = await supabaseAdmin
    .from("userPreferences")
    .upsert({ userId, ...dbPatch, updatedAt: new Date().toISOString() }, { onConflict: "userId" });
  if (error) throw new Error(`updateUserPreferences: ${error.message}`);
}

export function paletteDbToToken(dbValue: string): string {
  return PALETTE_DB_TO_TOKEN[dbValue] ?? "ocean";
}
