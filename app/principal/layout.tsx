"use client";
import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FileText, LayoutDashboard, School,Users, Calendar, Megaphone } from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/principal", icon: LayoutDashboard },
  { title: "Academic Year", href: "/principal/academic-year", icon: Calendar },
  { title: "Admission Form", href: "/principal/admission-form", icon: FileText },
  { title: "Classes", href: "/principal/classes", icon: School },
  { title: "Temp Users", href: "/principal/temp-users", icon: Users }, 
  { title: "Announcements", href: "/principal/announcements", icon: Megaphone },
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Principal" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
} 

