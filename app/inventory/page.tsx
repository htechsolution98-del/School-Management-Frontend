"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Boxes,
  AlertTriangle,
  TrendingUp,
  Truck,
  UserCheck,
  RefreshCw,
  ArrowUpRight,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert
} from "lucide-react";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";

export default function InventoryDashboardPage() {
  const [stats, setStats] = useState({
    total_items: 0,
    total_stock_units: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    today_purchases_amount: 0,
    today_issues_count: 0,
    today_revenue: 0,
    month_purchases_amount: 0,
    month_revenue: 0,
    pending_replacements_count: 0,
  });

  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, lowStockRes, issuesRes] = await Promise.all([
        inventoryApi.get("/reports/dashboard-summary/").catch(() => ({ data: {} })),
        inventoryApi.get("/items/low-stock/").catch(() => ({ data: [] })),
        inventoryApi.get("/issues/").catch(() => ({ data: [] })),
      ]);

      if (summaryRes.data) {
        setStats(prev => ({ ...prev, ...summaryRes.data }));
      }
      if (Array.isArray(lowStockRes.data)) {
        setLowStockItems(lowStockRes.data.slice(0, 5));
      }
      if (Array.isArray(issuesRes.data)) {
        setRecentIssues(issuesRes.data.slice(0, 5));
      }
    } catch (err) {
      console.error("Failed to load inventory dashboard data:", err);
      showApiError(err, "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#5c28e8] via-[#4d20cb] to-[#361399] p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
            Student Inventory Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Inventory & Student Item Management
          </h1>
          <p className="text-purple-100 text-sm mt-1">
            Real-time stock tracking, student item entitlements, purchases, and issue operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/inventory/issue"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
          >
            <UserCheck className="w-4 h-4" /> Issue Item
          </Link>
          <Link
            href="/inventory/purchases"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm"
          >
            <Truck className="w-4 h-4" /> New Purchase
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Package className="w-6 h-6" />
            </div>
            <Link href="/inventory/items" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Catalog <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "..." : stats.total_items}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Registered Master Items
            </div>
          </div>
        </div>

        {/* Stock Units */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Boxes className="w-6 h-6" />
            </div>
            <Link href="/inventory/stock" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
              Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "..." : stats.total_stock_units}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Total Physical Stock Units
            </div>
          </div>
        </div>

        {/* Low / Out of Stock Alert */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              {stats.out_of_stock_count} Out
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? "..." : stats.low_stock_count}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Low Stock Items Requiring Reorder
            </div>
          </div>
        </div>

        {/* Today's Issues & Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <Link href="/inventory/reports" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              P&L <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "..." : `₹${Number(stats.today_revenue).toLocaleString()}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Today's Revenue ({stats.today_issues_count} units issued)
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Monthly Purchases</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
              ₹{Number(stats.month_purchases_amount).toLocaleString()}
            </div>
          </div>
          <Truck className="w-8 h-8 text-slate-400 opacity-60" />
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Monthly Item Revenue</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
              ₹{Number(stats.month_revenue).toLocaleString()}
            </div>
          </div>
          <TrendingUp className="w-8 h-8 text-slate-400 opacity-60" />
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Pending Replacement Requests</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {stats.pending_replacements_count} requests
            </div>
          </div>
          <RefreshCw className="w-8 h-8 text-orange-400 opacity-60" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Low Stock Alerts
              </h2>
            </div>
            <Link
              href="/inventory/stock"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              All inventory stock levels are healthy.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    <th className="pb-3">Item</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Current</th>
                    <th className="pb-3">Min Level</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        {item.item_name}
                        <span className="block text-xs text-slate-400 font-normal">{item.item_code}</span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">{item.category_name || "N/A"}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          item.current_stock === 0
                            ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                        }`}>
                          {item.current_stock} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">{item.minimum_stock_level} {item.unit}</td>
                      <td className="py-3 text-right">
                        <Link
                          href="/inventory/purchases"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-3.5 h-3.5" /> Reorder
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Student Issues */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Student Issues
              </h2>
            </div>
            <Link
              href="/inventory/issue"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              <Package className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
              No items issued recently.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Item</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3 text-right">Charged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        {issue.student_name}
                        <span className="block text-xs text-slate-400 font-normal">
                          {issue.student_class} {issue.student_division ? `(${issue.student_division})` : ""}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {issue.item_name}
                        {issue.size_name ? ` - Size ${issue.size_name}` : ""}
                      </td>
                      <td className="py-3 font-medium">{issue.quantity}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          issue.charging_type === "INCLUDED_IN_FEE"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            : issue.charging_type === "FREE"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                        }`}>
                          {issue.charging_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-900 dark:text-white">
                        ₹{Number(issue.charged_amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Modules Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Quick Workflows & Management
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <Link
            href="/inventory/items"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all text-center group bg-slate-50/50 dark:bg-slate-800/30"
          >
            <Package className="w-6 h-6 mx-auto text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform mb-2" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Item Master</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Catalog & Variants</div>
          </Link>

          <Link
            href="/inventory/pricing"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:shadow-md transition-all text-center group bg-slate-50/50 dark:bg-slate-800/30"
          >
            <TrendingUp className="w-6 h-6 mx-auto text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform mb-2" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Fee Mapping</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Yearly Pricing</div>
          </Link>

          <Link
            href="/inventory/purchases"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition-all text-center group bg-slate-50/50 dark:bg-slate-800/30"
          >
            <Truck className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform mb-2" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Purchases</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Vendors & Restock</div>
          </Link>

          <Link
            href="/inventory/stock"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:shadow-md transition-all text-center group bg-slate-50/50 dark:bg-slate-800/30"
          >
            <Boxes className="w-6 h-6 mx-auto text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform mb-2" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Stock Ledger</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Adjustments & In/Out</div>
          </Link>

          <Link
            href="/inventory/issue"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-md transition-all text-center group bg-slate-50/50 dark:bg-slate-800/30"
          >
            <UserCheck className="w-6 h-6 mx-auto text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Student Issues</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Bulk & Single</div>
          </Link>

          <Link
            href="/inventory/reports"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-md transition-all text-center group bg-slate-50/50 dark:bg-slate-800/30"
          >
            <TrendingUp className="w-6 h-6 mx-auto text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform mb-2" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Reports</div>
            <div className="text-[10px] text-slate-500 mt-0.5">P&L & Audits</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
