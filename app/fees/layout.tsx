"use client";

import React from "react";
import {
  LayoutDashboard,
  Calendar,
  ReceiptText,
  Tags,
  Layers,
  CreditCard,
  Megaphone,
  CalendarDays,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { 
    title: "Dashboard", 
    href: "/fees", 
    icon: LayoutDashboard,
    exact: true,
  },
  { 
    title: "Academic Year", 
    href: "/fees/academic-year", 
    icon: Calendar,
  },
  { 
    title: "Fee Types",           
    href: "/fees/fee-types",      
    icon: Tags,
  },
  { 
    title: "Fee Structure", 
    href: "/fees/fee-structure", 
    icon: Layers,
  },
  { 
    title: "Generate Fee", 
    href: "/fees/Genrate-Fees", 
    icon: CreditCard,
  },
  { 
    title: "Student Ledger", 
    href: "/fees/student-ledger", 
    icon: ReceiptText,
  },
  { 
    title: "Announcements", 
    href: "/fees/announcements", 
    icon: Megaphone,
  },
  { 
    title: "Events & Holidays", 
    href: "/fees/events", 
    icon: CalendarDays,
  },
];

export default function FeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout roleTitle="Fees" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}



