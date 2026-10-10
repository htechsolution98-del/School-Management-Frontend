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
  Hash,
  Award,
  Rocket,
  PhoneCall,
  SlidersHorizontal,
  Megaphone,
  CalendarDays,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import "./clerk-workspace.css";

const sidebarLinks = [
  { title: "Dashboard", href: "/clerk", icon: LayoutDashboard },
  {
    title: "Certificates & G.R.",
    href: "/clerk/docs",
    icon: Award,
    subLinks: [
      { title: "Certificate Desk (LC/TC)", href: "/clerk/certificates", icon: Award },
      { title: "General Register (G.R. Book)", href: "/clerk/general-register", icon: BookOpen },
    ],
  },
  {
    title: "HR Management",
    href: "/clerk/hr",
    icon: Users,
    subLinks: [
      { title: "Departments", href: "/clerk/departments", icon: Users },
      { title: "Staff", href: "/clerk/staff", icon: Users },
    ],
  },
  {
    title: "Admissions",
    href: "/clerk/admissions",
    icon: Users,
    subLinks: [
      { title: "Admission Form", href: "/clerk/admission-form", icon: FileText },
      { title: "Manual Admission", href: "/clerk/manual-admission", icon: UserPlus },
      { title: "Temp Users", href: "/clerk/temp-users", icon: Users },
      { title: "Student Directory", href: "/clerk/students", icon: Users },
    ],
  },
  {
    title: "School Management",
    href: "/clerk/class-mgmt",
    icon: School,
    subLinks: [
      { title: "Categories", href: "/clerk/categories", icon: LayoutGrid },
      { title: "Classes", href: "/clerk/classes", icon: School },
      { title: "Student Profiles", href: "/clerk/student-profiles", icon: Users },
      { title: "Divisions", href: "/clerk/divisions", icon: LayoutGrid },
      { title: "Assign Division", href: "/clerk/assign-division", icon: Layers },
      { title: "Assign Roll No.", href: "/clerk/assign-roll-no", icon: Hash },
      { title: "Student Promotion", href: "/clerk/student-promotion", icon: Rocket },
    ],
  },
  {
    title: "Attendance Desk",
    href: "/clerk/att-desk",
    icon: CalendarCheck,
    subLinks: [
      { title: "Absentee Calling Desk", href: "/clerk/absentee-desk", icon: PhoneCall },
      { title: "Attendance Zone", href: "/clerk/location-settings", icon: MapPin },
    ],
  },
  {
    title: "Curriculum",
    href: "/clerk/subject-mgmt",
    icon: BookOpen,
    subLinks: [
      { title: "Subjects", href: "/clerk/subjects", icon: BookOpen },
      { title: "Syllabus", href: "/clerk/syllabus", icon: FileText },
    ],
  },
  { title: "Assign Teacher", href: "/clerk/assign-teacher", icon: Plus },
  { title: "Teacher Workload", href: "/clerk/teacher-workload", icon: SlidersHorizontal },
  { title: "Timetable", href: "/clerk/timetable", icon: Calendar },
  { title: "Announcements", href: "/clerk/announcements", icon: Megaphone },
  { title: "Events & Holidays", href: "/clerk/events", icon: CalendarDays },
  { title: "Leave Requests", href: "/clerk/leave-requests", icon: CalendarCheck },
  { title: "My Leaves", href: "/clerk/leaves", icon: CalendarCheck },
  { title: "Leave Settings", href: "/clerk/leave-config", icon: Settings },
];

export default function ClerkLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout roleTitle="Clerk" sidebarLinks={sidebarLinks}>
      <div className="clerk-area min-w-0">{children}</div>
    </DashboardLayout>
  );
}
