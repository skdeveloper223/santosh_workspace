import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { loadUserProfile } from "./loadUserProfile";
import { getCurrentUser, isSupabaseConfigured, type CurrentUser } from "./session";

/**
 * API routes are the one surface both the web app AND the Flutter app call
 * (§7.7 point 1) — but they authenticate differently: the browser sends a
 * cookie (getCurrentUser()'s path), while Flutter has no cookies and sends
 * `Authorization: Bearer <supabase-access-token>` instead. Without this,
 * every mobile request 401s regardless of correctness — confirmed live
 * against a real guard token before writing this fix.
 */
export async function resolveApiUser(req: NextRequest): Promise<CurrentUser | null> {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;

  if (bearerToken && isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
    if (error || !data.user) return null;
    return loadUserProfile(data.user.id);
  }

  return getCurrentUser();
}
