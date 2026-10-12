"use client";
import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FileText, LayoutDashboard, School, Megaphone, CalendarDays, Settings, Award } from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { title: "Certificates", href: "/parent/certificates", icon: Award },
  { title: "Announcements", href: "/parent/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/parent/events", icon: CalendarDays },
  { title: "Account Settings", href: "/parent/settings", icon: Settings },
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Parent" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
