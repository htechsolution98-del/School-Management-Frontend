"use client";

import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  FileCheck,
  Megaphone,
  UserCheck,
  ClipboardList,
  Boxes,
  Settings,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/principal", icon: LayoutDashboard },
  { title: "Request Supplies", href: "/vice-principal/stock-request", icon: Boxes },
  { title: "Staff Leave Review", href: "/principal/leave-requests", icon: CalendarDays },
  { title: "Staff Attendance", href: "/principal/staff-attendance", icon: UserCheck },
  { title: "Marks Verification", href: "/principal/result/marks/verification", icon: FileCheck },
  { title: "Announcements", href: "/principal/announcements", icon: Megaphone },
  { title: "Account Settings", href: "/principal/settings", icon: Settings },
];

export default function VicePrincipalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Vice Principal" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
