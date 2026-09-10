import type { NextRequest } from "next/server";

/**
 * §8.3.2 point 2 — explicit allowlist only, never "*" (the legacy system's
 * wide-open CORS was a flagged risk in §1/§4 of the master plan). Configure
 * ALLOWED_ORIGINS as a comma-separated list: the web app's own origin plus
 * the Flutter app's origin(s).
 */
function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function resolveAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  return allowedOrigins().includes(origin) ? origin : null;
}

export function applyCorsHeaders(res: Response, req: NextRequest): Response {
  const allowed = resolveAllowedOrigin(req);
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", allowed);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return res;
}

/** Handles the preflight OPTIONS request centrally so individual routes never implement it. */
export function corsPreflightResponse(req: NextRequest): Response {
  const allowed = resolveAllowedOrigin(req);
  const res = new Response(null, { status: allowed ? 204 : 403 });
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", allowed);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set(
      "Access-Control-Allow-Methods",
      req.headers.get("access-control-request-method") ?? "GET,POST,PATCH,DELETE,OPTIONS",
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      req.headers.get("access-control-request-headers") ?? "Content-Type, Authorization",
    );
  }
  return res;
}
