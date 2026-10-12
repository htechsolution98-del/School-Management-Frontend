"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  CalendarCheck,
  ArrowRight,
  Info,
  Loader2,
  X,
  FileText,
  LayoutList,
  LayoutGrid,
  Send,
  HelpCircle,
  Check,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toHTMLDate, toApiDate, calculateDaysBetween } from "@/lib/dateUtils";

import {
  getRemainingLeaves,
  getMyLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  withdrawLeaveRequest,
  requestCancellation,
  calculateLeaveDays,
  type RemainingLeave,
  type MyLeaveRequest,
  type LeaveCalculationPreview,
} from "@/lib/teacher";

export interface StaffLeavesDeskProps {
  roleTitle?: string;
  subtitle?: string;
}

export function StaffLeavesDesk({
  roleTitle = "Staff",
  subtitle = "View your allocated balances, submit leave requests, and track approval status.",
}: StaffLeavesDeskProps) {
  const [balances, setBalances] = useState<RemainingLeave[]>([]);
  const [history, setHistory] = useState<MyLeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MyLeaveRequest | null>(null);

  // Form Fields (Dates stored as DD-MM-YYYY API format)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");
  const [totalDays, setTotalDays] = useState(0);
  const [previewData, setPreviewData] = useState<LeaveCalculationPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Cancellation Dialog State
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  // Processing specific actions
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Confirmation Dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  const triggerConfirm = (title: string, desc: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setOnConfirmAction(() => action);
    setIsConfirmOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("apply") === "true") {
        handleOpenCreateDialog();
      }
    }
  }, [balances.length]);

  // Compute total days automatically using authoritative backend preview
  useEffect(() => {
    if (!startDate || (!isHalfDay && !endDate) || !leaveTypeId) {
      setPreviewData(null);
      if (isHalfDay) setTotalDays(0.5);
      else if (startDate && endDate) setTotalDays(calculateDaysBetween(startDate, endDate));
      else setTotalDays(0);
      return;
    }

    let active = true;
    setIsPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const preview = await calculateLeaveDays({
          start_date: startDate,
          end_date: isHalfDay ? startDate : endDate,
          leave_type: leaveTypeId,
          is_half_day: isHalfDay,
          half_day_session: halfDaySession,
        });
        if (active) {
          setPreviewData(preview);
          setTotalDays(preview.total_effective_days);
        }
      } catch (err: any) {
        if (active) {
          console.warn("Could not calculate live server preview, falling back to local calculation:", err);
          setPreviewData(null);
          if (isHalfDay) setTotalDays(0.5);
          else setTotalDays(calculateDaysBetween(startDate, endDate));
        }
      } finally {
        if (active) setIsPreviewLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [startDate, endDate, leaveTypeId, isHalfDay, halfDaySession]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [remainingData, historyData] = await Promise.all([
        getRemainingLeaves(),
        getMyLeaveRequests(),
      ]);
      setBalances(Array.isArray(remainingData) ? remainingData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load leave records. Please check connection.");
      toast.error("Error loading leave data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingRequest(null);
    setStartDate("");
    setEndDate("");
    setLeaveTypeId(balances.length > 0 ? String(balances[0].leave_type_id ?? balances[0].leave_type) : "");
    setReason("");
    setIsHalfDay(false);
    setHalfDaySession("FIRST_HALF");
    setTotalDays(0);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (req: MyLeaveRequest) => {
    setEditingRequest(req);
    setStartDate(req.start_date);
    setEndDate(req.end_date);
    setIsHalfDay(Number(req.total_days) === 0.5);
    setHalfDaySession((req.half_day_session === "SECOND_HALF" ? "SECOND_HALF" : "FIRST_HALF") as any);

    const match = balances.find(
      (b) =>
        String(b.leave_type_id) === String(req.dynamic_leave_type) ||
        b.leave_type?.toUpperCase() === String(req.leave_type).toUpperCase()
    );
    setLeaveTypeId(match ? String(match.leave_type_id ?? match.leave_type) : String(req.dynamic_leave_type ?? ""));

    setReason(req.reason);
    setTotalDays(req.total_days);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !leaveTypeId || !reason.trim() || totalDays <= 0) {
      toast.error("Please fill out all fields correctly.");
      return;
    }

    if (previewData && previewData.overlapping) {
      toast.error(previewData.overlapping_error || "Selected dates overlap with an existing leave request.");
      return;
    }

    const selectedBal = balances.find(
      (b) => String(b.leave_type_id ?? b.leave_type) === leaveTypeId
    );
    const available = Number(
      previewData?.balance?.available ?? selectedBal?.remaining ?? (selectedBal as any)?.remaining_leaves ?? 0
    );
    if (selectedBal && selectedBal.is_paid !== false && totalDays > available) {
      toast.error(`Insufficient leave balance. You have ${available} days available, requested ${totalDays}.`);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      start_date: startDate,
      end_date: isHalfDay ? startDate : endDate,
      total_days: totalDays,
      is_half_day: isHalfDay,
      half_day_session: isHalfDay ? halfDaySession : "FULL_DAY",
      reason: reason.trim(),
      leave_type: Number(leaveTypeId),
      dynamic_leave_type: Number(leaveTypeId),
    };

    try {
      if (editingRequest) {
        await updateLeaveRequest(editingRequest.id, payload);
        toast.success("Leave request updated successfully");
      } else {
        await createLeaveRequest(payload);
        toast.success("Leave request submitted successfully. Awaiting approval.");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save leave request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawRequest = async (requestId: number) => {
    triggerConfirm(
      "Withdraw Leave Request?",
      "Are you sure you want to withdraw this pending leave request? Your reserved balance will be restored immediately.",
      async () => {
        setDeletingId(requestId);
        try {
          await withdrawLeaveRequest(requestId);
          toast.success("Leave request withdrawn and balance released.");
          fetchData();
        } catch (withdrawErr: any) {
          try {
            await deleteLeaveRequest(requestId);
            toast.success("Leave request cancelled.");
            fetchData();
          } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Failed to cancel request");
          }
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const handleOpenCancellationModal = (requestId: number) => {
    setCancellingRequestId(requestId);
    setCancellationReason("");
    setCancellationDialogOpen(true);
  };

  const handleCancellationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRequestId || !cancellationReason.trim()) {
      toast.error("Please specify a reason for cancellation.");
      return;
    }

    setIsSubmittingCancellation(true);
    try {
      await requestCancellation(cancellingRequestId, cancellationReason.trim());
      toast.success("Cancellation request submitted. Awaiting approval to restore balance.");
      setCancellationDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to submit cancellation request");
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  // Filter requests
  const filteredHistory = useMemo(() => {
    return history.filter((req) => {
      const status = (req.status || "").toUpperCase();
      if (activeTab === "pending") return status === "PENDING";
      if (activeTab === "approved") return status === "APPROVED";
      if (activeTab === "rejected") return status === "REJECTED";
      if (activeTab === "cancelled") return status === "CANCELLED";
      return true;
    });
  }, [history, activeTab]);

  const counts = useMemo(() => {
    return {
      all: history.length,
      pending: history.filter((r) => (r.status || "").toUpperCase() === "PENDING").length,
      approved: history.filter((r) => (r.status || "").toUpperCase() === "APPROVED").length,
      rejected: history.filter((r) => (r.status || "").toUpperCase() === "REJECTED").length,
      cancelled: history.filter((r) => (r.status || "").toUpperCase() === "CANCELLED").length,
    };
  }, [history]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center font-bold">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {roleTitle} Leaves & Absence
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="rounded-xl border-slate-200 dark:border-slate-800 h-10 px-3.5 text-xs font-semibold"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreateDialog}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 text-xs shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Error loading leaves</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Leave Balances Section ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Allocated Leave Balances
          </h2>
          <span className="text-xs text-slate-400">
            Real-time balance deduction & carry forward applied
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200/60" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No leave quota assigned yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Your leave template or categories have not been allocated for this cycle. Please contact Administrator/Clerk.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((b) => {
              const allocated = Number(b.allocated ?? b.total_allowed ?? 0);
              const carry = Number(b.carry_forward ?? 0);
              const totalQuota = allocated + carry;
              const used = Number(b.used ?? 0);
              const pending = Number(b.pending ?? 0);
              const remaining = Number(b.remaining ?? b.remaining_leaves ?? 0);
              const isPaid = b.is_paid !== false;

              return (
                <motion.div
                  key={b.leave_type_id || b.leave_type}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between group hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                  
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                        {b.leave_type_name || b.leave_type}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full",
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        )}
                      >
                        {isPaid ? "Paid" : "LOP / Unpaid"}
                      </Badge>
                    </div>

                    <div className="flex items-baseline gap-2 mt-3">
                      <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                        {remaining}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        / {totalQuota} days left
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] grid grid-cols-3 gap-1 text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Used</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{used} d</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Pending</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{pending} d</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Carry Fwd</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">+{carry} d</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── My Requests History ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Leave Applications & History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review all your pending, approved, and past leave submissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl h-9">
                <TabsTrigger value="all" className="text-xs font-semibold px-3 py-1 rounded-lg">
                  All ({counts.all})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs font-semibold px-3 py-1 rounded-lg">
                  Pending ({counts.pending})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs font-semibold px-3 py-1 rounded-lg">
                  Approved ({counts.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs font-semibold px-3 py-1 rounded-lg">
                  Rejected ({counts.rejected})
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs font-semibold px-3 py-1 rounded-lg">
                  Cancelled ({counts.cancelled})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading personal leave records...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No leave requests found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't submitted any leave requests in this category yet. Click "Apply for Leave" above to create one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredHistory.map((req) => {
                  const status = (req.status || "").toUpperCase();
                  const isPending = status === "PENDING";
                  const isApproved = status === "APPROVED";
                  const isRejected = status === "REJECTED";
                  const isCancelled = status === "CANCELLED";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {req.dynamic_leave_type_name || req.leave_type}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Applied: {req.created_at ? new Date(req.created_at).toLocaleDateString("en-IN") : "—"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {req.start_date === req.end_date ? (
                          req.start_date
                        ) : (
                          <span>
                            {req.start_date} <ArrowRight className="inline w-3 h-3 text-slate-400 mx-0.5" /> {req.end_date}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {req.total_days} {Number(req.total_days) === 1 ? "day" : "days"}
                        </span>
                        {req.is_half_day && (
                          <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            Half Day ({req.half_day_session === "SECOND_HALF" ? "2nd" : "1st"})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-600 dark:text-slate-400">
                        {req.reason || "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit",
                            isPending && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
                            isApproved && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
                            isRejected && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
                            isCancelled && "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {isPending && <Clock className="w-3 h-3" />}
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isRejected && <XCircle className="w-3 h-3" />}
                          {req.status}
                        </Badge>

                        {req.cancellation_status === "REQUESTED" && (
                          <div className="text-[10px] text-amber-600 font-bold mt-1">
                            Cancellation Pending Review
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditDialog(req)}
                                className="h-8 px-2 text-xs text-slate-600 hover:text-indigo-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleWithdrawRequest(req.id)}
                                disabled={deletingId === req.id}
                                className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                {deletingId === req.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </>
                          )}

                          {isApproved && req.cancellation_status !== "REQUESTED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCancellationModal(req.id)}
                              className="h-7 text-[11px] px-2.5 rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900"
                            >
                              Request Cancel
                            </Button>
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

      {/* ── Apply / Edit Leave Modal ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {editingRequest ? "Edit Leave Request" : "Apply for Leave"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submissions will be automatically routed to Principal / Leadership for review and approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Leave Type Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Leave Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={leaveTypeId} onValueChange={(val: any) => setLeaveTypeId(val ?? "")}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Select leave category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {balances.map((b) => (
                    <SelectItem
                      key={b.leave_type_id || b.leave_type}
                      value={String(b.leave_type_id ?? b.leave_type)}
                      className="text-xs"
                    >
                      {b.leave_type_name || b.leave_type} ({b.remaining} days available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={toHTMLDate(startDate)}
                  onChange={(e) => setStartDate(toApiDate(e.target.value))}
                  required
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  End Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={toHTMLDate(endDate)}
                  onChange={(e) => setEndDate(toApiDate(e.target.value))}
                  disabled={isHalfDay}
                  required={!isHalfDay}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            {/* Half Day Option */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Half Day Leave</div>
                  <div className="text-[11px] text-slate-400">Deducts 0.5 day from available balance</div>
                </div>
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {isHalfDay && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={halfDaySession === "FIRST_HALF" ? "default" : "outline"}
                    onClick={() => setHalfDaySession("FIRST_HALF")}
                    className="flex-1 rounded-xl text-xs h-8"
                  >
                    First Half (Morning)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={halfDaySession === "SECOND_HALF" ? "default" : "outline"}
                    onClick={() => setHalfDaySession("SECOND_HALF")}
                    className="flex-1 rounded-xl text-xs h-8"
                  >
                    Second Half (Afternoon)
                  </Button>
                </div>
              )}
            </div>

            {/* Total Duration Display */}
            <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl text-xs font-semibold text-indigo-800 dark:text-indigo-300">
              <span>Requested Duration:</span>
              <span className="font-extrabold text-sm">{totalDays} {totalDays === 1 ? "Day" : "Days"}</span>
            </div>

            {/* Live Calculation Preview Breakdown */}
            {isPreviewLoading ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                <span>Checking school calendar holidays & working days...</span>
              </div>
            ) : previewData ? (
              <div className="space-y-1.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">Effective Working Days:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                      {previewData.total_effective_days} {previewData.total_effective_days === 1 ? "Day" : "Days"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{previewData.summary_message}</span>
                    {previewData.day_breakdown.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline font-medium ml-2 shrink-0 cursor-pointer"
                      >
                        {showBreakdown ? "Hide dates" : "View dates"}
                      </button>
                    )}
                  </div>

                  {/* Day-by-day itemized list */}
                  {showBreakdown && previewData.day_breakdown.length > 0 && (
                    <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700 space-y-1 max-h-36 overflow-y-auto pr-1">
                      {previewData.day_breakdown.map((item) => (
                        <div
                          key={item.date}
                          className={cn(
                            "flex items-center justify-between px-2 py-1 rounded text-[11px]",
                            item.is_effective
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : item.category === "WEEKEND"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
                          )}
                        >
                          <span className="font-medium">
                            {item.date} ({item.day_name.slice(0, 3)})
                          </span>
                          <span className="text-[10px]">
                            {item.reason} {item.is_effective ? `(${item.weight} day)` : "(0.0 day)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewData.overlapping && (
                    <div className="pt-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1.5 border-t border-rose-100 dark:border-rose-900/30">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{previewData.overlapping_error || "Date overlaps with an existing leave request."}</span>
                    </div>
                  )}

                  {!previewData.has_sufficient_balance && (
                    <div className="pt-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1.5 border-t border-amber-100 dark:border-amber-900/30">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Insufficient balance: {previewData.balance.available} days available, requested {previewData.total_effective_days} days.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Leave <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please state clearly the reason for your absence..."
                rows={3}
                required
                className="rounded-xl text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl text-xs h-10 flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || totalDays <= 0}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Submit Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Request Cancellation Modal ── */}
      <Dialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Request Leave Cancellation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Once approved by leadership, your consumed leave balance will be refunded and attendance restored.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancellationSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cancellation Reason <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Reason why you would like to cancel this approved leave..."
                rows={3}
                required
                className="rounded-xl text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancellationDialogOpen(false)}
                className="rounded-xl text-xs h-10 flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCancellation}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 flex-1"
              >
                {isSubmittingCancellation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6 text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            {confirmTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            {confirmDesc}
          </DialogDescription>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="flex-1 rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (onConfirmAction) onConfirmAction();
                setIsConfirmOpen(false);
              }}
              className="flex-1 rounded-xl text-xs font-bold h-9"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
