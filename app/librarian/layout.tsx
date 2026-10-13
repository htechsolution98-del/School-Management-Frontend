"use client";

import React from "react";
import { LayoutDashboard, Megaphone, CalendarDays, Settings, CalendarCheck, Banknote } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/librarian", icon: LayoutDashboard },
  { title: "My Leaves", href: "/librarian/leaves", icon: CalendarCheck },
  { title: "My Payslips", href: "/librarian/payslips", icon: Banknote },
  { title: "Announcements", href: "/librarian/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/librarian/events", icon: CalendarDays },
  { title: "Account Settings", href: "/librarian/settings", icon: Settings },
];

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Librarian" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
