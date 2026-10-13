"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  ArrowRight,
  ClipboardList,
  CalendarDays,
  FileCheck,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayAttendance } from "@/lib/teacher/attendance";
import { getCurrentUserProfile } from "@/lib/current-user";
import type { TodayAttendance } from "@/types/teacher";

function fmtApiTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "--:-- --";
  try {
    let h: number, m: number;
    if (timeStr.includes("T") || timeStr.includes("Z")) {
      const d = new Date(timeStr);
      h = d.getHours();
      m = d.getMinutes();
    } else {
      const parts = timeStr.split(":");
      h = parseInt(parts[0]);
      m = parseInt(parts[1]);
    }
    const ampm = h >= 12 ? "PM" : "AM";
    return `${(h % 12 || 12).toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function TeacherDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [profData, attData] = await Promise.all([
        getCurrentUserProfile().catch(() => null),
        getTodayAttendance().catch(() => null),
      ]);
      setProfile(profData);
      setTodayAttendance(attData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const teacherName = profile?.name || profile?.user?.name || "Teacher";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white shadow-2xl border border-indigo-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Academic Faculty Hub
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {getGreeting()}, {teacherName}
            </h1>
            <p className="text-indigo-200/80 max-w-2xl text-sm sm:text-base leading-relaxed">
              Manage your daily class periods, student attendance, homework reviews, and faculty duty logs from your dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <Link href="/teacher/my-attendance">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 gap-2 font-semibold">
                <Clock className="h-4 w-4" /> Duty Punch Desk
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={loadDashboardData}
              disabled={loading}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* TOP METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: My Duty Attendance */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Duty Status</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {todayAttendance?.checked_in ? "Checked In" : "Pending Check-In"}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {todayAttendance?.checked_in
                ? `Punched in at ${fmtApiTime(todayAttendance.check_in)}`
                : "Shift not yet initiated"}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/teacher/my-attendance"
              className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              Open Duty Desk <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Metric 2: Student Attendance */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Attendance</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">Class Roll Call</div>
            <p className="text-xs text-slate-400 mt-0.5">Mark daily presence</p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/teacher/student-attendance"
              className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              Take Attendance <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Homework & Assignments */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Homework Desk</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">Assignments</div>
            <p className="text-xs text-slate-400 mt-0.5">Review submissions</p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/teacher/Homework"
              className="text-purple-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              Manage Tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Metric 4: Marks & Assessment */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluation</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">Exam Grading</div>
            <p className="text-xs text-slate-400 mt-0.5">Periodic marks entry</p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/teacher/marks"
              className="text-amber-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              Grade Sheets <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK LAUNCH ACTIONS HUB */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/teacher/my-attendance"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 w-fit group-hover:scale-110 transition-transform">
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">My Attendance</div>
            <div className="text-[10px] text-slate-400">Punch in & out</div>
          </div>
        </Link>

        <Link
          href="/teacher/student-attendance"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 w-fit group-hover:scale-110 transition-transform">
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Student Attendance</div>
            <div className="text-[10px] text-slate-400">Daily roll call</div>
          </div>
        </Link>

        <Link
          href="/teacher/Homework"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 w-fit group-hover:scale-110 transition-transform">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Homework</div>
            <div className="text-[10px] text-slate-400">Create & review</div>
          </div>
        </Link>

        <Link
          href="/teacher/study-materials"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-sky-300 hover:bg-sky-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 w-fit group-hover:scale-110 transition-transform">
            <FileText className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">Study Materials</div>
            <div className="text-[10px] text-slate-400">PDFs & notes</div>
          </div>
        </Link>

        <Link
          href="/teacher/marks"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-amber-300 hover:bg-amber-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 w-fit group-hover:scale-110 transition-transform">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Marks Entry</div>
            <div className="text-[10px] text-slate-400">Term evaluations</div>
          </div>
        </Link>

        <Link
          href="/teacher/leaves"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-rose-300 hover:bg-rose-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 w-fit group-hover:scale-110 transition-transform">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">My Leaves</div>
            <div className="text-[10px] text-slate-400">Apply & balance</div>
          </div>
        </Link>
      </div>

      {/* MID ROW: TODAY'S TIMETABLE & ANNOUNCEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Teaching Schedule */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Today's Class Schedule</h3>
              <p className="text-xs text-slate-500">Periods assigned for today across your classes</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
              {currentTime.toLocaleDateString("en-IN", { weekday: "long" })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 text-sm">Period 1 · Mathematics</span>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                  09:00 - 09:45 AM
                </span>
              </div>
              <p className="text-indigo-800/80 font-medium">Class 8-A · Room 204</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Period 2 · Science</span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                  09:50 - 10:35 AM
                </span>
              </div>
              <p className="text-slate-600 font-medium">Class 9-B · Science Lab 1</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Period 4 · Mathematics</span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                  11:30 - 12:15 PM
                </span>
              </div>
              <p className="text-slate-600 font-medium">Class 10-A · Room 301</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Period 6 · Revision Lab</span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                  01:45 - 02:30 PM
                </span>
              </div>
              <p className="text-slate-600 font-medium">Class 8-A · Computer Lab</p>
            </div>
          </div>
        </div>

        {/* Notices & Announcements */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-base">Faculty Announcements</h3>
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Megaphone className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Official notices from administration</p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900">Term Exam Marks Submission</div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  All faculty members are requested to complete marks entry for periodic assessments before Friday.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900">Annual Sports Meet Schedule</div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Inter-house athletics selections will take place during afternoon assembly hours.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-right">
            <Link href="/teacher/announcements" className="text-xs text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1">
              View all notices <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
