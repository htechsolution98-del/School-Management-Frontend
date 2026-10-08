"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  RotateCcw,
  Loader2,
  X
} from "lucide-react";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";

export default function ReplacementsAndReturnsPage() {
  const [activeTab, setActiveTab] = useState<"replacements" | "returns">("replacements");
  const [replacements, setReplacements] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "ISSUE">("APPROVE");
  const [chargingType, setChargingType] = useState("FREE");
  const [chargedAmount, setChargedAmount] = useState("0.00");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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
      const [repRes, retRes, itemsRes, sizesRes, colorsRes, studsRes] = await Promise.all([
        inventoryApi.get("/replacements/"),
        inventoryApi.get("/returns/"),
        inventoryApi.get("/items/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
        inventoryApi.get("/get-student/").catch(() => inventoryApi.get(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/get-student/`).catch(() => ({ data: [] }))),
      ]);

      setReplacements(Array.isArray(repRes.data) ? repRes.data : repRes.data.results || []);
      setReturns(Array.isArray(retRes.data) ? retRes.data : retRes.data.results || []);
      const its = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || [];
      setItems(its);
      if (its.length > 0 && !returnForm.item) {
        setReturnForm(prev => ({ ...prev, item: its[0].id }));
      }
      setSizes(Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || []);
      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || []);
      const st = Array.isArray(studsRes.data) ? studsRes.data : studsRes.data.results || [];
      setStudents(st);
      if (st.length > 0 && !returnForm.student) {
        setReturnForm(prev => ({ ...prev, student: st[0].id }));
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
        <button
          onClick={() => setIsReturnModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Record Student Return
        </button>
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

            <form onSubmit={handleProcessReview} className="p-6 space-y-4">
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

            <form onSubmit={handleSaveReturn} className="p-6 space-y-4">
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
                  onChange={(e) => setReturnForm({ ...returnForm, item: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.item_name}</option>
                  ))}
                </select>
              </div>

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
