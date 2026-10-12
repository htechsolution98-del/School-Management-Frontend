"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Users, LayoutDashboard, CreditCard, Megaphone, CalendarDays, Settings, History, Package, BookOpen, GraduationCap } from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/trustee", icon: LayoutDashboard },
  { title: "Staff Management", href: "/trustee/staff-management", icon: Users },
  { title: "Inventory Stock Report", href: "/trustee/inventory-report", icon: Package },
  { title: "Library Report", href: "/trustee/library-report", icon: BookOpen },
  { title: "Student Management & Reports", href: "/trustee/student-report", icon: GraduationCap },
  { title: "Subscription & Billing", href: "/trustee/subscription", icon: CreditCard },
  { title: "Announcements", href: "/trustee/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/trustee/events", icon: CalendarDays },
  { title: "Activity Logs", href: "/trustee/activity-logs", icon: History },
  { title: "Support & Helpdesk", href: "/trustee/support", icon: Megaphone },
  { title: "Account Settings", href: "/trustee/settings", icon: Settings },
  // { title: "Overview", href: "/trustee/dashboard", icon: LayoutDashboard },
];

export default function TrusteeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const restricted = ["/trustee/staff-status", "/trustee/salary-components", "/trustee/staff-salary", "/trustee/generate-salary"].some(route => pathname === route || pathname.startsWith(`${route}/`));
  return (
    <DashboardLayout roleTitle="Trustee" sidebarLinks={sidebarLinks}>
      {restricted ? <div className="rounded-2xl border bg-white p-6"><h1 className="text-xl font-bold">Trustee staff access is read-only</h1><p className="my-3 text-slate-600">View staff, attendance, leave and authorized salary reports in Staff Management.</p><Link href="/trustee/staff-management" className="font-semibold text-teal-700 underline">Open Staff Management</Link></div> : children}
    </DashboardLayout>
  );
}
