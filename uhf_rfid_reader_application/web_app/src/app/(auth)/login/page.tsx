import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/server/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";
import { IconRfid } from "@/components/icons";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;
  if (user) redirect("/dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          flex: 1,
          background: "linear-gradient(155deg, var(--color-primary), var(--color-accent))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 40,
          color: "#fff",
          minWidth: 280,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>
          <IconRfid style={{ stroke: "#fff", width: 22, height: 22 }} />
          AIRIS
        </div>
        <div>
          <h2 style={{ color: "#fff", fontSize: 28, maxWidth: 320 }}>Enterprise access control, unified.</h2>
          <p style={{ color: "rgba(255,255,255,.85)", marginTop: 10, maxWidth: 320, fontSize: 13.5 }}>
            One RBAC engine, one org hierarchy, one live event bus — for every gate, warehouse and checkpoint.
          </p>
        </div>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 11.5 }}>Magnum · Ascend</p>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, minWidth: 320 }}>
        {configured ? (
          <LoginForm />
        ) : (
          <div className="card card-pad" style={{ maxWidth: 340 }}>
            <b>Supabase isn&apos;t configured yet</b>
            <p className="sub" style={{ marginTop: 8 }}>
              Copy <span className="tag-code">.env.example</span> to <span className="tag-code">.env.local</span>, fill in a local
              (<span className="tag-code">supabase start</span>) or hosted project&apos;s values, run{" "}
              <span className="tag-code">npm run seed</span>, then reload this page to sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
