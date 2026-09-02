"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Users, LayoutDashboard, Sparkles, CreditCard, Building2, BadgePercent } from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/superadmin", icon: LayoutDashboard },
  { title: "Schools", href: "/superadmin/schools", icon: Building2 },
  { title: "Subscriptions", href: "/superadmin/subscriptions", icon: BadgePercent },
  { title: "Features", href: "/superadmin/fetures_select", icon: Sparkles },
  { title: "Razorpay", href: "/superadmin/razorpay", icon: CreditCard },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Super Admin" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}

