// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { loadUserProfile } from "@/server/auth/loadUserProfile";
import type { RealtimeIdentity } from "./types";

/**
 * Verifies a raw Supabase access token (sent by the client as
 * `socket.handshake.auth.token`, not a cookie — this gateway is a standalone
 * process with no Next.js request context) and resolves it to the same
 * company/role identity src/server/auth/session.ts uses.
 */
export async function verifySupabaseToken(token: string): Promise<RealtimeIdentity | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const profile = await loadUserProfile(data.user.id);
  if (!profile) return null;

  return { userId: profile.id, companyId: profile.companyId, roleNames: profile.roleNames };
}
