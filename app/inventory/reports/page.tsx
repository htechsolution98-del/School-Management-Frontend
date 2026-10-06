"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Printer,
  Filter,
  RefreshCw,
  Search,
  DollarSign,
  Package,
  Gift,
  RotateCcw,
  ShoppingBag,
  FileSpreadsheet
} from "lucide-react";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";

export default function InventoryReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "purchases" | "free" | "replacements">("overview");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "this_week" | "this_month" | "custom">("this_month");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [plSummary, setPlSummary] = useState<any>(null);
  const [salesRows, setSalesRows] = useState<any[]>([]);
  const [purchasesRows, setPurchasesRows] = useState<any[]>([]);
  const [replacementsRows, setReplacementsRows] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Helper for computing date ranges
  const getDateRangeParams = () => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (dateFilter === "today") {
      const d = formatDate(today);
      return { from_date: d, to_date: d };
    }
    if (dateFilter === "yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const d = formatDate(y);
      return { from_date: d, to_date: d };
    }
    if (dateFilter === "this_week") {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return { from_date: formatDate(monday), to_date: formatDate(today) };
    }
    if (dateFilter === "this_month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from_date: formatDate(startOfMonth), to_date: formatDate(today) };
    }
    if (dateFilter === "custom") {
      return { from_date: fromDate || undefined, to_date: toDate || undefined };
    }
    return {};
  };

  const fetchReports = async () => {
    setLoading(true);
    const params = getDateRangeParams();

    try {
      // 1. Profit & Loss Summary
      const plRes = await inventoryApi.get("/reports/profit-loss/", { params });
      setPlSummary(plRes.data);

      // 2. Sales / Issues Summary
      const salesRes = await inventoryApi.get("/reports/sales-summary/", { params });
      setSalesRows(Array.isArray(salesRes.data) ? salesRes.data : salesRes.data.results || []);

      // 3. Purchases
      const purRes = await inventoryApi.get("/purchases/", { params });
      setPurchasesRows(Array.isArray(purRes.data) ? purRes.data : purRes.data.results || []);

      // 4. Replacements Summary
      const replRes = await inventoryApi.get("/reports/replacements-summary/", { params });
      setReplacementsRows(Array.isArray(replRes.data) ? replRes.data : replRes.data.results || []);
    } catch (err) {
      console.error("Error fetching inventory reports:", err);
      showApiError(err, "Failed to load inventory reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateFilter, fromDate, toDate]);

  // Filtered rows for active tab
  const filteredSales = salesRows.filter((r) =>
    (r.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.item_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.item_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.class_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPurchases = purchasesRows.filter((p) =>
    (p.purchase_order_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.supplier_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.invoice_number || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const freeItems = salesRows.filter((r) => r.charging_type === "FREE" && (
    (r.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.item_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const filteredReplacements = replacementsRows.filter((r) =>
    (r.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.item_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csvContent = "data:text/csv;charset=utf-8," + [
      keys.join(","),
      ...data.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Inventory & Financial Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track student item sales, purchase expenses, gross margin, free item disbursements, and replacement audits.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "custom", label: "Custom Range" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateFilter === d.id
                    ? "bg-white text-indigo-700 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <button
            onClick={fetchReports}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹{Number(plSummary?.total_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> {plSummary?.issues_count || 0} items issued
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Cost</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹{Number(plSummary?.total_purchases || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Confirmed Purchase Orders</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost of Issued Items</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹{Number(plSummary?.total_issued_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Base stock procurement value</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Free Items Subsidy</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-700">
              ₹{Number(plSummary?.free_items_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-purple-500 mt-1">Absorbed by Institution</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Profit / Gain</span>
            <div className={`p-2 rounded-xl ${Number(plSummary?.gross_profit || 0) >= 0 ? "bg-teal-50 text-teal-600" : "bg-rose-50 text-rose-600"}`}>
              {Number(plSummary?.gross_profit || 0) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${Number(plSummary?.gross_profit || 0) >= 0 ? "text-teal-700" : "text-rose-600"}`}>
              ₹{Number(plSummary?.gross_profit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Revenue minus Issued Cost</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs and Search / Export */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 px-6 pt-3 pb-3 gap-4">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "overview", label: "P&L Summary", icon: DollarSign },
              { id: "sales", label: `Sales & Issues (${salesRows.length})`, icon: TrendingUp },
              { id: "purchases", label: `Purchases (${purchasesRows.length})`, icon: ShoppingBag },
              { id: "free", label: `Free Items (${freeItems.length})`, icon: Gift },
              { id: "replacements", label: `Replacements (${replacementsRows.length})`, icon: RotateCcw },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search report..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            <button
              onClick={() => {
                if (activeTab === "sales") exportCSV(filteredSales, "sales_issues_report");
                else if (activeTab === "purchases") exportCSV(filteredPurchases, "purchases_report");
                else if (activeTab === "free") exportCSV(freeItems, "free_items_report");
                else if (activeTab === "replacements") exportCSV(filteredReplacements, "replacements_report");
                else window.print();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: P&L Overview */}
        {activeTab === "overview" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial Breakdown Table */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  Financial Statement Breakdown
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Student Issue Revenue (Charged)</span>
                    <span className="font-semibold text-emerald-700">
                      +₹{Number(plSummary?.total_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Cost of Goods Issued (Procurement Basis)</span>
                    <span className="font-semibold text-amber-700">
                      -₹{Number(plSummary?.total_issued_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 bg-emerald-50/50 px-2 rounded-lg">
                    <span className="font-bold text-slate-800">Gross Operating Margin</span>
                    <span className="font-bold text-emerald-700">
                      ₹{Number(plSummary?.gross_profit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Free Items Distributed (Institutional Subsidy)</span>
                    <span className="font-semibold text-purple-700">
                      ₹{Number(plSummary?.free_items_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Total Purchases Inflow (Supplier POs)</span>
                    <span className="font-semibold text-blue-700">
                      ₹{Number(plSummary?.total_purchases || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* High Level Key Takeaways */}
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-indigo-900 mb-3">Inventory Health & Insights</h3>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5" />
                      <span>
                        <strong>Fee-Included vs Direct Charges:</strong> Items configured with <em>INCLUDED_IN_FEE</em> are linked to tuition fees and do not require on-counter student cash payment.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5" />
                      <span>
                        <strong>Profit Realization:</strong> Gross margin is calculated on issued unit cost vs charged amount to provide accurate accounting insight.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5" />
                      <span>
                        <strong>Subsidy Transparency:</strong> Free replacement and scholarship kits are tracked separately under Free Items Subsidy.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-indigo-100 flex justify-between items-center text-xs">
                  <span className="text-indigo-800 font-semibold">Active Filter: {dateFilter.replace("_", " ").toUpperCase()}</span>
                  <span className="text-slate-500">Auto-updated from live stock ledger</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sales & Issues Register */}
        {activeTab === "sales" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Item & Code</th>
                  <th className="py-3 px-4">Variant</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Charged</th>
                  <th className="py-3 px-4 text-right">Profit</th>
                  <th className="py-3 px-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">Loading sales data...</td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">No sales or issue transactions found for this period.</td>
                  </tr>
                ) : (
                  filteredSales.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500">{r.issue_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {r.student_name}
                        <div className="text-[10px] text-slate-400 font-normal">{r.admission_number}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{r.class_name}</td>
                      <td className="py-3 px-4 font-medium text-indigo-900">
                        {r.item_name}
                        <div className="text-[10px] text-slate-400 font-mono">{r.item_code}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {r.size || r.color ? `${r.size || ""} ${r.color || ""}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{r.quantity}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.charging_type === "INCLUDED_IN_FEE"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : r.charging_type === "SEPARATE_CHARGE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {r.charging_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Number(r.total_cost).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">₹{Number(r.charged_amount).toFixed(2)}</td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${Number(r.gross_profit) >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                        ₹{Number(r.gross_profit).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">{r.profit_margin_pct}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Purchases Register */}
        {activeTab === "purchases" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Tax</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">Loading purchase orders...</td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">No purchase records found.</td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{p.purchase_order_number}</td>
                      <td className="py-3 px-4 text-slate-500">{p.purchase_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.supplier_name || "N/A"}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.invoice_number || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-50 text-slate-700 border border-slate-200"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">₹{Number(p.subtotal).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">₹{Number(p.tax_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">₹{Number(p.discount_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">₹{Number(p.grand_total).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Free Items */}
        {activeTab === "free" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Procurement Cost</th>
                  <th className="py-3 px-4 text-right">Total School Subsidy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {freeItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No free items issued in this period.</td>
                  </tr>
                ) : (
                  freeItems.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500">{r.issue_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{r.student_name}</td>
                      <td className="py-3 px-4 text-slate-600">{r.class_name}</td>
                      <td className="py-3 px-4 font-medium text-indigo-900">{r.item_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{r.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">₹{Number(r.unit_cost).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-purple-700 font-mono">₹{Number(r.total_cost).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Replacements Summary */}
        {activeTab === "replacements" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Admin Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredReplacements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No replacement logs found in this period.</td>
                  </tr>
                ) : (
                  filteredReplacements.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500">{r.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{r.student_name}</td>
                      <td className="py-3 px-4 font-medium text-indigo-900">{r.item_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{r.quantity}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {r.reason_display || r.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "ISSUED" || r.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 italic">{r.admin_remarks || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
