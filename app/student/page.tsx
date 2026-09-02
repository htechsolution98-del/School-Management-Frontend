"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  BookOpen,
  ClipboardList,
  Calendar,
  Trophy,
  BarChart2,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
  CreditCard,
  Layers,
  Coffee,
  GraduationCap
} from "lucide-react";
import { 
  getStudentHomework, 
  getStudentExams, 
  getStudentAttendance, 
  getStudentSyllabus, 
  getStudentFees,
  type HomeworkItem,
  type StudentExam,
  type StudentAttendanceRecord
} from "@/lib/student";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

// ─────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: "easeOut" as const,
    },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
};

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  try {
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export default function StudentDashboardPage() {
  const [studentName, setStudentName] = useState<string>("Student");
  const [isLoading, setIsLoading] = useState(true);

  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [examsList, setExamsList] = useState<StudentExam[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecord[]>([]);
  const [syllabusItems, setSyllabusItems] = useState<any[]>([]);
  const [pendingFeeAmount, setPendingFeeAmount] = useState<number>(0);
  const [timetableList, setTimetableList] = useState<any[]>([]);

  // Default day to today's weekday
  const currentWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toLowerCase();
  const [selectedDay, setSelectedDay] = useState<string>(
    DAYS_OF_WEEK.includes(currentWeekday) ? currentWeekday : "monday"
  );

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Parallel data fetch
        const [hwRes, exRes, attRes, sylRes, feeRes, ttRes, profileRes] = await Promise.allSettled([
          getStudentHomework(),
          getStudentExams(),
          getStudentAttendance(),
          getStudentSyllabus(),
          getStudentFees(),
          fetchWithAuth(`${API_BASE_URL}/timetable/`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetchWithAuth(`${API_BASE_URL}/studentget/me/`).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value) {
          const prof = profileRes.value;
          const resolvedName = prof.full_name || [prof.surname, prof.name, prof.father_name].filter(Boolean).join(" ");
          if (resolvedName) setStudentName(resolvedName);
        }

        if (hwRes.status === "fulfilled") {
          setHomeworkList(hwRes.value || []);
        }
        if (exRes.status === "fulfilled") {
          setExamsList(exRes.value || []);
        }
        if (attRes.status === "fulfilled") {
          setAttendanceRecords(attRes.value || []);
        }
        if (sylRes.status === "fulfilled") {
          setSyllabusItems(sylRes.value || []);
        }
        if (feeRes.status === "fulfilled") {
          const fees = feeRes.value || [];
          const totalPending = fees.reduce((sum: number, f: any) => sum + Math.max(Number(f.balance_amount || f.amount || 0), 0), 0);
          setPendingFeeAmount(totalPending);
        }
        if (ttRes.status === "fulfilled") {
          const ttData = Array.isArray(ttRes.value) ? ttRes.value : (ttRes.value?.results || []);
          setTimetableList(ttData);
        }
      } catch (err) {
        console.error("Failed to load student dashboard info", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate attendance percentage
  const totalAttDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((a: any) => a.is_present || a.status === "PRESENT").length;
  const attendancePct = totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 100;

  // Selected Day Timetable
  const activeDayTimetable = useMemo(() => {
    return timetableList.find(t => String(t.day || "").toLowerCase() === selectedDay.toLowerCase());
  }, [timetableList, selectedDay]);

  const activeSlots = useMemo(() => {
    if (!activeDayTimetable || !Array.isArray(activeDayTimetable.slots)) return [];
    return [...activeDayTimetable.slots].sort((a, b) => (a.slot_number || 0) - (b.slot_number || 0));
  }, [activeDayTimetable]);

  const statCards = [
    {
      title: "Homework",
      value: homeworkList.length,
      subtitle: homeworkList.length > 0 ? `${homeworkList.length} Assigned` : "No pending homework",
      linkText: "View all homework →",
      icon: <BookOpen size={22} className="text-indigo-600" />,
      iconBg: "bg-indigo-50 border border-indigo-100",
      valueColor: "text-indigo-600",
      linkColor: "text-indigo-600",
      href: "/student/homework",
    },
    {
      title: "Attendance",
      value: `${attendancePct}%`,
      subtitle: `${presentDays}/${totalAttDays || 1} days present`,
      linkText: "View attendance →",
      icon: <CheckCircle2 size={22} className="text-emerald-600" />,
      iconBg: "bg-emerald-50 border border-emerald-100",
      valueColor: "text-emerald-600",
      linkColor: "text-emerald-600",
      href: "/student/attendance",
    },
    {
      title: "Upcoming Exams",
      value: examsList.length,
      subtitle: examsList.length > 0 ? `${examsList.length} Scheduled` : "No upcoming exams",
      linkText: "View hall ticket →",
      icon: <ClipboardList size={22} className="text-amber-600" />,
      iconBg: "bg-amber-50 border border-amber-100",
      valueColor: "text-amber-600",
      linkColor: "text-amber-600",
      href: "/student/exams",
    },
    {
      title: "Pending Fees",
      value: `₹${pendingFeeAmount}`,
      subtitle: pendingFeeAmount > 0 ? "Due for payment" : "All cleared",
      linkText: "Pay fees online →",
      icon: <CreditCard size={22} className="text-purple-600" />,
      iconBg: "bg-purple-50 border border-purple-100",
      valueColor: pendingFeeAmount > 0 ? "text-purple-600" : "text-emerald-600",
      linkColor: "text-purple-600",
      href: "/student/pay-fees",
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 md:px-8 py-6 bg-slate-50/60 min-h-screen">
      {/* Greeting Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            Good Morning, {studentName}!{" "}
            <motion.span
              animate={{ rotate: [0, 18, -10, 18, 0] }}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeInOut" }}
              className="inline-block"
            >
              👋
            </motion.span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Welcome to your Student Portal. Here is your class timetable and academic schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-zinc-200 rounded-2xl px-4 py-2.5 shadow-2xs self-start sm:self-auto">
          <Calendar size={15} className="text-indigo-600" />
          <span>{todayFormatted}</span>
        </div>
      </motion.div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <Link key={idx} href={card.href} className="block group">
            <motion.div
              className="bg-white rounded-3xl border border-zinc-200/80 p-5 flex flex-col justify-between gap-3 h-full shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-300"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              custom={idx + 1}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`${card.iconBg} p-2.5 rounded-2xl`}>
                  {card.icon}
                </div>
              </div>

              <div>
                <p className={`text-3xl sm:text-4xl font-black tracking-tight ${card.valueColor}`}>
                  {card.value}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{card.subtitle}</p>
              </div>

              <div className={`text-xs font-bold ${card.linkColor} flex items-center gap-1 group-hover:gap-1.5 transition-all pt-1.5 border-t border-zinc-100`}>
                {card.linkText}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Timetable Section (Full Detailed Component) */}
      <motion.div
        className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs flex flex-col gap-5"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">Class Lecture Timetable</h2>
              <p className="text-xs text-slate-400 font-medium">Daily lecture schedule, subject timings, and assigned teachers</p>
            </div>
          </div>

          {/* Weekday Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl overflow-x-auto self-start sm:self-auto max-w-full">
            {DAYS_OF_WEEK.map((day) => {
              const isActive = selectedDay === day;
              const isToday = currentWeekday === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                    isActive
                      ? "bg-white text-indigo-700 shadow-xs border border-zinc-200/70"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {day.slice(0, 3)} {isToday && <span className="text-[10px] text-indigo-500 font-black">•</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timetable Grid of Slots */}
        {activeSlots.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
            <Layers className="h-9 w-9 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No lectures scheduled for {selectedDay.toUpperCase()}</p>
            <p className="text-xs text-slate-400 mt-0.5">Please check other days or contact the school office.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeSlots.map((slot: any, idx: number) => {
              if (slot.is_break) {
                return (
                  <div
                    key={slot.id || idx}
                    className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                        <Coffee size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Recess / Break</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 mt-0.5">
                          <Clock size={12} />
                          <span>{formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/60 text-amber-800 rounded-lg">
                      Break
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={slot.id || idx}
                  className="flex flex-col justify-between p-4 rounded-2xl bg-white border border-zinc-200 hover:border-indigo-200 hover:shadow-xs transition-all gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Period #{slot.slot_number || idx + 1}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {slot.subject_name || `Subject #${slot.subject || "-"}`}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                      <Clock size={11} className="text-slate-400" />
                      <span>{formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <UserCheck size={14} className="text-indigo-500" />
                      <span>Teacher: <strong className="text-slate-800 font-bold">{slot.teacher_name || "Assigned Teacher"}</strong></span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Lecture
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Main 2-Column Section: Homework & Syllabus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Homework */}
        <motion.div
          className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs flex flex-col"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-base">
              <BookOpen size={18} className="text-indigo-600" />
              <span>Assigned Homework</span>
            </div>
            <Link href="/student/homework" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:underline">
              View all →
            </Link>
          </div>

          {homeworkList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <Sparkles className="h-8 w-8 text-amber-500/70 mb-2 animate-bounce" />
              <p className="text-sm font-bold text-slate-700">No pending homework!</p>
              <p className="text-xs text-slate-400 mt-0.5">You are all caught up with your assignments.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 flex-1 flex flex-col">
              {homeworkList.slice(0, 4).map((hw, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {hw.school_class_name || hw.division_name || "Homework"}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{hw.title}</span>
                    </div>
                    {hw.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{hw.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full shrink-0">
                    Due: {hw.due_date || "Soon"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Academic Syllabus & Study Resources */}
        <motion.div
          className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs flex flex-col"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-base">
              <GraduationCap size={18} className="text-indigo-600" />
              <span>Syllabus & Course Material</span>
            </div>
            <Link href="/student/syllabus" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:underline">
              View all syllabus →
            </Link>
          </div>

          {syllabusItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <Layers className="h-8 w-8 text-indigo-400/60 mb-2" />
              <p className="text-sm font-bold text-slate-700">No syllabus documents uploaded</p>
              <p className="text-xs text-slate-400 mt-0.5">Syllabus PDFs will appear here once uploaded by teachers.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 flex-1 flex flex-col">
              {syllabusItems.slice(0, 4).map((syl, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-900">{syl.subject_name || "General Subject"}</span>
                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                      Class: {syl.school_class || "STD1"} - {syl.divison_name || "A"}
                    </span>
                  </div>
                  {syl.syllabus_file && (
                    <a
                      href={syl.syllabus_file}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-indigo-600 hover:underline bg-indigo-50/80 px-2.5 py-1 rounded-lg"
                    >
                      📄 Download PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>

      {/* Motivation Banner */}
      <motion.div
        className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-md"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={7}
      >
        <div className="flex items-center gap-4 z-10">
          <div className="bg-white/15 backdrop-blur-xs text-amber-300 rounded-2xl p-3.5 border border-white/10">
            <Trophy size={28} />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg">
              You're doing great, {studentName}! ⭐
            </h3>
            <p className="text-xs text-indigo-100 mt-0.5 font-medium">
              View your published exam results, download hall tickets, and track your attendance.
            </p>
          </div>
        </div>

        <Link
          href="/student/results"
          className="z-10 flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs px-5 py-3 rounded-2xl shadow-sm transition-all duration-200 shrink-0"
        >
          <BarChart2 size={16} />
          View Academic Results
        </Link>
      </motion.div>
    </div>
  );
}