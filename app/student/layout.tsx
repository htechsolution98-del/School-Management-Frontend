"use client";

import {
  LayoutDashboard,
  Users,
  CreditCard,
  BookOpen,
  BookMarked,
  CalendarRange,
  Trophy,
  Megaphone,
  CalendarDays,
  Settings,
  Award,
  Clock,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  {
    title: "Dashboard",
    href: "/student",
    icon: LayoutDashboard,
  },
  {
    title: "Class Timetable",
    href: "/student/timetable",
    icon: Clock,
  },
  {
    title: "Attendance",
    href: "/student/attendance",
    icon: Users,
  },
  {
    title: "Homework",
    href: "/student/homework",
    icon: BookOpen,
  },
  {
    title: "Syllabus",
    href: "/student/syllabus",
    icon: BookMarked,
  },
  {
    title: "Exam Timetable",
    href: "/student/exams",
    icon: CalendarRange,
  },
  {
    title: "My Results",
    href: "/student/results",
    icon: Trophy,
  },
  {
    title: "Pay Fees",
    href: "/student/pay-fees",
    icon: CreditCard,
  },
  {
    title: "Library",
    href: "/student/library",
    icon: BookOpen,
  },
  {
    title: "Certificates",
    href: "/student/certificates",
    icon: Award,
  },
  {
    title: "Announcements",
    href: "/student/announcements",
    icon: Megaphone,
  },
  {
    title: "Events & Holidays",
    href: "/student/events",
    icon: CalendarDays,
  },
  {
    title: "Account Settings",
    href: "/student/settings",
    icon: Settings,
  },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout roleTitle="Student" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}
