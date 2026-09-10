import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Component / Route Handler / Server Action client — reads the
 * caller's session from cookies. Never cache or reuse this across requests
 * (see @supabase/ssr's setAll cache-header note); create one per request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render (not an action/route
            // handler) — cookies can't be written there. Session refresh
            // is retried on the next request that can write them.
          }
        },
      },
    },
  );
}
