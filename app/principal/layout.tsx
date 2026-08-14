"use client";
import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FileText, LayoutDashboard, School, Users, Calendar, Megaphone, CalendarCheck, Settings } from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/principal", icon: LayoutDashboard },
  { title: "Academic Year", href: "/principal/academic-year", icon: Calendar },
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

