import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/server/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";
import { IconRfid, IconRadio, IconShield, IconBuilding } from "@/components/icons";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;
  if (user) redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexWrap: "wrap", background: "var(--color-bg)" }}>
      {/* High-tech Left Hero Banner */}
      <div
        style={{
          flex: "1 1 420px",
          background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 40px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow & wave decoration */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-10%",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconRfid style={{ stroke: "#60a5fa", width: 22, height: 22 }} />
            </div>
            <span>AIRIS <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 600 }}>NEXT.JS</span></span>
          </div>

          <div style={{ marginTop: 48 }}>
            <h1 style={{ color: "#fff", fontSize: 32, lineHeight: 1.25, fontWeight: 800, maxWidth: 420 }}>
              Enterprise UHF RFID Access & Tracking Console
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", marginTop: 14, maxWidth: 400, fontSize: 14, lineHeight: 1.6 }}>
              Unified RBAC permissions, live hardware event ingestion, org hierarchy management, and real-time gate automation.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                <IconShield style={{ width: 18, height: 18, color: "#4ade80" }} />
                <span>Role-Based Access Control (RBAC) with permission matrix</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                <IconRadio style={{ width: 18, height: 18, color: "#38bdf8" }} />
                <span>Live Socket.IO tag & ANPR vehicle detections</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                <IconBuilding style={{ width: 18, height: 18, color: "#c084fc" }} />
                <span>Multi-site org hierarchy (Magnum & Ascend)</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>AIRIS Security Engine v2.0</span>
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600 }}>Supabase Auth · PostgreSQL</span>
        </div>
      </div>

      {/* Right Login Card Container */}
      <div style={{ flex: "1 1 380px", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        {configured ? (
          <div style={{ width: "100%", maxWidth: 420, padding: 32, borderRadius: "var(--radius-xl)", background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-lg)" }}>
            <LoginForm />
          </div>
        ) : (
          <div className="card card-pad" style={{ maxWidth: 360, textAlign: "center" }}>
            <b style={{ fontSize: 16 }}>Supabase isn&apos;t configured yet</b>
            <p className="sub" style={{ marginTop: 8, fontSize: 13 }}>
              Copy <span className="tag-code">.env.example</span> to <span className="tag-code">.env.local</span>, fill in your
              Supabase project keys, run <span className="tag-code">npm run seed</span>, then reload this page to sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
