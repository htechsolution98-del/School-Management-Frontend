"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  FileEdit,
  X,
  AlertTriangle,
  Send,
  Timer,
  ChevronDown,
} from "lucide-react";
import { getAttendanceHistory } from "@/lib/teacher/attendance";
import { createAttendanceRegularization } from "@/lib/hr-config";
import { getCurrentUserProfile } from "@/lib/current-user";
import type { CurrentUserProfile } from "@/types";
import type { AttendanceRecord } from "@/types/teacher";

interface StaffAttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName?: string;
  staffId?: number;
  roleName?: string;
}

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
  }
  return "";
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

function parseISODate(val: any): string {
  if (!val) return "—";
  const dateStr = formatDateYYYYMMDD(val);
  if (!dateStr) return typeof val === "string" ? val : "—";
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

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PRESENT: {
    label: "Present",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  LATE: {
    label: "Late",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  HALF_DAY: {
    label: "Half Day",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  ABSENT: {
    label: "Absent",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  LEAVE: {
    label: "Leave",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  HOLIDAY: {
    label: "Holiday",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  WEEK_OFF: {
    label: "Week Off",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  MISSING_PUNCH: {
    label: "Missing Punch",
    className: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

function getStatusBadge(record: AttendanceRecord) {
  const canonical = (record.status || "").toUpperCase();
  if (STATUS_BADGE_CONFIG[canonical]) {
    return STATUS_BADGE_CONFIG[canonical];
  }
  if (record.check_in && !record.check_out) {
    return STATUS_BADGE_CONFIG.MISSING_PUNCH;
  }
  if (!record.is_present) {
    return STATUS_BADGE_CONFIG.ABSENT;
  }
  if (record.is_half_day) {
    return STATUS_BADGE_CONFIG.HALF_DAY;
  }
  if (record.is_late) {
    return STATUS_BADGE_CONFIG.LATE;
  }
  return STATUS_BADGE_CONFIG.PRESENT;
}

export function StaffAttendanceHistoryModal({
  isOpen,
  onClose,
  staffName,
  staffId,
  roleName = "Staff",
}: StaffAttendanceHistoryModalProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "half-day" | "absent" | "missing-punch">("all");

  // Regularization modal state
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [reqCheckIn, setReqCheckIn] = useState("09:00");
  const [reqCheckOut, setReqCheckOut] = useState("17:00");
  const [reason, setReason] = useState("");
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionMsg, setCorrectionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const [attData, userProfile] = await Promise.all([
        getAttendanceHistory(staffId ? { staff_id: staffId } : undefined),
        getCurrentUserProfile().catch(() => null),
      ]);
      setRecords(staffId ? attData.filter((record) => record.staff === staffId) : attData);
      if (userProfile) setProfile(userProfile);
    } catch (err: any) {
      setError(err?.message || "Failed to load attendance history.");
    } finally {
      setLoading(false);
    }
  }, [isOpen, staffId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const present = records.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s ? (s === "PRESENT" || s === "LATE") : (r.is_present && !r.is_half_day);
    }).length;
    const halfDay = records.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s ? s === "HALF_DAY" : r.is_half_day;
    }).length;
    const absent = records.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s ? (s === "ABSENT" || s === "LEAVE") : !r.is_present;
    }).length;
    const missingPunch = records.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s ? s === "MISSING_PUNCH" : Boolean(r.check_in && !r.check_out);
    }).length;
    const total = records.length;
    const rate = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;
    return { present, halfDay, absent, missingPunch, total, rate };
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const canonical = (r.status || "").toUpperCase();
      let matchesStatus = true;
      if (statusFilter === "present") {
        matchesStatus = canonical ? (canonical === "PRESENT" || canonical === "LATE") : (r.is_present && !r.is_half_day);
      } else if (statusFilter === "half-day") {
        matchesStatus = canonical ? canonical === "HALF_DAY" : r.is_half_day;
      } else if (statusFilter === "absent") {
        matchesStatus = canonical ? (canonical === "ABSENT" || canonical === "LEAVE") : !r.is_present;
      } else if (statusFilter === "missing-punch") {
        matchesStatus = canonical ? canonical === "MISSING_PUNCH" : Boolean(r.check_in && !r.check_out);
      }

      const q = search.toLowerCase().trim();
      const recDate = formatDateYYYYMMDD(r.attendance_date) || "";
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
    setReqCheckIn("09:00");
    setReqCheckOut("17:00");
    setReason("");
    setCorrectionMsg(null);
    setIsCorrectionOpen(true);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!reason.trim()) {
      setCorrectionMsg({ type: "error", text: "Please enter a reason for regularization." });
      return;
    }

    const attDate = formatDateYYYYMMDD(selectedRecord.attendance_date) || formatDateYYYYMMDD(new Date());

    setCorrectionLoading(true);
    setCorrectionMsg(null);
    try {
      await createAttendanceRegularization({
        attendance_date: attDate,
        requested_check_in: reqCheckIn ? (reqCheckIn.length === 5 ? `${reqCheckIn}:00` : reqCheckIn) : null,
        requested_check_out: reqCheckOut ? (reqCheckOut.length === 5 ? `${reqCheckOut}:00` : reqCheckOut) : null,
        reason: reason.trim(),
        staff: selectedRecord.staff || profile?.staff_profile?.id,
      });

      setCorrectionMsg({ type: "success", text: "Regularization request submitted successfully!" });
      setTimeout(() => {
        setIsCorrectionOpen(false);
        loadData();
      }, 1200);
    } catch (err: any) {
      setCorrectionMsg({ type: "error", text: err?.message || "Failed to submit request." });
    } finally {
      setCorrectionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Attendance Log & History
              </h2>
              <p className="text-xs text-slate-500">
                {staffName ? `${staffName} · ` : ""}{roleName} Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-3 border-b border-slate-100 bg-white">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Present</p>
            <p className="text-lg font-black text-emerald-800">{stats.present}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Half Day</p>
            <p className="text-lg font-black text-amber-800">{stats.halfDay}</p>
          </div>
          <div className="p-3 rounded-2xl bg-red-50 border border-red-100">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Absent</p>
            <p className="text-lg font-black text-red-800">{stats.absent}</p>
          </div>
          <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Missing Punch</p>
            <p className="text-lg font-black text-orange-800">{stats.missingPunch}</p>
          </div>
          <div className="p-3 rounded-2xl bg-violet-50 border border-violet-100 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Attendance Rate</p>
            <p className="text-lg font-black text-violet-800">{stats.rate}%</p>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search date or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {(["all", "present", "half-day", "absent", "missing-punch"] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl capitalize transition-colors shrink-0 ${
                  statusFilter === filterKey
                    ? "bg-violet-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {filterKey.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <p className="text-xs font-semibold">Loading records…</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center text-xs text-red-600">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              No attendance records found matching criteria.
            </div>
          ) : (
            filtered.map((record) => {
              const badge = getStatusBadge(record);
              const canonical = (record.status || "").toUpperCase();

              return (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all gap-3 bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-600 font-bold shrink-0">
                      <span className="text-[10px] leading-none uppercase">
                        {new Date(record.attendance_date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-sm leading-none mt-0.5">
                        {new Date(record.attendance_date).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800">
                          {parseISODate(record.attendance_date)}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {record.is_late && canonical !== "LATE" && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md">
                            Late
                          </span>
                        )}
                        {record.is_early_exit && (
                          <span className="text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-md">
                            Early Exit
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-emerald-600" />
                          In: {parseISOTime(record.check_in)}
                        </span>
                        <span className="flex items-center gap-1">
                          <LogOut className="w-3 h-3 text-purple-600" />
                          Out: {parseISOTime(record.check_out)}
                        </span>
                        {record.working_hours ? (
                          <span className="flex items-center gap-1 text-slate-700 font-bold">
                            <Timer className="w-3 h-3 text-slate-400" />
                            {record.working_hours}h
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        GPS in: {record.check_in_latitude != null && record.check_in_longitude != null
                          ? `${record.check_in_latitude}, ${record.check_in_longitude}` : "not recorded"}
                        <span className="mx-2">?</span>
                        GPS out: {record.check_out_latitude != null && record.check_out_longitude != null
                          ? `${record.check_out_latitude}, ${record.check_out_longitude}` : "not recorded"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenCorrection(record)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 text-slate-600 hover:text-violet-700 hover:bg-violet-50/50 transition-colors"
                    >
                      <FileEdit className="w-3 h-3" />
                      Regularize
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Regularization Modal */}
      <AnimatePresence>
        {isCorrectionOpen && selectedRecord && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Attendance Regularization Request
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Date: {parseISODate(selectedRecord.attendance_date)}
                  </p>
                </div>
                <button
                  onClick={() => setIsCorrectionOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {correctionMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    correctionMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {correctionMsg.text}
                </div>
              )}

              <form onSubmit={handleSubmitCorrection} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">
                      Requested Check In
                    </label>
                    <input
                      type="time"
                      value={reqCheckIn}
                      onChange={(e) => setReqCheckIn(e.target.value)}
                      className="w-full mt-1 p-2 text-xs rounded-xl border border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">
                      Requested Check Out
                    </label>
                    <input
                      type="time"
                      value={reqCheckOut}
                      onChange={(e) => setReqCheckOut(e.target.value)}
                      className="w-full mt-1 p-2 text-xs rounded-xl border border-slate-200 bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">
                    Reason for Correction
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Device GPS malfunction, outdoor field duty..."
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCorrectionOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={correctionLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {correctionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    Submit Request
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
