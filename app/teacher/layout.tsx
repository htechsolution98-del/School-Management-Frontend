"use client";

import React from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  FileCheck,
  Megaphone,
  Boxes,
  CalendarCheck,
  CalendarRange,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard & Attendance", href: "/teacher", icon: LayoutDashboard },
  { title: "Student Attendance", href: "/teacher/student-attendance", icon: Users },
  { title: "Study Materials", href: "/teacher/study-materials", icon: FileText },
  { title: "Homework & Assignments", href: "/teacher/Homework", icon: BookOpen },
  { title: "Enter & Verify Marks", href: "/teacher/marks", icon: GraduationCap },
  { title: "Progress Reports", href: "/teacher/progress-reports", icon: FileCheck },
  { title: "Announcements", href: "/teacher/announcements", icon: Megaphone },
  { title: "Stock Management", href: "/teacher/stock", icon: Boxes },
  { title: "My Leaves", href: "/teacher/leaves", icon: CalendarCheck },
  { title: "Attendance History", href: "/teacher/attendance", icon: ClipboardList },
  { title: "Exam Timetable", href: "/teacher/exams", icon: CalendarRange },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout roleTitle="Teacher" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
