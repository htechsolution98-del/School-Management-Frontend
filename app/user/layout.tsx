"use client";

import React, { useEffect, useState } from "react";
import { LayoutDashboard, Megaphone, CalendarDays, Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { capitalizeWords } from "@/lib/utils";

const sidebarLinks = [
  { title: "Dashboard", href: "/user", icon: LayoutDashboard },
  { title: "Announcements", href: "/user/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/user/events", icon: CalendarDays },
  { title: "Account Settings", href: "/user/settings", icon: Settings },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState("Applicant");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user") || localStorage.getItem("username");
      if (stored) {
        if (stored.startsWith("{")) {
          const u = JSON.parse(stored);
          const raw = u.name || u.first_name || u.username || "";
          if (raw && !/^\d+$/.test(raw.trim()) && raw.trim().toLowerCase() !== "applicant") {
            setUserName(capitalizeWords(raw.trim()));
          }
        } else if (!/^\d+$/.test(stored.trim()) && stored.trim().toLowerCase() !== "applicant") {
          setUserName(capitalizeWords(stored.trim()));
        }
      }
    } catch {}
  }, []);

  return (
    <DashboardLayout roleTitle="Applicant" userName={userName} sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
