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
import { toast } from "sonner";

export default function StockAndLedgerPage() {
  const [activeTab, setActiveTab] = useState<"balances" | "ledger" | "audit">("balances");
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
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
      const [itemsRes, txnRes, sizesRes, colorsRes, yearsRes, auditRes] = await Promise.all([
        inventoryApi.get("/items/"),
        inventoryApi.get("/stock-transactions/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
        coreApi.get("/academic-year/").catch(() => ({ data: [] })),
        inventoryApi.get("/audit-logs/"),
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || []);
      setTransactions(Array.isArray(txnRes.data) ? txnRes.data : txnRes.data.results || []);
      setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : auditRes.data.results || []);
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
        item: openingForm.item ? Number(openingForm.item) : null,
        academic_year: openingForm.academic_year ? Number(openingForm.academic_year) : null,
        size: openingForm.size ? Number(openingForm.size) : null,
        color: openingForm.color ? Number(openingForm.color) : null,
        quantity: (openingForm.quantity as any) !== "" && openingForm.quantity !== null && !isNaN(Number(openingForm.quantity)) ? Number(openingForm.quantity) : null,
        unit_cost: openingForm.unit_cost !== "" && openingForm.unit_cost !== null && !isNaN(Number(openingForm.unit_cost)) ? openingForm.unit_cost : null,
        remarks: openingForm.remarks || "",
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
        item: adjustForm.item ? Number(adjustForm.item) : null,
        size: adjustForm.size ? Number(adjustForm.size) : null,
        color: adjustForm.color ? Number(adjustForm.color) : null,
        adjustment_type: adjustForm.adjustment_type,
        quantity: (adjustForm.quantity as any) !== "" && adjustForm.quantity !== null && !isNaN(Number(adjustForm.quantity)) ? Number(adjustForm.quantity) : null,
        reason: (adjustForm.reason || "").trim(),
        remarks: adjustForm.remarks || "",
        adjustment_date: new Date().toISOString().split("T")[0],
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
  const formatAuditDetails = (detailsData: any): string => {
    if (!detailsData) return "N/A";

    let parsed: any = detailsData;
    if (typeof detailsData === "string") {
      try {
        parsed = JSON.parse(detailsData);
      } catch {
        return detailsData.trim() || "N/A";
      }
    }

    if (!parsed || typeof parsed !== "object") {
      return String(parsed ?? "N/A");
    }

    const parts: string[] = [];

    if (parsed.quantity !== undefined && parsed.quantity !== null && parsed.quantity !== "") {
      parts.push(`Qty: ${parsed.quantity}`);
    }

    if (parsed.transaction_type) {
      parts.push(`Type: ${parsed.transaction_type}`);
    } else if (parsed.action) {
      parts.push(`Type: ${parsed.action}`);
    }

    if (parsed.item_name) {
      parts.push(`Item: ${parsed.item_name}`);
    } else if (parsed.item_id !== undefined && parsed.item_id !== null) {
      const matched = items.find((it) => it.id === Number(parsed.item_id));
      parts.push(matched ? `Item: ${matched.item_name}` : `Item: #${parsed.item_id}`);
    }

    if (parsed.reference_id !== undefined && parsed.reference_id !== null && parsed.reference_id !== "") {
      parts.push(`Ref: ${parsed.reference_id}`);
    }

    if (parsed.reason) {
      parts.push(`Reason: ${parsed.reason}`);
    }

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    const fallbackEntries = Object.entries(parsed)
      .filter(([_, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`);

    return fallbackEntries.length > 0 ? fallbackEntries.join(" | ") : "N/A";
  };

  const filteredAuditLogs = auditLogs.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const detailsText = formatAuditDetails(entry.details || entry.new_values || entry.old_values);
    return `${entry.user_name || ""} ${entry.action || ""} ${entry.entity_type || ""} ${entry.entity_id || ""} ${detailsText} ${JSON.stringify(entry.new_values || {})}`.toLowerCase().includes(q);
  });

  const selectedOpeningItem = items.find((item) => item.id === Number(openingForm.item));
  const selectedAdjustmentItem = items.find((item) => item.id === Number(adjustForm.item));

  const availableOpeningSizes: any[] = (() => {
    if (!selectedOpeningItem || !selectedOpeningItem.has_size) return [];
    const allowed = selectedOpeningItem.allowed_sizes;
    if (Array.isArray(allowed) && allowed.length > 0) {
      const allowedIds = allowed.map((x: any) => typeof x === "object" ? x.id : Number(x));
      return sizes.filter((s: any) => s.is_active && allowedIds.includes(s.id));
    }
    if (Array.isArray(selectedOpeningItem.allowed_size_details) && selectedOpeningItem.allowed_size_details.length > 0) {
      return selectedOpeningItem.allowed_size_details;
    }
    return sizes.filter((s: any) => s.is_active);
  })();

  const availableOpeningColors: any[] = (() => {
    if (!selectedOpeningItem || !selectedOpeningItem.has_color) return [];
    const allowed = selectedOpeningItem.allowed_colors;
    if (Array.isArray(allowed) && allowed.length > 0) {
      const allowedIds = allowed.map((x: any) => typeof x === "object" ? x.id : Number(x));
      return colors.filter((c: any) => c.is_active && allowedIds.includes(c.id));
    }
    if (Array.isArray(selectedOpeningItem.allowed_color_details) && selectedOpeningItem.allowed_color_details.length > 0) {
      return selectedOpeningItem.allowed_color_details;
    }
    return colors.filter((c: any) => c.is_active);
  })();

  const availableAdjustmentSizes: any[] = (() => {
    if (!selectedAdjustmentItem || !selectedAdjustmentItem.has_size) return [];
    const allowed = selectedAdjustmentItem.allowed_sizes;
    if (Array.isArray(allowed) && allowed.length > 0) {
      const allowedIds = allowed.map((x: any) => typeof x === "object" ? x.id : Number(x));
      return sizes.filter((s: any) => s.is_active && allowedIds.includes(s.id));
    }
    if (Array.isArray(selectedAdjustmentItem.allowed_size_details) && selectedAdjustmentItem.allowed_size_details.length > 0) {
      return selectedAdjustmentItem.allowed_size_details;
    }
    return sizes.filter((s: any) => s.is_active);
  })();

  const availableAdjustmentColors: any[] = (() => {
    if (!selectedAdjustmentItem || !selectedAdjustmentItem.has_color) return [];
    const allowed = selectedAdjustmentItem.allowed_colors;
    if (Array.isArray(allowed) && allowed.length > 0) {
      const allowedIds = allowed.map((x: any) => typeof x === "object" ? x.id : Number(x));
      return colors.filter((c: any) => c.is_active && allowedIds.includes(c.id));
    }
    if (Array.isArray(selectedAdjustmentItem.allowed_color_details) && selectedAdjustmentItem.allowed_color_details.length > 0) {
      return selectedAdjustmentItem.allowed_color_details;
    }
    return colors.filter((c: any) => c.is_active);
  })();

  return (
    <div className="space-y-6 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full min-w-0 pb-24 sm:pb-8">
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
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              if (items.length > 0) setAdjustForm(prev => ({ ...prev, item: items[0].id }));
              setIsAdjustModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4 text-slate-500" /> Stock Adjustment
          </button>
          <button
            onClick={() => {
              if (items.length > 0) setOpeningForm(prev => ({ ...prev, item: items[0].id }));
              setIsOpeningModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Opening Stock
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 flex-nowrap overflow-x-auto whitespace-nowrap hide-scrollbar pb-0.5 sm:pb-0">
        <button
          onClick={() => setActiveTab("balances")}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "balances"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Boxes className="w-4 h-4 shrink-0" /> Live Stock Balances ({items.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "ledger"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <History className="w-4 h-4 shrink-0" /> Movement Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "audit" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <History className="w-4 h-4 shrink-0" /> Audit Trail ({auditLogs.length})
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
            <option value="PURCHASE">Purchases (+)</option>
            <option value="ISSUE">Student Issues (-)</option>
            <option value="RETURN">Returns (+)</option>
            <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
            <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
            <option value="DAMAGE">Damage (-)</option>
            <option value="LOST">Lost (-)</option>
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
          <div className="w-full overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[700px] text-left text-sm whitespace-nowrap">
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
        ) : activeTab === "ledger" ? (
          /* Ledger Table */
          <div className="w-full overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[750px] text-left text-sm whitespace-nowrap">
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
        ) : (
          <div className="w-full overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[650px] text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr><th className="py-3.5 px-4">Date</th><th className="py-3.5 px-4">User</th><th className="py-3.5 px-4">Action</th><th className="py-3.5 px-4">Entity</th><th className="py-3.5 px-4">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAuditLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {entry.user_name || "System"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {entry.entity_type} #{entry.entity_id}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {formatAuditDetails(entry.details || entry.new_values || entry.old_values)}
                    </td>
                  </tr>
                ))}
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

            <form onSubmit={handleSaveOpening} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={openingForm.item}
                  onChange={(e) => setOpeningForm({ ...openingForm, item: e.target.value, size: "", color: "" })}
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
                    Size Variant {selectedOpeningItem?.has_size ? "*" : "(Optional)"}
                  </label>
                  <select
                    disabled={!selectedOpeningItem || !selectedOpeningItem.has_size}
                    required={!!selectedOpeningItem?.has_size}
                    value={openingForm.size}
                    onChange={(e) => setOpeningForm({ ...openingForm, size: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  >
                    <option value="">
                      {!selectedOpeningItem ? "Select item first" : !selectedOpeningItem.has_size ? "None / Standard" : "Select size"}
                    </option>
                    {availableOpeningSizes.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} {s.size_type && s.size_type !== "General" ? `(${s.size_type})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Color {selectedOpeningItem?.has_color ? "*" : "(Optional)"}
                  </label>
                  <select
                    disabled={!selectedOpeningItem || !selectedOpeningItem.has_color}
                    required={!!selectedOpeningItem?.has_color}
                    value={openingForm.color}
                    onChange={(e) => setOpeningForm({ ...openingForm, color: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  >
                    <option value="">
                      {!selectedOpeningItem ? "Select item first" : !selectedOpeningItem.has_color ? "None / Standard" : "Select color"}
                    </option>
                    {availableOpeningColors.map((c: any) => (
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
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all">
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

            <form onSubmit={handleSaveAdjustment} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={adjustForm.item}
                  onChange={(e) => setAdjustForm({ ...adjustForm, item: e.target.value, size: "", color: "" })}
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Size Variant {selectedAdjustmentItem?.has_size ? "*" : "(Optional)"}</label>
                  <select
                    disabled={!selectedAdjustmentItem || !selectedAdjustmentItem.has_size}
                    required={!!selectedAdjustmentItem?.has_size}
                    value={adjustForm.size}
                    onChange={(e) => setAdjustForm({ ...adjustForm, size: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  >
                    <option value="">
                      {!selectedAdjustmentItem ? "Select item first" : !selectedAdjustmentItem.has_size ? "None / Standard" : "Select size"}
                    </option>
                    {availableAdjustmentSizes.map((size: any) => (
                      <option key={size.id} value={size.id}>
                        {size.name} {size.size_type && size.size_type !== "General" ? `(${size.size_type})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Color Variant {selectedAdjustmentItem?.has_color ? "*" : "(Optional)"}</label>
                  <select
                    disabled={!selectedAdjustmentItem || !selectedAdjustmentItem.has_color}
                    required={!!selectedAdjustmentItem?.has_color}
                    value={adjustForm.color}
                    onChange={(e) => setAdjustForm({ ...adjustForm, color: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  >
                    <option value="">
                      {!selectedAdjustmentItem ? "Select item first" : !selectedAdjustmentItem.has_color ? "None / Standard" : "Select color"}
                    </option>
                    {availableAdjustmentColors.map((color: any) => (
                      <option key={color.id} value={color.id}>{color.name}</option>
                    ))}
                  </select>
                </div>
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
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all">
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
