/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoginForm } from "@/components/auth/LoginForm";
import { ToastProvider } from "@/components/ui/Toast";

describe("LoginForm Component", () => {
  it("renders email and password inputs", () => {
    render(
      <ToastProvider>
        <LoginForm />
      </ToastProvider>
    );

    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In to AIRIS" })).toBeInTheDocument();
  });

  it("populates credentials when a demo account chip is clicked", () => {
    render(
      <ToastProvider>
        <LoginForm />
      </ToastProvider>
    );

    const masterAdminChip = screen.getByRole("button", { name: /Master Admin/i });
    fireEvent.click(masterAdminChip);

    const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;

    expect(emailInput.value).toBe("master_admin@magnum.airis.dev");
    expect(passwordInput.value).toBe("master_admin@123");
  });

  it("toggles password visibility when eye button is clicked", () => {
    render(
      <ToastProvider>
        <LoginForm />
      </ToastProvider>
    );

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const toggleBtn = screen.getByLabelText("Show password");

    expect(passwordInput.type).toBe("password");
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");
  });
});
