"use client";
import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Users, LayoutDashboard, Layers, ReceiptText, CreditCard, Megaphone } from "lucide-react";

const sidebarLinks = [
  { title: "Staff", href: "/trustee", icon: Users },
  { title: "Salary Components", href: "/trustee/salary-components", icon: Layers },
  { title: "Staff Salary", href: "/trustee/staff-salary", icon: Users },
  { title: "Generate Salary", href: "/trustee/generate-salary", icon: ReceiptText },
  { title: "Subscription & Billing", href: "/trustee/subscription", icon: CreditCard },
  { title: "Announcements", href: "/trustee/announcements", icon: Megaphone },
  // { title: "Overview", href: "/trustee/dashboard", icon: LayoutDashboard },
];

export default function TrusteeLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Trustee" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
