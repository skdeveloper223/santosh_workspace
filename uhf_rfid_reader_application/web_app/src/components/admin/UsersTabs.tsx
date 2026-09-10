"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function UsersTabs() {
  const pathname = usePathname();
  return (
    <div className="seg" style={{ marginBottom: 16 }}>
      <Link href="/users" className={pathname === "/users" ? "active" : undefined}>
        Users
      </Link>
      <Link href="/users/permissions" className={pathname === "/users/permissions" ? "active" : undefined}>
        Roles &amp; Permissions
      </Link>
    </div>
  );
}
