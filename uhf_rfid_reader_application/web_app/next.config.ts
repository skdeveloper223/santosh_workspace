import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/server/http/securityHeaders";

const nextConfig: NextConfig = {
  // §8.3.2 point 1a — applied globally so pages *and* API routes get them with
  // zero per-route code; withApiMiddleware re-asserts the same set on API
  // responses specifically (point 1b) so they're never accidentally missing.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
