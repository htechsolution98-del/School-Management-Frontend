"use client";

import React from "react";
import {
  LayoutDashboard,
  ReceiptText,
  Clock,
  CalendarDays,
  Banknote,
  Boxes,
  BookOpen,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/fees", icon: LayoutDashboard },
  { title: "Request Supplies", href: "/fees-management/stock-request", icon: Boxes },
  { title: "Student Ledger", href: "/fees/student-ledger", icon: ReceiptText },
  { title: "Daily Cash Register", href: "/fees/cash-register", icon: Banknote },
  { title: "Account Ledger", href: "/fees/account-ledger", icon: BookOpen },
  { title: "My Attendance", href: "/fees/attendance", icon: Clock },
  { title: "My Leaves", href: "/fees/leaves", icon: CalendarDays },
  { title: "My Payslips", href: "/fees/payslips", icon: Banknote },
];

export default function FeesManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Fees Management" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
