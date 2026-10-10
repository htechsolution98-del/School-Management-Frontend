"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  FileCheck,
  Megaphone,
  CalendarDays,
  Boxes,
  CalendarCheck,
  CalendarRange,
  Loader2,
  Settings,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getDashboardRoute } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/current-user";

const sidebarLinks = [
  { title: "Dashboard & Attendance", href: "/teacher", icon: LayoutDashboard },
  { title: "Student Attendance", href: "/teacher/student-attendance", icon: Users },
  { title: "Study Materials", href: "/teacher/study-materials", icon: FileText },
  { title: "Homework & Assignments", href: "/teacher/Homework", icon: BookOpen },
  { title: "Marks Entry", href: "/teacher/marks", icon: GraduationCap },
  { title: "Teacher Assessment", href: "/teacher/assessment", icon: ClipboardList },
  { title: "Class Verification", href: "/teacher/verify-marks", icon: FileCheck },
  { title: "Progress Reports", href: "/teacher/progress-reports", icon: FileCheck },
  { title: "Announcements", href: "/teacher/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/teacher/events", icon: CalendarDays },
  { title: "Stock Management", href: "/teacher/stock", icon: Boxes },
  { title: "My Leaves", href: "/teacher/leaves", icon: CalendarCheck },
  { title: "Attendance History", href: "/teacher/attendance", icon: ClipboardList },
  { title: "Exam Timetable", href: "/teacher/exams", icon: CalendarRange },
  { title: "Account Settings", href: "/teacher/settings", icon: Settings },
];

const ALLOWED_TEACHER_ROLES = ["teacher", "staff"];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      // 1. Fast local verification
      try {
        const rawRoles = localStorage.getItem("roles");
        if (rawRoles) {
          const parsed = JSON.parse(rawRoles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map((r) => String(r).toLowerCase().trim());
            const hasAccess = ALLOWED_TEACHER_ROLES.some((r) => normalized.includes(r));
            if (!hasAccess) {
              const dest = getDashboardRoute(parsed);
              window.location.replace(dest && dest !== "/teacher" ? dest : "/login");
              return;
            }
          }
        }
      } catch {}

      // 2. Authoritative server verification
      try {
        const profile = await getCurrentUserProfile();
        if (!active) return;
        const profileRoles = (profile.roles || (profile.role ? [profile.role] : [])).map((r) =>
          String(r).toLowerCase().trim()
        );
        const hasAccess = ALLOWED_TEACHER_ROLES.some((r) => profileRoles.includes(r));
        if (!hasAccess) {
          const dest = getDashboardRoute(profile.roles || (profile.role ? [profile.role] : []));
          window.location.replace(dest && dest !== "/teacher" ? dest : "/login");
          return;
        }

        setIsAuthorized(true);
      } catch {
        if (active) {
          window.location.replace("/login?redirect=/teacher");
        }
      }
    };

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-[#f4f6fb] text-indigo-900 font-semibold">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Checking access…
      </div>
    );
  }

  return (
    <DashboardLayout roleTitle="Teacher" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
