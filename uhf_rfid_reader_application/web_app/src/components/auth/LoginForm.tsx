"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/server/db/supabaseBrowser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError("That email and password combination doesn't match our records.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 21 }}>Sign in</h2>
        <p className="sub" style={{ marginTop: 6, color: "var(--color-text-muted)" }}>
          Use the credentials issued by your administrator.
        </p>
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.airis.dev"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: 0 }} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ padding: 11 }}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p style={{ fontSize: 11.5, color: "var(--color-text-faint)", textAlign: "center", margin: 0 }}>
        No self-signup — accounts are created and role-assigned by <b>master_admin</b>.
      </p>
    </form>
  );
}
