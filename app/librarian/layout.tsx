"use client";

import React from "react";
<<<<<<< HEAD
import { LayoutDashboard, Megaphone, CalendarDays, Settings, CalendarCheck, Banknote } from "lucide-react";
=======
import {
  LayoutDashboard,
  BookOpen,
  Megaphone,
  CalendarDays,
  Settings,
  CalendarCheck,
  ClipboardList,
} from "lucide-react";
>>>>>>> 5736d01579bdee078f5b013da1bb9a989e5a9b46
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/librarian", icon: LayoutDashboard },
  { title: "Library Management", href: "/librarian/library", icon: BookOpen },
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
