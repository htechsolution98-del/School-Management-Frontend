"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Package,
  User,
  Calendar,
  Layers,
  Check,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";
import { getCurrentUserProfile } from "@/lib/current-user";
import type { CurrentUserProfile } from "@/types";

interface RequisitionItem {
  id: number;
  school: number;
  requester: number;
  requester_name: string;
  requester_role: string;
  item: number;
  item_name: string;
  item_code: string;
  unit: string;
  available_stock: number;
  quantity_requested: number;
  purpose: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  requested_at: string;
  action_date?: string | null;
  action_by?: number | null;
  action_by_name?: string | null;
  remarks?: string | null;
}

export default function InventoryRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<RequisitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Action State
  const [selectedReq, setSelectedReq] = useState<RequisitionItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);

  // Fetch all requisitions from /api/inventory/requisitions/
  const fetchRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.get("/requisitions/");
      const data: RequisitionItem[] = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      setRequisitions(data);
    } catch (err) {
      console.error("Failed to load requisitions:", err);
      showApiError(err, "Failed to load staff requisitions list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequisitions();
    getCurrentUserProfile()
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error("Could not fetch current user profile:", err));
  }, [fetchRequisitions]);

  // Extract logged-in user's full name
  const getApproverName = useCallback((): string => {
    if (currentUser) {
      const directName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
      if (directName && directName.toLowerCase() !== "none") return directName;
      if (currentUser.name && currentUser.name.toLowerCase() !== "none") return currentUser.name;
      if (currentUser.staff_profile?.name && currentUser.staff_profile.name.toLowerCase() !== "none") {
        return currentUser.staff_profile.name;
      }
      if (currentUser.username && currentUser.username.toLowerCase() !== "none") return currentUser.username;
    }

    if (typeof window !== "undefined") {
      try {
        const cu = JSON.parse(localStorage.getItem("current_user") || "{}");
        const localName = `${cu.first_name || ""} ${cu.last_name || ""}`.trim() || cu.name;
        if (localName && localName.toLowerCase() !== "none") return localName;
      } catch {}
      const username = localStorage.getItem("username");
      if (username && username.toLowerCase() !== "none") return username;
    }

    return "Inventory Manager";
  }, [currentUser]);

  // Handle Approve Click
  const handleOpenApprove = (req: RequisitionItem) => {
    if (req.available_stock < req.quantity_requested) {
      toast.error(
        `Insufficient stock: ${req.item_name} has only ${req.available_stock} ${req.unit} available, but ${req.quantity_requested} ${req.unit} was requested.`
      );
      return;
    }
    setSelectedReq(req);
    setActionType("APPROVE");
    setRemarks("");
  };

  // Handle Reject Click
  const handleOpenReject = (req: RequisitionItem) => {
    setSelectedReq(req);
    setActionType("REJECT");
    setRemarks("");
  };

  // Submit Action (Approve / Reject)
  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !actionType) return;

    if (actionType === "APPROVE" && selectedReq.available_stock < selectedReq.quantity_requested) {
      toast.error(
        `Insufficient stock: Cannot approve request. Available: ${selectedReq.available_stock}, Requested: ${selectedReq.quantity_requested}.`
      );
      return;
    }

    try {
      setActionLoading(true);
      const isApprove = actionType === "APPROVE";
      const approverName = getApproverName();
      const actionDateStr = formatDate(new Date().toISOString());
      const auditRemark = `Acted on ${actionDateStr} by ${approverName}`;

      const finalRemarks = remarks.trim()
        ? `${remarks.trim()} (${auditRemark})`
        : auditRemark;

      const payload: { status: string; remarks: string } = {
        status: isApprove ? "Approved" : "Rejected",
        remarks: finalRemarks,
      };

      await inventoryApi.patch(`/requisitions/${selectedReq.id}/`, payload);

      showSuccess(
        isApprove ? "Requisition Approved" : "Requisition Rejected",
        isApprove
          ? `Approved request #${selectedReq.id}. Deducted ${selectedReq.quantity_requested} ${selectedReq.unit} of ${selectedReq.item_name} from inventory stock.`
          : `Rejected request #${selectedReq.id} for ${selectedReq.requester_name}.`
      );

      // Close modal & reset
      setSelectedReq(null);
      setActionType(null);
      setRemarks("");

      // Refresh list immediately
      await fetchRequisitions();
    } catch (err) {
      console.error("Requisition action failed:", err);
      showApiError(
        err,
        actionType === "APPROVE"
          ? "Failed to approve requisition. Please check available stock."
          : "Failed to reject requisition."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Filter & Search
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesStatus =
        statusFilter === "ALL" || r.status.toUpperCase() === statusFilter.toUpperCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.requester_name.toLowerCase().includes(q) ||
        r.requester_role.toLowerCase().includes(q) ||
        r.item_name.toLowerCase().includes(q) ||
        r.item_code.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [requisitions, statusFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = requisitions.length;
    const pending = requisitions.filter((r) => r.status.toUpperCase() === "PENDING").length;
    const approved = requisitions.filter((r) => r.status.toUpperCase() === "APPROVED").length;
    const rejected = requisitions.filter((r) => r.status.toUpperCase() === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [requisitions]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") {
      return (
        <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300/60 inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    }
    if (s === "rejected") {
      return (
        <Badge className="text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300/60 inline-flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    }
    return (
      <Badge className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/60 inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2 sm:gap-2.5">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate sm:whitespace-normal">Staff Supply Requisitions</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 sm:mt-1 line-clamp-2 sm:line-clamp-none">
            Review and approve teaching consumable and asset requisitions requested by teachers and staff.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchRequisitions}
          disabled={loading}
          className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 shrink-0"
          title="Refresh requisitions"
          aria-label="Refresh requisitions"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-zinc-100 font-mono">
              {metrics.total}
            </span>
            <Layers className="h-5 w-5 text-slate-400" />
          </div>
        </Card>

        <Card className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-2xs">
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Pending Review
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {metrics.pending}
            </span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        </Card>

        <Card className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Approved & Issued
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {metrics.approved}
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </Card>

        <Card className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 shadow-2xs">
          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Rejected
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
              {metrics.rejected}
            </span>
            <XCircle className="h-5 w-5 text-rose-500" />
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by requester, item, code, or purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
              <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 min-w-[140px]">
                <Filter className="h-3.5 w-3.5 mr-1 text-slate-400" />
                <SelectValue placeholder="All Status">
                  {statusFilter === "ALL"
                    ? "All Status"
                    : statusFilter === "PENDING"
                    ? `Pending (${metrics.pending})`
                    : statusFilter === "APPROVED"
                    ? `Approved (${metrics.approved})`
                    : `Rejected (${metrics.rejected})`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" label="All Status">All Status</SelectItem>
                <SelectItem value="PENDING" label="Pending">Pending ({metrics.pending})</SelectItem>
                <SelectItem value="APPROVED" label="Approved">Approved ({metrics.approved})</SelectItem>
                <SelectItem value="REJECTED" label="Rejected">Rejected ({metrics.rejected})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Requisitions Data Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b dark:border-zinc-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              All Staff Supply Requests ({filteredRequisitions.length})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Review staff requests. Approving will automatically deduct the requested quantity from available stock.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="w-full overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[780px] text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Requester</th>
                  <th className="px-4 py-3.5">Item Requested</th>
                  <th className="px-4 py-3.5 text-center">Quantity</th>
                  <th className="px-4 py-3.5">Purpose / Remarks</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                        <span className="text-xs">Loading staff requisitions...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      <img
                        src="/images/empty-folder.png"
                        alt="No requisitions found"
                        className="w-20 sm:w-24 h-auto object-contain mx-auto mb-3 filter drop-shadow-sm select-none pointer-events-none"
                      />
                      <p className="font-semibold text-slate-700 dark:text-zinc-300">No requisitions found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchQuery || statusFilter !== "ALL"
                          ? "Try adjusting your search or status filter."
                          : "Teachers and staff have not submitted any stock requests yet."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((req, idx) => {
                    const isPending = req.status.toLowerCase() === "pending";
                    const hasSufficientStock = req.available_stock >= req.quantity_requested;

                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          {formatDate(req.requested_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-zinc-100 line-clamp-1">
                                {req.requester_name}
                              </p>
                              <p className="text-[10px] text-slate-400">{req.requester_role || "Staff"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-zinc-100">{req.item_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">{req.item_code}</span>
                              <span className="text-slate-300 dark:text-zinc-700">•</span>
                              <span
                                className={`text-[10px] font-semibold ${
                                  hasSufficientStock
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {req.available_stock} {req.unit} in stock
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold font-mono text-sm text-indigo-600 dark:text-indigo-400">
                            {req.quantity_requested}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1">{req.unit}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-slate-800 dark:text-zinc-200 line-clamp-2">
                            {req.purpose}
                          </p>
                          {req.remarks && (
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 italic mt-0.5 line-clamp-1">
                              Note: {req.remarks}
                            </p>
                          )}
                          {req.action_date && (
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              Acted on {formatDate(req.action_date)}
                              {req.action_by_name ? ` by ${req.action_by_name}` : ""}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {renderStatusBadge(req.status)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Over-Stock Validation: Disable Approve when requested > available */}
                              <div className="relative group inline-flex">
                                <Button
                                  size="sm"
                                  disabled={!hasSufficientStock}
                                  onClick={() => handleOpenApprove(req)}
                                  className={`h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shadow-2xs transition-all ${
                                    !hasSufficientStock
                                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-200 dark:border-zinc-700 opacity-60"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                  }`}
                                  title={
                                    !hasSufficientStock
                                      ? `Insufficient stock (${req.available_stock} available, ${req.quantity_requested} requested)`
                                      : "Approve requisition"
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" /> Approve
                                </Button>
                                {!hasSufficientStock && (
                                  <div className="pointer-events-none absolute bottom-full mb-1.5 right-0 hidden group-hover:flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg z-30 animate-in fade-in zoom-in-95">
                                    <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />
                                    <span>Insufficient stock ({req.available_stock} in stock)</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(req)}
                                className="h-8 px-2.5 border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400 dark:border-rose-900/60 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400 italic">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Approve / Reject Modal */}
      <Dialog
        open={!!selectedReq && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReq(null);
            setActionType(null);
            setRemarks("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {actionType === "APPROVE" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Approve Requisition Request
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  Reject Requisition Request
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionType === "APPROVE"
                ? "Approving will automatically deduct the requested quantity from available stock ledger."
                : "Rejecting this request will inform the staff member with your remarks."}
            </DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <form onSubmit={handleConfirmAction} className="space-y-4 pt-2">
              <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3 border border-slate-200 dark:border-zinc-700 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Requester:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-100">
                    {selectedReq.requester_name} ({selectedReq.requester_role})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Item:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-100">
                    {selectedReq.item_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Quantity Requested:</span>
                  <span className="font-bold font-mono text-indigo-600">
                    {selectedReq.quantity_requested} {selectedReq.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Current Available Stock:</span>
                  <span
                    className={`font-bold font-mono ${
                      selectedReq.available_stock >= selectedReq.quantity_requested
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {selectedReq.available_stock} {selectedReq.unit}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-zinc-700 pt-2">
                  <span className="text-slate-500 font-medium block mb-0.5">Purpose:</span>
                  <p className="text-slate-700 dark:text-zinc-300 italic">{selectedReq.purpose}</p>
                </div>
              </div>

              {actionType === "APPROVE" && selectedReq.available_stock < selectedReq.quantity_requested && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Warning: Current available stock ({selectedReq.available_stock}) is less than requested ({selectedReq.quantity_requested}).
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {actionType === "APPROVE" ? "Approval Remarks (Optional)" : "Reason for Rejection *"}
                </label>
                <Textarea
                  placeholder={
                    actionType === "APPROVE"
                      ? "Add optional remarks or issuance instructions..."
                      : "Provide a reason why this request is being rejected..."
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="text-xs min-h-[70px] rounded-xl bg-slate-50 dark:bg-zinc-800/60"
                  required={actionType === "REJECT"}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedReq(null);
                    setActionType(null);
                    setRemarks("");
                  }}
                  disabled={actionLoading}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || (actionType === "APPROVE" && selectedReq.available_stock < selectedReq.quantity_requested)}
                  className={`rounded-xl text-xs font-bold gap-1.5 text-white ${
                    actionType === "APPROVE"
                      ? selectedReq.available_stock < selectedReq.quantity_requested
                        ? "bg-slate-300 dark:bg-zinc-700 cursor-not-allowed opacity-60"
                        : "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : actionType === "APPROVE" ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Confirm Approval
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" /> Confirm Rejection
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
