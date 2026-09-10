import type { NextRequest } from "next/server";
import { resolveApiUser } from "@/server/auth/resolveApiUser";
import type { CurrentUser } from "@/server/auth/session";
import { getPermissionGrants, grantsInclude } from "@/server/permissions/getPermissions";
import type { ModuleKey, PermissionAction } from "@/server/permissions/modules";
import { applySecurityHeaders } from "./securityHeaders";
import { applyCorsHeaders, corsPreflightResponse } from "./cors";
import { checkRateLimit, type RateLimitOptions } from "./rateLimit";
import { fail } from "./respond";

export type ApiContext<Params = Record<string, string>> = {
  params: Promise<Params>;
};

export type ApiExtras = { user: CurrentUser | null };

export type WithApiMiddlewareOptions = {
  rateLimit?: RateLimitOptions;
  /** Requiring a permission implies requiring a signed-in user. */
  permission?: { module: ModuleKey | string; action: PermissionAction | string; scopeId?: string };
};

/**
 * §8.3.2 — every route handler in the app is wrapped in this, no exceptions.
 * Composes, in order: CORS preflight, rate limiting, security headers,
 * auth + permission guard. Thin handlers do zod parse -> service call ->
 * ok()/fail() (see src/server/http/respond.ts) and receive the resolved user.
 *
 * @example
 * export const POST = withApiMiddleware(
 *   async (req, ctx, { user }) => { ... },
 *   { rateLimit: { points: 20, durationSeconds: 60 }, permission: { module: "vehicles", action: "create" } },
 * );
 */
export function withApiMiddleware<Params = Record<string, string>>(
  handler: (req: NextRequest, ctx: ApiContext<Params>, extras: ApiExtras) => Promise<Response>,
  options: WithApiMiddlewareOptions = {},
) {
  return async (req: NextRequest, ctx: ApiContext<Params>): Promise<Response> => {
    if (req.method === "OPTIONS") return corsPreflightResponse(req);

    const user = await resolveApiUser(req);

    const rateLimitId = user?.id ?? req.headers.get("x-forwarded-for") ?? "anonymous";
    if (options.rateLimit) {
      const result = await checkRateLimit(`${req.nextUrl.pathname}:${rateLimitId}`, options.rateLimit);
      if (!result.allowed) {
        const res = fail(429, "Too many requests — please slow down.");
        res.headers.set("Retry-After", String(result.retryAfterSeconds));
        return finalize(res, req);
      }
    }

    if (options.permission) {
      if (!user) return finalize(fail(401, "Sign in required."), req);
      const grants = await getPermissionGrants(user.id);
      const allowed = grantsInclude(
        grants,
        options.permission.module,
        options.permission.action,
        options.permission.scopeId,
      );
      if (!allowed) {
        return finalize(
          fail(403, `Missing permission: ${options.permission.module}:${options.permission.action}`),
          req,
        );
      }
    }

    try {
      const res = await handler(req, ctx, { user });
      return finalize(res, req);
    } catch (err) {
      console.error(`[api] ${req.nextUrl.pathname} threw:`, err);
      return finalize(fail(500, "Internal server error."), req);
    }
  };
}

function finalize(res: Response, req: NextRequest): Response {
  return applyCorsHeaders(applySecurityHeaders(res), req);
}
