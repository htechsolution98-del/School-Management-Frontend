"use client";

import React, { useRef, useState, useEffect } from "react";
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
import { getCurrentUserProfile } from "@/lib/current-user";

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: PayrollPayslip | null;
  schoolName?: string;
  schoolLogo?: string;
  autoPrint?: boolean;
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
  schoolName,
  schoolLogo,
  autoPrint = false,
}: SalarySlipModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // ── Dynamic School Name & Logo Resolution (No hardcoded fallback names) ──
  const [resolvedSchoolName, setResolvedSchoolName] = useState<string>(() => {
    if (schoolName && schoolName !== "Institutional Academy") return schoolName;
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("school_full_name") ||
        localStorage.getItem("school_name") ||
        localStorage.getItem("school_short_name") ||
        "School Management"
      );
    }
    return "School Management";
  });

  const [resolvedSchoolLogo, setResolvedSchoolLogo] = useState<string | null>(() => {
    if (schoolLogo) return schoolLogo;
    if (typeof window !== "undefined") {
      return localStorage.getItem("school_logo") || null;
    }
    return null;
  });

  useEffect(() => {
    if (isOpen) {
      if (schoolName && schoolName !== "Institutional Academy") {
        setResolvedSchoolName(schoolName);
      }
      if (schoolLogo) {
        setResolvedSchoolLogo(schoolLogo);
      }

      // Check payslip properties
      if (payslip) {
        if (payslip.school_name && payslip.school_name !== "Institutional Academy") {
          setResolvedSchoolName(payslip.school_name);
        }
        if ((payslip as any).school_logo) {
          setResolvedSchoolLogo((payslip as any).school_logo);
        }
      }

      // Fallback fetch if school info is still default
      if (
        typeof window !== "undefined" &&
        (!resolvedSchoolLogo || resolvedSchoolName === "School Management")
      ) {
        getCurrentUserProfile()
          .then((profile) => {
            if (profile) {
              const sName =
                profile.school_full_name ||
                profile.school?.full_name ||
                profile.school?.name ||
                profile.short_display_name;
              if (sName) setResolvedSchoolName(sName);

              const sLogo = profile.school?.logo || profile.avatar;
              if (sLogo) setResolvedSchoolLogo(sLogo);
            }
          })
          .catch(() => {
            // Silently ignore profile fetch errors on printable modal
          });
      }
    }
  }, [isOpen, schoolName, schoolLogo, payslip]);

  useEffect(() => {
    if (isOpen && autoPrint && payslip) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, payslip]);

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

  // ── 3. High-Fidelity 1-Page Printable Handler ──
  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;

    // Use an isolated hidden iframe to completely eliminate blank-page bugs and fit strictly on 1 sheet
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
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            html, body {
              width: 100%;
              background: #ffffff;
              color: #0f172a;
              font-size: 11px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .slip-root {
              width: 100%;
              max-width: 100%;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
            .gap-2 { gap: 6px; }
            .gap-2\\.5 { gap: 8px; }
            .gap-3 { gap: 10px; }
            .gap-4 { gap: 12px; }
            .p-2 { padding: 6px 8px; }
            .p-2\\.5 { padding: 7px 10px; }
            .p-3 { padding: 8px 12px; }
            .p-4 { padding: 10px 14px; }
            .px-3 { padding-left: 10px; padding-right: 10px; }
            .py-1 { padding-top: 3px; padding-bottom: 3px; }
            .py-1\\.5 { padding-top: 4px; padding-bottom: 4px; }
            .py-2 { padding-top: 5px; padding-bottom: 5px; }
            .border { border: 1px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-b-2 { border-bottom: 2px solid #2563eb; }
            .rounded-lg { border-radius: 6px; }
            .rounded-xl { border-radius: 8px; }
            .rounded-2xl { border-radius: 10px; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-emerald-50 { background-color: #ecfdf5; }
            .bg-rose-50 { background-color: #fff1f2; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-indigo-50 { background-color: #eef2ff; }
            .text-emerald-600 { color: #059669; }
            .text-emerald-700 { color: #047857; }
            .text-emerald-800 { color: #065f46; }
            .text-rose-600 { color: #e11d48; }
            .text-rose-800 { color: #9f1239; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-700 { color: #1d4ed8; }
            .text-indigo-600 { color: #4f46e5; }
            .text-indigo-700 { color: #4338ca; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-500 { color: #64748b; }
            .text-slate-600 { color: #475569; }
            .text-slate-700 { color: #334155; }
            .text-slate-800 { color: #1e293b; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 11px; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 12px; }
            .text-base { font-size: 13px; }
            .text-lg { font-size: 15px; }
            .text-xl { font-size: 18px; }
            .text-2xl { font-size: 20px; }
            .text-3xl { font-size: 22px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .uppercase { text-transform: uppercase; }
            .capitalize { text-transform: capitalize; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .shrink-0 { flex-shrink: 0; }
            .space-y-3 > * + * { margin-top: 8px; }
            .divide-y > * + * { border-top: 1px solid #f1f5f9; }
            .net-banner {
              background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #0f172a 100%) !important;
              color: #ffffff !important;
              border-radius: 8px;
              padding: 8px 12px;
            }
          </style>
        </head>
        <body>
          <div class="slip-root space-y-3">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
        >
          {/* ── Modal Action Header (Hidden on Print) ── */}
          <div className="print:hidden flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
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
                <span>Print / Save PDF (1 Page)</span>
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
            className="p-4 sm:p-6 overflow-y-auto space-y-3 text-slate-800 dark:text-slate-100 print:p-0 print:m-0 print:text-black print:dark:text-black print:bg-white print:overflow-visible"
          >
            {/* Institution Letterhead with Dynamic School Logo */}
            <div className="border-b-2 border-blue-600 pb-3 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                {resolvedSchoolLogo ? (
                  <img
                    src={resolvedSchoolLogo}
                    alt={resolvedSchoolName}
                    className="h-10 sm:h-12 w-auto max-w-[130px] object-contain shrink-0 rounded-lg"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0">
                    {(resolvedSchoolName || "S").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-600 dark:text-blue-400 font-black text-lg sm:text-xl tracking-tight leading-tight">
                    <span>{payslip.school_name || resolvedSchoolName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Official Staff Payroll & Compensation Statement
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {payslip.receipt_number || `Payslip #${payslip.id}`}
                </span>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Salary Month: <span className="text-slate-800 dark:text-slate-200 font-bold">{formatMonthYear(payslip.salary_month)}</span>
                </div>
              </div>
            </div>

            {/* Employee Metadata Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Employee Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs mt-0.5 block">
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
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Attendance & Duty Summary for {formatMonthYear(payslip.salary_month)}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center text-[11px]">
                <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block text-[10px]">Total Days in Cycle</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                    {totalWorkingDays}
                  </span>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">Present Days</span>
                  <span className="text-sm font-bold mt-0.5 block">
                    {presentDays}
                  </span>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
                  <span className="text-blue-600 dark:text-blue-400 block text-[10px]">Paid Leaves</span>
                  <span className="text-sm font-bold mt-0.5 block">
                    {paidLeaves}
                  </span>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                  <span className="text-rose-600 dark:text-rose-400 block text-[10px]">Unpaid / LOP</span>
                  <span className="text-sm font-bold mt-0.5 block">
                    {unpaidLeaves}
                  </span>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300">
                  <span className="text-indigo-600 dark:text-indigo-400 block text-[10px]">Payable Days</span>
                  <span className="text-sm font-bold mt-0.5 block">
                    {payableDays}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown: Earnings vs Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Earnings Column */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-1.5 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3 h-3" />
                      Earnings & Allowances
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Amount (INR)
                    </span>
                  </div>
                  <div className="p-2.5 divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    {displayEarnings.length > 0 ? (
                      displayEarnings.map((item, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium truncate pr-2">
                            {item.name}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-1 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Basic Salary
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                          {formatCurrency(basicSalaryNum || grossEarnings)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Total Gross Earnings
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    {formatCurrency(grossEarnings)}
                  </span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-rose-50/80 dark:bg-rose-950/40 px-3 py-1.5 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <ArrowDownRight className="w-3 h-3" />
                      Deductions & Recoveries
                    </span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                      Amount (INR)
                    </span>
                  </div>
                  <div className="p-2.5 divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    {displayDeductions.length > 0 ? (
                      displayDeductions.map((item, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium truncate pr-2">
                            {item.name}
                          </span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                            - {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-1 flex items-center justify-between text-slate-400">
                        <span>No voluntary deductions</span>
                        <span className="font-semibold shrink-0">
                          {formatCurrency(totalDeductions)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Total Deductions
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 text-xs font-bold">
                    {formatCurrency(totalDeductions)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight Banner */}
            <div className="net-banner bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white rounded-xl p-3 sm:p-3.5 shadow-md border border-blue-400/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                  Net Take-Home Salary
                </span>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                  {formatCurrency(netSalary)}
                </div>
                <p className="text-[10px] text-blue-200/90 mt-0.5 font-medium">
                  Gross Earnings ({formatCurrency(grossEarnings)}) — Total Deductions ({formatCurrency(totalDeductions)})
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  Disbursed & Reconciled
                </span>
              </div>
            </div>

            {/* Official Sign-off Notice */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
              <p>
                This is a secure, system-generated electronic payslip verified by the School Accounts & HR Office.
              </p>
              <span className="text-[10px] font-medium">
                Generated: {payslip.created_at ? new Date(payslip.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
