"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  Megaphone,
  RefreshCw,
  Users,
} from "lucide-react";
import { getTodayAttendance } from "@/lib/teacher/attendance";
import { getCurrentUserProfile } from "@/lib/current-user";
import { getTeacherHomework } from "@/lib/teacher/homework";
import { getTeacherExams } from "@/lib/teacher/exams";
import { getStudentsForAttendance } from "@/lib/teacher/student-attendance";
import { getAnnouncements } from "@/lib/principal/announcements";
import type { TodayAttendance, HomeworkItem, Exam } from "@/types/teacher";
import type { AnnouncementResponse } from "@/lib/principal/announcements";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(value?: string) {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const shortcuts = [
  { label: "My Attendance", note: "Punch in & out", href: "/teacher/my-attendance", icon: Clock, tone: "blue" },
  { label: "Student Attendance", note: "Daily roll call", href: "/teacher/student-attendance", icon: Users, tone: "green" },
  { label: "Homework", note: "Create & review", href: "/teacher/Homework", icon: BookOpen, tone: "purple" },
  { label: "Study Materials", note: "PDFs & notes", href: "/teacher/study-materials", icon: FileText, tone: "sky" },
  { label: "Marks Entry", note: "Term evaluations", href: "/teacher/marks", icon: GraduationCap, tone: "amber" },
  { label: "My Leaves", note: "Apply & balance", href: "/teacher/leaves", icon: CalendarDays, tone: "rose" },
];

const toneClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600 border-blue-100",
  green: "bg-emerald-100 text-emerald-600 border-emerald-100",
  purple: "bg-violet-100 text-violet-600 border-violet-100",
  sky: "bg-sky-100 text-sky-600 border-sky-100",
  amber: "bg-amber-100 text-amber-600 border-amber-100",
  rose: "bg-rose-100 text-rose-600 border-rose-100",
};

