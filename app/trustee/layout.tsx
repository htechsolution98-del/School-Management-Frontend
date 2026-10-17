"use client";
import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Users,
  LayoutDashboard,
  CreditCard,
  Megaphone,
  CalendarDays,
  Settings,
  History,
  CalendarCheck,
  Package,
  BookOpen,
  GraduationCap,
  FileText,
  UserCheck,
  UserPlus,
  LifeBuoy,
  Banknote,
  Layers,
  ReceiptText,
} from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/trustee", icon: LayoutDashboard },
  {
    title: "Staff Management",
    href: "/trustee/staff-management",
    icon: Users,
    subLinks: [
      { title: "Staff Directory & Reports", href: "/trustee/staff-management", icon: Users },
      { title: "+ Add / Manage Staff", href: "/trustee/staff", icon: UserPlus },
      { title: "Leave & Approvals", href: "/trustee/leave-requests", icon: CalendarCheck },
    ],
  },
  {
    title: "Payroll & Salary",
    href: "/trustee/staff-salary",
    icon: Banknote,
    subLinks: [
      { title: "Salary Components", href: "/trustee/salary-components", icon: Layers },
      { title: "Staff Salary", href: "/trustee/staff-salary", icon: Users },
      { title: "Generate Salary", href: "/trustee/generate-salary", icon: ReceiptText },
    ],
  },
  {
    title: "Reports & Audit",
    href: "/trustee/reports",
    icon: FileText,
    subLinks: [
      { title: "Student Reports", href: "/trustee/student-report", icon: GraduationCap },
      { title: "Inventory Stock", href: "/trustee/inventory-report", icon: Package },
      { title: "Library Stock", href: "/trustee/library-report", icon: BookOpen },
    ],
  },
  { title: "Subscription & Billing", href: "/trustee/subscription", icon: CreditCard },
  { title: "Announcements", href: "/trustee/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/trustee/events", icon: CalendarDays },
  { title: "Activity Logs", href: "/trustee/activity-logs", icon: History },
  { title: "Support & Helpdesk", href: "/trustee/support", icon: LifeBuoy },
  { title: "Account Settings", href: "/trustee/settings", icon: Settings },
];

export default function TrusteeLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Trustee" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
