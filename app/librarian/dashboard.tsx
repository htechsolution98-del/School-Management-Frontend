"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  BookMarked,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  BookmarkPlus,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Receipt,
  FileCheck,
  Layers,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  BarChart3,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LibraryDashboardSummary,
  getLibraryDashboardSummary,
  getStoredDashboardSummary,
  checkReservationExpiries,
} from "@/lib/library";

function MetricValue({
  value,
  loading,
  className = "",
}: {
  value: React.ReactNode;
  loading: boolean;
  className?: string;
}) {
  if (loading) {
    return <span className={`inline-block h-5 w-12 bg-slate-200/80 animate-pulse rounded my-0.5 ${className}`} />;
  }
  return <span className={className}>{value}</span>;
}

export default function LibrarianDashboard() {
  const [summary, setSummary] = useState<LibraryDashboardSummary | null>(() => getStoredDashboardSummary());
  const [loading, setLoading] = useState<boolean>(() => !getStoredDashboardSummary());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadDashboardData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else if (!summary) {
      setLoading(true);
    }

    try {
      const summaryData = await getLibraryDashboardSummary(isManual);
      setSummary(summaryData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [summary]);

  useEffect(() => {
    loadDashboardData(true);
  }, []);

  // Derived metrics from instant SWR cache / backend response
  const titlesCount = summary?.titles ?? 0;
  const totalCopies = summary?.total_physical_copies ?? 0;
  const availableCopies = summary?.available_copies ?? 0;
  const activeLoansCount = summary?.active_loans_count ?? 0;
  const overdueCount = summary?.overdue_count ?? 0;
  const waitingReservationsCount = summary?.waiting_reservations_count ?? 0;
  const availableHoldsCount = summary?.available_holds_count ?? 0;
  const lostDamagedCount = summary?.lost_damaged_count ?? 0;
  const totalFinesDue = Number(summary?.total_fines_due || 0);
  const totalFinesSettled = Number(summary?.total_fines_settled || 0);
  const pendingClearanceCount = summary?.pending_clearance_count ?? 0;

  const overdueLoans = summary?.overdue_loans_sample || [];
  const availableHolds = summary?.available_holds_sample || [];
  const recentTransactions = summary?.recent_transactions || [];
  const mostBorrowed = summary?.most_borrowed_sample || [];
  const categoryTrends = summary?.category_trends_sample || [];
  const inventoryAudit = summary?.inventory_audit_overview;

  // Sweep holds
  const handleSweepHolds = async () => {
    setSweepLoading(true);
    try {
      const res = await checkReservationExpiries();
      showToast("success", res.detail || "Expired reservations swept successfully.");
      await loadDashboardData(true);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to sweep holds.");
    } finally {
      setSweepLoading(false);
    }
  };

  const isInitialLoading = loading && !summary;

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-4 pb-3 sm:pb-5 lg:pb-6 w-full min-w-0 overflow-x-hidden font-sans">
      {/* Toast */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white font-medium text-sm ${
            notification.type === "success" ? "bg-emerald-600 shadow-emerald-500/20" : "bg-rose-600 shadow-rose-500/20"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ─── 1. WELCOME HERO BANNER (Teacher-style compact mobile proportion) ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#121B34] p-3.5 sm:p-5 text-white shadow-sm border border-[#1A2648]">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#182346] text-[#93C5FD] text-[10px] font-bold tracking-wider uppercase border border-[#233366]">
              <Sparkles className="h-3 w-3 text-[#93C5FD]" /> LIBRARY OPERATIONS COMMAND CENTER
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
              Library Intelligence & Circulation
            </h1>
            <p className="text-white/70 text-[11px] sm:text-xs leading-relaxed line-clamp-2 max-w-md">
              Real-time physical copy tracking, circulating loan velocity, overdue fine assessments, hold reservations, and institutional clearance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] sm:flex sm:items-center sm:justify-end gap-2 mt-3 pt-2.5 border-t border-white/10 relative z-10">
          <Link
            href="/librarian/library"
            className="py-2 px-3 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-bold flex items-center justify-between sm:justify-center gap-2 shadow-sm shadow-blue-600/30 transition-all active:scale-95"
          >
            <span className="flex items-center gap-1.5 truncate">
              <BookOpen className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="truncate">Open Operations Desk</span>
            </span>
            <span className="text-white/80 font-bold sm:hidden">›</span>
          </Link>
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="p-2 h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 text-white shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. KPI METRIC CARDS ROW (Responsive: 2-col on mobile, 4-col on tablet, 8-col on desktop) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        {/* Card 1: Books */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Titles</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-slate-900">
                <MetricValue value={titlesCount} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                <MetricValue value={`${totalCopies} physical`} loading={isInitialLoading} />
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-emerald-600 font-bold truncate">
              <MetricValue value={`${availableCopies} avail`} loading={isInitialLoading} />
            </span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">In stock</span>
          </div>
        </div>

        {/* Card 2: Active Loans */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Active Loans</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <BookMarked className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-slate-900">
                <MetricValue value={activeLoansCount} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Borrowers</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-sky-600 font-bold truncate">Circulating</span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">Loans</span>
          </div>
        </div>

        {/* Card 3: Overdue Loans */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-rose-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider truncate">Overdue</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-rose-600">
                <MetricValue value={overdueCount} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Past return date</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-rose-600 font-bold truncate">Urgent</span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">Action</span>
          </div>
        </div>

        {/* Card 4: Hold Queue */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Hold Queue</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <BookmarkPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-slate-900">
                <MetricValue value={waitingReservationsCount} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                <MetricValue value={`${availableHoldsCount} ready pickup`} loading={isInitialLoading} />
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-purple-600 font-bold truncate">Active holds</span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">Queue</span>
          </div>
        </div>

        {/* Card 5: Lost & Damaged */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-red-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-wider truncate">Lost & Damaged</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-red-600">
                <MetricValue value={lostDamagedCount} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Damaged or lost copies</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-red-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-red-600 font-bold truncate">Stock Loss</span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">Audit</span>
          </div>
        </div>

        {/* Card 6: Pending Dues & Penalties */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-amber-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider truncate">Dues & Fines</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-amber-700">
                <MetricValue value={`₹${totalFinesDue.toFixed(0)}`} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Pending collection</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-amber-700 font-bold truncate">Uncollected</span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">Penalties</span>
          </div>
        </div>

        {/* Card 7: Settled Fines Revenue */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Fines Settled</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-emerald-600">
                <MetricValue value={`₹${totalFinesSettled.toFixed(0)}`} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Total collected</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-emerald-600 font-bold truncate">Settled</span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">Receipts</span>
          </div>
        </div>

        {/* Card 8: Clearance Blocked */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 border border-[#EBF0F8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Clearance Dues</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-slate-800">
                <MetricValue value={pendingClearanceCount} loading={isInitialLoading} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Students blocked</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] truncate">
            <span className="text-rose-600 font-bold truncate">TC / Exam hold</span>
            <span className="text-slate-400 font-medium shrink-0 ml-1">Section 22</span>
          </div>
        </div>
      </div>

      {/* ─── 3. QUICK LAUNCH OPERATIONAL HUBS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <Link
          href="/librarian/library?tab=catalog"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 w-fit group-hover:scale-110 transition-transform">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Book Catalog</div>
            <div className="text-[10px] text-slate-400">Search & stock</div>
          </div>
        </Link>

        <Link
          href="/librarian/library?tab=issues"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-sky-300 hover:bg-sky-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 w-fit group-hover:scale-110 transition-transform">
            <BookMarked className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">Circulation Desk</div>
            <div className="text-[10px] text-slate-400">Issue & return</div>
          </div>
        </Link>

        <Link
          href="/librarian/library?tab=clearance"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 w-fit group-hover:scale-110 transition-transform">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Clearance Desk</div>
            <div className="text-[10px] text-slate-400">TC no-dues verify</div>
          </div>
        </Link>

        <Link
          href="/librarian/library?tab=reservations"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 w-fit group-hover:scale-110 transition-transform">
            <BookmarkPlus className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Hold Queue</div>
            <div className="text-[10px] text-slate-400">48h pickup sweep</div>
          </div>
        </Link>

        <Link
          href="/librarian/library?tab=masters"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-amber-300 hover:bg-amber-50/30 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 w-fit group-hover:scale-110 transition-transform">
            <Layers className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Masters & Racks</div>
            <div className="text-[10px] text-slate-400">Shelves & authors</div>
          </div>
        </Link>

        <Link
          href="/librarian/library?tab=reports"
          className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 w-fit group-hover:scale-110 transition-transform">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-900 group-hover:text-slate-700 transition-colors">Audit & Reports</div>
            <div className="text-[10px] text-slate-400">Closing analytics</div>
          </div>
        </Link>
      </div>

      {/* MID ROW: ANALYTICS VISUALIZERS & LEADERBOARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Most Borrowed Titles Ranking */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Most Borrowed Titles</h3>
                <p className="text-xs text-slate-500">Highest circulating textbook titles</p>
              </div>
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>

            {mostBorrowed.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">No borrowing telemetry yet.</div>
            ) : (
              <div className="space-y-3.5">
                {mostBorrowed.slice(0, 5).map((item, idx) => {
                  const maxBorrow = mostBorrowed[0]?.times_issued || 1;
                  const pct = Math.round(((item.times_issued || 0) / maxBorrow) * 100);
                  const itemKey = item.book_id ?? `borrowed-${idx}`;
                  return (
                    <div key={itemKey} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-[200px]">
                          #{idx + 1} {item.title}
                        </div>
                        <span className="font-bold text-indigo-600 shrink-0">{item.times_issued} loans</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400">By {item.author}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-right">
            <Link href="/librarian/library?tab=reports" className="text-xs text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1">
              View complete ranking <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Category Strength Breakdown */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Category Distribution</h3>
                <p className="text-xs text-slate-500">Collection coverage by subject</p>
              </div>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Layers className="h-4 w-4" />
              </span>
            </div>

            {categoryTrends.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">No category data recorded.</div>
            ) : (
              <div className="space-y-3.5">
                {categoryTrends.slice(0, 5).map((cat, idx) => {
                  const maxCount = categoryTrends[0]?.total_books || 1;
                  const pct = Math.round(((cat.total_books || 0) / maxCount) * 100);
                  const catKey = cat.category || `cat-${idx}`;
                  return (
                    <div key={catKey} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800">{cat.category || "General"}</span>
                        <span className="font-bold text-purple-700">
                          {cat.total_books ? `${cat.total_books} books` : "0 books"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-right">
            <Link href="/librarian/library?tab=masters" className="text-xs text-purple-600 hover:underline font-semibold inline-flex items-center gap-1">
              Manage categories <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Physical Inventory Health Audit */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Physical Stock Audit</h3>
                <p className="text-xs text-slate-500">Accession copies lifecycle health</p>
              </div>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 text-[11px]">Registered Copies</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {inventoryAudit?.total_copies ?? totalCopies}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-emerald-700 text-[11px]">Available on Shelf</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">
                  {inventoryAudit?.available ?? availableCopies}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                <div className="text-amber-700 text-[11px]">Under Repair</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5">
                  {inventoryAudit?.under_repair ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
                <div className="text-rose-700 text-[11px]">Lost / Damaged</div>
                <div className="text-lg font-bold text-rose-700 mt-0.5">
                  {(inventoryAudit?.lost ?? 0) + (inventoryAudit?.damaged ?? 0)}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
              <span className="text-slate-500 font-medium">Estimated Collection Value:</span>
              <span className="font-bold text-slate-900">
                ₹{Number(inventoryAudit?.total_value || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-right">
            <Link href="/librarian/library?tab=reports" className="text-xs text-emerald-600 hover:underline font-semibold inline-flex items-center gap-1">
              Closing audit report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* LOWER ROW: URGENT OVERDUE LOANS & READY FOR PICKUP HOLDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-4">
        {/* Urgent Overdue Attention List */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-rose-200/80 p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <span className="p-1.5 sm:p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">Overdue Loans Attention</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">Immediate return required</p>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0">
              {overdueCount} Loans
            </span>
          </div>

          {overdueLoans.length === 0 ? (
            <div className="p-5 sm:p-6 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl sm:rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-1.5" />
              No overdue loans currently active!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {overdueLoans.slice(0, 4).map((loan: any, idx: number) => {
                const overdueDays = Math.max(
                  1,
                  Math.floor((Date.now() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24))
                );
                return (
                  <div key={loan.id ?? `overdue-${idx}`} className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{loan.book_title}</div>
                      <div className="text-[11px] sm:text-xs text-slate-500 truncate">
                        Borrower: <strong>{loan.student_name || loan.staff_name || "Borrower"}</strong> · GR: {loan.student_gr_no || "N/A"}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-rose-600 font-semibold">
                        Due: {new Date(loan.due_date).toLocaleDateString()} ({overdueDays} days late)
                      </div>
                    </div>

                    <Link href={`/librarian/library?tab=issues`} className="shrink-0">
                      <Button size="sm" variant="outline" className="text-xs h-7 sm:h-8 border-rose-200 text-rose-700 hover:bg-rose-50 px-2.5">
                        Collect
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ready for Pickup Holds & Sweeper */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <span className="p-1.5 sm:p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <BookmarkPlus className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">Reserved Holds Ready</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">Waiting for pickup</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSweepHolds}
              disabled={sweepLoading}
              className="text-[11px] sm:text-xs h-7 sm:h-8 border-purple-200 text-purple-700 hover:bg-purple-50 px-2 sm:px-2.5 shrink-0"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${sweepLoading ? "animate-spin" : ""}`} /> Sweep 48h
            </Button>
          </div>

          {availableHolds.length === 0 ? (
            <div className="p-5 sm:p-6 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl sm:rounded-2xl border border-dashed border-slate-200">
              No holds currently waiting for pickup.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {availableHolds.slice(0, 4).map((hold, idx) => (
                <div key={hold.id ?? `hold-${idx}`} className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{hold.book_title}</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 truncate">Reserved for: <strong>{hold.student_name}</strong></div>
                    <div className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Ready at desk
                    </div>
                  </div>
                  <Link href="/librarian/library?tab=reservations" className="shrink-0">
                    <Button size="sm" className="text-xs h-7 sm:h-8 bg-purple-600 hover:bg-purple-700 text-white px-2.5">
                      Issue
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT CIRCULATION STREAM */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">Recent Borrowing Activity</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">Latest loans, returns, and renewals</p>
          </div>
          <Link href="/librarian/library?tab=issues" className="shrink-0">
            <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700 h-7 sm:h-8 px-2 sm:px-3">
              View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">No circulation history recorded yet.</div>
        ) : (
          <>
            {/* Desktop Full Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Fine Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx, idx) => (
                    <tr key={tx.id ?? `tx-${idx}`} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[220px] truncate">
                        {tx.book_title}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {tx.student_name || tx.staff_name || "Borrower"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(tx.book_issued_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(tx.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            tx.status === "RETURNED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : tx.status === "ISSUED"
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {Number(tx.total_fine || 0) > 0 ? (
                          tx.is_fine_paid ? (
                            <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Paid ₹{tx.fine_paid_amount}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Due ₹{Number(tx.total_fine) - Number(tx.fine_paid_amount || 0)}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">No fine</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Zero-X-Scroll Card View */}
            <div className="divide-y divide-slate-100 block md:hidden w-full">
              {recentTransactions.map((tx, idx) => (
                <div key={tx.id ?? `mobile-tx-${idx}`} className="py-3 space-y-2 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {tx.book_title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        Borrower: <span className="font-semibold text-slate-700">{tx.student_name || tx.staff_name || "Borrower"}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        tx.status === "RETURNED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : tx.status === "ISSUED"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5 border-t border-slate-50">
                    <div className="min-w-0 truncate text-[11px]">
                      <span>Due: <strong className="text-slate-800">{new Date(tx.due_date).toLocaleDateString()}</strong></span>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span className="text-slate-400 text-[10px]">{new Date(tx.book_issued_date).toLocaleDateString()}</span>
                    </div>

                    <div className="shrink-0 text-right">
                      {Number(tx.total_fine || 0) > 0 ? (
                        tx.is_fine_paid ? (
                          <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Paid ₹{tx.fine_paid_amount}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Due ₹{Number(tx.total_fine) - Number(tx.fine_paid_amount || 0)}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px]">No fine</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
