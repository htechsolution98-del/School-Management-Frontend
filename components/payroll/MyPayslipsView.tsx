"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Calendar,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  CreditCard,
  Building,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMyPayslips } from "@/lib/hr-config";
import { SalarySlipModal } from "@/components/payroll/SalarySlipModal";
import type { PayrollPayslip } from "@/types/hr-config";

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "₹0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatMonthYear(dateStr?: string): string {
  if (!dateStr) return "Current Cycle";
  try {
    const parts = dateStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface MyPayslipsViewProps {
  roleTitle?: string;
  badgeText?: string;
}

export function MyPayslipsView({
  roleTitle = "Staff",
  badgeText = "Employee Self-Service",
}: MyPayslipsViewProps) {
  const [payslips, setPayslips] = useState<PayrollPayslip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [activePayslip, setActivePayslip] = useState<PayrollPayslip | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyPayslips();
      setPayslips(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load your personal payslips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    payslips.forEach((p) => {
      if (p.salary_month) {
        const y = String(p.salary_month).split("-")[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [payslips]);

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter((p) => {
      if (selectedYear !== "ALL" && p.salary_month) {
        if (!String(p.salary_month).startsWith(selectedYear)) return false;
      }
      if (searchQuery.trim()) {
        const monthName = formatMonthYear(p.salary_month).toLowerCase();
        const query = searchQuery.toLowerCase().trim();
        const ref = String(p.receipt_number || p.id).toLowerCase();
        if (!monthName.includes(query) && !ref.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [payslips, selectedYear, searchQuery]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (payslips.length === 0) {
      return {
        latestNet: 0,
        totalNet: 0,
        avgNet: 0,
        count: 0,
      };
    }
    const latest = payslips[0];
    const latestNet = parseFloat(String(latest.net_salary || 0));
    const totalNet = payslips.reduce(
      (acc, curr) => acc + (parseFloat(String(curr.net_salary || 0)) || 0),
      0
    );
    const avgNet = totalNet / payslips.length;

    return {
      latestNet,
      totalNet,
      avgNet,
      count: payslips.length,
    };
  }, [payslips]);

  const handleOpenSlip = (slip: PayrollPayslip) => {
    setActivePayslip(slip);
    setModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-3 lg:pb-8 space-y-6 w-full min-w-0 overflow-x-hidden font-sans">
      {/* ── Top Header (Shown Directly on the Page, Border-b, Hero Artwork on Right) ── */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5 pt-1">
        {/* Background Artwork on the Right with Smooth Multi-Directional Gradient */}
        <div className="absolute inset-y-0 right-0 w-3/4 sm:w-3/5 md:w-1/2 pointer-events-none select-none overflow-hidden">
          <img
            src="/salary-hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-right opacity-45 sm:opacity-60 dark:opacity-20"
          />
          {/* Horizontal fade from solid background on left into image */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent dark:from-background dark:via-background/80 dark:to-transparent" />
          {/* Bottom fade to blend cleanly with bottom border */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          {/* Top fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-transparent" />
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Banknote className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            My Salary Payslips
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
            Review monthly compensation statements, gross earnings, itemized deductions, and download receipts.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayslips}
            disabled={loading}
            className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs bg-background/80 backdrop-blur-xs"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="uppercase tracking-wider text-[11px]">Latest Disbursed Pay</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(kpis.latestNet)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {payslips.length > 0 ? formatMonthYear(payslips[0]?.salary_month) : "No records"}
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-400" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="uppercase tracking-wider text-[11px]">Cumulative Received</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(kpis.totalNet)}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">Across all issued statements</div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="uppercase tracking-wider text-[11px]">Average Monthly Net</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(kpis.avgNet)}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">Monthly average take-home</div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-violet-400" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="uppercase tracking-wider text-[11px]">Total Issued Payslips</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {kpis.count}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">Available for PDF download</div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search month or slip ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Payslip List / Cards ── */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 shadow-sm">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Fetching your salary slips...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Could not load payslips
            </h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button
              onClick={fetchPayslips}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 py-16 px-6 sm:px-12 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-2xs flex flex-col items-center justify-center relative overflow-hidden">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-[#5826df]/20 shadow-2xs flex items-center justify-center text-[#5826df] mb-4">
              <Banknote className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.8]" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">
              No payslips found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
              No payroll payslips have been processed for your profile for this period yet. Once the school administration or Trustee generates salary disbursement, your verified statements will appear here automatically.
            </p>
            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400 dark:text-zinc-500 mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Verified by School Accounts
              </span>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5826df]" />
                Official Electronic Receipts
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPayslips.map((slip) => {
              const presentDays = parseFloat(String(slip.present_days || 0));
              const paidLeaves = parseFloat(String(slip.paid_leaves || 0));
              const unpaidLeaves = parseFloat(String(slip.unpaid_leaves || 0));
              const paymentStatus = slip.payment_status || "paid";

              return (
                <motion.div
                  key={slip.id}
                  whileHover={{ y: -2 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Card Header: Month + Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-gradient-to-br from-[#5826df]/10 to-[#6d3df5]/20 text-[#5826df] border border-[#5826df]/15 shadow-2xs">
                          <Calendar className="w-4 h-4 stroke-[2.2]" />
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {formatMonthYear(slip.salary_month)}
                          </h3>
                          <span className="text-xs text-slate-400 font-semibold">
                            {slip.receipt_number || `PAY-${slip.id}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {paymentStatus === "paid" ? "Paid" : "Disbursed"}
                        </span>
                        {slip.payment_mode && (
                          <span className="text-[10px] uppercase text-slate-400 font-bold">
                            {slip.payment_mode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attendance Mini Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        Present: {presentDays}d
                      </span>
                      {paidLeaves > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                          Paid: {paidLeaves}
                        </span>
                      )}
                      {unpaidLeaves > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium">
                          LOP: {unpaidLeaves}
                        </span>
                      )}
                    </div>

                    {/* Financial Metric Row */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Gross Earnings</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(slip.gross_earnings)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Total Deductions</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          - {formatCurrency(slip.total_deductions)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                        <span className="text-slate-800 dark:text-slate-200">Net Take-Home</span>
                        <span className="text-base font-black text-[#5826df] dark:text-indigo-400">
                          {formatCurrency(slip.net_salary)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => handleOpenSlip(slip)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white shadow-md shadow-[#5826df]/20 hover:shadow-[#5826df]/30 transition-all active:scale-[0.98]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View & Download Slip</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detailed Printable Modal ── */}
      <SalarySlipModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        payslip={activePayslip}
      />
    </div>
  );
}
