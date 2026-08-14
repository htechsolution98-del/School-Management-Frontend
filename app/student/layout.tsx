"use client";

import { LayoutDashboard, Users, CreditCard, BookOpen, BookMarked, CalendarRange, Trophy } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  {
    title: "Dashboard",
    href: "/student",
    icon: LayoutDashboard,
  },
  {
    title: "Attendance",
    href: "/student/attendance",
    icon: Users,
  },
  {
    title: "Syllabus",
    href: "/student/syllabus",
    icon: BookMarked,
  },
  {
    title: "Homework",
    href: "/student/homework",
    icon: BookOpen,
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


