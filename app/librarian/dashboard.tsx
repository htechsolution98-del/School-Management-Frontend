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
  Book,
  BookIssued,
  BookReservation,
  LibrarySetting,
  getBooks,
  getIssuedBooks,
  getReservations,
  getLibrarySettings,
  getInventoryAudit,
  getMostBorrowedReport,
  getCategoryTrendsReport,
  getFeeCollectionReport,
  getPendingClearanceStudents,
  checkReservationExpiries,
} from "@/lib/library";

export default function LibrarianDashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<BookIssued[]>([]);
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [settings, setSettings] = useState<LibrarySetting | null>(null);
  const [inventoryAudit, setInventoryAudit] = useState<any>(null);
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<any[]>([]);
  const [feeCollection, setFeeCollection] = useState<any>(null);
  const [pendingClearance, setPendingClearance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        booksData,
        loansData,
        resData,
        settingsData,
        auditData,
        borrowedData,
        trendsData,
        feeData,
        clearanceData,
      ] = await Promise.all([
        getBooks().catch(() => []),
        getIssuedBooks().catch(() => []),
        getReservations().catch(() => []),
        getLibrarySettings().catch(() => null),
        getInventoryAudit().catch(() => null),
        getMostBorrowedReport().catch(() => []),
        getCategoryTrendsReport().catch(() => []),
        getFeeCollectionReport().catch(() => null),
        getPendingClearanceStudents().catch(() => ({ pending_clearance_students_count: 0, results: [] })),
      ]);

      setBooks(booksData);
      setLoans(loansData);
      setReservations(resData);
      setSettings(settingsData);
      setInventoryAudit(auditData);
      setMostBorrowed(borrowedData);
      setCategoryTrends(trendsData);
      setFeeCollection(feeData);
      const clearanceList = Array.isArray(clearanceData)
        ? clearanceData
        : (clearanceData as any)?.results || [];
      setPendingClearance(clearanceList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics
  const activeLoans = useMemo(() => loans.filter((l) => l.status === "ISSUED"), [loans]);
  const overdueLoans = useMemo(() => {
    const now = new Date();
    return activeLoans.filter((l) => new Date(l.due_date) < now);
  }, [activeLoans]);

  const totalCopies = useMemo(() => books.reduce((sum, b) => sum + (b.total_copies || 0), 0), [books]);
  const availableCopies = useMemo(() => books.reduce((sum, b) => sum + (b.available_copies || 0), 0), [books]);

  const waitingReservations = useMemo(() => reservations.filter((r) => r.status === "WAITING"), [reservations]);
  const availableHolds = useMemo(() => reservations.filter((r) => r.status === "AVAILABLE"), [reservations]);

  const totalFinesSettled = useMemo(() => {
    return loans.reduce((sum, l) => sum + Number(l.fine_paid_amount || 0), 0);
  }, [loans]);

  const totalFinesDue = useMemo(() => {
    return loans.reduce((sum, l) => {
      const remaining = Number(l.total_fine || 0) - Number(l.fine_paid_amount || 0);
      return sum + Math.max(0, remaining);
    }, 0);
  }, [loans]);

  const recentTransactions = useMemo(() => {
    return [...loans].sort((a, b) => b.id - a.id).slice(0, 5);
  }, [loans]);

  // Sweep holds
  const handleSweepHolds = async () => {
    setSweepLoading(true);
    try {
      const res = await checkReservationExpiries();
      showToast("success", res.detail || "Expired reservations swept successfully.");
      await loadDashboardData();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to sweep holds.");
    } finally {
      setSweepLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
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

      {/* SUPERADMIN-STYLE HERO HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white shadow-2xl border border-indigo-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Library Operations Command Center
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Library Intelligence & Circulation
            </h1>
            <p className="text-indigo-200/80 max-w-2xl text-sm sm:text-base leading-relaxed">
              Real-time physical copy tracking, circulating loan velocity, overdue fine assessments, hold reservations, and institutional clearance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <Link href="/librarian/library">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 gap-2 font-semibold">
                <BookOpen className="h-4 w-4" /> Open Operations Desk
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={loadDashboardData}
              disabled={loading}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS ROW (Superadmin Aesthetics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Books */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalogue Titles</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{books.length}</div>
            <p className="text-xs text-slate-400 mt-0.5">{totalCopies} physical copies</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">{availableCopies} available</span>
            <span className="text-slate-400 font-medium">In stock</span>
          </div>
        </div>

        {/* Card 2: Active Loans */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Loans</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
              <BookMarked className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{activeLoans.length}</div>
            <p className="text-xs text-slate-400 mt-0.5">Currently borrowed</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-sky-600 font-semibold">Circulating</span>
            <span className="text-slate-400 font-medium">Loans</span>
          </div>
        </div>

        {/* Card 3: Overdue Loans */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-rose-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Overdue Alert</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600">{overdueLoans.length}</div>
            <p className="text-xs text-slate-400 mt-0.5">Past due return date</p>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-semibold">Action required</span>
            <span className="text-slate-400 font-medium">Immediate</span>
          </div>
        </div>

        {/* Card 4: Hold Queue */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hold Queue</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <BookmarkPlus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{waitingReservations.length}</div>
            <p className="text-xs text-slate-400 mt-0.5">{availableHolds.length} ready for pickup</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-purple-600 font-semibold">Active holds</span>
            <span className="text-slate-400 font-medium">Waiting</span>
          </div>
        </div>

        {/* Card 5: Fines Collected */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fines Collected</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600">₹{totalFinesSettled.toFixed(0)}</div>
            <p className="text-xs text-slate-400 mt-0.5">₹{totalFinesDue.toFixed(0)} pending due</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">Revenue recorded</span>
            <span className="text-slate-400 font-medium">Receipts</span>
          </div>
        </div>

        {/* Card 6: Clearance Blocked */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clearance Dues</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">{pendingClearance.length}</div>
            <p className="text-xs text-slate-400 mt-0.5">Students with dues</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-amber-600 font-semibold">TC / Exam hold</span>
            <span className="text-slate-400 font-medium">Section 22</span>
          </div>
        </div>
      </div>

      {/* QUICK LAUNCH OPERATIONAL HUBS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Borrowed Titles Ranking */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
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
                  const itemKey = item.book_id ?? item.id ?? `borrowed-${idx}`;
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
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
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
                  const maxCount = categoryTrends[0]?.total_books || categoryTrends[0]?.times_issued || 1;
                  const loanCount = cat.times_issued ?? cat.total_loans ?? 0;
                  const pct = Math.round(((cat.total_books || loanCount || 0) / maxCount) * 100);
                  const catKey = cat.category || `cat-${idx}`;
                  return (
                    <div key={catKey} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800">{cat.category || "General"}</span>
                        <span className="font-bold text-purple-700">
                          {cat.total_books ? `${cat.total_books} books ` : ""}
                          {loanCount > 0 ? `(${loanCount} loans)` : ""}
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
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
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
                  {inventoryAudit?.overview?.total_copies || totalCopies}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-emerald-700 text-[11px]">Available on Shelf</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">
                  {inventoryAudit?.overview?.available || availableCopies}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                <div className="text-amber-700 text-[11px]">Under Repair</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5">
                  {inventoryAudit?.overview?.under_repair || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
                <div className="text-rose-700 text-[11px]">Lost / Damaged</div>
                <div className="text-lg font-bold text-rose-700 mt-0.5">
                  {(inventoryAudit?.overview?.lost || 0) + (inventoryAudit?.overview?.damaged || 0)}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
              <span className="text-slate-500 font-medium">Estimated Collection Value:</span>
              <span className="font-bold text-slate-900">
                ₹{Number(inventoryAudit?.overview?.total_value || 0).toLocaleString()}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Overdue Attention List */}
        <div className="bg-white rounded-3xl border border-rose-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Overdue Loans Attention</h3>
                <p className="text-xs text-slate-500">Books exceeding loan duration requiring immediate return</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
              {overdueLoans.length} Loans
            </span>
          </div>

          {overdueLoans.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
              No overdue loans currently active. Outstanding circulation is 100% on schedule!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {overdueLoans.slice(0, 4).map((loan, idx) => {
                const overdueDays = Math.max(
                  1,
                  Math.floor((Date.now() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24))
                );
                return (
                  <div key={loan.id ?? `overdue-${idx}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 line-clamp-1">{loan.book_title}</div>
                      <div className="text-slate-500">
                        Borrower: <strong>{loan.student_name || loan.staff_name}</strong> · GR: {loan.student_gr_no || "N/A"}
                      </div>
                      <div className="text-[11px] text-rose-600 font-semibold">
                        Due: {new Date(loan.due_date).toLocaleDateString()} ({overdueDays} days late)
                      </div>
                    </div>

                    <Link href={`/librarian/library?tab=issues`}>
                      <Button size="sm" variant="outline" className="text-xs h-8 border-rose-200 text-rose-700 hover:bg-rose-50">
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
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <BookmarkPlus className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reserved Holds Ready</h3>
                <p className="text-xs text-slate-500">Returned copies held for reservation queue pickup</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSweepHolds}
              disabled={sweepLoading}
              className="text-xs h-8 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${sweepLoading ? "animate-spin" : ""}`} /> Sweep 48h Holds
            </Button>
          </div>

          {availableHolds.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No holds currently waiting for pickup.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {availableHolds.slice(0, 4).map((hold, idx) => (
                <div key={hold.id ?? `hold-${idx}`} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 line-clamp-1">{hold.book_title}</div>
                    <div className="text-slate-500">Reserved for: <strong>{hold.student_name}</strong></div>
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Ready at circulation desk
                    </div>
                  </div>
                  <Link href="/librarian/library?tab=reservations">
                    <Button size="sm" className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white">
                      Issue Hold
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT CIRCULATION STREAM */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Borrowing Activity</h3>
            <p className="text-xs text-slate-500">Live stream of the latest book loans, returns, and renewals</p>
          </div>
          <Link href="/librarian/library?tab=issues">
            <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
              View All History <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">No circulation history recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
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
        )}
      </div>
    </div>
  );
}
