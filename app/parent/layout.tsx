"use client";
import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FileText, LayoutDashboard, School, Megaphone } from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { title: "Announcements", href: "/parent/announcements", icon: Megaphone },
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Parent" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
