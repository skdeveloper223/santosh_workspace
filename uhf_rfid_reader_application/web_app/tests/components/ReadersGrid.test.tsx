/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ReadersGrid } from "@/components/admin/ReadersGrid";
import { ToastProvider } from "@/components/ui/Toast";

const mockReaders = [
  {
    id: "reader-1",
    name: "Gate 1 Reader",
    ipAddress: "10.1.1.10",
    port: 9000,
    locationType: "entryPoint",
    locationName: "Magnum HQ Gate 1",
    isActive: true,
    lastSeenAt: "2026-09-15T22:00:00Z",
  },
];

describe("ReadersGrid Component", () => {
  it("renders readers and online status summary", () => {
    render(
      <ToastProvider>
        <ReadersGrid initialReaders={mockReaders} attachmentOptions={[]} />
      </ToastProvider>
    );

    expect(screen.getByText("1/1 Online")).toBeInTheDocument();
    expect(screen.getByText("Gate 1 Reader")).toBeInTheDocument();
    expect(screen.getByText("10.1.1.10:9000")).toBeInTheDocument();
  });

  it("opens Add Reader modal when button is clicked", () => {
    render(
      <ToastProvider>
        <ReadersGrid initialReaders={[]} attachmentOptions={[]} />
      </ToastProvider>
    );

    const addBtn = screen.getByRole("button", { name: /Add Reader/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Add New Reader")).toBeInTheDocument();
  });
});
