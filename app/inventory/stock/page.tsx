"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  History,
  Loader2,
  X
} from "lucide-react";
import { inventoryApi, coreApi, showApiError, showSuccess } from "@/lib/inventory-client";

export default function StockAndLedgerPage() {
  const [activeTab, setActiveTab] = useState<"balances" | "ledger">("balances");
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modals
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Opening Stock Form
  const [openingForm, setOpeningForm] = useState({
    item: "",
    academic_year: "",
    size: "",
    color: "",
    quantity: 50,
    unit_cost: "500.00",
    remarks: "Opening Stock Intake",
  });

  // Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
    item: "",
    size: "",
    color: "",
    adjustment_type: "ADJUSTMENT_IN",
    quantity: 5,
    reason: "Inventory Count Reconciliation",
    remarks: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, txnRes, sizesRes, colorsRes, yearsRes] = await Promise.all([
        inventoryApi.get("/items/"),
        inventoryApi.get("/stock-transactions/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
        coreApi.get("/academic-year/").catch(() => ({ data: [] })),
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || []);
      setTransactions(Array.isArray(txnRes.data) ? txnRes.data : txnRes.data.results || []);
      setSizes(Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || []);
      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || []);
      const years = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.results || [];
      setAcademicYears(years);

      if (years.length > 0 && !openingForm.academic_year) {
        setOpeningForm(prev => ({ ...prev, academic_year: years[0].id }));
      }
    } catch (err) {
      console.error("Failed to load stock data:", err);
      showApiError(err, "Failed to load stock balances & ledger.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        item: Number(openingForm.item),
        academic_year: Number(openingForm.academic_year),
        size: openingForm.size ? Number(openingForm.size) : null,
        color: openingForm.color ? Number(openingForm.color) : null,
        quantity: Number(openingForm.quantity),
        unit_cost: openingForm.unit_cost,
        remarks: openingForm.remarks,
      };

      await inventoryApi.post("/stock-transactions/opening-stock/", payload);
      showSuccess("Opening stock recorded successfully");
      setIsOpeningModalOpen(false);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Failed to record opening stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        item: Number(adjustForm.item),
        size: adjustForm.size ? Number(adjustForm.size) : null,
        color: adjustForm.color ? Number(adjustForm.color) : null,
        adjustment_type: adjustForm.adjustment_type,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
        remarks: adjustForm.remarks,
      };

      await inventoryApi.post("/adjustments/", payload);
      showSuccess("Stock adjustment recorded successfully");
      setIsAdjustModalOpen(false);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Failed to adjust stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((it) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.item_name?.toLowerCase().includes(q) ||
      it.item_code?.toLowerCase().includes(q) ||
      it.category_name?.toLowerCase().includes(q)
    );
  });

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.item_name?.toLowerCase().includes(q) ||
      t.item_code?.toLowerCase().includes(q) ||
      t.remarks?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Stock Ledger & Live Inventory
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor real-time item balances, enter opening balances, adjust stock variances, and inspect the movement ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (items.length > 0) setAdjustForm(prev => ({ ...prev, item: items[0].id }));
              setIsAdjustModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4 text-slate-500" /> Stock Adjustment
          </button>
          <button
            onClick={() => {
              if (items.length > 0) setOpeningForm(prev => ({ ...prev, item: items[0].id }));
              setIsOpeningModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Opening Stock
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("balances")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "balances"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Boxes className="w-4 h-4" /> Live Stock Balances ({items.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "ledger"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <History className="w-4 h-4" /> Movement Ledger ({transactions.length})
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search items or transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {activeTab === "ledger" && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Movement Types</option>
            <option value="OPENING">Opening Stock</option>
            <option value="PURCHASE_IN">Purchases (+)</option>
            <option value="STUDENT_ISSUE">Student Issues (-)</option>
            <option value="STUDENT_RETURN_GOOD">Returns (+)</option>
            <option value="REPLACEMENT_ISSUE">Replacements (-)</option>
            <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
            <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
          </select>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading stock records...
          </div>
        ) : activeTab === "balances" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Item Name & Code</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Current Stock</th>
                  <th className="py-3.5 px-4">Min Alert Level</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{it.item_name}</div>
                      <div className="text-xs font-mono text-slate-400">{it.item_code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {it.category_name || "Unassigned"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {it.current_stock}
                      </span>{" "}
                      <span className="text-xs text-slate-500">{it.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                      {it.minimum_stock_level} {it.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        it.stock_status === "OUT_OF_STOCK"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : it.stock_status === "LOW_STOCK"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}>
                        {it.stock_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setAdjustForm(prev => ({ ...prev, item: it.id }));
                          setIsAdjustModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Ledger Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Item & Variant</th>
                  <th className="py-3.5 px-4">Movement Type</th>
                  <th className="py-3.5 px-4">In / Out Qty</th>
                  <th className="py-3.5 px-4">Unit Purchase Cost</th>
                  <th className="py-3.5 px-4">Remarks / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTransactions.map((t) => {
                  const isInflow = t.quantity > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                        {t.transaction_date}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                        {t.item_name}
                        {t.size_name ? ` (Size: ${t.size_name})` : ""}
                        {t.color_name ? ` (${t.color_name})` : ""}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                          isInflow
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                        }`}>
                          {isInflow ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-purple-500" />}
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-bold ${isInflow ? "text-emerald-600 dark:text-emerald-400" : "text-purple-600 dark:text-purple-400"}`}>
                          {isInflow ? `+${t.quantity}` : t.quantity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        ₹{Number(t.unit_purchase_cost).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {t.remarks || t.reference_type || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Opening Stock Modal */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enter Opening Stock</h2>
              <button onClick={() => setIsOpeningModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={openingForm.item}
                  onChange={(e) => setOpeningForm({ ...openingForm, item: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.item_name} ({it.item_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Size Variant (Optional)
                  </label>
                  <select
                    value={openingForm.size}
                    onChange={(e) => setOpeningForm({ ...openingForm, size: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="">None / Standard</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Color (Optional)
                  </label>
                  <select
                    value={openingForm.color}
                    onChange={(e) => setOpeningForm({ ...openingForm, color: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="">None / Standard</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={openingForm.quantity}
                    onChange={(e) => setOpeningForm({ ...openingForm, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Cost (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={openingForm.unit_cost}
                    onChange={(e) => setOpeningForm({ ...openingForm, unit_cost: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={openingForm.remarks}
                  onChange={(e) => setOpeningForm({ ...openingForm, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsOpeningModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Opening Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                Stock Adjustment & Reconciliation
              </h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={adjustForm.item}
                  onChange={(e) => setAdjustForm({ ...adjustForm, item: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.item_name} (Current: {it.current_stock})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={adjustForm.adjustment_type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  >
                    <option value="ADJUSTMENT_IN">Adjustment In (+) Inflow</option>
                    <option value="ADJUSTMENT_OUT">Adjustment Out (-) Outflow</option>
                    <option value="DAMAGE">Damaged Stock (-)</option>
                    <option value="LOST">Lost / Missing (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Justification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Audit Discrepancy, Damaged in transit"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
