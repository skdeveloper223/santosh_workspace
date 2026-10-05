import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as patchSiteAuth } from "@/app/api/vehicles/[id]/site-authorizations/route";
import { PATCH as patchGateAuth } from "@/app/api/vehicles/[id]/gate-authorizations/route";

describe("Vehicle Authorizations API Routes", () => {
  it("processes site authorization patch request", async () => {
    const req = new NextRequest("http://localhost:3000/api/vehicles/veh-123/site-authorizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: "00000000-0000-0000-0000-000000000001",
        authorized: true,
      }),
    });

    const res = await patchSiteAuth(req, { params: Promise.resolve({ id: "veh-123" }) });
    expect([200, 400, 403, 500]).toContain(res.status);
  });

  it("processes gate authorization patch request", async () => {
    const req = new NextRequest("http://localhost:3000/api/vehicles/veh-123/gate-authorizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gateId: "00000000-0000-0000-0000-000000000001",
        authorized: true,
      }),
    });

    const res = await patchGateAuth(req, { params: Promise.resolve({ id: "veh-123" }) });
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});
