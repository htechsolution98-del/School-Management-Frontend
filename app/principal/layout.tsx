"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  CalendarCheck,
  BarChart3,
  Percent,
  FileCheck,
  Hash,
  Award,
} from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/principal", icon: LayoutDashboard },
  { title: "Academic Year", href: "/principal/academic-year", icon: Calendar },
  { title: "Result Dashboard", href: "/principal/result/dashboard", icon: BarChart3 },
  { title: "Dynamic Weightage (100%)", href: "/principal/result/weightage", icon: Percent },
  { title: "Exam Management", href: "/principal/result/exams", icon: FileCheck },
  { title: "Seating Allocation", href: "/principal/result/seating", icon: Hash },
  { title: "Result Processing & Publish", href: "/principal/result/publish", icon: Award },
  { title: "Announcements", href: "/principal/announcements", icon: Megaphone },
  { title: "Staff Leave", href: "/principal/leave-requests", icon: CalendarCheck },
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Principal" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
