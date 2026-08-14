"use client";

import React from "react";
import {
  LayoutDashboard,
  LayoutGrid,
  BookOpen,
  FileText,
  Plus,
  Users,
  MapPin,
  Calendar,
  CalendarCheck,
  Settings,
  School,
  Layers,
  UserPlus,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const sidebarLinks = [
  { title: "Dashboard", href: "/clerk", icon: LayoutDashboard },
  {
    title: "HR Management",
    href: "/clerk/hr", // dummy href to group, or could omit if not strictly navigating
    icon: Users,
    subLinks: [
      { title: "Departments", href: "/clerk/departments", icon: Users },
      { title: "Staff", href: "/clerk/staff", icon: Users },
    ]
  },
  {
    title: "Admissions",
    href: "/clerk/admissions", // dummy href to group
    icon: Users,
    subLinks: [
      { title: "Admission Form", href: "/clerk/admission-form", icon: FileText },
      { title: "Manual Admission", href: "/clerk/manual-admission", icon: UserPlus },
      { title: "Temp Users", href: "/clerk/temp-users", icon: Users },
      { title: "Student Directory", href: "/clerk/students", icon: Users },
    ]
  },
  {
    title: "Class Management",
    href: "/clerk/class-mgmt",
    icon: School,
    subLinks: [
      { title: "Class Students", href: "/clerk/students", icon: Users },
      { title: "Categories", href: "/clerk/categories", icon: LayoutGrid },
      { title: "Classes", href: "/clerk/classes", icon: School },
      { title: "Divisions", href: "/clerk/divisions", icon: LayoutGrid },
      { title: "Assign Division", href: "/clerk/assign-division", icon: Layers },
    ]
  },
  {
    title: "Curriculum",
    href: "/clerk/subject-mgmt",
    icon: BookOpen,
    subLinks: [
      { title: "Subjects", href: "/clerk/subjects", icon: BookOpen },
      { title: "Syllabus", href: "/clerk/syllabus", icon: FileText },
    ]
  },
  { title: "Attendance Zone", href: "/clerk/location-settings", icon: MapPin },
  { title: "Assign Teacher", href: "/clerk/assign-teacher", icon: Plus },
  { title: "Timetable", href: "/clerk/timetable", icon: Calendar },
  { title: "Leave Requests", href: "/clerk/leave-requests", icon: CalendarCheck },
  { title: "My Leaves", href: "/clerk/leaves", icon: CalendarCheck },
  { title: "Leave Settings", href: "/clerk/leave-config", icon: Settings },
];



export default function ClerkLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Clerk" sidebarLinks={sidebarLinks}>
      {children}
    </DashboardLayout>
  );
}