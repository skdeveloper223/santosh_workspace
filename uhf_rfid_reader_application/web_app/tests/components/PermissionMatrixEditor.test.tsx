/// <reference types="@testing-library/jest-dom" />
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PermissionMatrixEditor } from "@/components/admin/PermissionMatrixEditor";
import { ToastProvider } from "@/components/ui/Toast";

const mockMatrix = {
  roles: [
    { id: "role-1", name: "master_admin", isSystemRole: true },
    { id: "role-2", name: "admin", isSystemRole: true },
  ],
  modules: [
    { key: "users" as const, label: "Users" },
    { key: "vehicles" as const, label: "Vehicles" },
  ],
  cellsByRoleId: {
    "role-1": { users: ["create", "read", "update", "delete"] },
    "role-2": { users: ["read"] },
  },
};

describe("PermissionMatrixEditor Component", () => {
  it("renders role selector and module rows", () => {
    render(
      <ToastProvider>
        <PermissionMatrixEditor matrix={mockMatrix} />
      </ToastProvider>
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Vehicles")).toBeInTheDocument();
  });

  it("locks master_admin checkboxes by design", () => {
    render(
      <ToastProvider>
        <PermissionMatrixEditor matrix={mockMatrix} />
      </ToastProvider>
    );

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    checkboxes.forEach((cb) => {
      expect(cb.disabled).toBe(true);
    });
  });
});
