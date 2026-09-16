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
  // Properly configured CSP directives allowing inline styles, Next.js hydration scripts, Google Fonts, images, and Supabase connections.
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https: wss: ws: http:;",
};

export function applySecurityHeaders(res: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}
