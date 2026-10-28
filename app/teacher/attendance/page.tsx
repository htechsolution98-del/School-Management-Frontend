"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Edit3,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Users,
  GraduationCap,
  RotateCcw,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Loader2,
  Save,
  ClipboardList,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  getStudentAttendanceRecords,
  getStudentsForAttendance,
  updateSingleStudentAttendance,
} from "@/lib/teacher/student-attendance";
import { getAttendanceHistory } from "@/lib/teacher/attendance";
import type { AttendanceRecord } from "@/types/teacher";

// ─── Avatar Palette ───────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  "#2563eb", "#0284c7", "#1d4ed8", "#0369a1", "#0d9488",
  "#059669", "#d97706", "#dc2626", "#e11d48", "#0f766e",
];

function getInitials(name?: string, surname?: string): string {
  const f = (name || "").trim().charAt(0).toUpperCase();
  const l = (surname || "").trim().charAt(0).toUpperCase();
  return (f + l) || "ST";
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        weekday: "short",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
  className = "",
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-2xs hover:shadow-xs transition-all ${className}`}
    >
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mb-1 truncate">
          {label}
        </p>
        <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-none truncate">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Gender Badge (Text-Only, No Emojis) ───────────────────────────────────────
function GenderBadge({ gender }: { gender?: string }) {
  const g = (gender || "").toLowerCase();
  const isFemale = g.includes("female") || g === "f" || g.includes("girl");
  const isMale = g.includes("male") || g === "m" || g.includes("boy");

  if (isFemale) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
        Female
      </span>
    );
  }

  if (isMale) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
        Male
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      {gender || "—"}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function AttendanceStatusBadge({ isPresent }: { isPresent: boolean }) {
  if (isPresent) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Present
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
      <XCircle className="w-3 h-3 text-rose-600" />
      Absent
    </span>
  );
}

// ─── Edit Student Attendance Modal ────────────────────────────────────────────
function EditStudentAttendanceModal({
  record,
  onClose,
  onSuccess,
}: {
  record: any;
  onClose: () => void;
  onSuccess: (updatedRecord: any) => void;
}) {
  const [status, setStatus] = useState<"present" | "absent">(
    record.is_present ? "present" : "absent"
  );
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const d = record.attendance_date || new Date().toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    return d > today ? today : d;
  });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentName =
    record.student_name ||
    `${record.name || ""} ${record.surname || ""}`.trim() ||
    "Student";
  const initials = getInitials(record.name, record.surname);

  const handleSave = async () => {
    if (attendanceDate > todayStr) {
      setError("Cannot select or mark attendance for future dates.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSingleStudentAttendance(
        record.student_id || record.student,
        status === "present",
        status === "absent",
        reason,
        attendanceDate
      );
      const updated = {
        ...record,
        is_present: status === "present",
        is_absent: status === "absent",
        attendance_date: attendanceDate,
      };
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update attendance.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
              {initials}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Edit Attendance Record
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {studentName} {record.gr_no ? `· GR: ${record.gr_no}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Date Picker (Strict max={todayStr}) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Attendance Date
            </label>
            <input
              type="date"
              max={todayStr}
              value={attendanceDate}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val > todayStr) return;
                setAttendanceDate(val);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status Selection Cards */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("present")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  status === "present"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                    status === "present"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  Present
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("absent")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  status === "absent"
                    ? "border-rose-500 bg-rose-50 text-rose-800 shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                    status === "absent"
                      ? "bg-rose-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  Absent
                </span>
              </button>
            </div>
          </div>

          {/* Reason / Remarks */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Reason / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder={
                status === "absent"
                  ? "e.g., Sick leave, Family travel"
                  : "e.g., Regular, Late arrival"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {status === "absent" && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>
                Marking as Absent will automatically dispatch absence notifications to the parent profile.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Detail / History Modal ───────────────────────────────────────────
function StudentDetailModal({
  studentId,
  studentName,
  allRecords,
  onClose,
}: {
  studentId: number | string;
  studentName: string;
  allRecords: any[];
  onClose: () => void;
}) {
  const history = useMemo(() => {
    return allRecords.filter(
      (r) => String(r.student_id || r.student) === String(studentId)
    );
  }, [allRecords, studentId]);

  const presentCount = history.filter((r) => r.is_present).length;
  const absentCount = history.filter((r) => r.is_absent).length;
  const rate =
    history.length > 0
      ? Math.round((presentCount / history.length) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
              {getInitials(studentName)}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Attendance Timeline
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {studentName} · {history.length} Records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="px-6 py-3 bg-blue-50/30 border-b border-blue-100/50 grid grid-cols-3 gap-3 shrink-0 text-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Logged
            </span>
            <span className="text-sm font-extrabold text-slate-800">
              {history.length} Days
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Present Rate
            </span>
            <span className="text-sm font-extrabold text-emerald-600">
              {presentCount} ({rate}%)
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Absences
            </span>
            <span className="text-sm font-extrabold text-rose-600">
              {absentCount} Days
            </span>
          </div>
        </div>

        {/* History List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              No historical attendance logs recorded for this student.
            </div>
          ) : (
            history.map((rec, i) => (
              <div
                key={rec.id || i}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      rec.is_present
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {rec.is_present ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {formatDateDisplay(rec.attendance_date)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Marked by: {rec.marked_by || "Class Teacher"}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    rec.is_present
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {rec.is_present ? "Present" : "Absent"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Attendance History Page ─────────────────────────────────────────────
export default function AttendanceHistoryPage() {
  const [activeTab, setActiveTab] = useState<"students" | "staff">("students");

  // Records state
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Divisions state
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | "all">("all");

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "roll" | "name">("date_desc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Strict today ISO string (Disallow future dates)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Pagination State
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Modals State
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [viewingStudent, setViewingStudent] = useState<{ id: any; name: string } | null>(null);

  // Staff punches state (for secondary tab)
  const [staffRecords, setStaffRecords] = useState<AttendanceRecord[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Load Data
  const loadStudentAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attData, classData] = await Promise.all([
        getStudentAttendanceRecords().catch(() => []),
        getStudentsForAttendance().catch(() => null),
      ]);

      setRecords(attData || []);
      if (classData?.assigned_divisions && classData.assigned_divisions.length > 0) {
        setDivisions(classData.assigned_divisions);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentAttendance();
  }, [loadStudentAttendance]);

  // Load staff records when tab switched
  useEffect(() => {
    if (activeTab === "staff" && staffRecords.length === 0) {
      setStaffLoading(true);
      getAttendanceHistory()
        .then((data) => setStaffRecords(data || []))
        .catch(() => {})
        .finally(() => setStaffLoading(false));
    }
  }, [activeTab, staffRecords.length]);

  // Handle Preset Date changes
  const handleDatePreset = (preset: "all" | "today" | "yesterday" | "week" | "month") => {
    setDatePreset(preset);
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      setStartDate(toISO(y));
      setEndDate(toISO(y));
    } else if (preset === "week") {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      setStartDate(toISO(w));
      setEndDate(todayStr);
    } else if (preset === "month") {
      const m = new Date(today);
      m.setDate(m.getDate() - 30);
      setStartDate(toISO(m));
      setEndDate(todayStr);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGenderFilter("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setSelectedDivisionId("all");
    setSortBy("date_desc");
  };

  // Client Filter & Sort logic
  const filteredRecords = useMemo(() => {
    let result = [...records];

    // Exclude any records with future dates
    result = result.filter((r) => {
      const d = (r.attendance_date || "").split("T")[0];
      return !d || d <= todayStr;
    });

    // 1. Search Query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => {
        const sName = (r.student_name || `${r.name || ""} ${r.surname || ""}`).toLowerCase();
        const rNo = (r.roll_no || "").toString().toLowerCase();
        const gNo = (r.gr_no || "").toString().toLowerCase();
        const dateStr = (r.attendance_date || "").toLowerCase();
        const divName = (r.division_name || r.division || "").toLowerCase();
        return (
          sName.includes(q) ||
          rNo.includes(q) ||
          gNo.includes(q) ||
          dateStr.includes(q) ||
          divName.includes(q)
        );
      });
    }

    // 2. Gender Filter
    if (genderFilter !== "all") {
      result = result.filter((r) => {
        const g = (r.gender || "").toLowerCase();
        if (genderFilter === "male") {
          return g.includes("male") || g === "m" || g.includes("boy");
        }
        if (genderFilter === "female") {
          return g.includes("female") || g === "f" || g.includes("girl");
        }
        return true;
      });
    }

    // 3. Status Filter
    if (statusFilter === "present") {
      result = result.filter((r) => r.is_present);
    } else if (statusFilter === "absent") {
      result = result.filter((r) => r.is_absent);
    }

    // 4. Date Range
    if (startDate && endDate) {
      result = result.filter((r) => {
        const d = (r.attendance_date || "").split("T")[0];
        return d >= startDate && d <= endDate;
      });
    } else if (startDate) {
      result = result.filter((r) => (r.attendance_date || "").split("T")[0] >= startDate);
    } else if (endDate) {
      result = result.filter((r) => (r.attendance_date || "").split("T")[0] <= endDate);
    }

    // 5. Division filter
    if (selectedDivisionId !== "all") {
      const selectedDivObj = divisions.find((d) => d.division_id === Number(selectedDivisionId));
      if (selectedDivObj) {
        const divNameQuery = selectedDivObj.division_name.toLowerCase();
        result = result.filter((r) => {
          const divStr = (r.division_name || r.division || "").toLowerCase();
          return divStr.includes(divNameQuery) || String(r.division_id) === String(selectedDivisionId);
        });
      }
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (sortBy === "date_desc") {
        return (b.attendance_date || "").localeCompare(a.attendance_date || "");
      }
      if (sortBy === "date_asc") {
        return (a.attendance_date || "").localeCompare(b.attendance_date || "");
      }
      if (sortBy === "roll") {
        const rA = parseInt(a.roll_no || "99999", 10);
        const rB = parseInt(b.roll_no || "99999", 10);
        if (!isNaN(rA) && !isNaN(rB)) return rA - rB;
        return (a.roll_no || "").localeCompare(b.roll_no || "");
      }
      if (sortBy === "name") {
        const nA = (a.student_name || `${a.name || ""} ${a.surname || ""}`).trim();
        const nB = (b.student_name || `${b.name || ""} ${b.surname || ""}`).trim();
        return nA.localeCompare(nB);
      }
      return 0;
    });

    return result;
  }, [
    records,
    search,
    genderFilter,
    statusFilter,
    startDate,
    endDate,
    selectedDivisionId,
    divisions,
    sortBy,
    todayStr,
  ]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PER_PAGE));
  const paginatedRecords = useMemo(() => {
    const startIndex = (page - 1) * PER_PAGE;
    return filteredRecords.slice(startIndex, startIndex + PER_PAGE);
  }, [filteredRecords, page]);

  useEffect(() => {
    setPage(1);
  }, [search, genderFilter, statusFilter, startDate, endDate, selectedDivisionId, sortBy]);

  // Metrics
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.is_present).length;
    const absent = filteredRecords.filter((r) => r.is_absent).length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const males = filteredRecords.filter((r) => {
      const g = (r.gender || "").toLowerCase();
      return g.includes("male") || g === "m" || g.includes("boy");
    });
    const malesPresent = males.filter((r) => r.is_present).length;
    const malePct = males.length > 0 ? Math.round((malesPresent / males.length) * 100) : 0;

    const females = filteredRecords.filter((r) => {
      const g = (r.gender || "").toLowerCase();
      return g.includes("female") || g === "f" || g.includes("girl");
    });
    const femalesPresent = females.filter((r) => r.is_present).length;
    const femalePct = females.length > 0 ? Math.round((femalesPresent / females.length) * 100) : 0;

    return {
      total,
      present,
      absent,
      pct,
      malesCount: males.length,
      malePct,
      femalesCount: females.length,
      femalePct,
    };
  }, [filteredRecords]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      "Roll No",
      "GR No",
      "Student Name",
      "Gender",
      "Class/Division",
      "Attendance Date",
      "Status",
      "Marked By",
    ];
    const rows = filteredRecords.map((r) => [
      r.roll_no || "",
      r.gr_no || "",
      `"${(r.student_name || `${r.name || ""} ${r.surname || ""}`).trim()}"`,
      r.gender || "",
      `"${r.division_name || ""}"`,
      r.attendance_date || "",
      r.is_present ? "Present" : "Absent",
      `"${r.marked_by || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `student_attendance_history_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = Boolean(
    search ||
    genderFilter !== "all" ||
    statusFilter !== "all" ||
    datePreset !== "all" ||
    startDate ||
    endDate ||
    selectedDivisionId !== "all"
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (genderFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (datePreset !== "all" || startDate || endDate) count++;
    if (selectedDivisionId !== "all") count++;
    if (sortBy !== "date_desc") count++;
    return count;
  }, [search, genderFilter, statusFilter, datePreset, startDate, endDate, selectedDivisionId, sortBy]);

  return (
    <div className="w-full max-w-full overflow-hidden px-3 sm:px-6 py-4 pb-6 lg:pb-8 flex flex-col gap-4 text-slate-800 dark:text-slate-100">
      {/* ── Top Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
              Attendance History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Review student attendance records, punch timelines & export logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto w-full sm:w-auto">
          {divisions.length > 0 && (
            <select
              value={selectedDivisionId}
              onChange={(e) =>
                setSelectedDivisionId(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className="flex-1 sm:flex-initial bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Divisions ({divisions.length})</option>
              {divisions.map((d) => (
                <option key={d.division_id} value={d.division_id}>
                  {d.division_name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Export</span>
            <span className="hidden sm:inline">CSV</span>
          </button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={loadStudentAttendance}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`}
            />
            <span className="hidden xs:inline">Refresh</span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── View Mode Tabs: Students vs Staff Punch ── */}
      <div className="grid grid-cols-2 sm:inline-flex p-1 bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl w-full sm:w-auto">
        <button
          onClick={() => setActiveTab("students")}
          className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "students"
              ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Student Attendance History</span>
          <span className="sm:hidden">Students</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 font-semibold">
            {records.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "staff"
              ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">My Staff Punch Logs</span>
          <span className="sm:hidden">Staff Punches</span>
        </button>
      </div>

      {activeTab === "students" ? (
        <>
          {/* ── Stats Grid ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.04 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3"
          >
            <StatCard
              icon={Calendar}
              label="TOTAL RECORDS"
              value={stats.total}
              color="#2563eb"
              delay={0.06}
              className="col-span-2 sm:col-span-1"
            />
            <StatCard
              icon={CheckCircle2}
              label="PRESENT"
              value={`${stats.present} (${stats.pct}%)`}
              color="#10b981"
              delay={0.08}
            />
            <StatCard
              icon={Users}
              label="BOYS PRESENT"
              value={`${stats.malesCount} (${stats.malePct}%)`}
              color="#3b82f6"
              delay={0.10}
            />
            <StatCard
              icon={XCircle}
              label="ABSENT"
              value={`${stats.absent} (${stats.total > 0 ? 100 - stats.pct : 0}%)`}
              color="#ef4444"
              delay={0.12}
            />
            <StatCard
              icon={UserCheck}
              label="GIRLS PRESENT"
              value={`${stats.femalesCount} (${stats.femalePct}%)`}
              color="#0284c7"
              delay={0.14}
            />
          </motion.div>

          {/* ── Main Container: Filters + Attendance Data ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs"
          >
            {/* Primary Filter Bar: Search + Status Pills + Mobile Filters Toggle */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student, roll no, GR no, date..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Pills + Mobile Filter Toggle Button */}
              <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                {/* Status Segmented Control */}
                <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "present", label: "Present" },
                    { id: "absent", label: "Absent" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === tab.id
                          ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Mobile Filters Trigger (Visible on small screens) */}
                <button
                  onClick={() => setShowMobileFilters((prev) => !prev)}
                  className={`md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    showMobileFilters || activeFiltersCount > 0
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showMobileFilters ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Secondary Filter Drawer: Gender + Date Presets + Range + Sort (Collapsible on mobile) */}
            <div
              className={`${
                showMobileFilters ? "block" : "hidden md:block"
              } px-3 sm:px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs transition-all`}
            >
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 flex-wrap">
                  {/* Gender Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                      Gender:
                    </span>
                    <div className="bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl inline-flex items-center gap-1">
                      {[
                        { id: "all", label: "All" },
                        { id: "male", label: "Males" },
                        { id: "female", label: "Females" },
                      ].map((g) => (
                        <button
                          key={g.id}
                          onClick={() => setGenderFilter(g.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            genderFilter === g.id
                              ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Presets */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                      Preset:
                    </span>
                    <div className="bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl inline-flex items-center gap-1 shrink-0">
                      {[
                        { key: "all", label: "All" },
                        { key: "today", label: "Today" },
                        { key: "yesterday", label: "Yesterday" },
                        { key: "week", label: "7 Days" },
                        { key: "month", label: "30 Days" },
                      ].map((dp) => (
                        <button
                          key={dp.key}
                          onClick={() => handleDatePreset(dp.key as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            datePreset === dp.key
                              ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          }`}
                        >
                          {dp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Range, Sort & Reset */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                  {/* Date range inputs */}
                  <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
                    <span className="text-slate-400 font-medium text-[10px] uppercase">Range:</span>
                    <input
                      type="date"
                      max={endDate && endDate <= todayStr ? endDate : todayStr}
                      value={startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && val > todayStr) return;
                        setStartDate(val);
                        setDatePreset("custom");
                      }}
                      className="font-semibold text-slate-700 dark:text-slate-200 outline-none text-xs bg-transparent"
                    />
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                    <input
                      type="date"
                      min={startDate || undefined}
                      max={todayStr}
                      value={endDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && val > todayStr) return;
                        setEndDate(val);
                        setDatePreset("custom");
                      }}
                      className="font-semibold text-slate-700 dark:text-slate-200 outline-none text-xs bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="flex-1 sm:flex-initial bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                    >
                      <option value="date_desc">Newest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="roll">Roll Number</option>
                      <option value="name">Name (A-Z)</option>
                    </select>

                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Reset filters"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Desktop Attendance Table (Hidden on Mobile) ── */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5">Roll No</th>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Gender</th>
                    <th className="px-4 py-2.5">Class / Div</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Marked By</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                        <div className="text-xs font-semibold text-slate-400">
                          Loading attendance records…
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <img
                          src="/images/empty-folder.png"
                          alt="No records found"
                          className="w-20 sm:w-24 h-auto object-contain mx-auto mb-3 filter drop-shadow-sm select-none pointer-events-none"
                        />
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          No records found
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {hasActiveFilters
                            ? "No attendance records match your current filters."
                            : "No attendance records logged yet."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset Filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, idx) => {
                      const sName =
                        r.student_name ||
                        `${r.name || ""} ${r.surname || ""}`.trim() ||
                        "Student";
                      const initials = getInitials(r.name, r.surname);
                      const avatarBg = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];

                      return (
                        <tr
                          key={r.id || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {r.roll_no || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-2xs"
                                style={{ background: avatarBg }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                  {sName}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  GR: {r.gr_no || "—"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-2.5">
                            <GenderBadge gender={r.gender} />
                          </td>

                          <td className="px-4 py-2.5">
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-100 dark:border-blue-800">
                              {r.division_name || r.division || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                            {formatDateDisplay(r.attendance_date)}
                          </td>

                          <td className="px-4 py-2.5">
                            <AttendanceStatusBadge isPresent={r.is_present} />
                          </td>

                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                            {r.marked_by || "Class Teacher"}
                          </td>

                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingRecord(r)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-800 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() =>
                                  setViewingStudent({
                                    id: r.student_id || r.student,
                                    name: sName,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" /> History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Attendance Cards (Visible on Mobile Only: md:hidden) ── */}
            <div className="md:hidden">
              {loading ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-400">
                    Loading attendance records…
                  </div>
                </div>
              ) : paginatedRecords.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No records found
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
                    {hasActiveFilters
                      ? "No attendance records match your current filters."
                      : "No attendance records logged yet."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedRecords.map((r, idx) => {
                    const sName =
                      r.student_name ||
                      `${r.name || ""} ${r.surname || ""}`.trim() ||
                      "Student";
                    const initials = getInitials(r.name, r.surname);
                    const avatarBg = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];

                    return (
                      <div
                        key={r.id || idx}
                        className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors space-y-2.5"
                      >
                        {/* Card Header: Avatar + Student Name + Status Badge */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs"
                              style={{ background: avatarBg }}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                                {sName}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  Roll #{r.roll_no || "—"}
                                </span>
                                {r.gr_no && (
                                  <span className="text-[10px] text-slate-400">
                                    GR: {r.gr_no}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <AttendanceStatusBadge isPresent={r.is_present} />
                          </div>
                        </div>

                        {/* Card Meta Row: Division + Gender + Date + Marked By */}
                        <div className="flex items-center justify-between gap-2 text-xs pt-0.5 border-t border-slate-50 dark:border-slate-800/50">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-100 dark:border-blue-800">
                              {r.division_name || r.division || "—"}
                            </span>
                            <GenderBadge gender={r.gender} />
                          </div>

                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDateDisplay(r.attendance_date)}</span>
                          </div>
                        </div>

                        {/* Card Actions Row */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            By: {r.marked_by || "Class Teacher"}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setEditingRecord(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-800 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() =>
                                setViewingStudent({
                                  id: r.student_id || r.student,
                                  name: sName,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>History</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Pagination Footer (Responsive Mobile & Desktop) ── */}
            {totalPages > 1 && (
              <div className="px-3 sm:px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
                  Showing {(page - 1) * PER_PAGE + 1}–
                  {Math.min(page * PER_PAGE, filteredRecords.length)} of{" "}
                  {filteredRecords.length} records
                </span>

                {/* Mobile Pagination (Compact Prev / Page X of Y / Next) */}
                <div className="flex sm:hidden items-center gap-1 w-full justify-between pt-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                    Prev
                  </button>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
                  </button>
                </div>

                {/* Desktop Numeric Pagination */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer font-semibold shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 inline align-middle" /> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        page === p
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer font-semibold shadow-2xs"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 inline align-middle" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      ) : (
        /* Tab 2: Teacher Personal Staff Punch History */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Staff Biometric / Check-In Punch Logs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your personal teacher biometric check-in & check-out logs
            </p>
          </div>

          {staffLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-400">
                Loading punch records…
              </div>
            </div>
          ) : staffRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No records found
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                No biometric or mobile punch records logged in the system yet.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Staff Table */}
              <div className="hidden sm:block overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Check In</th>
                      <th className="px-4 py-2.5">Check Out</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staffRecords.map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                          {formatDateDisplay(r.attendance_date || (r as any).date)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                          {r.check_in || "—"}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-rose-600 dark:text-rose-400">
                          {r.check_out || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              r.is_present
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {r.is_present ? "Present" : "Absent"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Staff Cards */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {staffRecords.map((r, i) => (
                  <div key={r.id || i} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {formatDateDisplay(r.attendance_date || (r as any).date)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.is_present
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {r.is_present ? "Present" : "Absent"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                          Check In
                        </span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-xs">
                          {r.check_in || "—"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">
                          Check Out
                        </span>
                        <span className="font-extrabold text-rose-700 dark:text-rose-300 text-xs">
                          {r.check_out || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {editingRecord && (
        <EditStudentAttendanceModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={(updated) => {
            setRecords((prev) =>
              prev.map((r) =>
                String(r.id) === String(updated.id) ||
                (String(r.student_id || r.student) ===
                  String(updated.student_id || updated.student) &&
                  r.attendance_date === updated.attendance_date)
                  ? { ...r, ...updated }
                  : r
              )
            );
          }}
        />
      )}

      {viewingStudent && (
        <StudentDetailModal
          studentId={viewingStudent.id}
          studentName={viewingStudent.name}
          allRecords={records}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </div>
  );
}
