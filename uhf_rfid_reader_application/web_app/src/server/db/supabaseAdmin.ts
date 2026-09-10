// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely. Never import this from a
 * Client Component or expose it to the browser. Used for: creating Auth
 * users (no self-signup, §8.2 point 3), and service-layer reads/writes that
 * assertPermission() has already authorized.
 *
 * Lazily constructed behind a Proxy: this repo has no live Supabase project
 * configured yet (§8.9), so importing this module must not throw during
 * `next build`'s route collection — only an actual query, at request time,
 * should fail if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing.
 */
let client: SupabaseClient | undefined;
function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
