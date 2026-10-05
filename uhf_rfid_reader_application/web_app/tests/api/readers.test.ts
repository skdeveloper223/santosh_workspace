import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/readers/route";

describe("Readers API Route", () => {
  it("validates payload or RBAC permission on reader creation", async () => {
    const req = new NextRequest("http://localhost:3000/api/readers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Reader",
        ipAddress: "invalid-ip",
        port: 9000,
        locationType: "entryPoint",
        attachTo: { kind: "gate", id: "00000000-0000-0000-0000-000000000001" },
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect([400, 403]).toContain(res.status);
  });
});
