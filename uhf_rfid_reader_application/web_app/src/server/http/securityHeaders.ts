/**
 * §8.3.2 point 1 — the Next.js equivalent of Express's helmet(). Applied
 * globally via headers() in next.config.ts (covers pages + API routes with
 * zero per-route code) AND re-asserted here on every API response, so an API
 * route is never accidentally missing them even if next.config.ts changes.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Starts restrictive per §8.8 — widen with a documented reason per directive
  // once camera HLS embeds etc. are known (Phase 6).
  "Content-Security-Policy": "default-src 'self'",
};

export function applySecurityHeaders(res: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}
