"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Calendar,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  Timer,
  ChevronDown,
  ChevronUp,
  FileEdit,
  X,
  AlertTriangle,
  Send,
  ShieldAlert,
} from "lucide-react";
import { getAttendanceHistory } from "@/lib/teacher";
import {
  getAttendanceRegularizations,
  createAttendanceRegularization,
  type AttendanceRegularization,
} from "@/lib/hr-config";
import { getCurrentUserProfile } from "@/lib/current-user";
import type { CurrentUserProfile } from "@/types";
import type { AttendanceRecord } from "@/types/teacher";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateYYYYMMDD(val: any): string {
  if (!val) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } else if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return "";
}

function getRecordDateStr(record?: any): string {
  if (!record) return "";
  return (
    formatDateYYYYMMDD(record.attendance_date) ||
    formatDateYYYYMMDD(record.date) ||
    formatDateYYYYMMDD(record.date_time) ||
    formatDateYYYYMMDD(record.check_in) ||
    formatDateYYYYMMDD(record.created_at) ||
    ""
  );
}

function parseISOTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    return `${(h % 12 || 12).toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")} ${ampm}`;
  } catch {
    return "—";
  }
}

function extractTimeHHMM(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

function parseISODate(val: any): string {
  if (!val) return "—";
  const dateStr = formatDateYYYYMMDD(val);
  if (!dateStr) return typeof val === "string" && val !== "Invalid Date" ? val : "—";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(dateObj.getTime())) return dateStr;
    return dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      weekday: "short",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function calcDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "—";
  try {
    const diff = Math.floor(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000,
    );
    if (diff <= 0) return "—";
    return `${Math.floor(diff / 60)
      .toString()
      .padStart(2, "0")}h ${(diff % 60).toString().padStart(2, "0")}m`;
  } catch {
    return "—";
  }
}

function getStatus(r: AttendanceRecord): "present" | "half-day" | "absent" {
  if (!r.is_present) return "absent";
  if (r.is_half_day) return "half-day";
  return "present";
}

