"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  Check,
  X,
  Loader2,
  Search,
  History,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import {
  getAttendanceRegularizations,
  approveAttendanceRegularization,
  rejectAttendanceRegularization,
  type AttendanceRegularization,
} from "@/lib/hr-config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseISODate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00Z");
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      weekday: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function formatTime(timeStr?: string | null): string {
  if (!timeStr) return "—";
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

export default function PrincipalAttendanceExceptionsPage() {
  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Rejected" | "All">("Pending");
  const [search, setSearch] = useState("");

  // Processing state per request
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);

  // Audit history modal
  const [auditModalItem, setAuditModalItem] = useState<AttendanceRegularization | null>(null);

  // Note dialog state
  const [actionDialog, setActionDialog] = useState<{
    req: AttendanceRegularization;
    type: "approve" | "reject";
  } | null>(null);
  const [actionNote, setActionNote] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAttendanceRegularizations();
      setRequests(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load regularization requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "Pending").length;
    const approved = requests.filter((r) => r.status === "Approved").length;
    const rejected = requests.filter((r) => r.status === "Rejected").length;
    return { pending, approved, rejected, total: requests.length };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesTab = activeTab === "All" || r.status === activeTab;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.staff_name?.toLowerCase().includes(q) ||
        r.attendance_date.includes(q) ||
        parseISODate(r.attendance_date).toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [requests, activeTab, search]);

  const handleConfirmAction = async () => {
    if (!actionDialog) return;
    const { req, type } = actionDialog;
    setProcessingId(req.id);
    setProcessingAction(type);

    try {
      let updated: AttendanceRegularization;
      if (type === "approve") {
        updated = await approveAttendanceRegularization(req.id, actionNote.trim() || "Approved by Principal");
        showToast(`Attendance correction for ${req.staff_name || "staff"} approved successfully!`, "success");
      } else {
        updated = await rejectAttendanceRegularization(req.id, actionNote.trim() || "Rejected by Principal");
        showToast(`Attendance correction for ${req.staff_name || "staff"} rejected.`, "error");
      }

      setRequests((prev) => prev.map((item) => (item.id === req.id ? updated : item)));
      setActionDialog(null);
      setActionNote("");
    } catch (err: any) {
      showToast(err instanceof Error ? err.message : `Failed to ${type} request`, "error");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Toast Alert */}
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

      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#4338ca] p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" /> Principal Authorization
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Attendance Exceptions & Regularization
            </h1>
            <p className="text-indigo-100 max-w-xl text-sm md:text-base">
              Review and regularize staff check-in/out exceptions, resolve missing punch records, and inspect the immutable audit trail.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all shadow-sm disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1">
              Pending Exceptions
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-1">
              Approved
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.approved}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-1">
              Rejected
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.rejected}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">
              Total Recorded
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Main Content Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff, date, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(["Pending", "Approved", "Rejected", "All"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                {tab}
                {tab === "Pending" && stats.pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-900 font-extrabold">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-2">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            <span className="text-xs font-bold text-slate-400">Loading regularization requests...</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-16 px-4 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-sm font-bold text-slate-700">{error}</p>
            <button
              onClick={loadRequests}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredRequests.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">No requests found</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === "Pending"
                  ? "All staff punch exceptions have been regularized."
                  : "No attendance exception records match the selected filters."}
              </p>
            </div>
          </div>
        )}

        {/* Table list */}
        {!loading && !error && filteredRequests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Original Punch</th>
                  <th className="px-4 py-3.5">Requested Punch</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRequests.map((req) => {
                  const isPending = req.status === "Pending";
                  const isApproved = req.status === "Approved";
                  const isRejected = req.status === "Rejected";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Staff */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {req.staff_name ? req.staff_name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{req.staff_name || `Staff #${req.staff}`}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Staff ID: #{req.staff}</p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">
                            {parseISODate(req.attendance_date)}
                          </span>
                        </div>
                      </td>

                      {/* Original Punch */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="text-slate-600 font-medium">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">In:</span>
                            {formatTime(req.original_check_in)}
                          </p>
                          <p className="text-slate-600 font-medium">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Out:</span>
                            {req.original_check_out ? (
                              formatTime(req.original_check_out)
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                Missing
                              </span>
                            )}
                          </p>
                        </div>
                      </td>

                      {/* Requested Punch */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-0.5 font-semibold text-indigo-900 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100">
                          <p className="flex items-center gap-1 text-[11px]">
                            <span className="text-[10px] font-black text-indigo-400 uppercase">In:</span>
                            {formatTime(req.requested_check_in)}
                          </p>
                          <p className="flex items-center gap-1 text-[11px]">
                            <span className="text-[10px] font-black text-indigo-400 uppercase">Out:</span>
                            {formatTime(req.requested_check_out)}
                          </p>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-slate-700 line-clamp-2 italic text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{req.reason}"
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                          {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                          {req.status}
                        </span>
                        {req.approved_by_username && (
                          <p className="text-[9px] text-slate-400 mt-1 font-medium">
                            by {req.approved_by_username}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setActionDialog({ req, type: "approve" })}
                                disabled={processingId === req.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                              >
                                {processingId === req.id && processingAction === "approve" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionDialog({ req, type: "reject" })}
                                disabled={processingId === req.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors disabled:opacity-50"
                              >
                                {processingId === req.id && processingAction === "reject" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAuditModalItem(req)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors shadow-2xs"
                            >
                              <History className="w-3 h-3 text-indigo-500" />
                              Audit Log
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Action Confirmation Dialog (Approve / Reject) ── */}
      <AnimatePresence>
        {actionDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    actionDialog.type === "approve"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}>
                    {actionDialog.type === "approve" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      {actionDialog.type === "approve" ? "Approve Regularization" : "Reject Regularization"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Staff: {actionDialog.req.staff_name || `#${actionDialog.req.staff}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActionDialog(null);
                    setActionNote("");
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Date: {parseISODate(actionDialog.req.attendance_date)}
                  </p>
                  <p className="text-slate-700 font-semibold">
                    Requested Punch: {formatTime(actionDialog.req.requested_check_in)} - {formatTime(actionDialog.req.requested_check_out)}
                  </p>
                  <p className="text-slate-500 italic">
                    "{actionDialog.req.reason}"
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Administrative Note / Comment (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={
                      actionDialog.type === "approve"
                        ? "e.g. Approved as per biometric discrepancy report"
                        : "e.g. Rejected due to unverified departure time"
                    }
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActionDialog(null);
                      setActionNote("");
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    disabled={processingId !== null}
                    className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all ${
                      actionDialog.type === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                        : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                    }`}
                  >
                    Confirm {actionDialog.type === "approve" ? "Approval" : "Rejection"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Audit Trail Modal ── */}
      <AnimatePresence>
        {auditModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      Audit Trail & Revision History
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Immutable log for {auditModalItem.staff_name || "Staff"} on {parseISODate(auditModalItem.attendance_date)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditModalItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {(!auditModalItem.audit_log || auditModalItem.audit_log.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    No audit log entries recorded for this request.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {auditModalItem.audit_log.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              entry.action === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {entry.action}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(entry.timestamp).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <p className="text-slate-700 font-medium">
                          <strong>Authorized By:</strong> {entry.by_username || (entry.by ? `User #${entry.by}` : "System")}
                        </p>

                        {entry.note && (
                          <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">
                            Note: "{entry.note}"
                          </p>
                        )}

                        {entry.original_punch && entry.new_punch && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Original Punch</p>
                              <p className="text-slate-600">
                                In: {entry.original_punch.check_in ? new Date(entry.original_punch.check_in).toLocaleTimeString() : "—"}
                              </p>
                              <p className="text-slate-600">
                                Out: {entry.original_punch.check_out ? new Date(entry.original_punch.check_out).toLocaleTimeString() : "Missing"}
                              </p>
                            </div>
                            <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                              <p className="text-[9px] font-bold text-indigo-500 uppercase">Regularized Punch</p>
                              <p className="text-indigo-900 font-semibold">
                                In: {formatTime(entry.new_punch.requested_check_in)}
                              </p>
                              <p className="text-indigo-900 font-semibold">
                                Out: {formatTime(entry.new_punch.requested_check_out)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAuditModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
