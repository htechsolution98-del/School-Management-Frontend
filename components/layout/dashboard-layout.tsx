"use client";

import type { ReactNode } from "react";
import { AppShell, type SidebarLink } from "@/components/layout/app-shell";

export type { SidebarLink } from "@/components/layout/app-shell";

interface DashboardLayoutProps {
  children: ReactNode;
  roleTitle: string;
  roleColor?: string;
  sidebarLinks: SidebarLink[];
  userName?: string;
}

/**
 * Every role shares the single AppShell so the sidebar, header and active-pill
 * styling stay identical to the superadmin workspace.
 */
export function DashboardLayout({ children, roleTitle, sidebarLinks, userName = "Admin" }: DashboardLayoutProps) {
  return (
    <AppShell links={sidebarLinks} roleTitle={roleTitle} userName={userName}>
      {children}
    </AppShell>
  );
}
