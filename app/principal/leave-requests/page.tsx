"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  Check,
  X,
  Loader2,
  Info,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import {
  getAllLeaveRequests,
  changeLeaveDayStatus,
  approveAllLeaveDays,
  type LeaveRequest,
  type LeaveDay,
} from "@/lib/clerk";

export default function PrincipalLeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [showRawData, setShowRawData] = useState(false);

  // Track loading status per request or per day to show inline spinners
  const [processingRequests, setProcessingRequests] = useState<Record<number, "approving" | "rejecting" | null>>({});
  const [processingDays, setProcessingDays] = useState<Record<number, "approving" | "rejecting" | null>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllLeaveRequests();
      console.log("Fetched leave requests data:", data);
      
      // Filter out any null or malformed request records
      const validRequests = (Array.isArray(data) ? data : []).filter(
        (req) => req && typeof req === "object"
      );
      setRequests(validRequests);
    } catch (err: any) {
      console.error("Error loading leave requests:", err);
      setError(err?.message || "Failed to fetch leave requests. Please verify the API connection.");
      toast.error("Error loading leave requests");
    } finally {
      setIsLoading(false);
    }
  };

  // Safe getter for request or day status to prevent "toUpperCase of undefined" crashes
  const getSafeStatus = (statusStr: string | null | undefined): "PENDING" | "APPROVED" | "REJECTED" => {
    if (!statusStr) return "PENDING";
    const status = statusStr.trim().toUpperCase();
    if (status === "APPROVED" || status === "APPROVED_ALL") return "APPROVED";
    if (status === "REJECTED") return "REJECTED";
    return "PENDING";
  };

  // Resolve overall request status from dynamic API payloads
  const getRequestStatus = (req: LeaveRequest): "PENDING" | "APPROVED" | "PARTIAL" | "REJECTED" => {
    if (!req) return "PENDING";
    if (req.status) {
      const status = req.status.trim().toUpperCase();
      if (status === "APPROVED" || status === "APPROVED_ALL") return "APPROVED";
      if (status === "REJECTED") return "REJECTED";
      if (status === "PENDING") return "PENDING";
      if (status === "PARTIAL" || status === "PARTIALLY_APPROVED") return "PARTIAL";
    }

    const days = req.days || (req as any).leave_days || (req as any).dates || [];
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

  // Human-readable mapper for Leave Type (handles numeric IDs like 1, 2, or lowercase strings)
  const getLeaveTypeDisplay = (leaveType: any): string => {
    if (!leaveType) return "Casual Leave";
    
    let val: any = leaveType;
    if (typeof leaveType === "object" && leaveType !== null) {
      val = leaveType.name || leaveType.type || leaveType.title || leaveType.label || "Casual Leave";
    }

    if (typeof val === "number" || !isNaN(Number(val))) {
      const numId = Number(val);
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

  const handleBulkAction = async (requestId: number, action: "APPROVED" | "REJECTED") => {
    setProcessingRequests((prev) => ({ ...prev, [requestId]: action === "APPROVED" ? "approving" : "rejecting" }));
    try {
      try {
        await approveAllLeaveDays(requestId, action);
      } catch (bulkErr: any) {
        console.warn("Bulk action endpoint failed, falling back to day-by-day status update", bulkErr);
        
        // Find the request from local state to get its days list
        const req = requests.find((r) => r && r.id === requestId);
        const daysList = req ? (req.days || (req as any).leave_days || (req as any).dates || (req as any).request_days || []) : [];
        
        if (daysList.length > 0) {
          // Update all days in parallel
          await Promise.all(
            daysList.map((day: any) => changeLeaveDayStatus(day.id, action))
          );
        } else {
          // If no days are found in the list, throw the original bulk error
          throw bulkErr;
        }
      }
      
      toast.success(`Leave request ${action.toLowerCase()} successfully`);
      
      // Update local state immediately
      setRequests((prev) =>
        prev.map((req) => {
          if (req && req.id === requestId) {
            const rawDays = req.days || (req as any).leave_days || (req as any).dates || (req as any).request_days || [];
            const updatedDays = rawDays.map((day: any) => ({ ...day, status: action }));
            
            return {
              ...req,
              status: action,
              days: updatedDays,
              leave_days: updatedDays,
            };
          }
          return req;
        })
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || `Failed to update status to ${action}`);
    } finally {
      setProcessingRequests((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  const handleDayAction = async (requestId: number, dayId: number, action: "APPROVED" | "REJECTED") => {
    setProcessingDays((prev) => ({ ...prev, [dayId]: action === "APPROVED" ? "approving" : "rejecting" }));
    try {
      await changeLeaveDayStatus(dayId, action);
      toast.success(`Day marked as ${action.toLowerCase()}`);

      // Update local state for that specific day
      setRequests((prev) =>
        prev.map((req) => {
          if (req && req.id === requestId) {
            const rawDays = req.days || (req as any).leave_days || (req as any).dates || [];
            const updatedDays = rawDays.map((d: any) => 
              d && d.id === dayId ? { ...d, status: action } : d
            );
            
            const updatedReq = {
              ...req,
              days: updatedDays,
              leave_days: updatedDays,
            };
            const newRequestStatus = getRequestStatus(updatedReq);

            return {
              ...updatedReq,
              status: newRequestStatus as any,
            };
          }
          return req;
        })
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || `Failed to update day status to ${action}`);
    } finally {
      setProcessingDays((prev) => ({ ...prev, [dayId]: null }));
    }
  };

  // Helper date formatting
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
    if (!startDateStr || !endDateStr) return "N/A";
    try {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return `${startDateStr} – ${endDateStr}`;
      }
      const startFormatted = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endFormatted = start.getFullYear() === end.getFullYear() 
        ? end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startFormatted} – ${endFormatted}`;
    } catch {
      return `${startDateStr} – ${endDateStr}`;
    }
  };

  // Metrics Calculations (for the current calendar month, safely handled)
  const currentMonthRequests = requests.filter((req) => {
    if (!req || !req.submission_date) return false;
    try {
      const reqDate = new Date(req.submission_date);
      const now = new Date();
      return reqDate.getMonth() === now.getMonth() && reqDate.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  });

  const pendingCount = currentMonthRequests.filter((r) => getRequestStatus(r) === "PENDING").length;
  const approvedCount = currentMonthRequests.filter((r) => getRequestStatus(r) === "APPROVED").length;
  const partialCount = currentMonthRequests.filter((r) => getRequestStatus(r) === "PARTIAL").length;
  const rejectedCount = currentMonthRequests.filter((r) => getRequestStatus(r) === "REJECTED").length;

  // Filter requests based on tab selection
  const filteredRequests = requests.filter((req) => {
    const status = getRequestStatus(req);
    if (activeTab === "pending") return status === "PENDING";
    if (activeTab === "approved") return status === "APPROVED";
    if (activeTab === "partial") return status === "PARTIAL";
    if (activeTab === "rejected") return status === "REJECTED";
    return true;
  });

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

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto bg-linear-to-b from-zinc-50 to-zinc-100/30 dark:from-zinc-950 dark:to-zinc-900/30 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <CalendarCheck className="h-8 w-8 text-primary" />
            </div>
            Staff Leave Requests
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
            Review, approve, or reject leave submissions from staff members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRawData(!showRawData)}
            className="text-xs text-muted-foreground"
          >
            {showRawData ? "Hide Debug Data" : "Inspect Payload"}
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

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Pending Approvals</span>
              <div className="p-2 bg-amber-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">
                {isLoading ? <span className="h-10 w-16 bg-muted animate-pulse block rounded-lg" /> : pendingCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Submitted in current calendar month
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Approved Leaves</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">
                {isLoading ? <span className="h-10 w-16 bg-muted animate-pulse block rounded-lg" /> : approvedCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Approved in current calendar month
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 to-sky-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Partial Leaves</span>
              <div className="p-2 bg-sky-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <Info className="h-5 w-5 text-sky-500" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">
                {isLoading ? <span className="h-10 w-16 bg-muted animate-pulse block rounded-lg" /> : partialCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Partially approved in current month
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-400 to-rose-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Rejected Leaves</span>
              <div className="p-2 bg-rose-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <XCircle className="h-5 w-5 text-rose-500" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">
                {isLoading ? <span className="h-10 w-16 bg-muted animate-pulse block rounded-lg" /> : rejectedCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Rejected in current calendar month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Debug view for payload validation */}
      {showRawData && (
        <Card className="border border-amber-200 bg-amber-500/5 p-4 rounded-xl">
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">Raw API Data Payload:</h4>
          <pre className="text-xs max-h-60 overflow-y-auto bg-black/80 text-green-400 p-3 rounded-lg font-mono">
            {JSON.stringify(requests, null, 2)}
          </pre>
        </Card>
      )}

      {/* Tabs Filter & Leave requests list */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2 gap-4">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <TabsTrigger value="pending" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Pending
              {!isLoading && (
                <span className="ml-1 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-amber-950/60 dark:text-amber-300">
                  {requests.filter((r) => getRequestStatus(r) === "PENDING").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Approved
              {!isLoading && (
                <span className="ml-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300">
                  {requests.filter((r) => getRequestStatus(r) === "APPROVED").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="partial" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Partially Approved
              {!isLoading && (
                <span className="ml-1 bg-sky-100 text-sky-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-sky-950/60 dark:text-sky-300">
                  {requests.filter((r) => getRequestStatus(r) === "PARTIAL").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              Rejected
              {!isLoading && (
                <span className="ml-1 bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-rose-950/60 dark:text-rose-300">
                  {requests.filter((r) => getRequestStatus(r) === "REJECTED").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <span className="text-xs font-medium text-muted-foreground">
            Displaying {filteredRequests.length} matching requests
          </span>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {[1, 2].map((i) => (
              <Card key={i} className="w-full animate-pulse border border-zinc-200 dark:border-zinc-800 bg-white/50">
                <CardHeader className="space-y-3 pb-4">
                  <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Lists Container */}
        {!isLoading && (
          <TabsContent value={activeTab} className="mt-0 focus-visible:outline-none w-full">
            <AnimatePresence mode="popLayout">
              {filteredRequests.length === 0 ? (
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
                  {filteredRequests.map((request) => {
                    const reqStatus = getRequestStatus(request);
                    const isPending = reqStatus === "PENDING";
                    const isApproved = reqStatus === "APPROVED";
                    const isRejected = reqStatus === "REJECTED";

                    // Fallback helpers for request properties
                    const staffName = request.staff_name || (request as any).employee_name || (request as any).staff?.name || "Staff Member";
                    const submissionDate = request.submission_date || (request as any).created_at || (request as any).date || "";
                    const leaveType = request.leave_type || (request as any).type || "CASUAL";
                    const reason = request.reason || (request as any).reason_for_leave || (request as any).description || "No reason specified";
                    const startDate = request.start_date || (request as any).from_date || "";
                    const endDate = request.end_date || (request as any).to_date || "";
                    const totalDays = request.total_requested_days || (request as any).total_days || 0;
                    
                    // Support multiple days list keys
                    const days = request.days || (request as any).leave_days || (request as any).dates || (request as any).request_days || [];

                    const isPartial = reqStatus === "PARTIAL";

                    // Left border indicator based on status
                    const statusBorderColor = isApproved
                      ? "border-l-emerald-500 dark:border-l-emerald-600"
                      : isRejected
                      ? "border-l-rose-500 dark:border-l-rose-600"
                      : isPartial
                      ? "border-l-sky-500 dark:border-l-sky-600"
                      : "border-l-amber-500 dark:border-l-amber-600";

                    const initials = staffName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "S";

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
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 text-xs">
                                  {initials}
                                </div>
                                <div>
                                  <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50 leading-tight capitalize">
                                    {staffName}
                                  </h3>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Submitted: {formatDate(submissionDate)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                                <Badge variant="outline" className={cn("font-bold px-3 py-1 border text-xs tracking-wider rounded-md", getLeaveTypeBadgeClass(leaveType))}>
                                  {getLeaveTypeDisplay(leaveType)}
                                </Badge>
                                {getStatusBadge(reqStatus)}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 pt-0 space-y-3">
                            {/* Date Details Range */}
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground bg-zinc-100 dark:bg-zinc-800/60 px-2 py-1 rounded-md border dark:border-zinc-800">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span className="font-semibold text-zinc-850 dark:text-zinc-100">
                                  {formatDateRange(startDate, endDate)}
                                </span>
                              </div>
                              <div className="text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
                                <span>Total Days:</span>
                                <span className="font-extrabold text-zinc-950 dark:text-zinc-50 bg-primary/5 dark:bg-primary/20 px-2 py-0.5 rounded border dark:border-primary/20">{totalDays}</span>
                                <span>{totalDays === 1 ? 'day' : 'days'}</span>
                                {isPartial && (
                                  (() => {
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

                            {/* Reason for Leave */}
                            <div className="text-zinc-650 dark:text-zinc-300 text-xs">
                              <span className="font-semibold text-zinc-500 mr-2 text-[10px] uppercase tracking-wider">Reason:</span>
                              <span className="italic">"{reason}"</span>
                            </div>

                            {/* Direct Actions (Bulk) */}
                            {isPending && (
                              <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                  variant="default"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm hover:shadow-md transition-all px-4 py-2 hover:scale-[1.02] active:scale-[0.98]"
                                  onClick={() => handleBulkAction(request.id, "APPROVED")}
                                  disabled={processingRequests[request.id] !== undefined}
                                >
                                  {processingRequests[request.id] === "approving" ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Approving...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-1.5 h-4 w-4" />
                                      Approve Entire Request
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm hover:shadow-md transition-all px-4 py-2 hover:scale-[1.02] active:scale-[0.98]"
                                  onClick={() => handleBulkAction(request.id, "REJECTED")}
                                  disabled={processingRequests[request.id] !== undefined}
                                >
                                  {processingRequests[request.id] === "rejecting" ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Rejecting...
                                    </>
                                  ) : (
                                    <>
                                      <X className="mr-1.5 h-4 w-4" />
                                      Reject Entire Request
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

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
                                          const dayStatus = getSafeStatus(day.status);
                                          const isDayPending = dayStatus === "PENDING";

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
                                                
                                                {isDayPending && (
                                                  <div className="flex items-center gap-1.5">
                                                    <Button
                                                      size="xs"
                                                      variant="outline"
                                                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200/70 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 shadow-xs"
                                                      onClick={() => handleDayAction(request.id, day.id, "APPROVED")}
                                                      disabled={processingDays[day.id] !== undefined}
                                                      title="Approve individual day"
                                                    >
                                                      {processingDays[day.id] === "approving" ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                        <Check className="h-3 w-3" />
                                                      )}
                                                      <span className="sr-only">Approve Day</span>
                                                    </Button>
                                                    <Button
                                                      size="xs"
                                                      variant="outline"
                                                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-rose-200/70 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50 shadow-xs"
                                                      onClick={() => handleDayAction(request.id, day.id, "REJECTED")}
                                                      disabled={processingDays[day.id] !== undefined}
                                                      title="Reject individual day"
                                                    >
                                                      {processingDays[day.id] === "rejecting" ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                        <X className="h-3 w-3" />
                                                      )}
                                                      <span className="sr-only">Reject Day</span>
                                                    </Button>
                                                  </div>
                                                )}
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
    </div>
  );
}
