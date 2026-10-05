/// <reference types="@testing-library/jest-dom" />
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { VehicleAuthEditor } from "@/components/admin/VehicleAuthEditor";
import { ToastProvider } from "@/components/ui/Toast";

const mockVehicleDetail = {
  id: "veh-1",
  plateNumber: "MA-4W-001",
  type: "4-wheeler",
  ownerName: "Magnum Supervisor",
  createdAt: "2026-09-15T22:00:00Z",
  updatedAt: "2026-09-15T22:00:00Z",
  sites: [
    {
      siteId: "site-1",
      name: "Magnum HQ",
      authorized: true,
      gates: [
        { gateId: "gate-1", name: "Magnum HQ Gate 1", authorized: true },
        { gateId: "gate-2", name: "Magnum HQ Gate 2", authorized: false },
      ],
    },
  ],
};

describe("VehicleAuthEditor Component", () => {
  it("renders site and gate authorization checkboxes", () => {
    render(
      <ToastProvider>
        <VehicleAuthEditor vehicleId="veh-1" initial={mockVehicleDetail} />
      </ToastProvider>
    );

    expect(screen.getByText("Magnum HQ")).toBeInTheDocument();
    expect(screen.getByText("Magnum HQ Gate 1")).toBeInTheDocument();
    expect(screen.getByText("Magnum HQ Gate 2")).toBeInTheDocument();
  });
});
