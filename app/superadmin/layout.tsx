"use client";

import React from "react";
import { AdminShell } from "@/components/superadmin/admin-shell";
import { Building2, LayoutDashboard , Sparkles , CreditCard, BadgePercent, History } from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/superadmin", icon: LayoutDashboard, exact: true },
  { title: "Manage Schools", href: "/superadmin/schools", icon: Building2 },
  { title: "Subscriptions", href: "/superadmin/subscriptions", icon: BadgePercent },
  { title: "Features", href: "/superadmin/fetures_select", icon: Sparkles },
  { title: "Activity Logs", href: "/superadmin/activity-logs", icon: History },
  { title: "Razorpay", href: "/superadmin/razorpay", icon: CreditCard },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell links={sidebarLinks}>
      {children}
    </AdminShell>
  );
}

