"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  CalendarCheck,
  BarChart3,
  Percent,
  FileCheck,
  Hash,
  Award,
  CalendarDays,
  Clock,
  Settings,
  ClipboardList,
  CheckSquare,
  UserCheck,
  Sparkles,
  Eye,
  ShieldCheck,
  Send,
  GraduationCap,
} from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/principal", icon: LayoutDashboard },
  { title: "Academic Year", href: "/principal/academic-year", icon: Calendar },
  { title: "Result Dashboard", href: "/principal/result/dashboard", icon: BarChart3 },
  { title: "Result Weightage", href: "/principal/result/weightage", icon: Percent },
  {
    title: "Exam Management",
    href: "/principal/result/exams",
    icon: FileCheck,
    subLinks: [
      { title: "Exam Configuration", href: "/principal/result/exams", icon: Settings },
      { title: "Exam Schedule", href: "/principal/result/exams/schedule", icon: CalendarDays },
      { title: "Exam Timetable", href: "/principal/result/exams/timetable", icon: Clock },
      { title: "Seating Arrangement", href: "/principal/result/seating", icon: Hash },
    ],
  },
  {
    title: "Marks Management",
    href: "/principal/result/marks/overview",
    icon: ClipboardList,
    subLinks: [
      { title: "Marks Overview", href: "/principal/result/marks/overview", icon: Eye },
      { title: "Marks Verification", href: "/principal/result/marks/verification", icon: CheckSquare },
      { title: "Teacher Assessment", href: "/principal/result/marks/assessment", icon: UserCheck },
    ],
  },
  {
    title: "Result Processing",
    href: "/principal/result/processing/preview",
    icon: Sparkles,
    subLinks: [
      { title: "Result Preview", href: "/principal/result/processing/preview", icon: Eye },
      { title: "Result Verification", href: "/principal/result/processing/verification", icon: ShieldCheck },
      { title: "Result Publish", href: "/principal/result/publish", icon: Send },
    ],
  },
  { title: "Published Results", href: "/principal/result/published", icon: Award },
  { title: "Announcements", href: "/principal/announcements", icon: Megaphone },
  { title: "Staff Leave", href: "/principal/leave-requests", icon: CalendarCheck },
  { title: "Attendance Exceptions", href: "/principal/attendance-exceptions", icon: Clock },
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Principal" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
