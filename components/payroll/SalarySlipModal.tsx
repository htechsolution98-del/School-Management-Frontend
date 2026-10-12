"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Printer,
  Download,
  Building,
  Calendar,
  User,
  CreditCard,
  CheckCircle2,
  FileText,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import type { PayrollPayslip } from "@/types/hr-config";

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: PayrollPayslip | null;
  schoolName?: string;
}

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "₹0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
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

export function SalarySlipModal({
  isOpen,
  onClose,
  payslip,
  schoolName = "Institutional Academy",
}: SalarySlipModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payslip) return null;

  const breakdown = payslip.component_breakdown || {};
  const earningsList: Array<{ name: string; amount: number | string; type?: string }> =
    breakdown.earnings || [];
  const deductionsList: Array<{ name: string; amount: number | string; type?: string }> =
    breakdown.deductions || [];

  // If LOP deduction was calculated but not in deductions list, include it
  const lopAmount = parseFloat(breakdown.lop_deduction_amount || "0");
  const hasLopInList = deductionsList.some((d) => d.name?.toLowerCase().includes("lop") || d.name?.toLowerCase().includes("leave"));
  const displayDeductions = [...deductionsList];
  if (lopAmount > 0 && !hasLopInList) {
    displayDeductions.push({
      name: "Unpaid Leave (LOP) Deduction",
      amount: lopAmount,
      type: "deduction",
    });
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* ── Modal Action Header (Hidden on Print) ── */}
          <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Salary Slip & Compensation Receipt
                </h3>
                <p className="text-xs text-slate-400">
                  Period: {formatMonthYear(payslip.salary_month)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Printable Payslip Document Content ── */}
          <div
            ref={printRef}
            className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-100 print:p-0 print:m-0 print:text-black print:dark:text-black print:bg-white"
          >
            {/* Institution Letterhead */}
            <div className="border-b-2 border-indigo-600 pb-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl tracking-tight">
                  <Building className="w-6 h-6" />
                  <span>{schoolName}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Official Staff Payroll & Compensation Statement
                </p>
              </div>

              <div className="text-center sm:text-right">
                <span className="inline-block px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Payslip #{payslip.id}
                </span>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Salary Month: <span className="text-slate-800 dark:text-slate-200 font-bold">{formatMonthYear(payslip.salary_month)}</span>
                </div>
              </div>
            </div>

            {/* Employee Metadata Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Employee Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5 block">
                  {payslip.staff_name || `Staff #${payslip.staff}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Staff ID / Code</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block font-mono">
                  EMP-{payslip.staff}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Payroll Run Ref</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block font-mono">
                  RUN-{payslip.payroll_run}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Generated & Approved
                </span>
              </div>
            </div>

            {/* Attendance & Leave Utilization Summary */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Attendance & Duty Summary for {formatMonthYear(payslip.salary_month)}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block">Total Working Days</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                    {breakdown.working_days ?? 30}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                  <span className="text-emerald-600 dark:text-emerald-400 block">Present Days</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {payslip.present_days}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
                  <span className="text-blue-600 dark:text-blue-400 block">Paid Leaves</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {payslip.paid_leaves}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                  <span className="text-rose-600 dark:text-rose-400 block">Unpaid / LOP</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {payslip.unpaid_leaves}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300">
                  <span className="text-indigo-600 dark:text-indigo-400 block">Payable Days</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {breakdown.payable_days ?? (Number(payslip.present_days) + Number(payslip.paid_leaves))}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown: Earnings vs Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earnings Column */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2.5 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Earnings & Allowances
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Amount (INR)</span>
                  </div>
                  <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {earningsList.length > 0 ? (
                      earningsList.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {item.name}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">Gross Regular Pay</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {formatCurrency(payslip.gross_earnings)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Total Gross Earnings
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                    {formatCurrency(payslip.gross_earnings)}
                  </span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-rose-50/80 dark:bg-rose-950/40 px-4 py-2.5 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Deductions & Recoveries
                    </span>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Amount (INR)</span>
                  </div>
                  <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {displayDeductions.length > 0 ? (
                      displayDeductions.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {item.name}
                          </span>
                          <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                            - {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 flex items-center justify-between text-slate-400">
                        <span>No voluntary deductions</span>
                        <span className="font-mono">{formatCurrency(payslip.total_deductions)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Total Deductions
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 text-sm font-mono">
                    {formatCurrency(payslip.total_deductions)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight Banner */}
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 block">
                  Net Take-Home Salary
                </span>
                <div className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
                  {formatCurrency(payslip.net_salary)}
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  Gross Earnings ({formatCurrency(payslip.gross_earnings)}) — Total Deductions ({formatCurrency(payslip.total_deductions)})
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Disbursed & Reconciled
                </span>
              </div>
            </div>

            {/* Official Sign-off Notice */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <p>
                This is a secure, system-generated electronic payslip verified by the School Accounts & HR Office.
              </p>
              <span className="font-mono text-[11px]">
                Generated: {payslip.created_at ? new Date(payslip.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
