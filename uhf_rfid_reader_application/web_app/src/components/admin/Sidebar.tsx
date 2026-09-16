"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconGrid,
  IconRadio,
  IconBuilding,
  IconCar,
  IconAlertTriangle,
  IconShield,
  IconSettings,
  IconRfid,
  IconWifi,
  IconX,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IconGrid },
  { href: "/tag-detection", label: "Tag Detection", icon: IconRadio },
  { href: "/readers", label: "Readers", icon: IconWifi },
  { href: "/organization", label: "Organization", icon: IconBuilding },
  { href: "/vehicles", label: "Vehicles", icon: IconCar },
  { href: "/unknown-entities", label: "Unknown Entities", icon: IconAlertTriangle },
  { href: "/users", label: "Users & Roles", icon: IconShield },
  { href: "/settings", label: "Settings", icon: IconSettings },
] as const;

export function Sidebar({
  companyName,
  unknownEntitiesPending,
  mobileOpen,
  onNavigate,
}: {
  companyName: string;
  unknownEntitiesPending: number;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onNavigate}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <div className="brandrow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brandmark">
              <IconRfid style={{ stroke: "#fff", width: 18, height: 18 }} />
            </div>
            <div className="brandtext">
              <div className="l1">AIRIS</div>
              <div className="l2">{companyName}</div>
            </div>
          </div>
          {mobileOpen && (
            <button
              onClick={onNavigate}
              style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 4 }}
              aria-label="Close sidebar"
            >
              <IconX style={{ width: 18, height: 18 }} />
            </button>
          )}
        </div>

        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`navitem${active ? " active" : ""}`}
              onClick={onNavigate}
            >
              <Icon />
              <span className="navlabel">{item.label}</span>
              {item.href === "/unknown-entities" && unknownEntitiesPending > 0 && (
                <span className="navbadge">{unknownEntitiesPending}</span>
              )}
            </Link>
          );
        })}

        <div className="sidebar-foot">
          <span className="dot" style={{ background: "var(--color-success)", boxShadow: "0 0 8px var(--color-success)" }} />
          <span className="navlabel">System Online</span>
        </div>
      </aside>
    </>
  );
}