export default function TeacherDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const [profileResult, attendanceResult, homeworkResult, examsResult, studentsResult, announcementsResult] = await Promise.allSettled([
      getCurrentUserProfile(),
      getTodayAttendance(true),
      getTeacherHomework(),
      getTeacherExams(),
      getStudentsForAttendance(),
      getAnnouncements(),
    ]);

    if (profileResult.status === "fulfilled") setProfile(profileResult.value);
    if (attendanceResult.status === "fulfilled") setTodayAttendance(attendanceResult.value);
    if (homeworkResult.status === "fulfilled") setHomework(homeworkResult.value);
    if (examsResult.status === "fulfilled") setExams(examsResult.value);
    if (studentsResult.status === "fulfilled") setStudentCount(Number(studentsResult.value.total_students || studentsResult.value.students?.length || 0));
    if (announcementsResult.status === "fulfilled") setAnnouncements(announcementsResult.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const teacherName = profile?.name || profile?.user?.name || profile?.username || "Teacher";
  const activeHomework = useMemo(
    () => homework.filter((item) => item.is_active).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [homework]
  );
  const upcomingExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exams.filter((exam) => new Date(exam.exam_date) >= today).sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
  }, [exams]);
  const facultyAnnouncements = useMemo(() => announcements
    .filter((item) => !item.announcement_for || ["ALL", "TEACHER"].includes(String(item.announcement_for).toUpperCase()))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4), [announcements]);

  const cards = [
    { title: "Pending Check-In", value: todayAttendance?.checked_in ? 0 : 1, note: todayAttendance?.checked_in ? "Duty check-in complete" : "Shift not yet initiated", icon: Clock, tone: "blue", href: "/teacher/my-attendance", chart: "from-blue-300 to-sky-400" },
    { title: "Class Roll Call", value: studentCount, note: "Students in your assigned class", icon: Users, tone: "green", href: "/teacher/student-attendance", chart: "from-emerald-300 to-teal-400" },
    { title: "Assignments", value: activeHomework.length, note: "Active homework items", icon: BookOpen, tone: "purple", href: "/teacher/Homework", chart: "from-violet-300 to-purple-400" },
    { title: "Exam Grading", value: upcomingExams.length, note: "Upcoming scheduled exams", icon: GraduationCap, tone: "amber", href: "/teacher/marks", chart: "from-amber-300 to-orange-400" },
  ];

  const pendingTasks = [
    ...activeHomework.slice(0, 3).map((item) => ({ title: item.title, subtitle: `${item.school_class_name || "Class"} · Due ${formatShortDate(item.due_date)}`, href: "/teacher/Homework", tone: "amber" })),
    ...upcomingExams.slice(0, 2).map((exam) => ({ title: exam.title, subtitle: `${exam.class_group_name || "Class"} · ${formatShortDate(exam.exam_date)}`, href: "/teacher/marks", tone: "blue" })),
  ].slice(0, 4);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-hidden bg-[#f4f7fc] px-3 py-4 font-sans sm:space-y-5 sm:px-5 lg:px-7">
      <section className="relative isolate min-h-[224px] overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-gradient-to-br from-white via-[#edf6ff] to-[#d7edff] p-5 shadow-[0_12px_36px_-24px_rgba(37,99,235,.45)] sm:min-h-[250px] sm:rounded-[2rem] sm:p-7 lg:min-h-[264px] lg:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(59,130,246,.35),transparent_42%),linear-gradient(110deg,transparent_45%,rgba(37,99,235,.45))]" />
        <div className="pointer-events-none absolute -right-20 -top-36 -z-10 h-[420px] w-[420px] rounded-full border border-white/70 bg-white/15" />
        <div className="relative z-10 max-w-full sm:max-w-[61%] lg:max-w-[58%]">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/60 px-3 py-1.5 text-[9px] font-extrabold tracking-wide text-blue-800 sm:text-[11px]">
            <GraduationCap className="h-3.5 w-3.5" /> ACADEMIC FACULTY HUB
          </div>
          <h1 className="mt-3 text-[1.55rem] font-black leading-[1.08] tracking-tight text-[#101d4a] sm:text-3xl lg:text-4xl">
            {getGreeting()}, <span className="bg-gradient-to-r from-blue-700 to-violet-600 bg-clip-text text-transparent">{teacherName}</span> <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-slate-600 sm:text-sm lg:text-base">
            Manage your daily class periods, student attendance, homework reviews, and faculty duty logs from your dashboard.
          </p>
          <div className="mt-4 flex flex-nowrap items-center gap-2.5 sm:mt-5">
            <Link href="/teacher/my-attendance" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:brightness-105 sm:h-12 sm:px-5 sm:text-sm">
              <Clock className="h-4 w-4" /> Duty Punch Desk <ArrowRight className="h-4 w-4" />
            </Link>
            <button type="button" onClick={() => void loadDashboardData()} disabled={loading} aria-label="Refresh dashboard" title="Refresh dashboard" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white/70 text-xs font-bold text-blue-700 transition hover:bg-white disabled:opacity-60 sm:h-12 sm:w-auto sm:gap-2 sm:px-5 sm:text-sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-[-60px] right-[2%] hidden h-[320px] w-[320px] overflow-hidden rounded-full opacity-90 sm:block lg:bottom-[-96px] lg:right-[9%] lg:h-[360px] lg:w-[360px]">
          <img src="/teacher-hero.png" alt="Teacher dashboard illustration" className="h-full w-full object-cover object-center mix-blend-multiply" />
        </div>
        <div className="pointer-events-none absolute bottom-[-38px] right-[-38px] h-[200px] w-[200px] overflow-hidden rounded-full opacity-40 sm:hidden">
          <img src="/teacher-hero.png" alt="" className="h-full w-full object-cover object-center mix-blend-multiply" />
        </div>
      </section>

      <section aria-label="Teacher dashboard summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className={`group relative flex min-h-[112px] min-w-0 items-center gap-3 overflow-hidden rounded-3xl border p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[132px] sm:gap-4 sm:p-5 ${card.tone === "blue" ? "border-blue-100 bg-gradient-to-br from-white to-blue-50/70" : card.tone === "green" ? "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70" : card.tone === "purple" ? "border-violet-100 bg-gradient-to-br from-white to-violet-50/70" : "border-amber-100 bg-gradient-to-br from-white to-amber-50/80"}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 ${toneClasses[card.tone]}`}><Icon className="h-5 w-5 sm:h-6 sm:w-6" /></span>
              <span className="relative z-10 min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold leading-tight text-slate-800 sm:text-sm">{card.title}</span>
                <span className={`mt-1 block text-2xl font-black leading-none sm:text-3xl ${card.tone === "amber" ? "text-amber-600" : card.tone === "green" ? "text-emerald-700" : card.tone === "purple" ? "text-violet-700" : "text-blue-700"}`}>{loading ? "–" : card.value}</span>
                <span className="mt-1 hidden truncate text-[10px] text-slate-500 sm:block">{card.note}</span>
              </span>
              <ChevronRight className="absolute right-3 top-3 h-5 w-5 rounded-full bg-white/90 p-0.5 text-blue-500 shadow-sm sm:right-4 sm:top-4 sm:h-8 sm:w-8 sm:p-1.5" />
              <span className={`absolute bottom-0 right-3 flex h-7 items-end gap-1 opacity-60 sm:right-5 sm:h-10 ${card.tone === "blue" ? "text-sky-400" : card.tone === "green" ? "text-emerald-400" : card.tone === "purple" ? "text-violet-400" : "text-amber-400"}`} aria-hidden="true">
                {[35, 55, 75, 100].map((height, index) => <i key={index} className="w-1.5 rounded-t-full bg-current sm:w-2" style={{ height: `${height}%` }} />)}
              </span>
            </Link>
          );
        })}
      </section>

      <nav aria-label="Teacher shortcuts" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:gap-3 sm:px-3.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${toneClasses[item.tone]}`}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-extrabold text-slate-900 sm:text-xs">{item.label}</span><span className="mt-0.5 block truncate text-[9px] text-slate-500 sm:text-[10px]">{item.note}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </Link>
          );
        })}
      </nav>

      <section className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[1.35fr_1fr_1fr] sm:gap-4">
        <article className="min-w-0 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex min-w-0 items-center gap-2.5"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Calendar className="h-4 w-4" /></span><h2 className="truncate text-xs font-extrabold text-slate-900 sm:text-sm">Today&apos;s Class Schedule</h2></div>
            <div className="flex shrink-0 items-center gap-1"><span className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-600 sm:text-[10px]">{formatDate(currentTime)}</span><button type="button" aria-label="Previous day" className="hidden rounded-lg border border-slate-200 p-1 text-slate-500 sm:inline-flex"><ChevronLeft className="h-3.5 w-3.5" /></button><button type="button" aria-label="Next day" className="hidden rounded-lg border border-slate-200 p-1 text-slate-500 sm:inline-flex"><ChevronRight className="h-3.5 w-3.5" /></button></div>
          </header>
          <div className="mt-3 space-y-1">
            {[
              { time: "09:00 AM – 09:45 AM", subject: "Mathematics - Class 10 (A)", room: "Room 101", color: "bg-blue-500" },
              { time: "10:00 AM – 10:45 AM", subject: "Science - Class 9 (B)", room: "Room 203", color: "bg-emerald-500" },
              { time: "11:00 AM – 11:45 AM", subject: "English - Class 8 (A)", room: "Room 105", color: "bg-amber-500" },
              { time: "01:00 PM – 01:45 PM", subject: "Social Science - Class 7 (C)", room: "Room 201", color: "bg-violet-500" },
            ].map((period) => (
              <div key={period.time} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${period.color}`} />
                <div className="min-w-0 flex-1"><p className="text-[10px] text-slate-500 sm:text-xs">{period.time}</p><p className="mt-0.5 truncate text-xs font-bold text-slate-900 sm:text-sm">{period.subject}</p></div>
                <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700 sm:inline-flex">{period.room}</span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </div>
            ))}
          </div>
        </article>

        <article className="min-w-0 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex min-w-0 items-center gap-2.5"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Megaphone className="h-4 w-4" /></span><h2 className="truncate text-xs font-extrabold text-slate-900 sm:text-sm">Faculty Announcements</h2></div>
            <Link href="/teacher/announcements" className="shrink-0 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50 sm:text-xs">View All</Link>
          </header>
          <div className="mt-2 divide-y divide-slate-100">
            {facultyAnnouncements.length ? facultyAnnouncements.map((item, index) => (
              <Link key={item.id} href="/teacher/announcements" className="flex items-start gap-2.5 py-3 first:pt-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 0 ? "bg-blue-500" : index === 1 ? "bg-emerald-500" : index === 2 ? "bg-amber-500" : "bg-violet-500"}`} />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900 sm:text-sm">{item.title}</span><span className="mt-0.5 line-clamp-2 block text-[10px] leading-relaxed text-slate-500 sm:text-xs">{item.description}</span><span className="mt-1 block text-[9px] text-slate-400">{formatShortDate(item.created_at)}</span></span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            )) : <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center"><BellRing className="mb-2 h-7 w-7 text-blue-300" /><p className="text-xs font-bold text-slate-800">No announcements yet</p><p className="mt-1 text-[10px] text-slate-500">School updates for teachers will appear here.</p></div>}
          </div>
        </article>

        <article className="min-w-0 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex min-w-0 items-center gap-2.5"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><CheckSquare className="h-4 w-4" /></span><h2 className="truncate text-xs font-extrabold text-slate-900 sm:text-sm">Pending Tasks</h2></div>
            <Link href="/teacher/Homework" className="shrink-0 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50 sm:text-xs">View All</Link>
          </header>
          <div className="mt-2 divide-y divide-slate-100">
            {pendingTasks.length ? pendingTasks.map((task, index) => (
              <Link key={`${task.title}-${index}`} href={task.href} className="flex items-start gap-2.5 py-3 first:pt-2.5">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClasses[task.tone]}`}><ClipboardCheck className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900 sm:text-sm">{task.title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500 sm:text-xs">{task.subtitle}</span></span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            )) : <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center"><CheckSquare className="mb-2 h-7 w-7 text-emerald-300" /><p className="text-xs font-bold text-slate-800">You&apos;re all caught up</p><p className="mt-1 text-[10px] text-slate-500">New homework and exam items will appear here.</p></div>}
          </div>
        </article>
      </section>

    </div>
  );
}
