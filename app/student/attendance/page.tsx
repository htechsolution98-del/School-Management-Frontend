"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Info,
  Clock,
  Check,
  X,
  UserCheck,
  BarChart2,
} from "lucide-react";
import { toast } from "sonner";
import { getStudentAttendance, type StudentAttendanceRecord } from "@/lib/student";
import { cn } from "@/lib/utils";
import { StudentEmptyState } from "@/components/student/student-empty-state";

// ─────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
};

const scaleIn = {
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

/**
 * Normalizes any backend date (DD-MM-YYYY, YYYY-MM-DD, ISO string) into canonical YYYY-MM-DD.
 * Strictly verifies academic year bounds (2020 - 2030) to eliminate invalid historical years (1918, 1927).
 */
function normalizeDateToYMD(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  const clean = raw.includes("T") ? raw.split("T")[0] : raw;
  const parts = clean.split("-");
  if (parts.length === 3) {
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let d = parseInt(parts[2], 10);

    // If DD-MM-YYYY format
    if (parts[2].length === 4) {
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    }

    if (y < 100) y += 2000;
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    if (y < 2020 || y > 2030) return null;

    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

function safeFormatDate(dateStr?: string | null): string {
  if (!dateStr) return "Recorded Date";
  const ymd = normalizeDateToYMD(dateStr);
  if (!ymd) return "Recorded Date";
  try {
    const parts = ymd.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    return "Recorded Date";
  } catch {
    return "Recorded Date";
  }
}

function formatFullDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar State & Academic Boundaries
  const today = new Date();
  const MIN_ACADEMIC_YEAR = 2024;
  const MAX_ACADEMIC_YEAR = Math.max(today.getFullYear(), 2026) + 1; // 2027

  const [currentYear, setCurrentYear] = useState(() => {
    const y = today.getFullYear();
    return y >= MIN_ACADEMIC_YEAR && y <= MAX_ACADEMIC_YEAR ? y : 2026;
  });
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const isPrevDisabled = currentYear <= MIN_ACADEMIC_YEAR && currentMonth === 0;
  const isNextDisabled = currentYear >= MAX_ACADEMIC_YEAR && currentMonth === 11;

  const fetchAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStudentAttendance();
      // Strictly filter to valid contemporary academic dates
      const validRecords = (data || []).filter((r: any) => {
        return normalizeDateToYMD(r.attendance_date || r.created_at) !== null;
      });
      const sorted = validRecords.sort((a: any, b: any) => {
        const ymdA = normalizeDateToYMD(a.attendance_date || a.created_at) || "";
        const ymdB = normalizeDateToYMD(b.attendance_date || b.created_at) || "";
        return ymdB.localeCompare(ymdA);
      });
      setRecords(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance records.");
      toast.error("Could not load attendance records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Compute Overall Stats
  const stats = useMemo(() => {
    if (records.length === 0) {
      return { present: 0, absent: 0, unmarked: 0, rate: 100, total: 0 };
    }

    let present = 0;
    let absent = 0;
    let unmarked = 0;

    records.forEach((record) => {
      if (record.is_present) {
        present++;
      } else if (record.is_absent) {
        absent++;
      } else {
        unmarked++;
      }
    });

    const totalMarked = present + absent;
    const rate = totalMarked > 0 ? (present / totalMarked) * 100 : 100;

    return {
      present,
      absent,
      unmarked,
      rate,
      total: records.length,
    };
  }, [records]);

  // Calendar calculations
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayIndex = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1; // Shifts Sunday to last and Monday to first
  }, [currentYear, currentMonth]);

  // Stats for the currently selected month
  const monthStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    records.forEach((r) => {
      const ymd = normalizeDateToYMD(r.attendance_date || r.created_at);
      if (ymd && ymd.startsWith(prefix)) {
        if (r.is_present) present++;
        else if (r.is_absent) absent++;
      }
    });

    const total = present + absent;
    const rate = total > 0 ? (present / total) * 100 : 100;
    return { present, absent, rate, total };
  }, [records, currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const daysArray = [];

    // Empty spaces for previous month's padding
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }

    // Days of the actual month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const match = records.find((r) => {
        const ymd = normalizeDateToYMD(r.attendance_date || r.created_at);
        return ymd === dateString;
      });
      daysArray.push({
        day,
        dateString,
        record: match,
      });
    }

    return daysArray;
  }, [currentYear, currentMonth, daysInMonth, firstDayIndex, records]);

  // Default selected date to today or latest record in month
  useEffect(() => {
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    if (todayYMD.startsWith(monthPrefix)) {
      setSelectedDate(todayYMD);
    } else {
      const recInMonth = records.find((r) => {
        const ymd = normalizeDateToYMD(r.attendance_date || r.created_at);
        return ymd && ymd.startsWith(monthPrefix);
      });
      if (recInMonth) {
        setSelectedDate(normalizeDateToYMD(recInMonth.attendance_date || recInMonth.created_at));
      } else {
        setSelectedDate(`${monthPrefix}-01`);
      }
    }
  }, [currentYear, currentMonth, records]);

  const selectedItem = useMemo(() => {
    if (!selectedDate) return null;
    const match = records.find((r) => normalizeDateToYMD(r.attendance_date || r.created_at) === selectedDate);
    return {
      dateString: selectedDate,
      record: match,
    };
  }, [selectedDate, records]);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (currentMonth === 0) {
      if (currentYear > MIN_ACADEMIC_YEAR) {
        setCurrentMonth(11);
        setCurrentYear((prev) => prev - 1);
      }
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (currentMonth === 11) {
      if (currentYear < MAX_ACADEMIC_YEAR) {
        setCurrentMonth(0);
        setCurrentYear((prev) => prev + 1);
      }
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const todayFormattedString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 max-w-5xl mx-auto w-full min-w-0 overflow-x-hidden pb-4 sm:pb-8">
      {/* ─────────────────────────────────────────────────────────────
          1. Attendance Hub Welcome Card (Matches reference image)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex-1 min-w-0 z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarIcon size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Attendance Hub
            </h1>
          </div>
          <p className="text-slate-400 text-xs mt-1 mb-3.5 font-medium leading-relaxed max-w-[260px] sm:max-w-md">
            Real-time verification of your presence, metrics, and calendar.
          </p>

          <button
            type="button"
            onClick={fetchAttendance}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Sync Log</span>
          </button>
        </div>

        {/* 3D Calendar & Clock Illustration */}
        <div className="w-28 sm:w-36 md:w-44 shrink-0 flex items-center justify-end pointer-events-none select-none">
          <img
            src="/images/Books-with-calendar.png"
            alt="Attendance Hub Calendar"
            className="w-full h-auto object-contain filter drop-shadow-md"
          />
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. Attendance Rate Banner Card (Royal Blue Gradient)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="rounded-3xl p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md relative overflow-hidden flex flex-col gap-3"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
              ATTENDANCE RATE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-0.5">
              {stats.rate.toFixed(1)}%
            </h2>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-xs">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Glowing Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden relative">
          <motion.div
            className="h-full bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.9)]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, stats.rate))}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-blue-100">Target: 75%</span>
          <span className="text-white font-bold flex items-center gap-1">
            {stats.rate >= 75 ? "On Track 🎉" : "Needs Improvement ⚠️"}
          </span>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          3. Days Present & Days Absent (2-Column Grid)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Days Present */}
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 flex flex-col justify-between h-full min-h-[140px] shadow-2xs hover:border-emerald-200 transition-all"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                DAYS PRESENT
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ChevronRight size={13} />
            </div>
          </div>

          <div className="my-1">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {stats.present}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Marked verified
            </p>
          </div>
        </motion.div>

        {/* Days Absent */}
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 flex flex-col justify-between h-full min-h-[140px] shadow-2xs hover:border-rose-200 transition-all"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <XCircle size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                DAYS ABSENT
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <ChevronRight size={13} />
            </div>
          </div>

          <div className="my-1">
            <p className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight">
              {stats.absent}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Needs justification
            </p>
          </div>
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. Monthly Tracker Calendar Card (Direct Present/Absent Display)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-2xs flex flex-col gap-3.5"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart2 size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Monthly Tracker
              </h2>
              <p className="text-[11px] text-slate-400 font-normal truncate">
                Visualize your attendance pattern day-by-day
              </p>
            </div>
          </div>

          {/* Month Switcher with High-Contrast Visible Chevrons */}
          <div className="flex items-center gap-1 bg-[#F8F9FE] border border-slate-200/80 rounded-xl p-0.5 text-xs font-bold text-slate-800 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              aria-label="Previous month"
              title={isPrevDisabled ? "Cannot go prior to 2024" : "Previous month"}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-blue-600 hover:bg-white active:scale-90 transition-all cursor-pointer",
                isPrevDisabled && "opacity-25 cursor-not-allowed pointer-events-none text-slate-300"
              )}
            >
              <ChevronLeft className="w-4 h-4 text-slate-800 stroke-[2.5]" />
            </button>
            <span className="whitespace-nowrap px-1.5 sm:px-2 font-extrabold text-slate-900 text-xs sm:text-sm select-none">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextDisabled}
              aria-label="Next month"
              title={isNextDisabled ? "Cannot go beyond next year" : "Next month"}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-blue-600 hover:bg-white active:scale-90 transition-all cursor-pointer",
                isNextDisabled && "opacity-25 cursor-not-allowed pointer-events-none text-slate-300"
              )}
            >
              <ChevronRight className="w-4 h-4 text-slate-800 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Quick Month Metrics Strip */}
        <div className="flex items-center justify-between bg-slate-50/70 border border-slate-100 rounded-2xl px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              {monthNames[currentMonth]}:
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {monthStats.present} Present
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700 font-extrabold bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {monthStats.absent} Absent
            </span>
          </div>
          <span className="text-xs font-black text-slate-700">
            {monthStats.rate.toFixed(0)}%
          </span>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
            <span key={d} className="text-[10px] font-extrabold text-slate-400 tracking-wider">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Days Grid with Direct Present / Absent Indicators */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-11 sm:h-12" />;
            }

            const isToday = item.dateString === todayFormattedString;
            const isSelected = selectedDate === item.dateString;
            const isPresent = item.record?.is_present;
            const isAbsent = item.record?.is_absent;

            return (
              <button
                key={`day-${item.day}`}
                type="button"
                onClick={() => setSelectedDate(item.dateString)}
                aria-label={`${item.day} ${monthNames[currentMonth]} ${currentYear} - ${isPresent ? "Present" : isAbsent ? "Absent" : "No record"}`}
                className={cn(
                  "h-11 sm:h-12 flex flex-col items-center justify-center relative rounded-2xl transition-all cursor-pointer p-0.5 group",
                  isSelected && "ring-2 ring-blue-600 bg-blue-50/40 shadow-xs scale-102",
                  !isSelected && "hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isPresent
                      ? "bg-emerald-500 text-white font-black shadow-xs shadow-emerald-500/30"
                      : isAbsent
                      ? "bg-rose-500 text-white font-black shadow-xs shadow-rose-500/30"
                      : isToday
                      ? "bg-blue-600 text-white font-black shadow-md shadow-blue-500/25"
                      : "text-slate-700 group-hover:text-slate-900 font-semibold"
                  )}
                >
                  {item.day}
                </span>

                {/* Direct Visual Label Below Day */}
                <div className="h-2.5 flex items-center justify-center mt-0.5">
                  {isPresent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                  ) : isAbsent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]" />
                  ) : isToday ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Interactive Details Card */}
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl p-3 sm:p-3.5 border flex items-center justify-between gap-3 transition-colors",
              selectedItem.record?.is_present
                ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-950"
                : selectedItem.record?.is_absent
                ? "bg-rose-50/70 border-rose-200/80 text-rose-950"
                : "bg-slate-50 border-slate-200/70 text-slate-800"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs font-bold",
                  selectedItem.record?.is_present
                    ? "bg-emerald-500"
                    : selectedItem.record?.is_absent
                    ? "bg-rose-500"
                    : "bg-slate-400"
                )}
              >
                {selectedItem.record?.is_present ? (
                  <Check size={16} className="stroke-[3]" />
                ) : selectedItem.record?.is_absent ? (
                  <X size={16} className="stroke-[3]" />
                ) : (
                  <CalendarIcon size={15} />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-extrabold truncate">
                  {formatFullDate(selectedItem.dateString)}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {selectedItem.record?.is_present
                    ? `Verified by Instructor (Staff #${selectedItem.record.attendance_by || 39}) • Full Day`
                    : selectedItem.record?.is_absent
                    ? `Marked Absent (Staff #${selectedItem.record.attendance_by || 39}) • Justification required`
                    : selectedItem.dateString === todayFormattedString
                    ? "Today • Attendance not yet submitted by teacher"
                    : "No lecture or attendance record for this day"}
                </p>
              </div>
            </div>

            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black shrink-0",
                selectedItem.record?.is_present
                  ? "bg-emerald-600 text-white shadow-xs"
                  : selectedItem.record?.is_absent
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-200 text-slate-700"
              )}
            >
              {selectedItem.record?.is_present
                ? "Present"
                : selectedItem.record?.is_absent
                ? "Absent"
                : "No Record"}
            </span>
          </motion.div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-700">Present</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="font-bold text-slate-700">Absent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="font-bold text-slate-700">Today</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info size={12} /> Tap any date to view status
          </span>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          5. Timeline Activity Card (Matches reference UI)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-2xs flex flex-col gap-3.5"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={5}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Timeline Activity
              </h2>
              <p className="text-[11px] text-slate-400 font-normal">
                Verify submissions chronologically
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSortOrder((s) => (s === "latest" ? "oldest" : "latest"))}
            className="flex items-center gap-1.5 bg-[#F8F9FE] border border-slate-200/60 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <span>{sortOrder === "latest" ? "Latest first" : "Oldest first"}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>
        </div>

        {records.length === 0 ? (
          <StudentEmptyState
            title="No attendance records found"
            description="Attendance entries will appear here once submitted by your class teacher."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {(sortOrder === "latest" ? records : [...records].reverse()).map((record) => {
              const isPres = record.is_present;
              const isAbs = record.is_absent;

              return (
                <div
                  key={record.id}
                  className="p-3 sm:p-3.5 rounded-2xl bg-[#FAFAFE] border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs",
                        isPres ? "bg-emerald-500" : isAbs ? "bg-rose-500" : "bg-amber-400"
                      )}
                    >
                      {isPres ? <Check size={12} className="stroke-[3]" /> : <X size={12} className="stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {safeFormatDate(record.attendance_date || record.created_at)}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <UserCheck size={11} className="text-blue-500" />
                        <span>Instructor Log (Staff #{record.attendance_by || 39})</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold shrink-0",
                      isPres
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-100/60"
                        : isAbs
                        ? "text-rose-700 bg-rose-50 border border-rose-100/60"
                        : "text-amber-700 bg-amber-50 border border-amber-100/60"
                    )}
                  >
                    {isPres ? "Present" : isAbs ? "Absent" : "Unspecified"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