const STATUS_CONFIG = {
  present: { label: "Present", bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
  "half-day": {
    label: "Half Day",
    bg: "#fef9c3",
    text: "#854d0e",
    dot: "#f59e0b",
  },
  absent: { label: "Absent", bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex-1 min-w-0 bg-white rounded-xl border border-slate-100 px-3 py-3 flex items-center gap-3"
      style={{ boxShadow: "0 2px 10px -2px rgba(0,0,0,0.06)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5 truncate">
          {label}
        </p>
        <p className="text-lg font-extrabold text-slate-900 leading-none">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Expanded Row ─────────────────────────────────────────────────────────────

function ExpandedRow({
  record,
  onOpenCorrection,
  existingReg,
}: {
  record: AttendanceRecord;
  onOpenCorrection: (record: AttendanceRecord) => void;
  existingReg?: AttendanceRegularization;
}) {
  const isMissingPunch = Boolean(record.check_in && !record.check_out);
  const isLate = Boolean(record.is_late);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <td colSpan={7} className="px-4 pb-3 pt-0">
        <div
          className="rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "#f8faff", border: "1px solid #e0e7ff" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            {[
              { label: "Record ID", value: `#${record.id}` },
              { label: "Category", value: record.category || "Staff" },
              { label: "Staff ID", value: `#${record.staff}` },
              {
                label: "Date & Time",
                value:
                  record.date_time && !isNaN(new Date(record.date_time).getTime())
                    ? new Date(record.date_time).toLocaleString("en-IN")
                    : parseISODate(getRecordDateStr(record)),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  {label}
                </p>
                <p className="text-xs font-semibold text-slate-700">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {existingReg ? (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                existingReg.status === "Approved"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : existingReg.status === "Rejected"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {existingReg.status === "Approved" && <CheckCircle2 className="w-3.5 h-3.5" />}
                {existingReg.status === "Rejected" && <XCircle className="w-3.5 h-3.5" />}
                {existingReg.status === "Pending" && <Clock className="w-3.5 h-3.5" />}
                Correction {existingReg.status}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onOpenCorrection(record)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isMissingPunch || isLate
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                Request Correction
              </button>
            )}
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Correction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [requestedCheckIn, setRequestedCheckIn] = useState("");
  const [requestedCheckOut, setRequestedCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [modalError, setModalError] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attData, regData] = await Promise.all([
        getAttendanceHistory(),
        getAttendanceRegularizations().catch(() => []),
      ]);
      setRecords(attData);
      setRegularizations(regData);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    getCurrentUserProfile()
      .then((p) => {
        if (mounted) setProfile(p);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const regMap = useMemo(() => {
    const map = new Map<string, AttendanceRegularization>();
    for (const r of regularizations) {
      const dStr = formatDateYYYYMMDD(r.attendance_date);
      if (dStr) {
        map.set(dStr, r);
      }
    }
    return map;
  }, [regularizations]);

  const stats = useMemo(() => {
    const present = records.filter(
      (r) => r.is_present && !r.is_half_day,
    ).length;
    const halfDay = records.filter((r) => r.is_half_day).length;
    const absent = records.filter((r) => !r.is_present).length;
    const missingPunch = records.filter((r) => r.check_in && !r.check_out).length;
    const total = records.length;
    const rate =
      total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;
    return { present, halfDay, absent, missingPunch, total, rate };
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const status = getStatus(r);
      const isMissingPunch = Boolean(r.check_in && !r.check_out);
      let matchesStatus = statusFilter === "all" || status === statusFilter;
      if (statusFilter === "missing-punch") {
        matchesStatus = isMissingPunch;
      }

      const q = search.toLowerCase().trim();
      const recDate = getRecordDateStr(r);
      const matchesSearch =
        !q ||
        recDate.includes(q) ||
        parseISODate(recDate).toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  const handleOpenCorrection = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setRequestedCheckIn(extractTimeHHMM(record.check_in) || "09:00");
    setRequestedCheckOut(extractTimeHHMM(record.check_out) || "17:00");
    setReason("");
    setModalError("");
    setIsModalOpen(true);
  };

  const handleCloseCorrection = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    setReason("");
    setModalError("");
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!reason.trim()) {
      setModalError("Please provide a reason for the regularization request.");
      return;
    }
    if (!requestedCheckIn && !requestedCheckOut) {
      setModalError("Please provide requested check-in and/or check-out times.");
      return;
    }

    const formattedDate =
      getRecordDateStr(selectedRecord) ||
      formatDateYYYYMMDD(selectedRecord.attendance_date) ||
      formatDateYYYYMMDD(new Date());

    if (!formattedDate) {
      setModalError("Unable to determine a valid attendance date for this record.");
      return;
    }

    // Resolve staff ID from record or authenticated user profile
    let staffId =
      selectedRecord.staff ||
      (selectedRecord as any).staff_id ||
      profile?.staff_profile?.id;

    if (!staffId) {
      try {
        const freshProfile = await getCurrentUserProfile();
        setProfile(freshProfile);
        staffId = freshProfile?.staff_profile?.id;
      } catch {
        // Fallback: will be resolved on the backend if available
      }
    }

    setSubmittingCorrection(true);
    setModalError("");
    try {
      await createAttendanceRegularization({
        attendance_date: formattedDate,
        requested_check_in: requestedCheckIn
          ? requestedCheckIn.length === 5
            ? `${requestedCheckIn}:00`
            : requestedCheckIn
          : null,
        requested_check_out: requestedCheckOut
          ? requestedCheckOut.length === 5
            ? `${requestedCheckOut}:00`
            : requestedCheckOut
          : null,
        reason: reason.trim(),
        ...(staffId ? { staff: Number(staffId) } : {}),
      });
      showToast("Regularization request submitted to Principal for review!", "success");
      handleCloseCorrection();
      load();
    } catch (err: any) {
      setModalError(err instanceof Error ? err.message : "Failed to submit regularization request.");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div
      className="w-full max-w-full overflow-hidden px-3 sm:px-4 py-4 flex flex-col gap-4"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl"
            style={
              toast.type === "success"
                ? { background: "#052e16", color: "white", border: "1px solid #166534" }
                : { background: "#450a0a", color: "white", border: "1px solid #991b1b" }
            }
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <p className="text-xs font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
            Attendance History
          </h1>
          <p className="text-xs text-slate-400">
            View punches, monitor missing punch records, and request corrections
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin text-violet-400" : ""}`}
          />
          Refresh
        </motion.button>
      </motion.div>

      {/* ── Stats Row ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.04 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
      >
        <StatCard
          icon={Calendar}
          label="Total"
          value={stats.total}
          color="#7c3aed"
          delay={0.06}
        />
        <StatCard
          icon={CheckCircle2}
          label="Present"
          value={stats.present}
          color="#10b981"
          delay={0.09}
        />
        <StatCard
          icon={MinusCircle}
          label="Half Day"
          value={stats.halfDay}
          color="#f59e0b"
          delay={0.12}
        />
        <StatCard
          icon={XCircle}
          label="Absent"
          value={stats.absent}
          color="#ef4444"
          delay={0.15}
        />
        <StatCard
          icon={AlertTriangle}
          label="Missing Punch"
          value={stats.missingPunch}
          color="#f97316"
          delay={0.18}
        />
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        style={{ boxShadow: "0 2px 14px -4px rgba(0,0,0,0.06)" }}
      >
        {/* Filters */}
        <div className="p-3 sm:p-4 border-b border-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search date or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-violet-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "All" },
              { id: "present", label: "Present" },
              { id: "half-day", label: "Half Day" },
              { id: "absent", label: "Absent" },
              { id: "missing-punch", label: "Missing Punch" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-2">
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
            <span className="text-xs font-bold text-slate-400">Loading attendance...</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-12 px-4 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-sm font-bold text-slate-700">{error}</p>
            <button
              onClick={load}
              className="mt-2 text-xs font-bold text-violet-600 hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 px-6">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-600">No records found</p>
              <p className="text-xs text-slate-400 mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your filters."
                  : "No attendance records yet."}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[860px] w-full">
              <thead>
                <tr style={{ background: "#f8faff" }}>
                  {[
                    "Date",
                    "Check In",
                    "Check Out",
                    "Duration",
                    "Status",
                    "Correction",
                    "",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence initial={false}>
                  {filtered.map((record, i) => {
                    const status = getStatus(record);
                    const sc = STATUS_CONFIG[status];
                    const isExpanded = expandedId === record.id;
                    const isMissingPunch = Boolean(record.check_in && !record.check_out);
                    const isLate = Boolean(record.is_late);
                    const recDateStr = getRecordDateStr(record);
                    const existingReg =
                      regMap.get(recDateStr) ||
                      (record.attendance_date ? regMap.get(record.attendance_date) : undefined);

                    return (
                      <React.Fragment key={`row-${record.id}-${i}`}>
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.24) }}
                          className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${
                            isMissingPunch ? "bg-amber-50/20" : ""
                          }`}
                          onClick={() => setExpandedId(isExpanded ? null : record.id)}
                        >
                          {/* Date */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: isMissingPunch ? "#fef3c7" : `${sc.dot}15` }}
                              >
                                <Calendar
                                  className="w-3.5 h-3.5"
                                  style={{ color: isMissingPunch ? "#d97706" : sc.dot }}
                                />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {parseISODate(recDateStr || record.attendance_date)}
                                </p>
                                {isMissingPunch && (
                                  <p className="text-[10px] font-extrabold text-amber-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Punch-out missing
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Check In */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {record.check_in ? (
                                <>
                                  <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
                                    <LogIn className="w-3 h-3 text-emerald-500" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                                      {parseISOTime(record.check_in)}
                                    </span>
                                    {isLate && (
                                      <span className="ml-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                        Late
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-300 font-semibold">—</span>
                              )}
                            </div>
                          </td>

                          {/* Check Out */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {record.check_out ? (
                                <>
                                  <div className="w-5 h-5 rounded-md bg-violet-50 flex items-center justify-center">
                                    <LogOut className="w-3 h-3 text-violet-500" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                                    {parseISOTime(record.check_out)}
                                  </span>
                                </>
                              ) : record.check_in ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                                  <AlertCircle className="w-3 h-3" /> Not Checked Out
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300 font-semibold">—</span>
                              )}
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Timer className="w-3 h-3 text-slate-400" />
                              <span className="text-xs font-bold text-slate-700 tabular-nums">
                                {calcDuration(record.check_in, record.check_out)}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: sc.bg, color: sc.text }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: sc.dot }}
                              />
                              {sc.label}
                            </span>
                          </td>

                          {/* Action: Correction */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {existingReg ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl ${
                                existingReg.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : existingReg.status === "Rejected"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {existingReg.status === "Approved" && <CheckCircle2 className="w-3 h-3" />}
                                {existingReg.status === "Pending" && <Clock className="w-3 h-3" />}
                                {existingReg.status === "Rejected" && <XCircle className="w-3 h-3" />}
                                {existingReg.status}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCorrection(record);
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                  isMissingPunch || isLate
                                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200"
                                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                }`}
                              >
                                <FileEdit className="w-3.5 h-3.5" />
                                Request Correction
                              </button>
                            )}
                          </td>

                          {/* Expand chevron */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400">
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {isExpanded && (
                            <ExpandedRow
                              key={`exp-${record.id}`}
                              record={record}
                              onOpenCorrection={handleOpenCorrection}
                              existingReg={existingReg}
                            />
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && !error && filtered.length > 0 && (
          <div
            className="px-4 py-3 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2"
            style={{ background: "#fafbff" }}
          >
            <p className="text-[10px] text-slate-400 font-semibold">
              Showing{" "}
              <span className="text-slate-600 font-bold">{filtered.length}</span>{" "}
              of{" "}
              <span className="text-slate-600 font-bold">{records.length}</span>{" "}
              records
            </p>
            <div className="flex items-center gap-3">
              {[
                { color: "#10b981", label: "Present", val: stats.present },
                { color: "#f59e0b", label: "Half", val: stats.halfDay },
                { color: "#ef4444", label: "Absent", val: stats.absent },
                { color: "#f97316", label: "Missing Punch", val: stats.missingPunch },
              ].map(({ color, label, val }) => (
                <span
                  key={label}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-500"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: color }}
                  />
                  {label}: {val}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Attendance Correction Modal ── */}
      <AnimatePresence>
        {isModalOpen && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      Request Attendance Regularization
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Submit punch correction for Principal approval
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseCorrection}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitCorrection} className="p-6 space-y-4">
                {/* Summary Box */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Selected Date
                    </p>
                    <p className="text-xs font-black text-slate-800">
                      {parseISODate(getRecordDateStr(selectedRecord)) || "Today"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Current Punch Status
                    </p>
                    <p className="text-xs font-semibold text-slate-700">
                      In: {parseISOTime(selectedRecord.check_in)} | Out: {parseISOTime(selectedRecord.check_out)}
                    </p>
                  </div>
                </div>

                {selectedRecord.check_in && !selectedRecord.check_out && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Missing Check-Out detected. Please provide your requested check-out time.</span>
                  </div>
                )}

                {/* Requested Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      Requested Check-In
                    </label>
                    <input
                      type="time"
                      value={requestedCheckIn}
                      onChange={(e) => setRequestedCheckIn(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      Requested Check-Out
                    </label>
                    <input
                      type="time"
                      value={requestedCheckOut}
                      onChange={(e) => setRequestedCheckOut(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Reason for Correction <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Biometric device offline on exit, school field duty, forgot punch-out..."
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setModalError("");
                    }}
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* Error */}
                {modalError && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {modalError}
                  </p>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseCorrection}
                    disabled={submittingCorrection}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCorrection}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {submittingCorrection ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
