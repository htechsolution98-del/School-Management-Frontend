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
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShoppingCart,
  Coins,
  BarChart2,
  Tag,
  Coffee,
  BookOpen,
  Edit3,
  Loader2,
} from "lucide-react";
import { inventoryApi, showApiError } from "@/lib/inventory-client";

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
        setStats((prev) => ({ ...prev, ...summaryRes.data }));
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

  const getInitials = (name?: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getItemIcon = (name?: string, category?: string) => {
    const lower = `${name || ""} ${category || ""}`.toLowerCase();
    if (lower.includes("card") || lower.includes("id")) return Tag;
    if (lower.includes("bottle") || lower.includes("water")) return Coffee;
    if (lower.includes("book") || lower.includes("notebook") || lower.includes("stationery")) return BookOpen;
    if (lower.includes("chalk") || lower.includes("pen")) return Edit3;
    return Package;
  };

  const formatIssueDate = (dateStr?: string, createdAtStr?: string) => {
    const d = dateStr || createdAtStr;
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const formatIssueTime = (createdAtStr?: string) => {
    if (!createdAtStr) return "";
    try {
      const dt = new Date(createdAtStr);
      if (isNaN(dt.getTime())) return "";
      return dt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full min-w-0 pb-32 sm:pb-8">
      {/* 1. Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4E39F6] via-[#5D46F7] to-[#2563EB] p-4 sm:p-5 lg:px-8 lg:py-5 text-white shadow-xl shadow-indigo-950/15">
        {/* Ambient Background Waves & Glow */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute right-1/4 -top-12 w-80 h-80 bg-indigo-300/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-8 bottom-0 w-96 h-36 bg-purple-400/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 lg:gap-6">
          {/* Left Text Block */}
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center px-3 py-0.5 rounded-full bg-white/15 border border-white/20 text-white/90 text-[10px] sm:text-xs font-semibold tracking-wider uppercase mb-1.5 backdrop-blur-sm shadow-2xs">
              STUDENT INVENTORY HUB
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-tight leading-snug">
              Inventory & Student Item Management
            </h1>
            <p className="text-white/80 text-xs sm:text-sm font-normal mt-1 leading-normal max-w-xl">
              Real-time stock tracking, student item entitlements, purchases, and issue operations.
            </p>
          </div>

          {/* Right Section: Seamless 3D Illustration & Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 lg:gap-6 shrink-0">
            {/* Seamless 3D School Bag Illustration - grounded at bottom */}
            <div className="relative hidden md:flex items-end justify-center self-end shrink-0 -my-2 lg:-my-5">
              <img
                src="/images/inventory-backpack.png"
                alt="School supplies"
                className="relative z-10 h-24 lg:h-28 w-auto object-contain select-none pointer-events-none drop-shadow-[0_12px_20px_rgba(0,0,0,0.18)] bg-transparent block"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <Link
                href="/inventory/issue"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-white hover:bg-white/95 text-slate-900 font-semibold shadow-md px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-full text-xs sm:text-sm transition-all duration-200 active:scale-95 text-center cursor-pointer whitespace-nowrap"
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-slate-900" />
                <span>Issue Item</span>
              </Link>
              <Link
                href="/inventory/purchases"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-full backdrop-blur-sm text-xs sm:text-sm transition-all duration-200 active:scale-95 text-center cursor-pointer whitespace-nowrap"
              >
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-white" />
                <span>New Purchase</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Primary 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Registered Master Items */}
        <div className="group relative bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
          <div className="pointer-events-none absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-blue-500/10 blur-xl group-hover:bg-blue-500/15 transition-colors" />

          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <Link
              href="/inventory/items"
              className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] transition-colors flex items-center gap-1 group/link"
            >
              <span>Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? <Loader2 className="w-7 h-7 animate-spin text-slate-300" /> : stats.total_items}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Registered Master Items
            </div>
          </div>
        </div>

        {/* Card 2: Total Physical Stock Units */}
        <div className="group relative bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
          <div className="pointer-events-none absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/15 transition-colors" />

          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shadow-xs">
              <Boxes className="w-5 h-5 stroke-[2.2]" />
            </div>
            <Link
              href="/inventory/stock"
              className="text-xs font-bold text-[#059669] hover:text-[#047857] transition-colors flex items-center gap-1 group/link"
            >
              <span>Ledger</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? <Loader2 className="w-7 h-7 animate-spin text-slate-300" /> : stats.total_stock_units}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Total Physical Stock Units
            </div>
          </div>
        </div>

        {/* Card 3: Low Stock Items Requiring Reorder */}
        <div className="group relative bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
          <div className="pointer-events-none absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/15 transition-colors" />

          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
              {stats.out_of_stock_count} Out
            </span>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#D97706] tracking-tight">
              {loading ? <Loader2 className="w-7 h-7 animate-spin text-slate-300" /> : stats.low_stock_count}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Low Stock Items Requiring Reorder
            </div>
          </div>
        </div>

        {/* Card 4: Today's Revenue */}
        <div className="group relative bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
          <div className="pointer-events-none absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-purple-500/10 blur-xl group-hover:bg-purple-500/15 transition-colors" />

          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <Link
              href="/inventory/reports"
              className="text-xs font-bold text-[#9333EA] hover:text-[#7E22CE] transition-colors flex items-center gap-1 group/link"
            >
              <span>P&L</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? <Loader2 className="w-7 h-7 animate-spin text-slate-300" /> : `₹${Number(stats.today_revenue).toLocaleString()}`}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Today's Revenue ({stats.today_issues_count} units issued)
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Summary Cards Row (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
        {/* Monthly Purchases */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
              <ShoppingCart className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-medium">Monthly Purchases</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                  ₹{Number(stats.month_purchases_amount).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  ↑ 15%
                </span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-slate-300 pr-1">
            <BarChart2 className="w-7 h-7 stroke-[1.8]" />
          </div>
        </div>

        {/* Monthly Item Revenue */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center shrink-0 shadow-2xs">
              <Coins className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-medium">Monthly Item Revenue</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                  ₹{Number(stats.month_revenue).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  ↑ 5%
                </span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-slate-300 pr-1">
            <TrendingUp className="w-6 h-6 stroke-[1.8]" />
          </div>
        </div>

        {/* Pending Replacement Requests */}
        <div className="bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/40 to-[#FFFBEB] border border-[#FDE68A]/80 rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 shadow-2xs">
              <RotateCcw className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-amber-900/80 font-medium">Pending Replacement Requests</div>
              <div className="text-lg sm:text-2xl font-bold text-amber-950 tracking-tight mt-0.5">
                {stats.pending_replacements_count} requests
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between self-stretch shrink-0">
            <RefreshCw className="w-4 h-4 text-amber-500/80" />
            <Link
              href="/inventory/replacements"
              className="text-xs font-bold text-[#D97706] hover:text-[#B45309] flex items-center gap-1 group/link mt-2"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Main Data Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Card: Low Stock Alerts */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">
                  Low Stock Alerts
                </h2>
              </div>
              <Link
                href="/inventory/stock"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group/link shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading alerts...
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All inventory stock levels are healthy.
              </div>
            ) : (
              <>
                {/* Mobile Card View (< sm) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {lowStockItems.map((item, idx) => {
                    const IconComponent = getItemIcon(item.item_name, item.category_name);
                    const isZero = item.current_stock === 0;
                    return (
                      <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4 stroke-[1.8]" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {item.item_name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.category_name || "N/A"} • <span className="font-mono">{item.item_code}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isZero
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : item.current_stock <= 2
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200"
                            }`}
                          >
                            {item.current_stock} {item.unit || "Pcs"}
                          </span>
                          <Link
                            href="/inventory/purchases"
                            className="inline-flex items-center text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg"
                          >
                            Reorder
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= sm) */}
                <div className="hidden sm:block w-full overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 px-3 text-center w-8">#</th>
                        <th className="pb-3 px-3">Item</th>
                        <th className="pb-3 px-3">Category</th>
                        <th className="pb-3 px-3">Current Stock</th>
                        <th className="pb-3 px-3">Min Level</th>
                        <th className="pb-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {lowStockItems.map((item, idx) => {
                        const IconComponent = getItemIcon(item.item_name, item.category_name);
                        const isZero = item.current_stock === 0;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                  <IconComponent className="w-4 h-4 stroke-[1.8]" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {item.item_name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    {item.item_code}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-medium">
                              {item.category_name || "N/A"}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isZero
                                    ? "bg-red-50 text-red-600 border border-red-200"
                                    : item.current_stock <= 2
                                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                                    : "bg-amber-50 text-amber-600 border border-amber-200"
                                }`}
                              >
                                {item.current_stock} {item.unit || "Pcs"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-semibold">
                              {item.minimum_stock_level} {item.unit || "Pcs"}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Link
                                href="/inventory/purchases"
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                + Reorder
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Card: Recent Student Issues */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">
                  Recent Student Issues
                </h2>
              </div>
              <Link
                href="/inventory/issue"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group/link shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading issues...
              </div>
            ) : recentIssues.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <Package className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                No items issued recently.
              </div>
            ) : (
              <>
                {/* Mobile Card View (< sm) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {recentIssues.map((issue, idx) => {
                    const isFree = issue.charging_type === "FREE";
                    const isIncluded =
                      issue.charging_type === "INCLUDED_IN_FEE" ||
                      issue.charging_type === "INCLUDED";
                    const badgeLabel = isIncluded
                      ? "INCLUDED"
                      : isFree
                      ? "FREE"
                      : "SEPARATE CHARGE";

                    return (
                      <div key={issue.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(issue.student_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {issue.student_name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {issue.item_name} (x{issue.quantity}) • {issue.student_class}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900">
                            ₹{Number(issue.charged_amount ?? 0).toLocaleString()}
                          </div>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              isIncluded
                                ? "bg-blue-50 text-blue-700"
                                : isFree
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= sm) */}
                <div className="hidden sm:block w-full overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 px-3 text-center w-8">#</th>
                        <th className="pb-3 px-3">Student</th>
                        <th className="pb-3 px-3">Item</th>
                        <th className="pb-3 px-3 text-center">Qty</th>
                        <th className="pb-3 px-3">Type</th>
                        <th className="pb-3 px-3 text-right">Charge</th>
                        <th className="pb-3 px-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {recentIssues.map((issue, idx) => {
                        const isFree = issue.charging_type === "FREE";
                        const isIncluded =
                          issue.charging_type === "INCLUDED_IN_FEE" ||
                          issue.charging_type === "INCLUDED";
                        const badgeLabel = isIncluded
                          ? "INCLUDED"
                          : isFree
                          ? "FREE"
                          : "SEPARATE CHARGE";

                        return (
                          <tr key={issue.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                                  {getInitials(issue.student_name)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {issue.student_name}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {issue.student_class}{" "}
                                    {issue.student_division ? `(${issue.student_division})` : ""}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800 uppercase">
                                {issue.item_name}
                              </div>
                              {issue.size_name && (
                                <div className="text-[10px] text-slate-400">
                                  Size {issue.size_name}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">
                              {issue.quantity}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                                  isIncluded
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : isFree
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}
                              >
                                {badgeLabel}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                              ₹{Number(issue.charged_amount ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="text-[11px] text-slate-600 font-medium">
                                {formatIssueDate(issue.issue_date, issue.created_at)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {formatIssueTime(issue.created_at)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
