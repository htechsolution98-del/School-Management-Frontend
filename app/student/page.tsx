"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  BookOpen,
  ClipboardList,
  Calendar,
  BarChart2,
  CheckCircle2,
  Clock,
  UserCheck,
  CreditCard,
  Coffee,
  GraduationCap,
  Send,
  Upload,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  FileText,
} from "lucide-react";
import { 
  getStudentHomework, 
  getStudentExams, 
  getStudentAttendance, 
  getStudentSyllabus, 
  getStudentFees,
  submitHomework,
  type HomeworkItem,
  type StudentExam,
  type StudentAttendanceRecord
} from "@/lib/student";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getSyllabusStreamUrl, openAuthenticatedDocument } from "@/lib/document-viewer";
import { StudentEmptyState } from "@/components/student/student-empty-state";

// ─────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
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
  const [quickSubmitHw, setQuickSubmitHw] = useState<HomeworkItem | null>(null);
  const [submittingFile, setSubmittingFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Default day to today's weekday
  const currentWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toLowerCase();
  const [selectedDay, setSelectedDay] = useState<string>(
    DAYS_OF_WEEK.includes(currentWeekday) ? currentWeekday : "monday"
  );

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
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
          // Strictly filter valid contemporary academic dates (2020 - 2030)
          const validAtt = (attRes.value || []).filter((r: any) => {
            const raw = r.attendance_date || r.created_at;
            if (!raw) return false;
            const parts = String(raw).split("T")[0].split("-");
            let y = parseInt(parts[0], 10);
            if (parts.length === 3 && parts[2]?.length === 4) {
              y = parseInt(parts[2], 10);
            }
            if (y < 100) y += 2000;
            return !isNaN(y) && y >= 2020 && y <= 2030;
          });
          setAttendanceRecords(validAtt);
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

  // Calculate attendance metrics
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

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSubmitHw) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await submitHomework(quickSubmitHw.id, submittingFile || undefined);
      setSubmitSuccess(true);
      setTimeout(() => {
        setQuickSubmitHw(null);
        setSubmittingFile(null);
        setSubmitSuccess(false);
      }, 1500);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statCards = [
    {
      title: "HOMEWORK",
      value: homeworkList.length,
      subtitle: `${homeworkList.length} Assigned`,
      linkText: "View all homework →",
      icon: <BookOpen size={15} className="text-blue-600" />,
      iconBg: "bg-indigo-50/90 text-blue-600",
      valueColor: "text-slate-900",
      linkColor: "text-blue-600",
      href: "/student/homework",
    },
    {
      title: "ATTENDANCE",
      value: `${attendancePct}%`,
      subtitle: `${presentDays}/${totalAttDays || 1} days present`,
      linkText: "View attendance →",
      icon: <BarChart2 size={15} className="text-emerald-500" />,
      iconBg: "bg-emerald-50 text-emerald-500",
      valueColor: "text-emerald-500",
      linkColor: "text-emerald-600",
      href: "/student/attendance",
    },
    {
      title: "UPCOMING EXAMS",
      value: examsList.length,
      subtitle: `${examsList.length} Scheduled`,
      linkText: "View hall ticket →",
      icon: <Calendar size={15} className="text-amber-500" />,
      iconBg: "bg-amber-50 text-amber-500",
      valueColor: "text-amber-500",
      linkColor: "text-amber-600",
      href: "/student/exams",
    },
    {
      title: "PENDING FEES",
      value: `₹${pendingFeeAmount}`,
      subtitle: pendingFeeAmount > 0 ? "Due for payment" : "All cleared",
      linkText: "Pay fees online →",
      icon: <CreditCard size={15} className="text-[#7C3AED]" />,
      iconBg: "bg-blue-50 text-[#7C3AED]",
      valueColor: "text-[#7C3AED]",
      linkColor: "text-[#7C3AED]",
      href: "/student/pay-fees",
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 max-w-5xl mx-auto w-full min-w-0 overflow-x-hidden pb-4 sm:pb-8">
      {/* ─────────────────────────────────────────────────────────────
          1. Welcome Card (Matches reference image with 3D Books illustration)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex-1 min-w-0 z-10">
          <span className="block text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-400 uppercase mb-1">
            GOOD MORNING
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 leading-snug">
            {studentName}!{" "}
            <motion.span
              animate={{ rotate: [0, 18, -10, 18, 0] }}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeInOut" }}
              className="inline-block"
            >
              👋
            </motion.span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-3.5 font-medium leading-relaxed max-w-[280px] sm:max-w-md">
            Welcome to your Student Portal. Here is your class timetable and academic schedule.
          </p>

          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-800 bg-[#F8F9FE] border border-slate-200/60 rounded-xl px-2.5 py-1.5 shadow-2xs whitespace-nowrap shrink-0">
            <Calendar size={13} className="text-blue-600 shrink-0" />
            <span className="whitespace-nowrap">{todayFormatted}</span>
          </div>
        </div>

        {/* 3D Education Book & Graduation Cap Illustration */}
        <div className="w-28 sm:w-36 md:w-44 shrink-0 flex items-center justify-center pointer-events-none select-none">
          <img
            src="/images/Books-with-calendar.png"
            alt="Student Education Portal"
            className="w-full h-auto object-contain filter drop-shadow-md"
          />
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. Summary Cards Grid (2x2 Grid with pill links and chevrons)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {statCards.map((card, idx) => (
          <Link key={idx} href={card.href} className="block group cursor-pointer">
            <motion.div
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 p-3.5 sm:p-4.5 flex flex-col justify-between h-full min-h-[145px] sm:min-h-[155px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-indigo-200/80 hover:shadow-xs transition-all duration-300"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              custom={idx + 1}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                    {card.icon}
                  </div>
                  <span className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-500 uppercase tracking-tight truncate whitespace-nowrap">
                    {card.title}
                  </span>
                </div>
                <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-auto" />
              </div>

              <div className="my-1 sm:my-1.5">
                <p className={`text-2xl sm:text-3xl font-black tracking-tight ${card.valueColor}`}>
                  {card.value}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                  {card.subtitle}
                </p>
              </div>

              <div className={`text-[11px] sm:text-xs font-bold ${card.linkColor} flex items-center gap-1 group-hover:gap-1.5 transition-all pt-0.5`}>
                <span className="truncate">{card.linkText}</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Class Lecture Timetable (Matches reference UI with empty folder)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <Link href="/student/timetable" className="flex items-center justify-between gap-3 group cursor-pointer">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-indigo-50/80 text-indigo-600 rounded-2xl border border-indigo-100/50">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors">
                Class Lecture Timetable
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                Daily lecture schedule, subject timings, and assigned teachers
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        {/* Weekday Switcher Tabs */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isActive = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                type="button"
                className={`py-2 px-1 text-center rounded-2xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-[#F8F9FE] text-slate-600 border border-slate-200/50 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Timetable Content */}
        {activeSlots.length === 0 ? (
          <div className="py-6 sm:py-8 flex flex-col items-center justify-center text-center">
            <img
              src="/images/empty-folder.png"
              alt="No lectures"
              className="w-24 sm:w-28 h-auto object-contain filter drop-shadow-sm mb-3 pointer-events-none select-none"
            />
            <h4 className="text-sm font-extrabold text-slate-900">
              No lectures scheduled for {selectedDay.toUpperCase()}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Please check other days or contact the school office.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSlots.map((slot: any, idx: number) => {
              if (slot.is_break) {
                return (
                  <div
                    key={slot.id || idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 shadow-2xs"
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
                  className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-[#FAFAFE] border border-slate-100 hover:border-indigo-200 hover:shadow-xs transition-all gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Period #{slot.slot_number || idx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {slot.subject_name || `Subject #${slot.subject || "-"}`}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                      <Clock size={11} className="text-slate-400" />
                      <span>{formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-xs">
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

      {/* ─────────────────────────────────────────────────────────────
          4. Assigned Homework (Matches reference UI with Submit action)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-3.5"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={5}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
            <BookOpen size={18} className="text-blue-600" />
            <span>Assigned Homework</span>
          </div>
          <Link href="/student/homework" className="text-xs text-blue-600 hover:text-indigo-700 font-bold hover:underline">
            View all →
          </Link>
        </div>

        {homeworkList.length === 0 ? (
          <StudentEmptyState
            title="No homework available"
            description="You are all caught up with your assignments."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {homeworkList.slice(0, 4).map((hw, idx) => (
              <div
                key={hw.id || idx}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#FAFAFE] border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full shrink-0">
                    {hw.school_class_name || hw.division_name || "class 8"}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {(hw as any).subject_name ? `${(hw as any).subject_name}: ` : ""}{hw.title}
                    </h4>
                    {hw.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{hw.description}</p>
                    )}
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50/80 border border-amber-200/50 px-2.5 py-0.5 rounded-full">
                        <Calendar size={11} className="text-amber-600" />
                        Due: {hw.due_date || "Soon"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSubmitHw(hw);
                      setSubmittingFile(null);
                      setSubmitError(null);
                      setSubmitSuccess(false);
                    }}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Send size={12} />
                    Submit Assignment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          5. Syllabus & Course Material (Matches reference UI with Download PDF action)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-3.5"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={6}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
            <GraduationCap size={18} className="text-blue-600" />
            <span>Syllabus & Course Material</span>
          </div>
          <Link href="/student/syllabus" className="text-xs text-blue-600 hover:text-indigo-700 font-bold hover:underline">
            View all syllabus →
          </Link>
        </div>

        {syllabusItems.length === 0 ? (
          <StudentEmptyState
            title="No course materials available"
            description="Syllabus PDFs will appear here once uploaded by teachers."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {syllabusItems.slice(0, 4).map((syl, idx) => (
              <div
                key={syl.id || idx}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#FAFAFE] border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full shrink-0">
                    {syl.subject_name || "hindi"}
                  </span>
                  <span className="text-xs font-bold text-slate-600 bg-[#F1F5F9] px-3 py-1 rounded-full shrink-0">
                    Class: {syl.school_class || "class 8"} - {syl.divison_name || "a"}
                  </span>
                </div>

                {syl.syllabus_file && (
                  <button
                    type="button"
                    onClick={() =>
                      openAuthenticatedDocument(
                        syl.id ? getSyllabusStreamUrl(syl.id) : syl.syllabus_file,
                        syl.subject_name || "Syllabus",
                        syl.syllabus_file
                      )
                    }
                    className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer self-end sm:self-auto shrink-0"
                  >
                    <FileText size={13} className="text-rose-500" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          Quick Submit Assignment Modal (Functional Integration)
         ───────────────────────────────────────────────────────────── */}
      {quickSubmitHw && (
        <div
          className="fixed inset-0 z-50 bg-black/60 sm:bg-slate-900/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden"
          onClick={() => setQuickSubmitHw(null)}
        >
          <div
            className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40 shrink-0">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  {quickSubmitHw.school_class_name || "Assignment"} · {quickSubmitHw.division_name || ""}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">Submit Assignment</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickSubmitHw(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 no-scrollbar">
                <div className="bg-[#F8F9FE] rounded-2xl p-4 border border-slate-200/70">
                  <h4 className="text-sm font-bold text-slate-800">{quickSubmitHw.title}</h4>
                  {quickSubmitHw.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                      {quickSubmitHw.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-600 mt-3 pt-2.5 border-t border-slate-200/50">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-indigo-500" />
                      Due: <strong>{quickSubmitHw.due_date || "Soon"}</strong>
                    </span>
                    <span>Teacher: <strong>{quickSubmitHw.teacher_name || "Assigned"}</strong></span>
                  </div>
                </div>

                {submitSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Assignment submitted successfully!</span>
                  </div>
                )}

                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-500 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Attach Completed Assignment (PDF / Image) *
                  </label>
                  <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 block">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-700">
                        {submittingFile ? submittingFile.name : "Click to browse & upload assignment file"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, PNG, JPG documents</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setSubmittingFile(e.target.files[0]);
                          setSubmitError(null);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {submittingFile && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs">
                    <span className="font-bold text-slate-800 truncate">{submittingFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSubmittingFile(null)}
                      className="text-rose-500 font-bold hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Fixed Bottom Single-Row Full-Width Buttons */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setQuickSubmitHw(null)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all text-center flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Confirm & Submit
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
