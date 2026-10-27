"use client";

import React from "react";
import {
  LayoutDashboard,
  Truck,
  Boxes,
  Clock,
  CalendarCheck,
  Megaphone,
  CalendarDays,
  Settings,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { title: "Request Supplies", href: "/transportation/stock-request", icon: Boxes },
  { title: "My Attendance", href: "/teacher/my-attendance", icon: Clock },
  { title: "My Leaves", href: "/teacher/leaves", icon: CalendarCheck },
  { title: "Announcements", href: "/teacher/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/teacher/events", icon: CalendarDays },
  { title: "Account Settings", href: "/teacher/settings", icon: Settings },
];

export default function TransportationLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Transportation" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
