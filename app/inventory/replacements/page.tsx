"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  RotateCcw,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { inventoryApi, coreApi, showApiError, showSuccess } from "@/lib/inventory-client";

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

  // Replacement Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [studentIssuedItems, setStudentIssuedItems] = useState<any[]>([]);
  const [loadingIssuedItems, setLoadingIssuedItems] = useState(false);
  const [requestForm, setRequestForm] = useState<{
    student: string;
    item: string;
    academic_year: string;
    current_size: string;
    requested_size: string;
    current_color: string;
    requested_color: string;
    quantity: number | string;
    reason: string;
    description: string;
  }>({
    student: "", item: "", academic_year: "", current_size: "", requested_size: "",
    current_color: "", requested_color: "", quantity: 1, reason: "WRONG_SIZE", description: "",
  });

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    student: "",
    item: "",
    size: "",
    color: "",
    quantity: 1,
    condition: "GOOD",
    reason: "Graduation / Uniform Return",
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);

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
      const returnableItems = its.filter((item: { is_returnable?: boolean }) => item.is_returnable);
      if (returnableItems.length > 0 && !returnForm.item) {
        setReturnForm(prev => ({ ...prev, item: returnableItems[0].id }));
      }
      setSizes(Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || []);
      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || []);
      const st = Array.isArray(studsRes.data) ? studsRes.data : studsRes.data.results || [];
      setStudents(st);
      if (st.length > 0 && !returnForm.student) {
        setReturnForm(prev => ({ ...prev, student: st[0].id }));
      }
      const years = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.results || [];
      setAcademicYears(years);
      if (years.length > 0 && !requestForm.academic_year) {
        setRequestForm(prev => ({ ...prev, academic_year: String(years[0].id) }));
      }
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

  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReturn(true);
    try {
      const payload = {
        student: Number(returnForm.student),
        item: Number(returnForm.item),
        size: returnForm.size ? Number(returnForm.size) : null,
        color: returnForm.color ? Number(returnForm.color) : null,
        quantity: Number(returnForm.quantity),
        condition: returnForm.condition,
        reason: returnForm.reason,
      };

      await inventoryApi.post("/returns/", payload);
      showSuccess("Return Processed", returnForm.condition === "GOOD" ? "Item restocked into inventory." : "Item recorded as damaged.");
      setIsReturnModalOpen(false);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Failed to record student return.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleOpenRequestModal = () => {
    setRequestForm({
      student: "",
      item: "",
      academic_year: academicYears.length > 0 ? String(academicYears[0].id) : "",
      current_size: "",
      requested_size: "",
      current_color: "",
      requested_color: "",
      quantity: 1,
      reason: "WRONG_SIZE",
      description: "",
    });
    setStudentIssuedItems([]);
    setIsRequestModalOpen(true);
  };

  const handleStudentChange = async (studentId: string) => {
    setRequestForm((prev) => ({
      ...prev,
      student: studentId,
      item: "",
      current_size: "",
      requested_size: "",
      current_color: "",
      requested_color: "",
    }));

    if (!studentId) {
      setStudentIssuedItems([]);
      return;
    }

    setLoadingIssuedItems(true);
    try {
      const res = await inventoryApi.get(`/issues/?student=${studentId}`);
      const issuesData = Array.isArray(res.data) ? res.data : res.data?.results || [];

      // Extract unique items issued to this specific student
      const itemsMap = new Map<number, any>();
      issuesData.forEach((issue: any) => {
        const itId = typeof issue.item === "object" ? issue.item?.id : Number(issue.item);
        if (!itId) return;
        const qty = Number(issue.quantity || 0);
        if (!itemsMap.has(itId)) {
          const catalogItem = items.find((ci) => ci.id === itId);
          itemsMap.set(itId, {
            id: itId,
            item_name: issue.item_name || catalogItem?.item_name || `Item #${itId}`,
            item_code: issue.item_code || catalogItem?.item_code || "",
            total_issued_qty: qty,
            issues: [issue],
          });
        } else {
          const existing = itemsMap.get(itId);
          existing.total_issued_qty += qty;
          existing.issues.push(issue);
        }
      });

      setStudentIssuedItems(Array.from(itemsMap.values()));
    } catch (err) {
      console.error("Error fetching issued items for student:", err);
      toast.error("Failed to load student's issued items.");
      setStudentIssuedItems([]);
    } finally {
      setLoadingIssuedItems(false);
    }
  };

  const handleItemChange = (itemId: string) => {
    const selectedIssued = studentIssuedItems.find((it) => String(it.id) === itemId);
    let autoCurrentSize = "";
    let autoCurrentColor = "";

    if (selectedIssued && selectedIssued.issues && selectedIssued.issues.length > 0) {
      const latestIssue = selectedIssued.issues[0];
      if (latestIssue.size) {
        autoCurrentSize = String(typeof latestIssue.size === "object" ? latestIssue.size.id : latestIssue.size);
      }
      if (latestIssue.color) {
        autoCurrentColor = String(typeof latestIssue.color === "object" ? latestIssue.color.id : latestIssue.color);
      }
    }

    const maxQty = selectedIssued ? selectedIssued.total_issued_qty || 1 : 1;

    setRequestForm((prev) => ({
      ...prev,
      item: itemId,
      current_size: autoCurrentSize || prev.current_size,
      current_color: autoCurrentColor || prev.current_color,
      quantity: prev.quantity && prev.quantity > maxQty ? maxQty : prev.quantity || 1,
    }));
  };

  const selectedIssuedItem = studentIssuedItems.find((it) => String(it.id) === String(requestForm.item));
  const maxAllowedQuantity = selectedIssuedItem ? (Number(selectedIssuedItem.total_issued_qty) || 1) : undefined;
  const isQtyExceeded = maxAllowedQuantity !== undefined && Number(requestForm.quantity) > maxAllowedQuantity;
  const isQtyInvalid = !requestForm.quantity || Number(requestForm.quantity) <= 0 || isQtyExceeded;

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.student) {
      toast.error("Please select a student.");
      return;
    }
    if (!requestForm.academic_year) {
      toast.error("Please select an academic year.");
      return;
    }
    if (!requestForm.item) {
      toast.error("Please select an item to replace.");
      return;
    }
    if (isQtyExceeded) {
      toast.error(`Quantity cannot exceed previously issued quantity of ${maxAllowedQuantity}.`);
      return;
    }
    if (!requestForm.quantity || Number(requestForm.quantity) <= 0) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    setSubmittingRequest(true);
    try {
      await inventoryApi.post("/replacements/", {
        ...requestForm,
        student: Number(requestForm.student),
        item: Number(requestForm.item),
        academic_year: Number(requestForm.academic_year),
        current_size: requestForm.current_size ? Number(requestForm.current_size) : null,
        requested_size: requestForm.requested_size ? Number(requestForm.requested_size) : null,
        current_color: requestForm.current_color ? Number(requestForm.current_color) : null,
        requested_color: requestForm.requested_color ? Number(requestForm.requested_color) : null,
        quantity: Number(requestForm.quantity),
      });
      showSuccess("Replacement request recorded", "It is now pending review.");
      setIsRequestModalOpen(false);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Failed to record replacement request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const selectedReturnItem = items.find((item) => item.id === Number(returnForm.item));

  return (
    <div className="space-y-6">
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenRequestModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" /> New Replacement Request
          </button>
          <button
            onClick={() => setIsReturnModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Record Student Return
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("replacements")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "replacements"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <RefreshCw className="w-4 h-4" /> Replacement Requests ({replacements.length})
        </button>

        <button
          onClick={() => setActiveTab("returns")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "returns"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Student Item Returns ({returns.length})
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
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
          )
        )}
      </div>

      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Create Replacement Request
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit an exchange or replacement request for an item previously issued to a student.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRequest} noValidate className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Student */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Student <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={requestForm.student}
                    onChange={(e) => handleStudentChange(e.target.value)}
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

                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={requestForm.academic_year}
                    onChange={(e) => setRequestForm({ ...requestForm, academic_year: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                  >
                    <option value="">Select academic year</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>{year.name}</option>
                    ))}
                  </select>
                </div>

                {/* Item to Replace - DYNAMICALLY FILTERED BY ISSUED ITEMS */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Item to Replace <span className="text-red-500">*</span>
                    </label>
                    {loadingIssuedItems && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching student's issued items...
                      </span>
                    )}
                  </div>
                  <select
                    required
                    disabled={!requestForm.student || loadingIssuedItems || studentIssuedItems.length === 0}
                    value={requestForm.item}
                    onChange={(e) => handleItemChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {!requestForm.student ? (
                      <option value="">-- Please select a student first --</option>
                    ) : loadingIssuedItems ? (
                      <option value="">Loading student's issued items...</option>
                    ) : studentIssuedItems.length === 0 ? (
                      <option value="">No items previously issued to this student</option>
                    ) : (
                      <>
                        <option value="">-- Select an issued item --</option>
                        {studentIssuedItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.item_name} {item.item_code ? `(${item.item_code})` : ""} · (Issued: {item.total_issued_qty || 1})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {requestForm.student && !loadingIssuedItems && studentIssuedItems.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                      ⚠️ This student has no recorded item issuances in the system. Replacement requests can only be submitted for items previously issued to the student.
                    </p>
                  )}
                  {requestForm.student && !loadingIssuedItems && studentIssuedItems.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      Showing only items previously issued to this student ({studentIssuedItems.length} available).
                    </p>
                  )}
                </div>

                {/* Replacement Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Replacement Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                  >
                    <option value="WRONG_SIZE">Wrong Size</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="LOST">Lost</option>
                    <option value="DEFECTIVE">Defective</option>
                    <option value="WORN_OUT">Worn Out</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    {maxAllowedQuantity !== undefined && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Max Issued: <span className="font-bold text-slate-700 dark:text-slate-200">{maxAllowedQuantity}</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={maxAllowedQuantity}
                    required
                    value={requestForm.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRequestForm({
                        ...requestForm,
                        quantity: val === "" ? ("" as any) : Number(val),
                      });
                    }}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none transition-all ${
                      isQtyExceeded
                        ? "border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        : "border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df]"
                    }`}
                    placeholder="Quantity"
                  />
                  {isQtyExceeded && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <span>⚠️</span> Cannot exceed previously issued quantity of {maxAllowedQuantity}.
                    </p>
                  )}
                  {requestForm.quantity !== "" && Number(requestForm.quantity) <= 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <span>⚠️</span> Quantity must be greater than zero.
                    </p>
                  )}
                </div>

                {/* Current Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Current Size
                  </label>
                  <select
                    value={requestForm.current_size}
                    onChange={(e) => setRequestForm({ ...requestForm, current_size: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                  >
                    <option value="">Current size (optional)</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Requested Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Requested Size
                  </label>
                  <select
                    value={requestForm.requested_size}
                    onChange={(e) => setRequestForm({ ...requestForm, requested_size: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                  >
                    <option value="">Requested size (optional)</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Current Color */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Current Color
                  </label>
                  <select
                    value={requestForm.current_color}
                    onChange={(e) => setRequestForm({ ...requestForm, current_color: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                  >
                    <option value="">Current color (optional)</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Requested Color */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Requested Color
                  </label>
                  <select
                    value={requestForm.requested_color}
                    onChange={(e) => setRequestForm({ ...requestForm, requested_color: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                  >
                    <option value="">Requested color (optional)</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Request Details / Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Request Details / Description
                  </label>
                  <textarea
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5826df]/20 focus:border-[#5826df] transition-all"
                    rows={3}
                    placeholder="Provide additional context or details about this replacement request..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingRequest ||
                    !requestForm.student ||
                    !requestForm.item ||
                    loadingIssuedItems ||
                    isQtyInvalid
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submittingRequest && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submittingRequest ? "Submitting..." : "Submit Request"}
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

      {/* Record Return Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Record Student Return</h2>
              <button onClick={() => setIsReturnModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReturn} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={returnForm.student}
                  onChange={(e) => setReturnForm({ ...returnForm, student: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.surname} (Roll #{s.roll_no || "—"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Returned <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={returnForm.item}
                  onChange={(e) => setReturnForm({ ...returnForm, item: e.target.value, size: "", color: "" })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="">Select Item</option>
                  {items.filter((it) => it.is_returnable).map((it) => (
                    <option key={it.id} value={it.id}>{it.item_name}</option>
                  ))}
                </select>
              </div>

              {selectedReturnItem?.has_size && (
                <select required value={returnForm.size} onChange={(e) => setReturnForm({ ...returnForm, size: e.target.value })} className="w-full rounded-lg border p-2">
                  <option value="">Select returned size</option>{sizes.filter((size) => size.is_active).map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}
                </select>
              )}
              {selectedReturnItem?.has_color && (
                <select required value={returnForm.color} onChange={(e) => setReturnForm({ ...returnForm, color: e.target.value })} className="w-full rounded-lg border p-2">
                  <option value="">Select returned color</option>{colors.filter((color) => color.is_active).map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Returned Condition <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={returnForm.condition}
                    onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  >
                    <option value="GOOD">Good (Restock In Inventory)</option>
                    <option value="DAMAGED">Damaged (Do Not Restock)</option>
                    <option value="UNUSABLE">Unusable / Discard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={returnForm.quantity}
                    onChange={(e) => setReturnForm({ ...returnForm, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Remarks
                </label>
                <input
                  type="text"
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button type="submit" disabled={submittingReturn} className="px-5 py-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all">
                  {submittingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Accept Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
