"use client";

import React from "react";
import {
  LayoutDashboard,
  Package,
  Tags,
  BadgePercent,
  Truck,
  Boxes,
  UserCheck,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/inventory", icon: LayoutDashboard },
  { title: "Items Master", href: "/inventory/items", icon: Package },
  { title: "Categories & Variants", href: "/inventory/categories", icon: Tags },
  { title: "Pricing & Fee Mapping", href: "/inventory/pricing", icon: BadgePercent },
  { title: "Purchases & Suppliers", href: "/inventory/purchases", icon: Truck },
  { title: "Stock & Ledger", href: "/inventory/stock", icon: Boxes },
  { title: "Student Item Issues", href: "/inventory/issue", icon: UserCheck },
  { title: "Replacements & Returns", href: "/inventory/replacements", icon: RefreshCw },
  { title: "Reports & Analytics", href: "/inventory/reports", icon: BarChart3 },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Student Inventory" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
