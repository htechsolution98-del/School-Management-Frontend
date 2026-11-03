"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Award,
  CalendarCheck,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Megaphone,
  Settings,
} from "lucide-react";
import { capitalizeWords } from "@/lib/utils";

const sidebarLinks = [
  { title: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { title: "Child Attendance", href: "/parent/attendance", icon: CalendarCheck },
  { title: "Child Marksheet", href: "/parent/marksheets", icon: Award },
  { title: "Certificates", href: "/parent/certificates", icon: FileText },
  { title: "Announcements", href: "/parent/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/parent/events", icon: CalendarDays },
  { title: "Account Settings", href: "/parent/settings", icon: Settings },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState("Parent");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user") || localStorage.getItem("username");
      if (stored) {
        if (stored.startsWith("{")) {
          const u = JSON.parse(stored);
          const raw = u.name || u.first_name || u.username || "";
          if (raw && !/^\d+$/.test(raw.trim()) && raw.trim().toLowerCase() !== "parent") {
            setUserName(capitalizeWords(raw.trim()));
          }
        } else if (!/^\d+$/.test(stored.trim()) && stored.trim().toLowerCase() !== "parent") {
          setUserName(capitalizeWords(stored.trim()));
        }
      }
    } catch {}
  }, []);

  return (
    <DashboardLayout roleTitle="Parent" userName={userName} sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
