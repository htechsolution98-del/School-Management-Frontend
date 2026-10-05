"use client";

import type { ReactNode } from "react";
import { AppShell, type SidebarLink } from "@/components/layout/app-shell";

export function AdminShell({ children, links }: { children: ReactNode; links: SidebarLink[] }) {
  return (
    <AppShell links={links} roleTitle="Super Admin" userName="Super Admin">
      {children}
    </AppShell>
  );
}