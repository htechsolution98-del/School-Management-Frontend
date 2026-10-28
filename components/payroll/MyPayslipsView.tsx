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
  Wallet,
  BarChart2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMyPayslips, getStoredMyPayslips } from "@/lib/hr-config";
import { SalarySlipModal } from "@/components/payroll/SalarySlipModal";
import type { PayrollPayslip } from "@/types/hr-config";

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "₹0";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "₹0";
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
  const [payslips, setPayslips] = useState<PayrollPayslip[]>(() => getStoredMyPayslips());
  const [loading, setLoading] = useState<boolean>(() => getStoredMyPayslips().length === 0);
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-3.5 sm:space-y-4 w-full min-w-0 font-sans">
      {/* ── 1. Hero Card (Exact Reference Match with 3D Illustration) ── */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(20,32,68,0.04)] p-4 sm:p-6 lg:p-7">
        {/* Soft background blue glow behind the right side */}
        <div className="absolute right-0 top-0 bottom-0 w-3/5 bg-gradient-to-l from-blue-50/70 via-sky-50/20 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-blue-100/50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-2.5 sm:gap-4">
          {/* Header Row: Icon + Title in a SINGLE LINE across full width */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563EB]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight truncate sm:whitespace-normal">
                My Salary Payslips
              </h1>
            </div>
          </div>

          {/* Content Row: Bottom Paragraph & Refresh on Left, 3D Illustration on Right */}
          <div className="flex items-center justify-between gap-3 sm:gap-6 w-full min-w-0">
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs sm:text-sm text-slate-500 max-w-[280px] sm:max-w-md lg:max-w-lg leading-relaxed font-normal">
                Review monthly compensation statements, gross earnings, itemized deductions, and download receipts.
              </p>

              <button
                type="button"
                onClick={fetchPayslips}
                disabled={loading}
                aria-label="Refresh payslips"
                className="mt-3 sm:mt-4 w-9 h-9 rounded-2xl border border-blue-100/90 bg-white hover:bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className={cn("w-4 h-4 text-[#2563EB]", loading && "animate-spin")} />
              </button>
            </div>

            {/* Right 3D Illustration */}
            <div className="shrink-0 flex items-center justify-end relative">
              <img
                src="/images/payslip-hero.png"
                alt="My Salary Payslips"
                className="w-24 sm:w-40 md:w-48 lg:w-56 h-auto object-contain select-none pointer-events-none drop-shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Stat Cards (2x2 on Mobile, 4 Across on Desktop like Reference Image 2) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Latest Disbursed Pay */}
        <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(20,32,68,0.03)] p-3.5 sm:p-4.5 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-[#10B981]" />
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-500 shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 leading-tight flex-1 text-left pl-1">
                LATEST DISBURSED PAY
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(kpis.latestNet)}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 mt-1 truncate">
            {payslips.length > 0 ? formatMonthYear(payslips[0]?.salary_month) : "No records"}
          </div>
        </div>

        {/* Card 2: Cumulative Received */}
        <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(20,32,68,0.03)] p-3.5 sm:p-4.5 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-[#3B82F6]" />
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 leading-tight flex-1 text-left pl-1">
                CUMULATIVE RECEIVED
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(kpis.totalNet)}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs font-normal text-slate-400 mt-1 truncate">
            Across all issued statements
          </div>
        </div>

        {/* Card 3: Average Monthly Net */}
        <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(20,32,68,0.03)] p-3.5 sm:p-4.5 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-[#F59E0B]" />
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-500 shrink-0">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 leading-tight flex-1 text-left pl-1">
                AVERAGE MONTHLY NET
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(kpis.avgNet)}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs font-normal text-slate-400 mt-1 truncate">
            Monthly average take-home
          </div>
        </div>

        {/* Card 4: Total Issued Payslips */}
        <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(20,32,68,0.03)] p-3.5 sm:p-4.5 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-[#8B5CF6]" />
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shrink-0">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 leading-tight flex-1 text-left pl-1">
                TOTAL ISSUED PAYSLIPS
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {kpis.count}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs font-normal text-slate-400 mt-1 truncate">
            Available for PDF download
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search (Single Row) ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(20,32,68,0.03)] p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search month or slip ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-full border border-slate-200/80 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
          />
        </div>

        {/* Filter Dropdown in Same Row */}
        <div className="relative shrink-0">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white pl-9 pr-8 py-2.5 sm:py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
          <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ── 4. Empty State / Payslips List ── */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 flex flex-col items-center justify-center space-y-3 shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Fetching your salary slips...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-800">
              Could not load payslips
            </h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button
              onClick={fetchPayslips}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredPayslips.length === 0 ? (
          /* Exact Reference Match Empty State Card */
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(20,32,68,0.03)] py-12 px-6 sm:px-10 text-center flex flex-col items-center justify-center">
            {/* Soft oval backdrop with 3D folder and rays */}
            <div className="relative mb-3 flex items-center justify-center">
              <div className="w-36 h-28 rounded-full bg-blue-50/70 absolute -z-0" />

              <img
                src="/images/empty-folder.png"
                alt="No payslips found"
                className="relative z-10 w-24 h-24 object-contain filter drop-shadow-sm select-none pointer-events-none"
              />

              {/* Decorative blue spark lines */}
              <div className="absolute top-1 right-2 z-20 pointer-events-none select-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12L1 10.5" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M8 5L6 1.5" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M15 8L19 4" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              No payslips found
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
              Your salary payslips will appear here once they are issued.
            </p>
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
                        <span className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-sky-500/20 text-blue-600 border border-blue-500/15 shadow-2xs">
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${paymentStatus === "paid"
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
                        <span className="text-base font-black text-blue-600 dark:text-blue-400">
                          {formatCurrency(slip.net_salary)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => handleOpenSlip(slip)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
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
