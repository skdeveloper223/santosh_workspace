"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { IconMenu, IconLogOut, IconSettings, IconShield } from "@/components/icons";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { createSupabaseBrowserClient } from "@/server/db/supabaseBrowser";
import { useToast } from "@/components/ui/Toast";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/tag-detection": "Live Tag Detection Monitor",
  "/readers": "UHF Reader Infrastructure",
  "/organization": "Organization Hierarchy",
  "/vehicles": "Vehicle Fleet & Gate Authorizations",
  "/unknown-entities": "Unknown Entity Detections",
  "/users": "User Accounts & Role Permissions",
  "/users/permissions": "RBAC Permission Matrix",
  "/settings": "System Settings & Theme",
};

export function AdminShell({
  companyName,
  fullName,
  unknownEntitiesPending,
  children,
}: {
  companyName: string;
  fullName: string;
  unknownEntitiesPending: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  const pageTitle = TITLES[pathname] ?? (pathname.startsWith("/vehicles/") ? "Vehicle Governance Detail" : "AIRIS Control Console");

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      toast.info("Signed Out", "You have been safely signed out.");
      router.push("/login");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error signing out.";
      toast.error("Sign-out Error", msg);
    }
  }

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  return (
    <div className="app-shell">
      <Sidebar
        companyName={companyName}
        unknownEntitiesPending={unknownEntitiesPending}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="app-main">
        <div className="app-topbar">
          <button className="iconbtn" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle navigation">
            <IconMenu className="icon" />
          </button>

          <h1 style={{ fontSize: 18, fontWeight: 800 }}>{pageTitle}</h1>

          <div style={{ flex: 1 }} />

          {/* Topbar Actions & Profile Menu */}
          <div className="topbar-actions">
            {/* Quick Theme Switcher */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <ThemeSwitcher />
            </div>

            {/* Profile Menu Dropdown */}
            <div className="profile-menu-container" ref={menuRef}>
              <button
                type="button"
                className="profile-badge-btn"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-expanded={profileOpen}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--color-primary)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {initials}
                </div>
                <span className="profile-name" style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fullName}
                </span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown-menu">
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border)", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text)" }}>{fullName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <IconShield style={{ width: 12, height: 12, color: "var(--color-primary)" }} />
                      <span>{companyName} User</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/settings");
                    }}
                  >
                    <IconSettings style={{ width: 16, height: 16 }} />
                    <span>Preferences & Theme</span>
                  </button>

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={handleSignOut}
                    style={{ color: "var(--color-danger)" }}
                  >
                    <IconLogOut style={{ width: 16, height: 16 }} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
