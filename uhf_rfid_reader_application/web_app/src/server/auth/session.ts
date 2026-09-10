import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/server/db/supabaseServer";
import { loadUserProfile, type UserProfile } from "./loadUserProfile";

export type CurrentUser = UserProfile;

/** True once a Supabase project is actually configured (§8.9 — not yet true in this repo's default checkout). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Resolves the signed-in user from the request's cookies, plus their `users`
 * row and role names. Returns null when there is no valid session — callers
 * decide what to do (redirect for pages, 401 JSON for API routes).
 *
 * Uses `getUser()`, not `getSession()`, per Supabase's guidance: it revalidates
 * the JWT against the Auth server instead of trusting an unverified cookie.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) {
    // Fail to "signed out" rather than crashing every page — until .env.local
    // has real Supabase values, the app should still render the login screen.
    // Still read cookies() so Next.js correctly treats every caller of this
    // function as dynamically rendered instead of prerendering a stale
    // "logged out" page once real credentials are added later without a
    // fresh production build.
    await cookies();
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  return loadUserProfile(authUser.id);
});
