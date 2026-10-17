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
  "#7c3aed", "#6366f1", "#2563eb", "#0284c7", "#0d9488",
  "#059669", "#d97706", "#dc2626", "#e11d48", "#4f46e5",
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

// ─── Stat Card (Matches Original Dashboard Outfit Theme) ───────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex-1 min-w-0 bg-white rounded-xl border border-slate-100 px-3.5 py-3 flex items-center gap-3 shadow-xs"
      style={{ boxShadow: "0 2px 10px -2px rgba(0,0,0,0.06)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5 truncate">
          {label}
        </p>
        <p className="text-lg font-extrabold text-slate-900 leading-none">
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
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
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
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-xs text-white">
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
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-violet-500 focus:bg-white transition-all"
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
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-violet-500 focus:bg-white transition-all"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-xs"
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
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-xs text-white">
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
        <div className="px-6 py-3 bg-violet-50/30 border-b border-violet-100/50 grid grid-cols-3 gap-3 shrink-0 text-center">
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

  return (
    <div
      className="w-full max-w-full overflow-hidden px-3 sm:px-4 py-4 flex flex-col gap-4"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Top Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
            Attendance History
          </h1>
          <p className="text-xs text-slate-400">
            View punches, monitor missing punch records, and request corrections
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {divisions.length > 0 && (
            <select
              value={selectedDivisionId}
              onChange={(e) =>
                setSelectedDivisionId(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-violet-500 cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={loadStudentAttendance}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-violet-500" : ""}`}
            />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* ── View Mode Tabs: Students (Default) vs Staff Punch ── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab("students")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "students"
              ? "bg-violet-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-transparent"
          }`}
        >
          <Users className="w-4 h-4" />
          Student Attendance History ({records.length})
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "staff"
              ? "bg-violet-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-transparent"
          }`}
        >
          <Clock className="w-4 h-4" />
          My Staff Punch History
        </button>
      </div>

      {activeTab === "students" ? (
        <>
          {/* ── Stats Row ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.04 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
          >
            <StatCard
              icon={Calendar}
              label="TOTAL"
              value={stats.total}
              color="#7c3aed"
              delay={0.06}
            />
            <StatCard
              icon={CheckCircle2}
              label="PRESENT"
              value={`${stats.present} (${stats.pct}%)`}
              color="#10b981"
              delay={0.09}
            />
            <StatCard
              icon={Users}
              label="BOYS"
              value={`${stats.malesCount} (${stats.malePct}%)`}
              color="#3b82f6"
              delay={0.12}
            />
            <StatCard
              icon={XCircle}
              label="ABSENT"
              value={`${stats.absent} (${stats.total > 0 ? 100 - stats.pct : 0}%)`}
              color="#ef4444"
              delay={0.15}
            />
            <StatCard
              icon={UserCheck}
              label="GIRLS"
              value={`${stats.femalesCount} (${stats.femalePct}%)`}
              color="#8b5cf6"
              delay={0.18}
            />
          </motion.div>

          {/* ── Table Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs"
            style={{ boxShadow: "0 2px 14px -4px rgba(0,0,0,0.06)" }}
          >
            {/* Primary Filter Bar: Search + Status Tabs */}
            <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search date or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-violet-500 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: "All" },
                  { id: "present", label: "Present" },
                  { id: "absent", label: "Absent" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-violet-600 text-white shadow-xs"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Filter Bar: Gender + Date Presets + Date Range + Sort */}
            <div className="px-3 sm:px-4 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Gender Segmented Tabs (Never wraps awkwardly, NO emojis) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Gender:
                  </span>
                  <div className="bg-slate-100/80 p-1 rounded-xl inline-flex items-center gap-1">
                    {[
                      { id: "all", label: "All" },
                      { id: "male", label: "Males" },
                      { id: "female", label: "Females" },
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGenderFilter(g.id as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          genderFilter === g.id
                            ? "bg-violet-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Date:
                  </span>
                  <div className="bg-slate-100/80 p-1 rounded-xl inline-flex items-center gap-1">
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
                            ? "bg-violet-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {dp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Range, Sort & Reset */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-xs">
                  <span className="text-slate-400 font-medium text-[11px]">Range:</span>
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
                    className="font-semibold text-slate-700 outline-none text-xs bg-transparent"
                  />
                  <span className="text-slate-300">—</span>
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
                    className="font-semibold text-slate-700 outline-none text-xs bg-transparent"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500 cursor-pointer shadow-xs"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="roll">Roll Number</option>
                  <option value="name">Name (A-Z)</option>
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                    title="Reset filters"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto mb-2" />
                        <div className="text-xs font-semibold text-slate-400">
                          Loading attendance records…
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="text-sm font-bold text-slate-800">
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
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
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
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {r.roll_no || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                                style={{ background: avatarBg }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 leading-tight">
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
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-bold border border-violet-100">
                              {r.division_name || r.division || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 font-medium text-slate-700">
                            {formatDateDisplay(r.attendance_date)}
                          </td>

                          <td className="px-4 py-2.5">
                            <AttendanceStatusBadge isPresent={r.is_present} />
                          </td>

                          <td className="px-4 py-2.5 text-slate-500">
                            {r.marked_by || "Class Teacher"}
                          </td>

                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingRecord(r)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200/80 transition-colors cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
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

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-slate-500">
                  Showing {(page - 1) * PER_PAGE + 1}–
                  {Math.min(page * PER_PAGE, filteredRecords.length)} of{" "}
                  {filteredRecords.length} records
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-semibold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 inline align-middle" /> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer ${
                        page === p
                          ? "bg-violet-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-semibold"
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
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Staff Biometric / Check-In Punch Logs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your personal teacher biometric check-in & check-out logs
            </p>
          </div>

          {staffLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-400">
                Loading punch records…
              </div>
            </div>
          ) : staffRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">
                No records found
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                No biometric or mobile punch records logged in the system yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Check In</th>
                    <th className="px-4 py-2.5">Check Out</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffRecords.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {formatDateDisplay(r.attendance_date || (r as any).date)}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-emerald-600">
                        {r.check_in || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-rose-600">
                        {r.check_out || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            r.is_present
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
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
