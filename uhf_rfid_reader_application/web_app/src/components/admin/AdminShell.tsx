"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { IconMenu } from "@/components/icons";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tag-detection": "Tag Detection Monitor",
  "/readers": "Reader Configuration",
  "/organization": "Organization",
  "/vehicles": "Vehicles",
  "/unknown-entities": "Unknown Entities",
  "/users": "Users & Roles",
  "/users/permissions": "Roles & Permissions",
  "/settings": "Settings & Theme",
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
  const pathname = usePathname();
  const pageTitle = TITLES[pathname] ?? (pathname.startsWith("/vehicles/") ? "Vehicle Detail" : "AIRIS");

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
          <h1>{pageTitle}</h1>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: "var(--color-text-muted)", fontWeight: 600 }}>{fullName}</span>
        </div>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
