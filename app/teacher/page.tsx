"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  Calendar,
  RefreshCw,
  Megaphone,
} from "lucide-react";
import { getTodayAttendance } from "@/lib/teacher/attendance";
import { getCurrentUserProfile } from "@/lib/current-user";
import type { TodayAttendance } from "@/types/teacher";

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

  const teacherName = profile?.name || profile?.user?.name || "teacher1";

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4.5 w-full min-w-0 overflow-x-hidden font-sans pb-28 lg:pb-8">
      {/* ─── 1. WELCOME HERO BANNER (Compact, Proportional on all mobile sizes) ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#121B34] p-3.5 sm:p-5 text-white shadow-sm border border-[#1A2648]">
        {/* Top row: Greeting & Subtitle on Left, Glowing Circular Illustration on Right */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#182346] text-[#93C5FD] text-[10px] font-bold tracking-wider uppercase border border-[#233366]">
              <GraduationCap className="h-3 w-3 text-[#93C5FD]" /> ACADEMIC FACULTY HUB
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
              {getGreeting()}, {teacherName}
            </h1>
            <p className="text-white/70 text-[11px] sm:text-xs leading-relaxed line-clamp-2 max-w-md">
              Manage your daily class periods, student attendance, homework reviews, and faculty duty logs from your dashboard.
            </p>
          </div>

          {/* Teacher Circular Avatar with Glowing Halo - Zero white borders/corners */}
          <div className="relative w-16 h-16 sm:w-22 sm:h-22 md:w-26 md:h-26 rounded-full shrink-0 flex items-center justify-center p-0.5 bg-gradient-to-tr from-cyan-400/50 via-blue-500/40 to-indigo-600/50 shadow-md shadow-cyan-500/20">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1A2648]">
              <img
                src="/teacher-hero.png"
                alt="Faculty Illustration"
                className="w-full h-full object-cover object-[center_12%] scale-135"
              />
            </div>
          </div>
        </div>

        {/* Bottom row: Action Buttons (side-by-side on mobile) */}
        <div className="grid grid-cols-[1fr_auto] sm:flex sm:items-center sm:justify-end gap-2 mt-3 pt-2.5 border-t border-white/10 relative z-10">
          <Link
            href="/teacher/my-attendance"
            className="py-2 px-3 sm:px-4 rounded-xl bg-[#5436F5] hover:bg-[#4327D4] text-white text-[11px] sm:text-xs font-bold flex items-center justify-between sm:justify-center gap-2 shadow-sm shadow-[#5436F5]/40 transition-all active:scale-95"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="truncate">Duty Punch Desk</span>
            </span>
            <span className="text-white/80 font-bold sm:hidden">›</span>
          </Link>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="py-2 px-3 sm:px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white shrink-0 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── 2. FOUR QUICK ACTION CARDS (Responsive: 2-col on mobile, 4-col on desktop) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Pending Check-In */}
        <Link
          href="/teacher/my-attendance"
          className="rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group min-w-0"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ECEBFF] text-[#5436F5] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <span className="text-[#94A3B8] text-xs font-bold group-hover:translate-x-0.5 transition-transform">›</span>
            </div>
            <div className="mt-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#142044] leading-tight truncate">
                Pending Check-In
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#7183A6] mt-0.5 truncate">
                {todayAttendance?.checked_in ? "Duty active" : "Shift not yet initiated"}
              </p>
            </div>
          </div>
          <div className="mt-2.5 text-[10px] sm:text-xs font-bold text-[#5436F5] flex items-center gap-0.5 truncate">
            <span>Open Duty Desk</span>
            <span className="text-xs">→</span>
          </div>
        </Link>

        {/* Card 2: Class Roll Call */}
        <Link
          href="/teacher/student-attendance"
          className="rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group min-w-0"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8FAF0] text-[#10B981] flex items-center justify-center">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <span className="text-[#94A3B8] text-xs font-bold group-hover:translate-x-0.5 transition-transform">›</span>
            </div>
            <div className="mt-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#142044] leading-tight truncate">
                Class Roll Call
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#7183A6] mt-0.5 truncate">
                Mark daily presence
              </p>
            </div>
          </div>
          <div className="mt-2.5 text-[10px] sm:text-xs font-bold text-[#10B981] flex items-center gap-0.5 truncate">
            <span>Take Attendance</span>
            <span className="text-xs">→</span>
          </div>
        </Link>

        {/* Card 3: Assignments */}
        <Link
          href="/teacher/Homework"
          className="rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group min-w-0"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ECEBFF] text-[#6366F1] flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <span className="text-[#94A3B8] text-xs font-bold group-hover:translate-x-0.5 transition-transform">›</span>
            </div>
            <div className="mt-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#142044] leading-tight truncate">
                Assignments
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#7183A6] mt-0.5 truncate">
                Review submissions
              </p>
            </div>
          </div>
          <div className="mt-2.5 text-[10px] sm:text-xs font-bold text-[#6366F1] flex items-center gap-0.5 truncate">
            <span>Manage Tasks</span>
            <span className="text-xs">→</span>
          </div>
        </Link>

        {/* Card 4: Exam Grading */}
        <Link
          href="/teacher/marks"
          className="rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group min-w-0"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFF4E8] text-[#F59E0B] flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <span className="text-[#94A3B8] text-xs font-bold group-hover:translate-x-0.5 transition-transform">›</span>
            </div>
            <div className="mt-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#142044] leading-tight truncate">
                Exam Grading
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#7183A6] mt-0.5 truncate">
                Periodic marks entry
              </p>
            </div>
          </div>
          <div className="mt-2.5 text-[10px] sm:text-xs font-bold text-[#F59E0B] flex items-center gap-0.5 truncate">
            <span>Grade Sheets</span>
            <span className="text-xs">→</span>
          </div>
        </Link>
      </div>

      {/* ─── 3. SIX FEATURE SHORTCUTS (2 Columns on mobile, 6 on desktop) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Row 1 Left: My Attendance */}
        <Link
          href="/teacher/my-attendance"
          className="p-3 rounded-2xl bg-white border border-[#EBF0F8] shadow-2xs hover:border-[#5436F5]/40 transition-all flex items-center justify-between group min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#ECEBFF] text-[#5436F5] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#142044] group-hover:text-[#5436F5] transition-colors leading-tight truncate">
                My Attendance
              </h4>
              <p className="text-[10px] text-[#7183A6] mt-0.5 truncate">
                Punch in & out
              </p>
            </div>
          </div>
          <span className="text-[#7183A6] text-xs font-bold shrink-0 ml-1">›</span>
        </Link>

        {/* Row 1 Right: Student Attendance */}
        <Link
          href="/teacher/student-attendance"
          className="p-3 rounded-2xl bg-white border border-[#EBF0F8] shadow-2xs hover:border-[#10B981]/40 transition-all flex items-center justify-between group min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#E8FAF0] text-[#10B981] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#142044] group-hover:text-[#10B981] transition-colors leading-tight truncate">
                Student Attendance
              </h4>
              <p className="text-[10px] text-[#7183A6] mt-0.5 truncate">
                Daily roll call
              </p>
            </div>
          </div>
          <span className="text-[#7183A6] text-xs font-bold shrink-0 ml-1">›</span>
        </Link>

        {/* Row 2 Left: Homework */}
        <Link
          href="/teacher/Homework"
          className="p-3 rounded-2xl bg-white border border-[#EBF0F8] shadow-2xs hover:border-[#5436F5]/40 transition-all flex items-center justify-between group min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#ECEBFF] text-[#5436F5] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#142044] group-hover:text-[#5436F5] transition-colors leading-tight truncate">
                Homework
              </h4>
              <p className="text-[10px] text-[#7183A6] mt-0.5 truncate">
                Create & review
              </p>
            </div>
          </div>
          <span className="text-[#7183A6] text-xs font-bold shrink-0 ml-1">›</span>
        </Link>

        {/* Row 2 Right: Study Materials */}
        <Link
          href="/teacher/study-materials"
          className="p-3 rounded-2xl bg-white border border-[#EBF0F8] shadow-2xs hover:border-[#0284C7]/40 transition-all flex items-center justify-between group min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#E8F3FF] text-[#0284C7] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#142044] group-hover:text-[#0284C7] transition-colors leading-tight truncate">
                Study Materials
              </h4>
              <p className="text-[10px] text-[#7183A6] mt-0.5 truncate">
                PDFs & notes
              </p>
            </div>
          </div>
          <span className="text-[#7183A6] text-xs font-bold shrink-0 ml-1">›</span>
        </Link>

        {/* Row 3 Left: Marks Entry */}
        <Link
          href="/teacher/marks"
          className="p-3 rounded-2xl bg-white border border-[#EBF0F8] shadow-2xs hover:border-[#F59E0B]/40 transition-all flex items-center justify-between group min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#FFF4E8] text-[#F59E0B] flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#142044] group-hover:text-[#F59E0B] transition-colors leading-tight truncate">
                Marks Entry
              </h4>
              <p className="text-[10px] text-[#7183A6] mt-0.5 truncate">
                Term evaluations
              </p>
            </div>
          </div>
          <span className="text-[#7183A6] text-xs font-bold shrink-0 ml-1">›</span>
        </Link>

        {/* Row 3 Right: My Leaves */}
        <Link
          href="/teacher/leaves"
          className="p-3 rounded-2xl bg-white border border-[#EBF0F8] shadow-2xs hover:border-[#F43F5E]/40 transition-all flex items-center justify-between group min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#FFEBEF] text-[#F43F5E] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#142044] group-hover:text-[#F43F5E] transition-colors leading-tight truncate">
                My Leaves
              </h4>
              <p className="text-[10px] text-[#7183A6] mt-0.5 truncate">
                Apply & balance
              </p>
            </div>
          </div>
          <span className="text-[#7183A6] text-xs font-bold shrink-0 ml-1">›</span>
        </Link>
      </div>

      {/* ─── 4. LOWER SECTIONS (Responsive: 1-col on mobile, 2-col on desktop) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Today's Class Schedule */}
        <div className="rounded-2xl bg-white p-3.5 sm:p-4.5 border border-[#EBF0F8] shadow-2xs space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-1.5 border-b border-[#F1F5F9] pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-[#ECEBFF] text-[#5436F5] shrink-0">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-[#142044] text-xs sm:text-sm truncate">
                Today&apos;s Class Schedule
              </h3>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#ECEBFF] text-[#5436F5] shrink-0">
              {currentTime.toLocaleDateString("en-IN", { weekday: "long" })}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Period 1 */}
            <div className="flex items-center justify-between gap-2 text-left group cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-xl transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#5436F5] shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-[#7183A6] font-medium leading-tight">
                    09:00 AM - 09:45 AM
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-[#142044] truncate mt-0.5">
                    Mathematics - Class 10 (A)
                  </p>
                </div>
              </div>
              <span className="text-[#CBD5E1] text-xs font-bold shrink-0">›</span>
            </div>

            {/* Period 2 */}
            <div className="flex items-center justify-between gap-2 text-left group cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-xl transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-[#7183A6] font-medium leading-tight">
                    10:00 AM - 10:45 AM
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-[#142044] truncate mt-0.5">
                    Science - Class 9 (B)
                  </p>
                </div>
              </div>
              <span className="text-[#CBD5E1] text-xs font-bold shrink-0">›</span>
            </div>

            {/* Period 3 */}
            <div className="flex items-center justify-between gap-2 text-left group cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-xl transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-[#7183A6] font-medium leading-tight">
                    11:00 AM - 11:45 AM
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-[#142044] truncate mt-0.5">
                    English - Class 8 (A)
                  </p>
                </div>
              </div>
              <span className="text-[#CBD5E1] text-xs font-bold shrink-0">›</span>
            </div>
          </div>
        </div>

        {/* Card 2: Faculty Announcements */}
        <div className="rounded-2xl bg-white p-3.5 sm:p-4.5 border border-[#EBF0F8] shadow-2xs space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-1.5 border-b border-[#F1F5F9] pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-[#ECEBFF] text-[#5436F5] shrink-0">
                <Megaphone className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-[#142044] text-xs sm:text-sm truncate">
                Faculty Announcements
              </h3>
            </div>
            <Link
              href="/teacher/announcements"
              className="text-[10px] sm:text-xs font-semibold text-[#5436F5] hover:underline shrink-0"
            >
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {/* Announcement 1 */}
            <div className="flex items-center justify-between gap-2 text-left group cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-xl transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#5436F5] shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#142044] truncate">
                    Staff Meeting
                  </p>
                  <p className="text-[10px] text-[#7183A6] truncate mt-0.5">
                    Today at 12:00 PM in Conference Room
                  </p>
                </div>
              </div>
              <span className="text-[#CBD5E1] text-xs font-bold shrink-0">›</span>
            </div>

            {/* Announcement 2 */}
            <div className="flex items-center justify-between gap-2 text-left group cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-xl transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#0284C7] shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#142044] truncate">
                    Department Update
                  </p>
                  <p className="text-[10px] text-[#7183A6] truncate mt-0.5">
                    New curriculum guidelines are available.
                  </p>
                </div>
              </div>
              <span className="text-[#CBD5E1] text-xs font-bold shrink-0">›</span>
            </div>

            {/* Announcement 3 */}
            <div className="flex items-center justify-between gap-2 text-left group cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-xl transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#142044] truncate">
                    Holiday Notice
                  </p>
                  <p className="text-[10px] text-[#7183A6] truncate mt-0.5">
                    School will be closed on 15th Aug.
                  </p>
                </div>
              </div>
              <span className="text-[#CBD5E1] text-xs font-bold shrink-0">›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
