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
  Bell,
  Layers,
  ArrowRightLeft,
  BookmarkPlus,
  Clock,
  ShieldCheck,
  BarChart3,
  Sliders,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/librarian", icon: LayoutDashboard, exact: true },
  {
    title: "Library Management",
    href: "/librarian/library",
    icon: BookOpen,
    subLinks: [
      { title: "Racks & Storage", href: "/librarian/library?tab=masters", icon: Layers },
      { title: "Book Catalog", href: "/librarian/library?tab=catalog", icon: BookOpen },
      { title: "Issue & Return", href: "/librarian/library?tab=circulation", icon: ArrowRightLeft },
      { title: "Book Reservations", href: "/librarian/library?tab=reservations", icon: BookmarkPlus },
      { title: "Borrowing History", href: "/librarian/library?tab=history", icon: Clock },
      { title: "Student Clearance", href: "/librarian/library?tab=clearance", icon: ShieldCheck },
      { title: "Reports & Audit", href: "/librarian/library?tab=reports", icon: BarChart3 },
      { title: "Rules & Policies", href: "/librarian/library?tab=settings", icon: Sliders },
    ],
  },
  { title: "Notifications", href: "/librarian/notifications", icon: Bell },
  { title: "My Attendance", href: "/librarian/attendance", icon: ClipboardList },
  { title: "My Leaves", href: "/librarian/leaves", icon: CalendarCheck },
  { title: "My Payslips", href: "/librarian/payslips", icon: Banknote },
  { title: "Announcements", href: "/librarian/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/librarian/events", icon: CalendarDays },
  { title: "Account Settings", href: "/librarian/settings", icon: Settings },
];

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Librarian" sidebarLinks={sidebarLinks} noPadding>
      {children}
    </DashboardLayout>
  );
}
