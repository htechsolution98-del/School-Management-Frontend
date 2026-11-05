"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
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

  const breakdown = (payslip.component_breakdown || {}) as Record<string, any>;

  // ── 1. Dynamic Calendar Days & Attendance Calculations ──
  const [yearStr, monthStr] = (payslip.salary_month || "").split("-");
  const parsedYear = parseInt(yearStr, 10);
  const parsedMonth = parseInt(monthStr, 10);
  const calendarDaysInMonth =
    !isNaN(parsedYear) && !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? new Date(parsedYear, parsedMonth, 0).getDate()
      : 30;

  const totalWorkingDays =
    Number(breakdown.working_days) ||
    Number((payslip as any).working_days) ||
    calendarDaysInMonth;

  const presentDays =
    breakdown.present_days != null
      ? Number(breakdown.present_days)
      : Number(payslip.present_days || 0);

  const paidLeaves =
    breakdown.paid_leaves != null
      ? Number(breakdown.paid_leaves)
      : Number(payslip.paid_leaves || 0);

  const unpaidLeaves =
    breakdown.unpaid_leaves != null
      ? Number(breakdown.unpaid_leaves)
      : breakdown.lwp_days != null
      ? Number(breakdown.lwp_days)
      : Number(payslip.unpaid_leaves || (payslip as any).absent_days || 0);

  const payableDays =
    breakdown.payable_days != null
      ? Number(breakdown.payable_days)
      : Math.max(0, totalWorkingDays - unpaidLeaves);

  // ── 2. Unified Financial Calculations (Gross = Basic + Allowances, Net = Gross - Deductions) ──
  const rawEarningsList: Array<{ name: string; amount: number | string; type?: string }> =
    breakdown.earnings || [];
  const rawDeductionsList: Array<{ name: string; amount: number | string; type?: string }> =
    breakdown.deductions || [];

  const basicSalaryNum = Number(
    breakdown.basic_salary ||
      payslip.basic_salary ||
      (payslip as any).salary ||
      0
  );

  // Ensure Basic Salary is present in the earnings list
  const displayEarnings = [...rawEarningsList];
  const hasBasicInList = displayEarnings.some((e) =>
    e.name?.toLowerCase().includes("basic")
  );
  if (!hasBasicInList && basicSalaryNum > 0) {
    displayEarnings.unshift({
      name: "Basic Salary",
      amount: basicSalaryNum,
      type: "earning",
    });
  }

  // Deductions: ensure LWP / LOP deduction is itemized
  const displayDeductions = [...rawDeductionsList];
  const lopAmount = parseFloat(
    String(breakdown.lop_deduction_amount || breakdown.lwp_deduction || "0")
  );
  const hasLopInList = displayDeductions.some(
    (d) =>
      d.name?.toLowerCase().includes("lop") ||
      d.name?.toLowerCase().includes("leave") ||
      d.name?.toLowerCase().includes("lwp")
  );
  if (lopAmount > 0 && !hasLopInList) {
    const halfUnpaid = parseFloat(String(breakdown.half_unpaid_days || "0"));
    const fullUnpaid = parseFloat(String(breakdown.full_unpaid_days || "0"));
    if (halfUnpaid > 0 && fullUnpaid === 0) {
      displayDeductions.push({
        name: `LWP Deduction: ${halfUnpaid} Half Day (${halfUnpaid * 0.5})`,
        amount: lopAmount,
        type: "deduction",
      });
    } else {
      displayDeductions.push({
        name: "Leave Without Pay (LWP) Deduction",
        amount: lopAmount,
        type: "deduction",
      });
    }
  }

  // Calculate Computed Sums
  const computedEarningsSum = displayEarnings.reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0
  );
  const computedDeductionsSum = displayDeductions.reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0
  );

  // Total Gross Earnings MUST NEVER be 0 if Basic Salary or components are present
  const grossEarnings =
    Number(payslip.gross_earnings) > 0
      ? Number(payslip.gross_earnings)
      : Number((payslip as any).total_earnings) > 0
      ? Number((payslip as any).total_earnings)
      : computedEarningsSum > 0
      ? computedEarningsSum
      : basicSalaryNum;

  // Total Deductions
  const totalDeductions =
    Number(payslip.total_deductions) > 0
      ? Number(payslip.total_deductions)
      : computedDeductionsSum;

  // Net Salary = Gross Earnings - Total Deductions
  const netSalary =
    Number(payslip.net_salary) > 0
      ? Number(payslip.net_salary)
      : Math.max(0, grossEarnings - totalDeductions);

  // ── 3. High-Fidelity Printable Handler ──
  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;

    // Use an isolated hidden iframe to completely eliminate blank-page bugs caused by modal overflows
    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;"
    );
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Salary Slip - ${payslip.staff_name || "Staff"} (${formatMonthYear(payslip.salary_month)})</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            body { background: #ffffff; color: #0f172a; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
            .gap-3 { gap: 12px; }
            .gap-4 { gap: 16px; }
            .p-4 { padding: 16px; }
            .p-5 { padding: 20px; }
            .p-6 { padding: 24px; }
            .border { border: 1px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-b-2 { border-bottom: 2px solid #2563eb; }
            .rounded-xl { border-radius: 12px; }
            .rounded-2xl { border-radius: 16px; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-emerald-50 { background-color: #ecfdf5; }
            .bg-rose-50 { background-color: #fff1f2; }
            .bg-blue-50 { background-color: #eff6ff; }
            .text-emerald-600 { color: #059669; }
            .text-emerald-800 { color: #065f46; }
            .text-rose-600 { color: #e11d48; }
            .text-rose-800 { color: #9f1239; }
            .text-blue-600 { color: #2563eb; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-500 { color: #64748b; }
            .text-slate-800 { color: #1e293b; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-xl { font-size: 20px; }
            .text-3xl { font-size: 30px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .uppercase { text-transform: uppercase; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .space-y-6 > * + * { margin-top: 24px; }
            .divide-y > * + * { border-top: 1px solid #f1f5f9; }
            @page { margin: 12mm; size: A4 portrait; }
          </style>
        </head>
        <body>
          <div class="space-y-6">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
        >
          {/* ── Modal Action Header (Hidden on Print) ── */}
          <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600/15 to-blue-600/25 text-blue-600 border border-blue-600/20 shadow-2xs">
                <FileText className="w-4 h-4 stroke-[2.2]" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Salary Slip & Compensation Statement
                </h3>
                <p className="text-xs text-slate-400">
                  Period: {formatMonthYear(payslip.salary_month)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition shadow-sm shadow-blue-500/25 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Printable Payslip Document Content ── */}
          <div
            ref={printRef}
            id="salary-slip-modal-printable"
            className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-100 print:p-0 print:m-0 print:text-black print:dark:text-black print:bg-white print:overflow-visible"
          >
            {/* Institution Letterhead with Official Logo */}
            <div className="border-b-2 border-blue-600 pb-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5 justify-center sm:justify-start">
                <img
                  src="/logo.png"
                  alt="VidyaSanchalan"
                  className="h-12 w-auto object-contain shrink-0"
                />
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-600 dark:text-blue-400 font-black text-xl tracking-tight">
                    <span>{payslip.school_name || schoolName || "VidyaSanchalan"}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official Staff Payroll & Compensation Statement
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {payslip.receipt_number || `Payslip #${payslip.id}`}
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
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  EMP-{payslip.staff}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Designation / Role</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block capitalize">
                  {payslip.designation || payslip.staff_category || "Staff"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Department</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {payslip.department || "General"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Payment Mode</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block uppercase">
                  {payslip.payment_mode || "Direct / Cash"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Receipt Ref</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {payslip.receipt_number || `SAL-${payslip.id}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Payment Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {payslip.payment_date
                    ? new Date(payslip.payment_date).toLocaleDateString("en-IN")
                    : payslip.created_at
                    ? new Date(payslip.created_at).toLocaleDateString("en-IN")
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {payslip.payment_status === "paid" ? "Paid & Reconciled" : "Disbursed"}
                </span>
              </div>
            </div>

            {/* Attendance & Leave Utilization Summary (Calculated Dynamically) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Attendance & Duty Summary for {formatMonthYear(payslip.salary_month)}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block">Total Days in Cycle</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                    {totalWorkingDays}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                  <span className="text-emerald-600 dark:text-emerald-400 block">Present Days</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {presentDays}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
                  <span className="text-blue-600 dark:text-blue-400 block">Paid Leaves</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {paidLeaves}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                  <span className="text-rose-600 dark:text-rose-400 block">Unpaid / LOP</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {unpaidLeaves}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300">
                  <span className="text-indigo-600 dark:text-indigo-400 block">Payable Days</span>
                  <span className="text-base font-bold mt-0.5 block">
                    {payableDays}
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
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Amount (INR)
                    </span>
                  </div>
                  <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {displayEarnings.length > 0 ? (
                      displayEarnings.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {item.name}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Basic Salary
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {formatCurrency(basicSalaryNum || grossEarnings)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Total Gross Earnings
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                    {formatCurrency(grossEarnings)}
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
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                      Amount (INR)
                    </span>
                  </div>
                  <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {displayDeductions.length > 0 ? (
                      displayDeductions.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {item.name}
                          </span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            - {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 flex items-center justify-between text-slate-400">
                        <span>No voluntary deductions</span>
                        <span className="font-semibold">
                          {formatCurrency(totalDeductions)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Total Deductions
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 text-sm font-bold">
                    {formatCurrency(totalDeductions)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg shadow-blue-600/20 border border-blue-400/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block">
                  Net Take-Home Salary
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight">
                  {formatCurrency(netSalary)}
                </div>
                <p className="text-xs text-blue-200/90 mt-1 font-medium">
                  Gross Earnings ({formatCurrency(grossEarnings)}) — Total Deductions ({formatCurrency(totalDeductions)})
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Disbursed & Reconciled
                </span>
              </div>
            </div>

            {/* Official Sign-off Notice */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <p>
                This is a secure, system-generated electronic payslip verified by the School Accounts & HR Office.
              </p>
              <span className="text-[11px] font-medium">
                Generated: {payslip.created_at ? new Date(payslip.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
