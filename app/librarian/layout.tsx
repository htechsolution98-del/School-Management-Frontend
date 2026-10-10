"use client";

import React from "react";
import { LayoutDashboard, Megaphone, CalendarDays } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/librarian", icon: LayoutDashboard },
  { title: "Announcements", href: "/librarian/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/librarian/events", icon: CalendarDays },
];

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Librarian" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
