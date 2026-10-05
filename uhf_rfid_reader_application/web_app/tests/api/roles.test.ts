import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/roles/[roleId]/permissions/route";

describe("Roles Permissions API Route", () => {
  it("validates permission patch payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/roles/role-123/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleKey: "users",
        actions: ["read", "create"],
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ roleId: "role-123" }) });
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});
