"use client";

import { useEffect, useState } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { toHTMLDate, toApiDate, calculateDaysBetween } from "@/lib/dateUtils";

import {
  getRemainingLeaves,
  getMyLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  type RemainingLeave,
  type MyLeaveRequest,
} from "@/lib/teacher";

export default function ClerkMyLeavesPage() {
  const [balances, setBalances] = useState<RemainingLeave[]>([]);
  const [history, setHistory] = useState<MyLeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MyLeaveRequest | null>(null);

  // Form Fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [totalDays, setTotalDays] = useState(0);

  // Processing specific actions (e.g. canceling a request)
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Custom Confirmation Dialog State
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

  // Compute total days automatically when start/end dates change
  // Note: startDate/endDate are stored as DD-MM-YYYY (API format)
  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateDaysBetween(startDate, endDate);
      setTotalDays(days);
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

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
      setError(err?.message || "Failed to load leave records. Please try again.");
      toast.error("Error loading leave data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingRequest(null);
    setStartDate("");
    setEndDate("");
    setLeaveTypeId("");
    setReason("");
    setTotalDays(0);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (req: MyLeaveRequest) => {
    setEditingRequest(req);
    setStartDate(req.start_date);
    setEndDate(req.end_date);
    
    // Find matching leave type ID from balances if possible
    const match = balances.find((b) => b.leave_type.toUpperCase() === String(req.leave_type).toUpperCase());
    setLeaveTypeId(match ? String(match.leave_type_id ?? match.leave_type) : "");
    
    setReason(req.reason);
    setTotalDays(req.total_days);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !leaveTypeId || !reason || totalDays <= 0) {
      toast.error("Please fill out all fields correctly.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason,
      leave_type: Number(leaveTypeId),
    };

    try {
      if (editingRequest) {
        await updateLeaveRequest(editingRequest.id, payload);
        toast.success("Leave request updated successfully");
      } else {
        await createLeaveRequest(payload);
        toast.success("Leave request submitted successfully");
      }
      setIsDialogOpen(false);
      fetchData(); // Reload data
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save leave request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    triggerConfirm(
      "Cancel Leave Request?",
      "Are you sure you want to cancel this leave request? This action cannot be undone.",
      async () => {
        setDeletingId(requestId);
        try {
          await deleteLeaveRequest(requestId);
          toast.success("Leave request cancelled successfully");
          fetchData();
        } catch (err: any) {
          console.error(err);
          toast.error(err?.message || "Failed to cancel leave request");
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  // Safe getter for request status
  const getSafeStatus = (statusStr: string | null | undefined): "PENDING" | "APPROVED" | "REJECTED" => {
    if (!statusStr) return "PENDING";
    const status = statusStr.trim().toUpperCase();
    if (status === "APPROVED" || status === "APPROVED_ALL") return "APPROVED";
    if (status === "REJECTED") return "REJECTED";
    return "PENDING";
  };

  // Resolve overall request status from dynamic API payloads
  const getRequestStatus = (req: MyLeaveRequest): "PENDING" | "APPROVED" | "PARTIAL" | "REJECTED" => {
    if (req.status) {
      const status = req.status.trim().toUpperCase();
      if (status === "APPROVED" || status === "APPROVED_ALL") return "APPROVED";
      if (status === "REJECTED") return "REJECTED";
      if (status === "PENDING") return "PENDING";
      if (status === "PARTIAL" || status === "PARTIALLY_APPROVED") return "PARTIAL";
    }

    const days = (req as any).leave_days || (req as any).days || [];
    if (days.length === 0) return "PENDING";

    const allApproved = days.every((d: any) => d && d.status && (d.status.trim().toUpperCase() === "APPROVED" || d.status.trim().toUpperCase() === "APPROVED_ALL"));
    const allRejected = days.every((d: any) => d && d.status && d.status.trim().toUpperCase() === "REJECTED");
    const anyPending = days.some((d: any) => d && (!d.status || d.status.trim().toUpperCase() === "PENDING"));

    if (anyPending) return "PENDING";
    if (allApproved) return "APPROVED";
    if (allRejected) return "REJECTED";

    // If no pending days, but some are approved and some are rejected
    return "PARTIAL";
  };

  // Human-readable mapper for Leave Type
  const getLeaveTypeDisplay = (leaveType: any): string => {
    if (!leaveType) return "Casual Leave";
    let val: any = leaveType;
    if (typeof leaveType === "object" && leaveType !== null) {
      val = leaveType.name || leaveType.type || leaveType.title || leaveType.label || "Casual Leave";
    }

    if (typeof val === "number" || !isNaN(Number(val))) {
      const numId = Number(val);
      const match = balances.find(b => (b.leave_type_id ?? b.leave_type) === numId);
      if (match) return (match as any).leave_type_name ?? match.leave_type;
      
      const mapping: Record<number, string> = {
        1: "Casual Leave",
        2: "Sick Leave",
        3: "Maternity Leave",
        4: "Paternity Leave",
        5: "Earned Leave",
      };
      return mapping[numId] || `Leave Type ${numId}`;
    }

    const typeStr = String(val).trim().toUpperCase();
    if (typeStr === "SICK" || typeStr === "SICK_LEAVE") return "Sick Leave";
    if (typeStr === "CASUAL" || typeStr === "CASUAL_LEAVE") return "Casual Leave";
    if (typeStr === "MATERNITY") return "Maternity Leave";
    if (typeStr === "PATERNITY") return "Paternity Leave";
    if (typeStr === "EARNED") return "Earned Leave";

    return String(val).charAt(0).toUpperCase() + String(val).slice(1).toLowerCase();
  };

  const getLeaveTypeBadgeClass = (leaveType: any) => {
    const type = getLeaveTypeDisplay(leaveType).toUpperCase();
    if (type.includes("SICK")) return "bg-rose-500/10 text-rose-600 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
    if (type.includes("CASUAL")) return "bg-sky-500/10 text-sky-600 border-sky-200/50 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50";
    if (type.includes("MATERNITY") || type.includes("PATERNITY")) return "bg-purple-500/10 text-purple-600 border-purple-200/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50";
    return "bg-zinc-500/10 text-zinc-600 border-zinc-200/50 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-800/50";
  };

  const getStatusBadge = (statusStr: string | null | undefined) => {
    if (!statusStr) return null;
    const status = statusStr.trim().toUpperCase();
    if (status === "PENDING") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/60 flex items-center gap-1 font-semibold rounded-full px-2.5 py-0.5">
          <Clock className="h-3 w-3 animate-pulse text-amber-500" />
          Pending
        </Badge>
      );
    }
    if (status === "APPROVED" || status === "APPROVED_ALL") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/60 flex items-center gap-1 font-semibold rounded-full px-2.5 py-0.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Approved
        </Badge>
      );
    }
    if (status === "PARTIAL" || status === "PARTIALLY_APPROVED") {
      return (
        <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-200/60 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/60 flex items-center gap-1 font-semibold rounded-full px-2.5 py-0.5">
          <Info className="h-3 w-3 text-sky-500" />
          Partially Approved
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/60 flex items-center gap-1 font-semibold rounded-full px-2.5 py-0.5">
        <XCircle className="h-3 w-3 text-rose-500" />
        Rejected
      </Badge>
    );
  };

  // Compact micro-badges for inline day status listings
  const getStatusBadgeSmall = (statusStr: string | null | undefined) => {
    if (!statusStr) return null;
    const status = statusStr.trim().toUpperCase();
    if (status === "PENDING") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200/40 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 flex items-center gap-1 text-[10px] font-bold rounded-md px-1.5 py-0.5 uppercase tracking-wider">
          <Clock className="h-2.5 w-2.5 text-amber-500" />
          Pending
        </Badge>
      );
    }
    if (status === "APPROVED" || status === "APPROVED_ALL") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 flex items-center gap-1 text-[10px] font-bold rounded-md px-1.5 py-0.5 uppercase tracking-wider">
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200/40 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-1 text-[10px] font-bold rounded-md px-1.5 py-0.5 uppercase tracking-wider">
        <XCircle className="h-2.5 w-2.5 text-rose-500" />
        Rejected
      </Badge>
    );
  };

  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateRange = (startDateStr: string | null | undefined, endDateStr: string | null | undefined) => {
    return `${formatDate(startDateStr)} – ${formatDate(endDateStr)}`;
  };

  // Filter requests for display
  const filteredHistory = history.filter((req) => {
    const status = getRequestStatus(req);
    if (activeTab === "pending") return status === "PENDING";
    if (activeTab === "approved") return status === "APPROVED";
    if (activeTab === "partial") return status === "PARTIAL";
    if (activeTab === "rejected") return status === "REJECTED";
    return true;
  });

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto bg-linear-to-b from-zinc-50 to-zinc-100/30 dark:from-zinc-950 dark:to-zinc-900/30 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <CalendarCheck className="h-8 w-8 text-primary" />
            </div>
            My Leaves Dashboard
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
            View leave balances, submit leave requests, and track your request history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={handleOpenCreateDialog}
            className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Apply For Leave
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="animate-in fade-in-50 slide-in-from-top-4 duration-300">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Leave Balance Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Remaining Balances</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse border border-zinc-250 bg-white dark:bg-zinc-900">
                <CardContent className="h-32" />
              </Card>
            ))
          ) : balances.length === 0 ? (
            <div className="col-span-full border border-dashed rounded-xl py-8 flex flex-col items-center justify-center bg-white/50 text-muted-foreground">
              <Info className="h-8 w-8 mb-2" />
              <p className="text-sm">No leave balance data available.</p>
            </div>
          ) : (
            balances.map((bal) => {
              // Parse backend properties defensively (support total_allowed vs total_levaes and remaining vs remaining_leaves)
              const totalAllowed = bal.total_allowed ?? (bal as any).total_levaes ?? (bal as any).total_leaves ?? 0;
              const remaining = bal.remaining ?? (bal as any).remaining_leaves ?? 0;
              const used = bal.used ?? (totalAllowed - remaining);
              const leaveTypeVal = (bal as any).leave_type_name ?? bal.leave_type ?? (bal as any).type ?? "";
              const typeLabel = getLeaveTypeDisplay(leaveTypeVal);
              const remainingPct = totalAllowed > 0 ? (remaining / totalAllowed) * 100 : 0;
              
              // Decide border gradient color based on type
              let accentColor = "from-sky-400 to-sky-500";
              if (typeLabel.toUpperCase().includes("SICK")) accentColor = "from-rose-400 to-rose-500";
              if (typeLabel.toUpperCase().includes("MATERNITY") || typeLabel.toUpperCase().includes("PATERNITY")) accentColor = "from-purple-400 to-purple-500";
              if (typeLabel.toUpperCase().includes("EARNED")) accentColor = "from-emerald-400 to-emerald-500";

              const timelineVal = (bal as any).leave_template_timeline ?? (bal as any).timeline ?? "";
              const formattedTimeline = (() => {
                if (!timelineVal) return "";
                const t = timelineVal.trim().toUpperCase();
                if (t === "MONTHLY") return "Monthly";
                if (t === "QUARTERLY") return "Quarterly";
                if (t === "SEMI_ANNUAL") return "Semi-Annual";
                if (t === "ANNUAL") return "Annual";
                return timelineVal;
              })();

              return (
                <Card key={bal.leave_type_id ?? (bal as any).id} className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-300 group">
                  <div className={cn("absolute top-0 inset-x-0 h-1 bg-gradient-to-r", accentColor)} />
                  <CardContent className="pt-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{typeLabel}</span>
                        {formattedTimeline && (
                          <span className="text-[10px] text-muted-foreground/80 font-medium mt-0.5">
                            Period: {formattedTimeline}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{remaining}</span>
                        <span className="text-xs text-muted-foreground">/ {totalAllowed} left</span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">{used} days used</p>
                    </div>

                    {/* Circular visual progress meter */}
                    <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                      <svg className="absolute w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="23" className="stroke-zinc-100 dark:stroke-zinc-800 fill-none" strokeWidth="4" />
                        <circle
                          cx="28"
                          cy="28"
                          r="23"
                          className={cn("fill-none transition-all duration-500", 
                            typeLabel.toUpperCase().includes("SICK") ? "stroke-rose-500" :
                            typeLabel.toUpperCase().includes("EARNED") ? "stroke-emerald-500" : "stroke-sky-500"
                          )}
                          strokeWidth="4"
                          strokeDasharray={2 * Math.PI * 23}
                          strokeDashoffset={2 * Math.PI * 23 * (1 - (remainingPct / 100))}
                        />
                      </svg>
                      <span className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300">
                        {Math.round(remainingPct)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Leave History List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2 gap-4">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <TabsTrigger value="pending" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Pending
              {!isLoading && (
                <span className="ml-1 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-amber-950/60 dark:text-amber-300">
                  {history.filter((r) => getRequestStatus(r) === "PENDING").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Approved
              {!isLoading && (
                <span className="ml-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300">
                  {history.filter((r) => getRequestStatus(r) === "APPROVED").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="partial" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Partially Approved
              {!isLoading && (
                <span className="ml-1 bg-sky-100 text-sky-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-sky-950/60 dark:text-sky-300">
                  {history.filter((r) => getRequestStatus(r) === "PARTIAL").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Rejected
              {!isLoading && (
                <span className="ml-1 bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-rose-950/60 dark:text-rose-300">
                  {history.filter((r) => getRequestStatus(r) === "REJECTED").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <span className="text-xs font-medium text-muted-foreground">
            Displaying {filteredHistory.length} matching requests
          </span>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {[1, 2].map((i) => (
              <Card key={i} className="w-full animate-pulse border border-zinc-200 dark:border-zinc-800 bg-white/50">
                <CardContent className="space-y-4 pt-6">
                  <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                  <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* History Items */}
        {!isLoading && (
          <TabsContent value={activeTab} className="mt-0 focus-visible:outline-none w-full">
            <AnimatePresence mode="popLayout">
              {filteredHistory.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center py-20 px-4 border rounded-2xl border-dashed bg-white/40 dark:bg-zinc-900/10"
                >
                  <FileText className="h-14 w-14 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No leave requests</h3>
                  <p className="text-muted-foreground text-sm max-w-xs text-center mt-1.5">
                    There are no leave requests under the "{activeTab}" status.
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                  {filteredHistory.map((request) => {
                    const reqStatus = getRequestStatus(request);
                    const isPending = reqStatus === "PENDING";
                    const isApproved = reqStatus === "APPROVED";
                    const isRejected = reqStatus === "REJECTED";

                    const isPartial = reqStatus === "PARTIAL";
                    const days = (request as any).days || (request as any).leave_days || (request as any).dates || [];

                    // Left border indicator based on status
                    const statusBorderColor = isApproved
                      ? "border-l-emerald-500 dark:border-l-emerald-600"
                      : isRejected
                      ? "border-l-rose-500 dark:border-l-rose-600"
                      : isPartial
                      ? "border-l-sky-500 dark:border-l-sky-600"
                      : "border-l-amber-500 dark:border-l-amber-600";

                    return (
                      <motion.div
                        key={request.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="w-full"
                      >
                        <Card className={cn(
                          "border border-zinc-200/80 dark:border-zinc-800/80 border-l-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 w-full", 
                          statusBorderColor
                        )}>
                          <CardHeader className="p-4 pb-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                                  <Calendar className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50 leading-tight">
                                    Request ID: #{request.id}
                                  </h3>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Submitted: {formatDate(request.created_at)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                                <Badge variant="outline" className={cn("font-bold px-3 py-1 border text-xs tracking-wider rounded-md", getLeaveTypeBadgeClass(request.leave_type))}>
                                  {getLeaveTypeDisplay(request.leave_type)}
                                </Badge>
                                {getStatusBadge(reqStatus)}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground bg-zinc-100 dark:bg-zinc-800/60 px-2 py-1 rounded-md border dark:border-zinc-800">
                                <span className="font-semibold text-zinc-850 dark:text-zinc-100">
                                  {formatDateRange(request.start_date, request.end_date)}
                                </span>
                              </div>
                              <div className="text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
                                <span>Total Days:</span>
                                <span className="font-extrabold text-zinc-950 dark:text-zinc-50 bg-primary/5 dark:bg-primary/20 px-2 py-0.5 rounded border dark:border-primary/20">{request.total_days}</span>
                                <span>{request.total_days === 1 ? 'day' : 'days'}</span>
                                {reqStatus === "PARTIAL" && (
                                  (() => {
                                    const days = (request as any).leave_days || (request as any).days || [];
                                    const approvedDaysCount = days.filter((d: any) => d && d.status && (d.status.trim().toUpperCase() === "APPROVED" || d.status.trim().toUpperCase() === "APPROVED_ALL")).length;
                                    const rejectedDaysCount = days.filter((d: any) => d && d.status && d.status.trim().toUpperCase() === "REJECTED").length;
                                    return (
                                      <span className="text-xs font-semibold flex items-center gap-1.5 ml-1">
                                        <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/40">{approvedDaysCount} Approved</span>
                                        <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/40">{rejectedDaysCount} Rejected</span>
                                      </span>
                                    );
                                  })()
                                )}
                              </div>
                            </div>

                            <div className="text-zinc-650 dark:text-zinc-300 text-xs">
                              <span className="font-semibold text-zinc-500 mr-2 text-[10px] uppercase tracking-wider">Reason:</span>
                              <span className="italic">"{request.reason || "No reason specified"}"</span>
                            </div>

                            {/* Accordion for individual days breakdown */}
                            {days && days.length > 0 && (
                              <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 pt-2.5">
                                <Accordion className="w-full">
                                  <AccordionItem value={`item-${request.id}`} className="border-0">
                                    <AccordionTrigger className="hover:no-underline py-2 text-xs font-bold text-primary/80 dark:text-primary-foreground/80 hover:text-primary transition-colors flex items-center justify-between group">
                                      <span className="flex items-center gap-1.5">
                                        View Day-by-Day Breakdown ({days.length} {days.length === 1 ? 'day' : 'days'})
                                      </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                      <div className="grid grid-cols-1 divide-y divide-zinc-200/40 dark:divide-zinc-800/40 bg-zinc-50/20 dark:bg-zinc-900/10 border dark:border-zinc-850 rounded-lg px-3 overflow-hidden">
                                        {days.map((day: any) => {
                                          if (!day) return null;
                                          return (
                                            <div key={day.id} className="flex items-center justify-between py-2 text-xs">
                                              <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
                                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                  {formatDate(day.date)}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                {getStatusBadgeSmall(day.status)}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            )}

                            {/* Actions (Cancel) - Only for pending requests */}
                            {isPending && (
                              <div className="flex items-center gap-3 pt-2 border-t dark:border-zinc-800">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteRequest(request.id)}
                                  disabled={deletingId === request.id}
                                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-xs"
                                >
                                  {deletingId === request.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  Cancel Request
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        )}
      </Tabs>

      {/* Apply / Edit Leave Dialog Form Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              {editingRequest ? "Edit Leave Request" : "Apply For Leave"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please enter your leave period, choose a leave type, and describe the reason.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs font-semibold">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={toHTMLDate(startDate)}
                  onChange={(e) => setStartDate(toApiDate(e.target.value))}
                  required
                  min={getTomorrowDateString()}
                  className="rounded-lg shadow-inner bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-xs font-semibold">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={toHTMLDate(endDate)}
                  onChange={(e) => setEndDate(toApiDate(e.target.value))}
                  required
                  min={toHTMLDate(startDate) || getTomorrowDateString()}
                  className="rounded-lg shadow-inner bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>

            {totalDays > 0 && (
              <div className="text-xs font-medium text-primary flex items-center gap-1.5 bg-primary/5 dark:bg-primary/20 p-2.5 rounded-lg border border-primary/20">
                <Info className="h-4 w-4" />
                <span>Calculated leave duration: <strong>{totalDays} {totalDays === 1 ? "day" : "days"}</strong></span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="leave-type" className="text-xs font-semibold">Leave Type</Label>
              <Select value={leaveTypeId} onValueChange={(val) => setLeaveTypeId(val || "")} required>
                <SelectTrigger id="leave-type" className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm">
                  <SelectValue placeholder="Select leave category">
                    {leaveTypeId ? (() => {
                      const selectedBal = balances.find(
                        (b) => String(b.leave_type_id ?? b.leave_type) === leaveTypeId
                      );
                      return selectedBal
                        ? getLeaveTypeDisplay((selectedBal as any).leave_type_name ?? selectedBal.leave_type)
                        : undefined;
                    })() : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border dark:border-zinc-800">
                  {balances.map((bal) => (
                    <SelectItem key={bal.leave_type_id ?? bal.leave_type} value={String(bal.leave_type_id ?? bal.leave_type)}>
                      {getLeaveTypeDisplay((bal as any).leave_type_name ?? bal.leave_type)} (Remaining: {bal.remaining ?? (bal as any).remaining_leaves ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold">Reason for Leave</Label>
              <Textarea
                id="reason"
                placeholder="Brief description of why you are taking leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                className="rounded-lg shadow-inner bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <DialogFooter className="pt-4 border-t dark:border-zinc-800 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-lg border shadow-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || totalDays <= 0}
                className="rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Request
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-xs bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl p-6 text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-full mb-3 dark:bg-rose-950/30">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
              {confirmDesc}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-5 flex items-center justify-center gap-3 border-t dark:border-zinc-800 mt-4 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="rounded-lg border shadow-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (onConfirmAction) onConfirmAction();
                setIsConfirmOpen(false);
              }}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs px-5"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
