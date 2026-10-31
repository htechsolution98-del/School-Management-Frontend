"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  RotateCcw,
  Loader2,
  X,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Check,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { inventoryApi, coreApi, showApiError, showSuccess } from "@/lib/inventory-client";
import {
  processReturnReplace,
  type ProcessReturnReplacePayload,
  formatChargingPolicy,
  formatVariantLabel
} from "@/lib/fees";

export default function ReplacementsAndReturnsPage() {
  const [activeTab, setActiveTab] = useState<"replacements" | "returns">("replacements");
  const [replacements, setReplacements] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "ISSUE">("APPROVE");
  const [chargingType, setChargingType] = useState("FREE");
  const [chargedAmount, setChargedAmount] = useState("0.00");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Unified Process Return / Exchange Modal State
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [submittingProcess, setSubmittingProcess] = useState(false);
  const [studentIssuedRecords, setStudentIssuedRecords] = useState<any[]>([]);
  const [loadingIssuedRecords, setLoadingIssuedRecords] = useState(false);
  const [selectedIssueRecord, setSelectedIssueRecord] = useState<any | null>(null);
  const [processForm, setProcessForm] = useState<{
    student: string;
    issue_id: string;
    action_type: "RETURN" | "REPLACEMENT";
    condition: "GOOD" | "DAMAGED";
    quantity: number | string;
    reason: string;
    remarks: string;
    requested_size: string;
    requested_color: string;
  }>({
    student: "",
    issue_id: "",
    action_type: "RETURN",
    condition: "GOOD",
    quantity: 1,
    reason: "WRONG_SIZE",
    remarks: "",
    requested_size: "",
    requested_color: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, retRes, itemsRes, sizesRes, colorsRes, studsRes, yearsRes] = await Promise.all([
        inventoryApi.get("/replacements/"),
        inventoryApi.get("/returns/"),
        inventoryApi.get("/items/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
        coreApi.get("/get-student/").catch(() => ({ data: [] })),
        coreApi.get("/academic-year/").catch(() => ({ data: [] })),
      ]);

      setReplacements(Array.isArray(repRes.data) ? repRes.data : repRes.data.results || []);
      setReturns(Array.isArray(retRes.data) ? retRes.data : retRes.data.results || []);
      const its = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || [];
      setItems(its);
      setSizes(Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || []);
      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || []);
      const st = Array.isArray(studsRes.data) ? studsRes.data : studsRes.data.results || [];
      setStudents(st);
      const years = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.results || [];
      setAcademicYears(years);
    } catch (err) {
      console.error("Error fetching replacements:", err);
      showApiError(err, "Failed to load replacement and return records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (rep: any, actionType: "APPROVE" | "REJECT" | "ISSUE") => {
    setSelectedReplacement(rep);
    setReviewAction(actionType);
    setAdminRemarks("");
    setChargingType("FREE");
    setChargedAmount("0.00");
    setIsReviewModalOpen(true);
  };

  const handleProcessReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReplacement) return;
    setSubmittingReview(true);
    try {
      if (reviewAction === "APPROVE") {
        await inventoryApi.post(`/replacements/${selectedReplacement.id}/approve/`, { admin_remarks: adminRemarks });
        showSuccess("Replacement Request Approved");
      } else if (reviewAction === "REJECT") {
        await inventoryApi.post(`/replacements/${selectedReplacement.id}/reject/`, { admin_remarks: adminRemarks });
        showSuccess("Replacement Request Rejected");
      } else if (reviewAction === "ISSUE") {
        await inventoryApi.post(`/replacements/${selectedReplacement.id}/issue/`, {
          charging_type: chargingType,
          charged_amount: chargedAmount,
        });
        showSuccess("Replacement Item Issued", "Inventory stock has been deducted.");
      }

      setIsReviewModalOpen(false);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Replacement action failed.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenProcessModal = () => {
    setProcessForm({
      student: "",
      issue_id: "",
      action_type: "RETURN",
      condition: "GOOD",
      quantity: 1,
      reason: "WRONG_SIZE",
      remarks: "",
      requested_size: "",
      requested_color: "",
    });
    setStudentIssuedRecords([]);
    setSelectedIssueRecord(null);
    setIsProcessModalOpen(true);
  };

  const handleStudentSelect = async (studentId: string) => {
    setProcessForm((prev) => ({
      ...prev,
      student: studentId,
      issue_id: "",
      quantity: 1,
      requested_size: "",
      requested_color: "",
    }));
    setSelectedIssueRecord(null);

    if (!studentId) {
      setStudentIssuedRecords([]);
      return;
    }

    setLoadingIssuedRecords(true);
    try {
      const res = await inventoryApi.get(`/issues/?student=${studentId}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const activeIssues = list.filter((iss: any) => !iss.status || iss.status === "ISSUED");
      setStudentIssuedRecords(activeIssues.length > 0 ? activeIssues : list);
    } catch (err) {
      console.error("Error fetching student issued items:", err);
      toast.error("Failed to load student's issued items.");
      setStudentIssuedRecords([]);
    } finally {
      setLoadingIssuedRecords(false);
    }
  };

  const handleIssueSelect = (issueIdStr: string) => {
    const found = studentIssuedRecords.find((rec) => String(rec.id) === issueIdStr);
    setSelectedIssueRecord(found || null);

    let defaultSize = "";
    let defaultColor = "";
    if (found) {
      if (found.size) {
        defaultSize = String(typeof found.size === "object" ? found.size.id : found.size);
      }
      if (found.color) {
        defaultColor = String(typeof found.color === "object" ? found.color.id : found.color);
      }
    }

    setProcessForm((prev) => ({
      ...prev,
      issue_id: issueIdStr,
      quantity: 1,
      requested_size: defaultSize,
      requested_color: defaultColor,
    }));
  };

  const selectedCatalogItem = useMemo(() => {
    if (!selectedIssueRecord) return null;
    const itId = typeof selectedIssueRecord.item === "object" ? selectedIssueRecord.item?.id : Number(selectedIssueRecord.item);
    return items.find((ci) => ci.id === itId);
  }, [selectedIssueRecord, items]);

  const allowedSizesForSelected = useMemo(() => {
    if (!selectedCatalogItem || !selectedCatalogItem.has_size) return [];
    if (selectedCatalogItem.allowed_sizes && selectedCatalogItem.allowed_sizes.length > 0) {
      const allowed = new Set(selectedCatalogItem.allowed_sizes.map((s: any) => (typeof s === "object" ? s.id : s)));
      return sizes.filter((s: any) => allowed.has(s.id));
    }
    return sizes;
  }, [selectedCatalogItem, sizes]);

  const allowedColorsForSelected = useMemo(() => {
    if (!selectedCatalogItem || !selectedCatalogItem.has_color) return [];
    if (selectedCatalogItem.allowed_colors && selectedCatalogItem.allowed_colors.length > 0) {
      const allowed = new Set(selectedCatalogItem.allowed_colors.map((c: any) => (typeof c === "object" ? c.id : c)));
      return colors.filter((c: any) => allowed.has(c.id));
    }
    return colors;
  }, [selectedCatalogItem, colors]);

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processForm.student) {
      toast.error("Please select a student.");
      return;
    }
    if (!processForm.issue_id || !selectedIssueRecord) {
      toast.error("Please select an issued item.");
      return;
    }
    const qty = Number(processForm.quantity);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be at least 1.");
      return;
    }
    const maxQty = selectedIssueRecord.quantity || 1;
    if (qty > maxQty) {
      toast.error(`Quantity cannot exceed the issued quantity of ${maxQty}.`);
      return;
    }

    if (processForm.action_type === "REPLACEMENT") {
      if (selectedCatalogItem?.has_size && !processForm.requested_size) {
        toast.error("Please select a requested replacement size.");
        return;
      }
      if (selectedCatalogItem?.has_color && !processForm.requested_color) {
        toast.error("Please select a requested replacement color.");
        return;
      }
    }

    setSubmittingProcess(true);
    try {
      const combinedRemarks = processForm.action_type === "REPLACEMENT"
        ? `[Exchange: ${processForm.reason}] ${processForm.remarks}`.trim()
        : processForm.remarks.trim();

      const payload: ProcessReturnReplacePayload = {
        action_type: processForm.action_type,
        condition: processForm.condition,
        quantity: qty,
        remarks: combinedRemarks,
        replacement_size: processForm.action_type === "REPLACEMENT" && processForm.requested_size ? Number(processForm.requested_size) : null,
        replacement_color: processForm.action_type === "REPLACEMENT" && processForm.requested_color ? Number(processForm.requested_color) : null,
      };

      const res = await processReturnReplace(selectedIssueRecord.id, payload);
      if (res.success) {
        showSuccess(
          processForm.action_type === "REPLACEMENT"
            ? "Exchange / Replacement Processed"
            : "Student Return Processed",
          processForm.action_type === "REPLACEMENT"
            ? "Replacement unit deducted from stock and issued to student."
            : `Stock updated (${processForm.condition === "GOOD" ? "Restocked in Main Stock" : "Logged to Scrap/Damaged ledger"})${
                selectedIssueRecord.charging_type === "SEPARATE_CHARGE"
                  ? " & Fee liability reversed."
                  : "."
              }`
        );
        setIsProcessModalOpen(false);
        fetchData();
      } else {
        showApiError(res.error || res.message, "Failed to process return/exchange.");
      }
    } catch (err: any) {
      showApiError(err, "Failed to process return/exchange.");
    } finally {
      setSubmittingProcess(false);
    }
  };

  return (
    <div className="space-y-6 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full min-w-0 pb-32 sm:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Replacement Requests & Returns
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Process damaged/size exchange requests with Free vs Chargeable pricing decisions, and handle returnable items.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={handleOpenProcessModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 shrink-0" /> Process Return / Exchange
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 flex-nowrap overflow-x-auto whitespace-nowrap hide-scrollbar pb-0.5 sm:pb-0">
        <button
          onClick={() => setActiveTab("replacements")}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "replacements"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <RefreshCw className="w-4 h-4 shrink-0" /> Replacement Requests ({replacements.length})
        </button>

        <button
          onClick={() => setActiveTab("returns")}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "returns"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <RotateCcw className="w-4 h-4 shrink-0" /> Student Item Returns ({returns.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading records...
          </div>
        ) : activeTab === "replacements" ? (
          replacements.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Replacement Requests</div>
              <p className="text-xs mt-1">Student size exchanges or damaged replacement requests will appear here.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< sm) */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3">
                {replacements.map((r) => (
                  <div key={r.id} className="py-3.5 first:pt-1 last:pb-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {r.student_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Roll #{r.student_roll || "—"}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === "ISSUED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : r.status === "APPROVED"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : r.status === "REJECTED"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {r.item_name} <span className="text-slate-500">(x{r.quantity})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Reason: <span className="font-medium text-slate-600 dark:text-slate-300">{r.reason}</span>
                          {r.requested_size_name ? ` • Size: ${r.requested_size_name}` : ""}
                        </div>
                      </div>

                      <div>
                        {r.status === "PENDING" && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenReview(r, "REJECT")}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleOpenReview(r, "APPROVE")}
                              className="px-2.5 py-1 rounded-lg bg-[#5826df] hover:bg-[#4a1ec2] text-white text-xs font-semibold shadow-xs"
                            >
                              Approve
                            </button>
                          </div>
                        )}
                        {r.status === "APPROVED" && (
                          <button
                            onClick={() => handleOpenReview(r, "ISSUE")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                          >
                            Dispense
                          </button>
                        )}
                        {r.status === "ISSUED" && (
                          <span className="text-[11px] text-emerald-600 font-semibold">Completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= sm) */}
              <div className="hidden sm:block w-full overflow-x-auto hide-scrollbar">
                <table className="w-full min-w-[720px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Item</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Requested Variant</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Review / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {replacements.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{r.student_name}</div>
                          <div className="text-xs text-slate-400">Roll #{r.student_roll || "—"}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                          {r.item_name} (x{r.quantity})
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {r.reason}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {r.requested_size_name ? `Size: ${r.requested_size_name}` : "Standard"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            r.status === "ISSUED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : r.status === "APPROVED"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : r.status === "REJECTED"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {r.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenReview(r, "APPROVE")}
                                className="px-2.5 py-1 rounded-lg bg-[#5826df] hover:bg-[#4a1ec2] text-white text-xs font-semibold shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenReview(r, "REJECT")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {r.status === "APPROVED" && (
                            <button
                              onClick={() => handleOpenReview(r, "ISSUE")}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                            >
                              Dispense & Deduct Stock
                            </button>
                          )}
                          {r.status === "ISSUED" && (
                            <span className="text-xs text-emerald-600 font-semibold">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          /* Returns Table */
          returns.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Student Returns Recorded</div>
              <p className="text-xs mt-1">Returned blazers, sports kits, or library gear are tracked here.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< sm) */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3">
                {returns.map((ret) => (
                  <div key={ret.id} className="py-3 first:pt-1 last:pb-1 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {ret.student_name}
                      </div>
                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        ret.condition === "GOOD"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      }`}>
                        {ret.condition}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {ret.item_name} {ret.size_name ? `(Size ${ret.size_name})` : ""}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">Qty: {ret.quantity}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {ret.return_date} • {ret.reason || "No notes"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= sm) */}
              <div className="hidden sm:block w-full overflow-x-auto hide-scrollbar">
                <table className="w-full min-w-[720px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Return Date</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Item Returned</th>
                      <th className="py-3.5 px-4">Qty</th>
                      <th className="py-3.5 px-4">Condition</th>
                      <th className="py-3.5 px-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {returns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-xs text-slate-500">{ret.return_date}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{ret.student_name}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                          {ret.item_name} {ret.size_name ? `(Size ${ret.size_name})` : ""}
                        </td>
                        <td className="py-3.5 px-4 font-bold">{ret.quantity}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                            ret.condition === "GOOD"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}>
                            {ret.condition} (Restocked: {ret.condition === "GOOD" ? "Yes" : "No"})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">{ret.reason || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>

      {/* Unified Process Return / Exchange Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Process Return / Exchange</h2>
                  <p className="text-xs text-slate-500">Unified workflow with condition routing and fee synchronization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProcessModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} noValidate className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Step 1: Identify Student & Issued Item */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Step 1: Identify Student & Issued Item
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Student */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Student <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={processForm.student}
                      onChange={(e) => handleStudentSelect(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                    >
                      <option value="">Select student</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.surname} {s.roll_no ? `· Roll: ${s.roll_no}` : s.gr_no ? `· GR: ${s.gr_no}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Issued Item */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Select Issued Item <span className="text-red-500">*</span>
                      </label>
                      {loadingIssuedRecords && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                        </span>
                      )}
                    </div>
                    <select
                      required
                      disabled={!processForm.student || loadingIssuedRecords || studentIssuedRecords.length === 0}
                      value={processForm.issue_id}
                      onChange={(e) => handleIssueSelect(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {!processForm.student ? (
                        <option value="">-- Select a student first --</option>
                      ) : loadingIssuedRecords ? (
                        <option value="">Loading student's issued items...</option>
                      ) : studentIssuedRecords.length === 0 ? (
                        <option value="">No items issued to this student</option>
                      ) : (
                        <>
                          <option value="">-- Select issued item --</option>
                          {studentIssuedRecords.map((iss) => {
                            const vLabel = formatVariantLabel(iss);
                            const policy = formatChargingPolicy(iss.charging_type);
                            return (
                              <option key={iss.id} value={iss.id}>
                                {iss.item_name} {vLabel ? `(${vLabel})` : ""} · Qty: {iss.quantity} ({policy.shortLabel})
                              </option>
                            );
                          })}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Selected Issue Preview Card */}
                {selectedIssueRecord && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {selectedIssueRecord.item_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {selectedIssueRecord.size_name || selectedIssueRecord.color_name
                            ? `Variant: ${selectedIssueRecord.size_name || "—"} / ${selectedIssueRecord.color_name || "—"}`
                            : "Standard / No Variant"}
                          {selectedIssueRecord.item_code ? ` · Code: ${selectedIssueRecord.item_code}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const pol = formatChargingPolicy(selectedIssueRecord.charging_type);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pol.badgeClass}`}>
                              <span className={`w-1 h-1 rounded-full ${pol.dotClass}`} />
                              {pol.label}
                            </span>
                          );
                        })()}
                        <div className="text-xs text-slate-500 mt-1">
                          Issued: <strong className="text-slate-800 dark:text-slate-200">{selectedIssueRecord.quantity} units</strong> on {selectedIssueRecord.issue_date}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Returned Condition */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Step 2: Returned Condition (Stock Routing) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProcessForm({ ...processForm, condition: "GOOD" })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      processForm.condition === "GOOD"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${processForm.condition === "GOOD" ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Good / Restock</span>
                      </div>
                      {processForm.condition === "GOOD" && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Item is reusable. Restocks (+{processForm.quantity || 1}) into Main Available Stock.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProcessForm({ ...processForm, condition: "DAMAGED" })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      processForm.condition === "DAMAGED"
                        ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 ring-2 ring-rose-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${processForm.condition === "DAMAGED" ? "text-rose-600" : "text-slate-400"}`} />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Damaged / Scrap</span>
                      </div>
                      {processForm.condition === "DAMAGED" && <Check className="w-4 h-4 text-rose-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Defective item. Does NOT increment Main Stock; logged to virtual Scrap/Damaged ledger.
                    </p>
                  </button>
                </div>
              </div>

              {/* Step 3: Action Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Step 3: Action Needed <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProcessForm({ ...processForm, action_type: "RETURN" })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      processForm.action_type === "RETURN"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <RotateCcw className={`w-4 h-4 ${processForm.action_type === "RETURN" ? "text-amber-600" : "text-slate-400"}`} />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Return Only (Refund/Cancel Fee)</span>
                      </div>
                      {processForm.action_type === "RETURN" && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Return item to inventory without issuing a replacement.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProcessForm({ ...processForm, action_type: "REPLACEMENT" })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      processForm.action_type === "REPLACEMENT"
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className={`w-4 h-4 ${processForm.action_type === "REPLACEMENT" ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Exchange / Replace Item</span>
                      </div>
                      {processForm.action_type === "REPLACEMENT" && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Dispense a replacement item to the student.
                    </p>
                  </button>
                </div>

                {/* Contextual Fee / Stock Synchronization Notice */}
                <div className="mt-2.5">
                  {processForm.action_type === "RETURN" ? (
                    selectedIssueRecord?.charging_type === "SEPARATE_CHARGE" ? (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <strong className="font-bold">Automatic Fee Synchronization:</strong> Because this item had a Separate Charge policy, confirming this return will automatically reverse/cancel the student's fee liability in the Fees module.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <strong className="font-semibold">Fee Ledger:</strong> No fee adjustment needed (item was issued as {selectedIssueRecord?.charging_type === "FREE" ? "Free" : "Included in Fee"}).
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <strong className="font-bold">Inventory & Fee Sync:</strong> A fresh unit will be deducted (-{processForm.quantity || 1}) from Main Stock. The fee ledger is NOT altered (original charge remains valid with no duplicate charge).
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Conditional Fields (Smart UI) */}
              {processForm.action_type === "REPLACEMENT" ? (
                <div className="space-y-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    Replacement Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Replacement Reason */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Replacement Reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={processForm.reason}
                        onChange={(e) => setProcessForm({ ...processForm, reason: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                      >
                        <option value="WRONG_SIZE">Wrong Size Fitting</option>
                        <option value="DEFECTIVE">Manufacturing Defect / Torn</option>
                        <option value="COLOR_EXCHANGE">Color Exchange</option>
                        <option value="DAMAGED">Damaged / Broken</option>
                        <option value="OTHER">Other Exchange Reason</option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Quantity to Exchange <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedIssueRecord ? selectedIssueRecord.quantity || 1 : 1}
                        required
                        value={processForm.quantity}
                        onChange={(e) => setProcessForm({ ...processForm, quantity: Math.max(1, Number(e.target.value)) })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                      />
                      {selectedIssueRecord && (
                        <span className="text-[11px] text-slate-400">Max: {selectedIssueRecord.quantity} units</span>
                      )}
                    </div>

                    {/* Requested Size */}
                    {selectedCatalogItem?.has_size && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Requested Size <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={processForm.requested_size}
                          onChange={(e) => setProcessForm({ ...processForm, requested_size: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                        >
                          <option value="">Select requested size</option>
                          {allowedSizesForSelected.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Requested Color */}
                    {selectedCatalogItem?.has_color && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Requested Color <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={processForm.requested_color}
                          onChange={(e) => setProcessForm({ ...processForm, requested_color: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                        >
                          <option value="">Select requested color</option>
                          {allowedColorsForSelected.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Remarks / Description */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Exchange Remarks / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Size M too tight, exchanged for Size L"
                        value={processForm.remarks}
                        onChange={(e) => setProcessForm({ ...processForm, remarks: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Quantity to Return <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedIssueRecord ? selectedIssueRecord.quantity || 1 : 1}
                      required
                      value={processForm.quantity}
                      onChange={(e) => setProcessForm({ ...processForm, quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                    />
                    {selectedIssueRecord && (
                      <span className="text-[11px] text-slate-400">Max: {selectedIssueRecord.quantity} units</span>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Return Reason / Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Completed school term, uniform returned, etc."
                      value={processForm.remarks}
                      onChange={(e) => setProcessForm({ ...processForm, remarks: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  disabled={submittingProcess}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProcess || !processForm.student || !processForm.issue_id}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                    processForm.action_type === "RETURN"
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                      : "bg-[#5826df] hover:bg-[#4a1ec2] shadow-indigo-500/20"
                  }`}
                >
                  {submittingProcess && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submittingProcess
                    ? "Processing..."
                    : processForm.action_type === "RETURN"
                    ? "Confirm Return"
                    : "Confirm Exchange"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && selectedReplacement && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {reviewAction === "APPROVE" ? "Approve Replacement" : reviewAction === "REJECT" ? "Reject Replacement" : "Issue Replacement Item"}
              </h2>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessReview} noValidate className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div><span className="text-slate-400">Student:</span> <span className="font-bold">{selectedReplacement.student_name}</span></div>
                <div><span className="text-slate-400">Item:</span> <span className="font-bold">{selectedReplacement.item_name} (x{selectedReplacement.quantity})</span></div>
                <div><span className="text-slate-400">Reason:</span> <span className="font-semibold text-orange-600">{selectedReplacement.reason}</span></div>
              </div>

              {reviewAction === "ISSUE" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Replacement Pricing Policy
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer ${
                        chargingType === "FREE" ? "border-blue-600 bg-blue-50/50 font-bold text-blue-700" : "border-slate-200"
                      }`}>
                        <input
                          type="radio"
                          name="chargingType"
                          value="FREE"
                          checked={chargingType === "FREE"}
                          onChange={() => {
                            setChargingType("FREE");
                            setChargedAmount("0.00");
                          }}
                          className="hidden"
                        />
                        <span className="text-xs">Free Replacement</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">School absorbs cost</span>
                      </label>

                      <label className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer ${
                        chargingType === "SEPARATE_CHARGE" ? "border-blue-600 bg-blue-50/50 font-bold text-blue-700" : "border-slate-200"
                      }`}>
                        <input
                          type="radio"
                          name="chargingType"
                          value="SEPARATE_CHARGE"
                          checked={chargingType === "SEPARATE_CHARGE"}
                          onChange={() => setChargingType("SEPARATE_CHARGE")}
                          className="hidden"
                        />
                        <span className="text-xs">Chargeable Replacement</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Charge student fee</span>
                      </label>
                    </div>
                  </div>

                  {chargingType === "SEPARATE_CHARGE" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Amount to Charge Student (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={chargedAmount}
                        onChange={(e) => setChargedAmount(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Remarks / Justification
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter review notes..."
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button type="submit" disabled={submittingReview} className="px-5 py-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all">
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}