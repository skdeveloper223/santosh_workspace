/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function TestComponent() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("Success Title", "Success details")}>Trigger Success</button>
      <button onClick={() => toast.error("Error Title", "Error details")}>Trigger Error</button>
    </div>
  );
}

describe("ToastProvider System", () => {
  it("renders toast notifications on trigger", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Success"));
    expect(screen.getByText("Success Title")).toBeInTheDocument();
    expect(screen.getByText("Success details")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Trigger Error"));
    expect(screen.getByText("Error Title")).toBeInTheDocument();
  });

  it("dismisses toast when close button is clicked", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Success"));
    const closeBtn = screen.getByLabelText("Dismiss notification");
    fireEvent.click(closeBtn);

    expect(screen.queryByText("Success Title")).not.toBeInTheDocument();
  });
});
