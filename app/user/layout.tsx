"use client";

import React from "react";
import { LayoutDashboard, FileText, Upload, HelpCircle, Megaphone, CalendarDays, Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/user", icon: LayoutDashboard },
  { title: "Announcements", href: "/user/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/user/events", icon: CalendarDays },
  { title: "Account Settings", href: "/user/settings", icon: Settings },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Applicant" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
