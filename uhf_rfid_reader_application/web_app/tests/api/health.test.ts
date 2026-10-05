import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as readyGET } from "@/app/api/ready/route";

describe("Health & Readiness API Routes", () => {
  it("returns 200 OK for GET /api/health", async () => {
    const req = new NextRequest("http://localhost:3000/api/health");
    const res = await healthGET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("airis-web");
    expect(body.data.time).toBeDefined();
  });

  it("returns readiness probe payload for GET /api/ready", async () => {
    const req = new NextRequest("http://localhost:3000/api/ready");
    const res = await readyGET(req, { params: Promise.resolve({}) });
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body.data || body.error).toBeDefined();
  });
});
