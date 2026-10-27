"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Boxes,
  ClipboardList,
  CalendarCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/clerk", icon: LayoutDashboard },
  { title: "Request Supplies", href: "/assistant-clerk/stock-request", icon: Boxes },
  { title: "Manual Admission", href: "/clerk/manual-admission", icon: FileText },
  { title: "Student Directory", href: "/clerk/students", icon: Users },
  { title: "My Attendance", href: "/clerk/my-attendance", icon: ClipboardList },
  { title: "My Leaves", href: "/clerk/leaves", icon: CalendarCheck },
];

export default function AssistantClerkLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Assistant Clerk" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
