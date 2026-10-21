"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  ChevronDown,
  ArrowLeft,
  Calendar,
  Save,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ClipboardList,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Edit3,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStudentsForAttendance,
  submitStudentAttendance,
  getStudentAttendanceRecords,
  updateSingleStudentAttendance,
} from "@/lib/teacher";
import { cn } from "@/lib/utils";
import type { StudentAttendanceListResponse } from "@/types/teacher";

// ─── Font ─────────────────────────────────────────────────────────────────────

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | null;
type View = "list" | "mark";

interface Student {
  id: string;
  grNo: string;
  rollNo?: string;
  name: string;
  initials: string;
  color: string;
  todayStatus: "present" | "absent" | "unmarked";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#38bdf8", "#f472b6", "#34d399", "#60a5fa",
  "#fbbf24", "#fb923c", "#0284c7", "#2dd4bf",
  "#f87171", "#4ade80",
];

function getInitials(name: string, surname?: string | null): string {
  const parts = [name, surname].filter(Boolean) as string[];
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const words = parts[0].trim().split(" ");
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : words[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizeDate(dStr: string): string {
  if (!dStr) return "";
  const parts = dStr.split("T")[0].split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return dStr;
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const S = {
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    boxShadow: "0 2px 14px rgba(37,99,235,0.06)",
    overflow: "hidden" as const,
  },
  th: {
    padding: "11px 18px",
    textAlign: "left" as const,
    fontSize: 11,
    fontWeight: 700,
    color: "#2563eb",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid #dbeafe",
    background: "#f8fafc",
  },
  tdBase: {
    padding: "13px 18px",
    fontSize: 13,
    fontFamily: "inherit",
  },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  initials,
  color,
  size = 34,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color + "22",
        border: `2px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        color,
        flexShrink: 0,
        letterSpacing: "0.02em",
        fontFamily: "inherit",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF4] shadow-xs p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 min-w-0 w-full overflow-hidden">
      <div
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
        style={{ background: iconBg }}
      >
        <Icon size={18} color={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] sm:text-[11px] text-[#7183A6] font-bold tracking-tight uppercase truncate">
          {label}
        </div>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5 min-w-0">
          <span className="text-base sm:text-xl font-black text-[#142044] leading-tight truncate">
            {value}
          </span>
          {sub && (
            <span className="text-[10px] sm:text-xs text-[#7183A6] font-medium truncate">
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          padding: "7px 30px 7px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          color: "#4b5563",
          fontFamily: "inherit",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {children}
      </select>
      <ChevronDown
        size={12}
        color="#9ca3af"
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ─── PagBtn ───────────────────────────────────────────────────────────────────

function PagBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer font-['Sora',sans-serif]",
        active
          ? "bg-[#2563EB] text-white shadow-xs"
          : "bg-white border border-[#E5EAF4] text-[#7183A6] hover:text-[#142044] hover:border-[#CBD5E1]",
        disabled && "opacity-40 cursor-not-allowed hover:border-[#E5EAF4] hover:text-[#7183A6]"
      )}
    >
      {children}
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: "present" | "absent" | "unmarked";
}) {
  const config = {
    present: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Present" },
    absent: { bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Absent" },
    unmarked: { bg: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-400", label: "Unmarked" },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0",
        config.bg
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-3.5 sm:p-6 pb-4 lg:pb-6 bg-[#F6F7FC] min-h-full font-['Sora',sans-serif] animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="w-48 h-7 bg-slate-200 rounded-xl mb-2" />
          <div className="w-32 h-4 bg-slate-200 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-28 h-9 bg-slate-200 rounded-xl" />
          <div className="w-32 h-9 bg-slate-200 rounded-xl" />
        </div>
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E5EAF4] p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-16 h-3 bg-slate-200 rounded" />
              <div className="w-10 h-5 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* List skeleton */}
      <div className="bg-white rounded-2xl border border-[#E5EAF4] p-4 divide-y divide-slate-100 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="pt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="w-28 h-4 bg-slate-200 rounded" />
                <div className="w-20 h-3 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="w-16 h-7 bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error / Not Assigned State ───────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const isNotAssigned = message.toLowerCase().includes("not assigned");

  return (
    <div className="p-4 sm:p-6 pb-4 lg:pb-6 flex items-center justify-center min-h-[60vh] font-['Sora',sans-serif]">
      <div className="bg-white rounded-3xl border border-[#E5EAF4] p-6 sm:p-10 text-center max-w-md w-full shadow-xs">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
            isNotAssigned ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
          )}
        >
          <AlertTriangle size={32} />
        </div>

        <h2 className="text-lg font-black text-[#142044] mb-2">
          {isNotAssigned ? "Not Assigned as Class Teacher" : "Something went wrong"}
        </h2>

        <p className="text-xs sm:text-sm text-[#7183A6] mb-6 leading-relaxed">
          {isNotAssigned
            ? "You are not assigned as a class teacher for any division. Please contact your school administrator to get assigned."
            : message}
        </p>

        {!isNotAssigned && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  presentCount,
  absentCount,
  totalStudents,
  divisionName,
  onConfirm,
  onCancel,
  saving,
  isEditMode,
}: {
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  divisionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditMode?: boolean;
}) {
  const unmarked = totalStudents - presentCount - absentCount;
  const today = formatDate(new Date());

  return (
    <div
      className="fixed inset-0 bg-[#142044]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF4] shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden font-['Sora',sans-serif] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-[#FAFBFD] p-4 sm:p-5 border-b border-[#E5EAF4] flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] flex items-center justify-center shrink-0 shadow-2xs">
            <Save size={18} className="text-[#2563EB]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-[#142044]">
              {isEditMode ? "Update Attendance?" : "Save Attendance?"}
            </h2>
            <p className="text-xs text-[#7183A6] mt-0.5">
              Please review before confirming
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer text-sm shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Class & Date pill */}
          <div className="bg-[#F8F9FD] rounded-xl border border-[#E5EAF4] p-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#7183A6] flex items-center gap-1.5">
              <Calendar size={13} className="text-[#2563EB]" />
              {today}
            </span>
            <span className="font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-lg">
              {divisionName}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-600 leading-none">
                {presentCount}
              </div>
              <div className="text-[10px] font-bold text-emerald-700 mt-1 uppercase tracking-wider">
                Present
              </div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-rose-600 leading-none">
                {absentCount}
              </div>
              <div className="text-[10px] font-bold text-rose-700 mt-1 uppercase tracking-wider">
                Absent
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-600 leading-none">
                {unmarked}
              </div>
              <div className="text-[10px] font-bold text-amber-700 mt-1 uppercase tracking-wider">
                Unmarked
              </div>
            </div>
          </div>

          {/* Warning if unmarked */}
          {unmarked > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                {unmarked} student{unmarked > 1 ? "s are" : " is"} not yet marked and will be skipped.
              </span>
            </div>
          )}

          <p className="text-[11px] text-[#7183A6] leading-relaxed">
            By confirming, you acknowledge that the attendance for{" "}
            <strong className="text-[#142044]">{divisionName}</strong> on{" "}
            <strong className="text-[#142044]">{today}</strong> is correct.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="h-10 px-3 rounded-xl border border-[#E5EAF4] bg-white text-[#7183A6] hover:text-[#142044] text-xs font-bold cursor-pointer transition-colors"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="h-10 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>{isEditMode ? "Confirm Update" : "Confirm & Save"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student List View ────────────────────────────────────────────────────────

function StudentListView({
  students,
  divisionName,
  onMarkAttendance,
  isAlreadyMarkedToday,
  assignedDivisions,
  selectedDivisionId,
  onSelectDivision,
  onViewStudent,
  onEditStudent,
  onQuickUpdate,
  onBulkQuickUpdate,
}: {
  students: Student[];
  divisionName: string;
  onMarkAttendance: () => void;
  isAlreadyMarkedToday: boolean;
  assignedDivisions?: { division_id: number; division_name: string }[];
  selectedDivisionId?: number | null;
  onSelectDivision?: (divId: number) => void;
  onViewStudent?: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
  onQuickUpdate?: (studentId: string, newStatus: "present" | "absent") => void;
  onBulkQuickUpdate?: (newStatus: "present" | "absent") => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const PER_PAGE = 8;
  const today = formatDate(new Date());

  const handleQuickMark = async (student: Student, targetStatus: "present" | "absent") => {
    if (student.todayStatus === targetStatus || updatingId === student.id || bulkUpdating) return;
    const previousStatus = student.todayStatus;
    setUpdatingId(student.id);

    // Instant optimistic update
    onQuickUpdate?.(student.id, targetStatus);

    try {
      await updateSingleStudentAttendance(
        student.id,
        targetStatus === "present",
        targetStatus === "absent"
      );
      toast.success(
        `${student.name} marked ${targetStatus === "present" ? "Present" : "Absent"}!`,
        { duration: 1500 }
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update attendance.");
      // Revert if failed
      if (previousStatus === "present" || previousStatus === "absent") {
        onQuickUpdate?.(student.id, previousStatus);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAll = async (targetStatus: "present" | "absent") => {
    if (students.length === 0 || bulkUpdating) return;
    setBulkUpdating(true);

    const previousStatuses = new Map(students.map((s) => [s.id, s.todayStatus]));
    if (onBulkQuickUpdate) {
      onBulkQuickUpdate(targetStatus);
    } else {
      students.forEach((s) => onQuickUpdate?.(s.id, targetStatus));
    }

    try {
      const records = students.map((s) => ({
        student: Number(s.id),
        is_present: targetStatus === "present",
        is_absent: targetStatus === "absent",
      }));
      await submitStudentAttendance(records);
      toast.success(
        `All ${students.length} students marked ${targetStatus === "present" ? "Present" : "Absent"}!`,
        { duration: 2000 }
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark attendance for all students.");
      students.forEach((s) => {
        const oldStatus = previousStatuses.get(s.id);
        if (oldStatus === "present" || oldStatus === "absent") {
          onQuickUpdate?.(s.id, oldStatus);
        }
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  const filtered = useMemo(
    () =>
      students
        .filter((s) => {
          const q = search.toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.grNo.toLowerCase().includes(q) ||
            (s.rollNo && s.rollNo.toLowerCase().includes(q))
          );
        })
        .sort((a, b) => {
          const rA = parseInt(a.rollNo || "999999", 10);
          const rB = parseInt(b.rollNo || "999999", 10);
          if (!isNaN(rA) && !isNaN(rB) && rA !== rB) return rA - rB;
          return (a.rollNo || "").localeCompare(b.rollNo || "") || a.name.localeCompare(b.name);
        }),
    [search, students],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const presentCount = students.filter((s) => s.todayStatus === "present").length;
  const absentCount = students.filter((s) => s.todayStatus === "absent").length;
  const pct = students.length > 0
    ? Math.round((presentCount / students.length) * 100)
    : 0;
  const absentPct = students.length > 0
    ? Math.round((absentCount / students.length) * 100)
    : 0;

  return (
    <div className="p-3.5 sm:p-6 pb-4 lg:pb-6 bg-[#F6F7FC] min-h-full font-['Sora',sans-serif] w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Alert banner if already marked */}
      {isAlreadyMarkedToday && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5 text-emerald-800 text-xs sm:text-sm font-semibold">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>Attendance recorded for today. You can tap P / A directly to update any student.</span>
          </div>
          <button
            type="button"
            onClick={onMarkAttendance}
            className="w-full sm:w-auto h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
          >
            <Edit3 size={13} />
            <span>Edit Full Attendance</span>
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-4 sm:mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#142044] tracking-tight">
                Student Attendance
              </h1>
              {assignedDivisions && assignedDivisions.length > 1 && (
                <div className="relative inline-block">
                  <select
                    value={selectedDivisionId ?? ""}
                    onChange={(e) => onSelectDivision?.(Number(e.target.value))}
                    className="appearance-none pl-3 pr-7 py-1 rounded-xl bg-white border border-[#E5EAF4] text-xs font-bold text-[#2563EB] shadow-xs cursor-pointer outline-none"
                  >
                    {assignedDivisions.map((ad) => (
                      <option key={ad.division_id} value={ad.division_id}>
                        {ad.division_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="text-[#2563EB] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>
            <p className="text-xs text-[#7183A6] mt-0.5 font-medium">
              {divisionName} • {today}
            </p>
          </div>

          {/* Action Row: Part 1 in a single row side-by-side */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <div className="h-9 px-2.5 sm:px-3 rounded-xl bg-white border border-[#E5EAF4] shadow-xs text-xs font-bold text-[#142044] flex items-center justify-center gap-1.5 min-w-0">
              <Calendar size={13} className="text-[#2563EB] shrink-0" />
              <span className="truncate">{today}</span>
            </div>
            {isAlreadyMarkedToday ? (
              <button
                type="button"
                onClick={onMarkAttendance}
                className="h-9 px-3 sm:px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer min-w-0"
              >
                <Edit3 size={13} className="shrink-0" />
                <span className="truncate">Review / Edit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onMarkAttendance}
                className="h-9 px-3 sm:px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer min-w-0"
              >
                <CheckCircle2 size={13} className="shrink-0" />
                <span className="truncate">Mark Attendance</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-4 sm:mb-5 w-full">
        <StatCard
          label="Total Students"
          value={String(students.length)}
          icon={Users}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />
        <StatCard
          label="Present Today"
          value={String(presentCount)}
          sub={students.length > 0 ? `(${pct}%)` : ""}
          icon={CheckCircle2}
          iconBg="#d1fae5"
          iconColor="#10b981"
        />
        <StatCard
          label="Absent Today"
          value={String(absentCount)}
          sub={students.length > 0 ? `(${absentPct}%)` : ""}
          icon={XCircle}
          iconBg="#fee2e2"
          iconColor="#ef4444"
        />
        <StatCard
          label="Attendance %"
          value={students.length > 0 ? `${pct}%` : "—"}
          icon={TrendingUp}
          iconBg="#fef3c7"
          iconColor="#f59e0b"
        />
      </div>

      {/* Main Student List Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF4] shadow-xs overflow-hidden">
        {/* Toolbar: Student List & Actions without overlap */}
        <div className="p-3 sm:p-4 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Header Title + Subtitle */}
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#142044]">Student List</h2>
            <p className="text-[11px] text-[#7183A6] mt-0.5">{divisionName} — tap P or A to mark attendance</p>
          </div>

          {/* Action controls: Bulk buttons + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            {/* Quick Bulk Action Buttons: 2-column grid on mobile, inline flex on desktop */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleMarkAll("present")}
                disabled={bulkUpdating}
                className="h-8.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 shadow-2xs whitespace-nowrap"
              >
                {bulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                <span>All Present</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("absent")}
                disabled={bulkUpdating}
                className="h-8.5 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 shadow-2xs whitespace-nowrap"
              >
                {bulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />}
                <span>All Absent</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search size={14} className="text-[#7183A6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                placeholder="Search by name, roll, GR..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8F9FD] border border-[#E5EAF4] text-xs text-[#142044] placeholder-[#7183A6] outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ── Mobile Student Card List (All students on single scrollable page, no pagination) ── */}
        <div className="sm:hidden divide-y divide-[#F1F5F9]">
          {filtered.map((s) => {
            const isUpdating = updatingId === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "p-3 flex items-center justify-between gap-2 transition-colors",
                  s.todayStatus === "present"
                    ? "bg-emerald-50/20"
                    : s.todayStatus === "absent"
                      ? "bg-rose-50/20"
                      : "hover:bg-slate-50/70"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar initials={s.initials} color={s.color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-[#142044] truncate">{s.name}</p>
                    <p className="text-[11px] text-[#7183A6] mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold">GR: {s.grNo}</span>
                      {s.rollNo && (
                        <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-md">
                          Roll #{s.rollNo}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Direct 1-Tap Attendance Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.todayStatus === "unmarked" ? (
                    <>
                      {/* Before marking: ONLY show Present and Absent buttons */}
                      <button
                        type="button"
                        onClick={() => handleQuickMark(s, "present")}
                        disabled={isUpdating || bulkUpdating}
                        title="Mark Present"
                        className="h-8.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-2xs"
                      >
                        {isUpdating ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        )}
                        <span>P</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickMark(s, "absent")}
                        disabled={isUpdating || bulkUpdating}
                        title="Mark Absent"
                        className="h-8.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-2xs"
                      >
                        <XCircle size={13} className="text-rose-600" />
                        <span>A</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* AFTER marking attendance: Show marked status badge and Edit button (never with P and A buttons!) */}
                      <button
                        type="button"
                        onClick={() => onEditStudent?.(s)}
                        title="Click to edit attendance"
                        className={cn(
                          "h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs",
                          s.todayStatus === "present"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        )}
                      >
                        {s.todayStatus === "present" ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : (
                          <XCircle size={13} className="text-rose-600" />
                        )}
                        <span>{s.todayStatus === "present" ? "Present" : "Absent"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditStudent?.(s)}
                        title="Edit attendance"
                        className="h-8 px-2 rounded-xl bg-slate-100 text-slate-600 hover:text-[#2563EB] hover:bg-[#EFF6FF] border border-slate-200/60 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                    </>
                  )}

                  {/* History */}
                  <button
                    type="button"
                    onClick={() => onViewStudent?.(s)}
                    title="View student history"
                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[#7183A6] text-xs">No students found.</div>
          )}
        </div>

        {/* ── Desktop Table (Visible on sm and up) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 500,
            }}
          >
            <thead>
              <tr>
                {["Roll No.", "GR No.", "Student Name", "Today's Status", "Quick Attendance"].map(
                  (h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      ...S.tdBase,
                      fontWeight: 700,
                      color: "#2563EB",
                    }}
                  >
                    {s.rollNo ? s.rollNo : "—"}
                  </td>
                  <td
                    style={{
                      ...S.tdBase,
                      fontWeight: 600,
                      color: "#6b7280",
                    }}
                  >
                    {s.grNo}
                  </td>
                  <td style={S.tdBase}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Avatar initials={s.initials} color={s.color} />
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0f172a",
                        }}
                      >
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td style={S.tdBase}>
                    <StatusBadge status={s.todayStatus} />
                  </td>
                  <td style={S.tdBase}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {s.todayStatus === "unmarked" ? (
                        <>
                          {/* 1-Tap Present */}
                          <button
                            type="button"
                            onClick={() => handleQuickMark(s, "present")}
                            disabled={updatingId === s.id || bulkUpdating}
                            className="h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          >
                            <CheckCircle2 size={12} /> Present
                          </button>

                          {/* 1-Tap Absent */}
                          <button
                            type="button"
                            onClick={() => handleQuickMark(s, "absent")}
                            disabled={updatingId === s.id || bulkUpdating}
                            className="h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          >
                            <XCircle size={12} /> Absent
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Remarks Edit - ONLY show after mark attendance */}
                          <button
                            type="button"
                            onClick={() => onEditStudent?.(s)}
                            title="Add remarks / change date or status"
                            className="h-7 px-2.5 rounded-lg bg-slate-100 text-slate-700 hover:text-[#2563EB] hover:bg-[#EFF6FF] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200/80"
                          >
                            <Edit3 size={12} /> Edit Attendance
                          </button>
                        </>
                      )}

                      {/* View History */}
                      <button
                        type="button"
                        onClick={() => onViewStudent?.(s)}
                        title="View student history"
                        className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: 13,
                    }}
                  >
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile footer summary (No pagination on mobile: all students shown in single list) */}
        <div className="sm:hidden px-3.5 py-3 border-t border-[#F1F5F9] text-xs text-[#7183A6] text-center font-medium">
          Showing all {filtered.length} students
        </div>

        {/* Desktop Pagination */}
        <div className="hidden sm:flex p-3 sm:p-4 border-t border-[#F1F5F9] flex-wrap items-center justify-between gap-2.5">
          <span className="text-xs text-[#7183A6]">
            Showing{" "}
            {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–
            {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}{" "}
            students
          </span>
          <div className="flex items-center gap-1.5">
            <PagBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </PagBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PagBtn
                key={p}
                onClick={() => setPage(p)}
                active={p === page}
              >
                {p}
              </PagBtn>
            ))}
            <PagBtn
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages || totalPages === 0}
            >
              <ChevronRight size={14} />
            </PagBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Attendance View ─────────────────────────────────────────────────────

function MarkAttendanceView({
  students,
  divisionName,
  onBack,
  localStorageKey,
  onMarkedSuccess,
  isEditMode,
}: {
  students: Student[];
  divisionName: string;
  onBack: () => void;
  localStorageKey: string;
  onMarkedSuccess: () => void;
  isEditMode?: boolean;
}) {
  const initialAttendance = useMemo(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      if (s.todayStatus === "present" || s.todayStatus === "absent") {
        initial[s.id] = s.todayStatus;
      }
    });
    return initial;
  }, [students]);

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >(initialAttendance);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const today = formatDate(new Date());

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.grNo.toLowerCase().includes(search.toLowerCase()),
  );

  const presentCount = Object.values(attendance).filter(
    (v) => v === "present",
  ).length;
  const absentCount = Object.values(attendance).filter(
    (v) => v === "absent",
  ).length;
  const markedCount = presentCount + absentCount;
  const pct =
    students.length > 0
      ? Math.round((presentCount / students.length) * 100)
      : 0;

  // SVG donut
  const r = 28, cx = 36, cy = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const markAll = (status: "present" | "absent") => {
    const upd: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      upd[s.id] = status;
    });
    setAttendance((prev) => ({ ...prev, ...upd }));
  };

  // ── Step 1: open confirm modal ────────────────────────────────────────────
  const handleSaveClick = () => {
    setApiError(null);
    setShowConfirm(true);
  };

  // ── Step 2: submit to API ─────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setSaving(true);
    setApiError(null);

    try {
      // Build payload — only include marked students
      const records = students
        .filter((s) => attendance[s.id] !== null && attendance[s.id] !== undefined)
        .map((s) => ({
          student: Number(s.id),
          is_present: attendance[s.id] === "present",
          is_absent: attendance[s.id] === "absent",
        }));

      await submitStudentAttendance(records);

      if (typeof window !== "undefined" && localStorageKey) {
        localStorage.setItem(localStorageKey, "true");
      }
      onMarkedSuccess();

      setSaving(false);
      setShowConfirm(false);
      setSaved(true);

      // Navigate back after short delay
      setTimeout(() => {
        setSaved(false);
        onBack();
      }, 1000);
    } catch (err: any) {
      setSaving(false);
      setShowConfirm(false);
      const isAlreadyMarked = err?.message?.toLowerCase().includes("already") ||
        err?.message?.toLowerCase().includes("unique") ||
        err?.message?.toLowerCase().includes("exist");
      if (isAlreadyMarked) {
        if (typeof window !== "undefined" && localStorageKey) {
          localStorage.setItem(localStorageKey, "true");
        }
        onMarkedSuccess();
        setApiError("Attendance for this class has already been marked today.");
      } else {
        setApiError(err?.message || "Failed to save attendance. Please try again.");
      }
    }
  }, [students, attendance, onBack, localStorageKey, onMarkedSuccess]);

  return (
    <div className="p-3.5 sm:p-6 pb-4 lg:pb-6 bg-[#F6F7FC] min-h-full font-['Sora',sans-serif] w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Confirm modal */}
      {showConfirm && (
        <ConfirmModal
          presentCount={presentCount}
          absentCount={absentCount}
          totalStudents={students.length}
          divisionName={divisionName}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          saving={saving}
          isEditMode={isEditMode}
        />
      )}

      {/* Page Header */}
      <div className="mb-4 sm:mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors cursor-pointer text-[11px] font-bold uppercase tracking-wider"
              >
                <ArrowLeft size={12} />
                <span>Back to List</span>
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#142044] tracking-tight">
              {isEditMode ? "Edit Student Attendance" : "Mark Attendance"}
            </h1>
            <p className="text-xs text-[#7183A6] mt-0.5 font-medium">
              {divisionName} • {today} {isEditMode && "• Edit Mode"}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5EAF4] shadow-xs text-xs font-bold text-[#142044] self-start sm:self-auto">
            <Calendar size={13} className="text-[#2563EB]" />
            <span>{today}</span>
          </div>
        </div>
      </div>

      {/* API Error banner */}
      {apiError && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-2xl p-3 sm:p-4 mb-4 text-xs font-semibold text-red-600">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-red-400 hover:text-red-700 text-base leading-none p-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Class Info & Donut Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF4] shadow-xs p-3.5 sm:p-5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <ClipboardList size={20} className="text-[#2563EB]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-6 flex-1 min-w-0">
            <div>
              <div className="text-[10px] text-[#7183A6] font-bold uppercase tracking-wider truncate">
                Division
              </div>
              <div className="text-sm sm:text-base font-black text-[#142044] mt-0.5 truncate">
                {divisionName}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#7183A6] font-bold uppercase tracking-wider truncate">
                Total Students
              </div>
              <div className="text-sm sm:text-base font-black text-[#142044] mt-0.5 truncate">
                {students.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider truncate">
                Present
              </div>
              <div className="text-sm sm:text-base font-black text-emerald-600 mt-0.5 truncate">
                {presentCount > 0 ? presentCount : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider truncate">
                Absent
              </div>
              <div className="text-sm sm:text-base font-black text-rose-600 mt-0.5 truncate">
                {absentCount > 0 ? absentCount : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Live Donut Ring */}
        <div className="self-center sm:self-auto shrink-0">
          <svg width={68} height={68} viewBox="0 0 72 72">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={8}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={pct > 0 ? "#2563EB" : "#E5EAF4"}
              strokeWidth={8}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "36px 36px",
                transition: "stroke-dasharray 0.4s",
              }}
            />
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={800}
              fill="#142044"
              fontFamily="Sora,sans-serif"
            >
              {pct}%
            </text>
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fill="#7183A6"
              fontFamily="Sora,sans-serif"
            >
              Present
            </text>
          </svg>
        </div>
      </div>

      {/* Main Student Marking Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF4] shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-3 sm:p-4 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:flex-1 max-w-sm">
            <Search size={14} className="text-[#7183A6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8F9FD] border border-[#E5EAF4] text-xs text-[#142044] placeholder-[#7183A6] outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          {/* Quick Mark All Buttons */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => markAll("present")}
              className="h-10 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={13} />
              <span>Mark All Present</span>
            </button>
            <button
              type="button"
              onClick={() => markAll("absent")}
              className="h-10 px-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <XCircle size={13} />
              <span>Mark All Absent</span>
            </button>
          </div>
        </div>

        {/* ── Mobile Marking Student List (Visible on mobile, Zero horizontal scroll) ── */}
        <div className="sm:hidden divide-y divide-[#F1F5F9]">
          {filtered.map((s) => {
            const status = attendance[s.id];
            return (
              <div
                key={s.id}
                className={cn(
                  "p-3 flex items-center justify-between gap-2.5 transition-colors",
                  status === "present"
                    ? "bg-emerald-50/50"
                    : status === "absent"
                      ? "bg-rose-50/50"
                      : "bg-white"
                )}
              >
                {/* Left: Avatar + Name + Roll/GR */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar initials={s.initials} color={s.color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-[#142044] truncate">{s.name}</p>
                    <p className="text-[11px] text-[#7183A6] mt-0.5 truncate">
                      {s.rollNo ? `Roll: #${s.rollNo} • ` : ""}GR: {s.grNo}
                    </p>
                  </div>
                </div>

                {/* Right: Quick P / A Thumb Toggles */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setAttendance((prev) => ({
                        ...prev,
                        [s.id]: prev[s.id] === "present" ? null : "present",
                      }))
                    }
                    className={cn(
                      "h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
                      status === "present"
                        ? "bg-[#10B981] text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    )}
                  >
                    <CheckCircle2 size={13} />
                    <span>P</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAttendance((prev) => ({
                        ...prev,
                        [s.id]: prev[s.id] === "absent" ? null : "absent",
                      }))
                    }
                    className={cn(
                      "h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
                      status === "absent"
                        ? "bg-[#EF4444] text-white shadow-xs"
                        : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    )}
                  >
                    <XCircle size={13} />
                    <span>A</span>
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[#7183A6] text-xs">No students found.</div>
          )}
        </div>

        {/* ── Desktop Marking Table (Visible on sm and up) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 480,
            }}
          >
            <thead>
              <tr>
                {["GR No.", "Student Name", "Mark Attendance"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const status = attendance[s.id];
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background:
                        status === "present"
                          ? "#f0fdf4"
                          : status === "absent"
                            ? "#fef2f2"
                            : i % 2 === 0
                              ? "#fff"
                              : "#f8fafc",
                      transition: "background 0.2s",
                    }}
                  >
                    <td
                      style={{
                        ...S.tdBase,
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      {s.grNo}
                    </td>
                    <td style={S.tdBase}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Avatar initials={s.initials} color={s.color} />
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0f172a",
                          }}
                        >
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td style={S.tdBase}>
                      <div style={{ display: "flex", gap: 7 }}>
                        {/* Present */}
                        <button
                          type="button"
                          onClick={() =>
                            setAttendance((prev) => ({
                              ...prev,
                              [s.id]: prev[s.id] === "present" ? null : "present",
                            }))
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 14px",
                            borderRadius: 7,
                            cursor: "pointer",
                            border:
                              status === "present"
                                ? "2px solid #10b981"
                                : "1.5px solid #d1fae5",
                            background:
                              status === "present" ? "#d1fae5" : "#f8fafc",
                            color:
                              status === "present" ? "#059669" : "#9ca3af",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                            boxShadow:
                              status === "present"
                                ? "0 2px 8px rgba(16,185,129,0.18)"
                                : "none",
                          }}
                        >
                          <CheckCircle2 size={12} /> Present
                        </button>
                        {/* Absent */}
                        <button
                          type="button"
                          onClick={() =>
                            setAttendance((prev) => ({
                              ...prev,
                              [s.id]: prev[s.id] === "absent" ? null : "absent",
                            }))
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 14px",
                            borderRadius: 7,
                            cursor: "pointer",
                            border:
                              status === "absent"
                                ? "2px solid #ef4444"
                                : "1.5px solid #fee2e2",
                            background:
                              status === "absent" ? "#fee2e2" : "#f8fafc",
                            color:
                              status === "absent" ? "#dc2626" : "#9ca3af",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                            boxShadow:
                              status === "absent"
                                ? "0 2px 8px rgba(239,68,68,0.18)"
                                : "none",
                          }}
                        >
                          <XCircle size={12} /> Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFD]">
          <div className="text-xs text-[#7183A6]">
            Showing 1–{filtered.length} of {students.length} students
            {markedCount > 0 && (
              <span className="ml-2 text-[#2563EB] font-bold">
                • {markedCount}/{students.length} marked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-xl border border-[#E5EAF4] bg-white text-[#7183A6] hover:text-[#142044] text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={markedCount === 0 || saving}
              className={cn(
                "flex-1 sm:flex-initial h-10 px-5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                saved
                  ? "bg-emerald-600"
                  : markedCount === 0
                    ? "bg-slate-300"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8]"
              )}
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>{isEditMode ? "Updated!" : "Saved!"}</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>{isEditMode ? "Update Attendance" : "Save Attendance"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EditStudentAttendanceModal ─────────────────────────────────────────────

function EditStudentAttendanceModal({
  student,
  divisionName,
  onClose,
  onSuccess,
}: {
  student: Student;
  divisionName: string;
  onClose: () => void;
  onSuccess: (updatedStatus: "present" | "absent") => void;
}) {
  const [status, setStatus] = useState<"present" | "absent">(
    student.todayStatus === "absent" ? "absent" : "present"
  );
  const [reason, setReason] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSingleStudentAttendance(
        student.id,
        status === "present",
        status === "absent",
        reason,
        attendanceDate
      );
      toast.success(
        `Attendance for ${student.name} updated to ${status === "present" ? "Present" : "Absent"} successfully!`
      );
      onSuccess(status);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update student attendance.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#142044]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF4] shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden font-['Sora',sans-serif] animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#FAFBFD] p-4 sm:p-5 border-b border-[#E5EAF4] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar initials={student.initials} color={student.color} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-[#142044] truncate">
                  Edit Attendance
                </h3>
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md">
                  {divisionName}
                </span>
              </div>
              <p className="text-[11px] text-[#7183A6] truncate mt-0.5">
                {student.name} {student.rollNo ? `• Roll #${student.rollNo}` : ""} • GR: {student.grNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer text-sm shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs font-semibold text-red-600">
              <AlertTriangle size={15} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-[#7183A6] uppercase tracking-wider mb-1.5">
              Attendance Date
            </label>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={attendanceDate}
              onChange={(e) => {
                const val = e.target.value;
                const today = new Date().toISOString().split("T")[0];
                if (val && val > today) return;
                setAttendanceDate(val);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FD] border border-[#E5EAF4] text-xs font-semibold text-[#142044] outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          {/* Status Selection Cards */}
          <div>
            <label className="block text-[11px] font-bold text-[#7183A6] uppercase tracking-wider mb-1.5">
              Select Status
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Present */}
              <button
                type="button"
                onClick={() => setStatus("present")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer",
                  status === "present"
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                    : "bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60"
                )}
              >
                <CheckCircle2 size={20} className={status === "present" ? "text-white" : "text-emerald-600"} />
                <span className="text-xs font-black tracking-wide">PRESENT</span>
                <span className={cn("text-[10px]", status === "present" ? "text-emerald-100" : "text-emerald-600")}>
                  In School
                </span>
              </button>

              {/* Absent */}
              <button
                type="button"
                onClick={() => setStatus("absent")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer",
                  status === "absent"
                    ? "bg-rose-500 text-white border-rose-500 shadow-md"
                    : "bg-rose-50/60 text-rose-800 border-rose-200 hover:bg-rose-100/60"
                )}
              >
                <XCircle size={20} className={status === "absent" ? "text-white" : "text-rose-600"} />
                <span className="text-xs font-black tracking-wide">ABSENT</span>
                <span className={cn("text-[10px]", status === "absent" ? "text-rose-100" : "text-rose-600")}>
                  Not Present
                </span>
              </button>
            </div>
          </div>

          {/* Reason / Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-[#7183A6] uppercase tracking-wider mb-1.5">
              Reason / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder={status === "absent" ? "e.g., Sick leave, Family travel" : "e.g., Late arrival, Regular"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FD] border border-[#E5EAF4] text-xs font-semibold text-[#142044] placeholder-[#7183A6] outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          {/* Absent notice */}
          {status === "absent" && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium">
              <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>Marking as Absent will automatically register an absence entry on the student's record.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-[#FAFBFD] border-t border-[#E5EAF4] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-xl border border-[#E5EAF4] bg-white text-[#7183A6] hover:text-[#142044] text-xs font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-initial h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Updating…</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StudentViewModal ─────────────────────────────────────────────────────────

function StudentViewModal({
  student,
  attendanceRecords,
  divisionName,
  onClose,
}: {
  student: Student;
  attendanceRecords: any[];
  divisionName: string;
  onClose: () => void;
}) {
  const studentHistory = useMemo(() => {
    return attendanceRecords.filter(
      (r) => String(r.student) === String(student.id)
    );
  }, [attendanceRecords, student.id]);

  return (
    <div
      className="fixed inset-0 bg-[#142044]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF4] shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden font-['Sora',sans-serif] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#FAFBFD] p-4 sm:p-5 border-b border-[#E5EAF4] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar initials={student.initials} color={student.color} size={40} />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-[#142044] truncate">
                {student.name}
              </h3>
              <p className="text-[11px] text-[#7183A6] truncate mt-0.5">
                GR: {student.grNo} • {divisionName} {student.rollNo ? `• Roll #${student.rollNo}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer text-sm shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Today's Status Card */}
          <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#E5EAF4] flex items-center justify-between">
            <span className="text-xs font-bold text-[#7183A6]">Today's Status</span>
            <StatusBadge status={student.todayStatus} />
          </div>

          {/* Attendance History */}
          <div>
            <h4 className="text-xs font-bold text-[#142044] mb-2">
              Attendance History ({studentHistory.length})
            </h4>

            <div className="max-h-56 overflow-y-auto border border-[#E5EAF4] rounded-xl divide-y divide-[#F1F5F9]">
              {studentHistory.length === 0 ? (
                <div className="p-6 text-center text-[#7183A6] text-xs">
                  No past attendance records found.
                </div>
              ) : (
                studentHistory.map((rec, i) => (
                  <div
                    key={rec.id || i}
                    className="p-2.5 px-3 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[#142044]">
                      {rec.attendance_date}
                    </span>
                    <StatusBadge
                      status={
                        rec.is_present ? "present" : rec.is_absent ? "absent" : "unmarked"
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-[#FAFBFD] border-t border-[#E5EAF4] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-5 rounded-xl border border-[#E5EAF4] bg-white text-[#7183A6] hover:text-[#142044] text-xs font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Entry Point ─────────────────────────────────────────────────────────

export default function StudentAttendancePage() {
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<StudentAttendanceListResponse | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [divisionName, setDivisionName] = useState("—");
  const [selectedDivId, setSelectedDivId] = useState<number | null>(null);
  const [rawAttendanceRecords, setRawAttendanceRecords] = useState<any[]>([]);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isAlreadyMarkedToday, setIsAlreadyMarkedToday] = useState(false);
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const localStorageKey = useMemo(() => {
    const divId = apiData?.division_id || "";
    return divId ? `attendance_marked_${divId}_${todayDateStr}` : "";
  }, [apiData, todayDateStr]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorageKey) {
      const marked = localStorage.getItem(localStorageKey);
      if (marked === "true") {
        setIsAlreadyMarkedToday(true);
      } else {
        setIsAlreadyMarkedToday(false);
      }
    }
  }, [localStorageKey]);

  // ── Fetch students ──────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async (targetDivId?: number) => {
    setLoading(true);
    setError(null);

    try {
      const [data, attendanceRecords] = await Promise.all([
        getStudentsForAttendance(targetDivId),
        getStudentAttendanceRecords(),
      ]);
      setApiData(data);
      setRawAttendanceRecords(attendanceRecords);
      setDivisionName(data.division_name);
      if (data.division_id) {
        setSelectedDivId(data.division_id);
      }

      const todayNorm = normalizeDate(new Date().toISOString().split("T")[0]);
      let hasMarkedToday = false;

      // Map API shape → internal Student shape
      const mapped: Student[] = data.students.map((s, idx) => {
        const match = attendanceRecords.find(
          (r) => String(r.student) === String(s.id) && normalizeDate(r.attendance_date) === todayNorm
        );

        let todayStatus: "present" | "absent" | "unmarked" = "unmarked";
        if (match) {
          hasMarkedToday = true;
          if (match.is_present) {
            todayStatus = "present";
          } else if (match.is_absent) {
            todayStatus = "absent";
          }
        }

        return {
          id: String(s.id),
          grNo: s.gr_no,
          rollNo: s.roll_no || "",
          name: [s.name, s.surname].filter(Boolean).join(" "),
          initials: getInitials(s.name, s.surname),
          color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          todayStatus,
        };
      });

      setStudents(mapped);

      if (hasMarkedToday) {
        setIsAlreadyMarkedToday(true);
      } else {
        setIsAlreadyMarkedToday(false);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSelectDivision = (divId: number) => {
    setSelectedDivId(divId);
    fetchStudents(divId);
  };

  const handleStudentAttendanceUpdated = (studentId: string, newStatus: "present" | "absent") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, todayStatus: newStatus } : s))
    );
    setIsAlreadyMarkedToday(true);
    if (typeof window !== "undefined" && localStorageKey) {
      localStorage.setItem(localStorageKey, "true");
    }
    getStudentAttendanceRecords().then(setRawAttendanceRecords).catch(() => { });
  };

  const handleBulkAttendanceUpdated = (newStatus: "present" | "absent") => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, todayStatus: newStatus }))
    );
    setIsAlreadyMarkedToday(true);
    if (typeof window !== "undefined" && localStorageKey) {
      localStorage.setItem(localStorageKey, "true");
    }
    getStudentAttendanceRecords().then(setRawAttendanceRecords).catch(() => { });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('${FONT_URL}');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchStudents(selectedDivId ?? undefined)} />
      ) : view === "list" ? (
        <>
          <StudentListView
            students={students}
            divisionName={divisionName}
            onMarkAttendance={() => setView("mark")}
            isAlreadyMarkedToday={isAlreadyMarkedToday}
            assignedDivisions={apiData?.assigned_divisions}
            selectedDivisionId={selectedDivId}
            onSelectDivision={handleSelectDivision}
            onViewStudent={(st) => setViewingStudent(st)}
            onEditStudent={(st) => setEditingStudent(st)}
            onQuickUpdate={handleStudentAttendanceUpdated}
            onBulkQuickUpdate={handleBulkAttendanceUpdated}
          />
          {viewingStudent && (
            <StudentViewModal
              student={viewingStudent}
              attendanceRecords={rawAttendanceRecords}
              divisionName={divisionName}
              onClose={() => setViewingStudent(null)}
            />
          )}
          {editingStudent && (
            <EditStudentAttendanceModal
              student={editingStudent}
              divisionName={divisionName}
              onClose={() => setEditingStudent(null)}
              onSuccess={(newStatus) => {
                handleStudentAttendanceUpdated(editingStudent.id, newStatus);
              }}
            />
          )}
        </>
      ) : (
        <MarkAttendanceView
          students={students}
          divisionName={divisionName}
          onBack={() => setView("list")}
          localStorageKey={localStorageKey}
          isEditMode={isAlreadyMarkedToday}
          onMarkedSuccess={() => {
            setIsAlreadyMarkedToday(true);
            fetchStudents(selectedDivId ?? undefined);
          }}
        />
      )}
    </>
  );
}