"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/server/db/supabaseBrowser";
import { useToast } from "@/components/ui/Toast";
import { IconShield, IconAlertTriangle } from "@/components/icons";

const DEMO_ACCOUNTS = [
  { role: "master_admin", email: "master_admin@magnum.airis.dev", label: "Master Admin" },
  { role: "admin", email: "admin@magnum.airis.dev", label: "Admin" },
  { role: "supervisor", email: "supervisor@magnum.airis.dev", label: "Supervisor" },
  { role: "guard", email: "guard@magnum.airis.dev", label: "Guard" },
  { role: "hr", email: "hr@magnum.airis.dev", label: "HR" },
  { role: "employee", email: "employee@magnum.airis.dev", label: "Employee" },
];

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSelectDemo(acc: { role: string; email: string }) {
    setEmail(acc.email);
    setPassword(`${acc.role}@123`);
    setError(null);
    toast.info("Demo Account Selected", `Loaded ${acc.email} (${acc.role}@123)`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email address and password.");
      toast.warning("Missing Fields", "Please enter your credentials.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      
      if (signInError) {
        const errorMsg = "Invalid email or password combination. Check your credentials.";
        setError(errorMsg);
        toast.error("Authentication Failed", errorMsg);
        setSubmitting(false);
        return;
      }

      toast.success("Welcome back!", "Authentication successful. Redirecting to dashboard...");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected authentication error occurred.";
      setError(msg);
      toast.error("Sign-in Error", msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "var(--color-primary-soft)", color: "var(--color-primary)", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
          <IconShield style={{ width: 14, height: 14 }} />
          AIRIS RBAC Auth
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Sign In</h2>
        <p className="sub" style={{ marginTop: 4, color: "var(--color-text-muted)", fontSize: 13.5 }}>
          Enter your issued credentials or select a demo account below.
        </p>
      </div>

      {/* 1-Click Demo Seed Accounts */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Quick Demo Login (Click to Auto-fill)
        </label>
        <div className="demo-accounts-grid">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              className="demo-chip"
              onClick={() => handleSelectDemo(acc)}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)" }} />
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="email" style={{ fontWeight: 600 }}>Email Address</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@magnum.airis.dev"
          disabled={submitting}
        />
      </div>

      <div className="field">
        <label htmlFor="password" style={{ fontWeight: 600 }}>Password</label>
        <div className="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            disabled={submitting}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: "var(--radius-sm)", background: "var(--color-danger-bg)", color: "var(--color-danger)", fontSize: 12.5 }} role="alert">
          <IconAlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ padding: 12, fontWeight: 700, fontSize: 14 }}>
        {submitting ? "Authenticating…" : "Sign In to AIRIS"}
      </button>

      <p style={{ fontSize: 12, color: "var(--color-text-faint)", textAlign: "center", margin: 0 }}>
        Role-based permissions enforcement enabled · <b>Magnum & Ascend</b>
      </p>
    </form>
  );
}
