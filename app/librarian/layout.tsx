"use client";

import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  Megaphone,
  CalendarDays,
  Settings,
  CalendarCheck,
  ClipboardList,
  Banknote,
  Boxes,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/librarian", icon: LayoutDashboard },
  { title: "Library Management", href: "/librarian/library", icon: BookOpen },
  { title: "Request Supplies", href: "/librarian/stock-request", icon: Boxes },
  { title: "My Attendance", href: "/librarian/attendance", icon: ClipboardList },
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
