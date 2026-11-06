"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Wallet,
  CreditCard,
  Banknote,
  X,
  Loader2,
  FileText,
  Calendar,
  IndianRupee,
  Eye,
  RefreshCw,
  Users,
  BadgeCheck,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Building2,
  Download,
  Printer,
  Layers,
  ExternalLink,
} from "lucide-react";
import {
  getSalaryPayments,
  generateSalary,
  getStaffList,
  triggerPayrollGeneration,
  getSalaryPreview,
  bulkGenerateSalaries,
  bulkDisburseSalaries,
  getPayslipViewUrl,
  type SalaryPreviewData,
} from "@/lib/fees";
import { loadRazorpayScript } from "@/lib/razorpay";
import { SalarySlipModal } from "@/components/payroll/SalarySlipModal";
import type { PayrollPayslip } from "@/types/hr-config";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";
import type {
  ComponentSnapshot,
  SalaryPayment,
  PayrollComponentBreakdown,
  PayrollBreakdownComponent,
} from "@/types/fees";

// ─── Types ─────────────────────────────────────────────────────────────────────

// payment_record stores the full backend response so "View Receipt" shows real data
interface StaffMember {
  id: number;
  name: string;
  role: string;
  department: string;
  category?: string;
  basic_salary: number;
  salary_generated: boolean;
  payment_status?: string;
  net_salary?: number;
  payment_mode?: string;
  receipt_number?: string;
  payment_date?: string;
  payment_record?: SalaryPayment;
  joining_date?: string;
}

type PaymentMode = "offline" | "online" | "cheque" | "bank_transfer";
type FilterStatus = "all" | "generated" | "pending" | "paid";

// ─── Helper: Check if staff joined in a month after the target salary month ────
function isStaffJoinedAfterMonth(joiningDate?: string, salaryMonthStr?: string): boolean {
  if (!joiningDate || !salaryMonthStr) return false;
  try {
    const parts = salaryMonthStr.split("-").map(Number);
    const y = parts[0];
    const m = parts[1];
    if (!y || !m) return false;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEndStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return String(joiningDate).substring(0, 10) > monthEndStr;
  } catch {
    return false;
  }
}

// ─── Transform raw API response → StaffMember ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStaff(raw: any): StaffMember {
  const isPaid = raw.payment_status === "paid";
  const hasRecord = Boolean(raw.receipt_number || raw.net_salary != null || raw.working_days != null);
  const staffId = Number(raw.staff ?? raw.staff_id ?? raw.id);
  return {
    id: staffId,
    name: raw.staff_name ?? raw.name ?? raw.full_name ?? "—",
    role: raw.staff_category ?? raw.role ?? raw.designation ?? "—",
    department: raw.staff_category ?? raw.department ?? "—",
    basic_salary: parseFloat(raw.basic_salary ?? "0"),
    salary_generated: isPaid || (hasRecord && raw.payment_status === "pending"),
    payment_status: raw.payment_status || (hasRecord ? "pending" : undefined),
    net_salary: raw.net_salary != null ? parseFloat(raw.net_salary) : undefined,
    payment_mode: raw.payment_mode,
    receipt_number: raw.receipt_number,
    payment_date: raw.payment_date,
    payment_record: hasRecord ? (raw as SalaryPayment) : undefined,
    joining_date: raw.joining_date || raw.joiningDate || raw.date_of_joining,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonth = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const formatCurrency = (val: string | number) =>
  `₹${parseFloat(String(val)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const AVATAR_COLORS = [
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-blue-500",
  "from-purple-500 to-fuchsia-500",
  "from-cyan-500 to-sky-500",
  "from-lime-500 to-emerald-500",
];
const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

// ─── Status Badge ──────────────────────────────────────────────────────────────

const StatusBadge = ({
  generated,
  mode,
  status,
}: {
  generated: boolean;
  mode?: string;
  status?: string;
}) => {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} />
        Paid
        {mode && (
          <span className="capitalize text-emerald-500 font-normal">
            · {mode}
          </span>
        )}
      </span>
    );
  }
  if (status === "pending" && generated) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Sparkles size={10} />
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
      <Hourglass size={10} />
      Pending
    </span>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  iconBg: string;
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
    >
      <Icon size={22} className="text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// Note: Receipt modal replaced by unified SalarySlipModal
const ReceiptModal = ({
  data,
  onClose,
  onDownloadPdf,
}: {
  data: SalaryPayment;
  onClose: () => void;
  onDownloadPdf?: () => void;
}) => {
  const breakdown: PayrollComponentBreakdown = useMemo(() => {
    if (data.component_breakdown && typeof data.component_breakdown === "object") {
      return data.component_breakdown;
    }
    // Fallback if component_breakdown was not present
    const earnings: PayrollBreakdownComponent[] = (data.component_snapshot || [])
      .filter((c) => c.component_type === "earning")
      .map((c) => ({
        component_id: c.component_id,
        name: c.name,
        type: "Earning",
        calc_type: c.calculation_type,
        calc_base: null,
        value: c.value,
        amount: c.amount,
      }));
    const deductions: PayrollBreakdownComponent[] = (data.component_snapshot || [])
      .filter((c) => c.component_type === "deduction")
      .map((c) => ({
        component_id: c.component_id,
        name: c.name,
        type: "Deduction",
        calc_type: c.calculation_type,
        calc_base: null,
        value: c.value,
        amount: c.amount,
      }));
    const pDays = parseFloat(data.present_days || "0");
    const hDays = data.half_days || 0;
    const payable = pDays + hDays * 0.5;
    return {
      working_days: data.working_days || 0,
      eligible_working_days: data.working_days || 0,
      effective_start: "",
      effective_end: "",
      present_days: pDays,
      late_days: 0,
      half_days: hDays,
      paid_leaves: 0,
      unpaid_leaves: 0,
      lop_deduction_amount: data.attendance_deduction || "0.00",
      payable_days: payable,
      pro_rata_multiplier:
        data.working_days > 0 ? (payable / data.working_days).toFixed(4) : "1.0000",
      earnings,
      deductions,
      gross_earnings: data.total_earnings || "0.00",
      total_deductions: data.total_deductions || "0.00",
      net_salary: data.net_salary || "0.00",
      calculated_at: data.payment_date || new Date().toISOString(),
    };
  }, [data]);

  const cycleDateRange = useMemo(() => {
    if (!data.salary_month) return "";
    const parts = String(data.salary_month).split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month)) return "";
    const lastDay = new Date(year, month, 0).getDate();
    return `01-${String(month).padStart(2, "0")}-${year} to ${String(lastDay).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  }, [data.salary_month]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative z-[210] bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/15 rounded-xl p-2.5">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-200 tracking-widest uppercase">
                Dynamic Salary Slip & Breakdown
              </p>
              <p className="font-bold text-xl leading-tight">{data.staff_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-indigo-200">
                  {data.staff_category}
                </span>
                {cycleDateRange && (
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono text-white">
                    Cycle: {cycleDateRange}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Salary Month", val: formatMonth(data.salary_month) },
              { label: "Receipt No.", val: data.receipt_number },
              { label: "Status", val: data.payment_status },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white/10 rounded-xl p-2.5">
                <p className="text-[10px] text-indigo-200 uppercase tracking-wider">
                  {label}
                </p>
                <p className="font-semibold text-sm mt-0.5 capitalize truncate">
                  {val}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Pro-rata Joining/Exit Notice (Priority 1) */}
          {breakdown.eligible_working_days < breakdown.working_days && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Pro-Rata Eligible Working Days Applied
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Staff active for <span className="font-bold">{breakdown.eligible_working_days}</span> of{" "}
                  <span>{breakdown.working_days}</span> calendar days ({breakdown.effective_start} to {breakdown.effective_end}).
                  Salary components are pro-rated accordingly.
                </p>
              </div>
            </div>
          )}

          {/* Clean 5-Field Attendance & Duty Summary (Strictly essential fields only) */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Attendance & Duty Summary ({formatMonth(data.salary_month)})
              </p>
              {cycleDateRange && (
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  {cycleDateRange}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-center">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Days in Cycle</span>
                <span className="text-lg font-bold text-slate-800 mt-0.5 block">{breakdown.working_days}</span>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                <span className="text-[10px] text-emerald-600 block uppercase font-medium">Present Days</span>
                <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{breakdown.present_days}</span>
              </div>
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <span className="text-[10px] text-blue-600 block uppercase font-medium">Paid Leaves</span>
                <span className="text-lg font-bold text-blue-700 mt-0.5 block">{breakdown.paid_leaves}</span>
              </div>
              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3">
                <span className="text-[10px] text-rose-600 block uppercase font-medium">Unpaid / LOP</span>
                <span className="text-lg font-bold text-rose-700 mt-0.5 block">{breakdown.unpaid_leaves}</span>
              </div>
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
                <span className="text-[10px] text-indigo-600 block uppercase font-medium">Payable Days</span>
                <span className="text-lg font-bold text-indigo-700 mt-0.5 block">{breakdown.payable_days}</span>
              </div>
            </div>
          </div>

          {/* Dynamic 2-Column Salary Components (Earnings on Left, Deductions on Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings Column */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-emerald-600" /> Earnings
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {breakdown.earnings.length} item{breakdown.earnings.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2 mt-3">
                  {breakdown.earnings.map((c, idx) => (
                    <div
                      key={`${c.name}-${idx}`}
                      className="flex items-start justify-between py-2 border-b border-emerald-50/80 last:border-0"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {c.calc_type === "Percentage"
                            ? `${c.value}% of ${c.calc_base || "Basic"}`
                            : `Fixed · ₹${c.value}`}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-emerald-700 tabular-nums shrink-0">
                        +{formatCurrency(c.amount)}
                      </p>
                    </div>
                  ))}
                  {breakdown.earnings.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center italic">No earnings found</p>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-emerald-200 mt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase">Gross Earnings</span>
                <span className="text-base font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(breakdown.gross_earnings)}
                </span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="bg-red-50/40 border border-red-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-red-100">
                  <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet size={14} className="text-red-500" /> Deductions
                  </span>
                  <span className="text-xs font-semibold text-red-600">
                    {breakdown.deductions.length} item{breakdown.deductions.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2 mt-3">
                  {breakdown.deductions.map((c, idx) => (
                    <div
                      key={`${c.name}-${idx}`}
                      className="flex items-start justify-between py-2 border-b border-red-50/80 last:border-0"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {c.calc_type === "Percentage"
                            ? `${c.value}% of ${c.calc_base || "Basic"}`
                            : `Fixed · ₹${c.value}`}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-red-600 tabular-nums shrink-0">
                        −{formatCurrency(c.amount)}
                      </p>
                    </div>
                  ))}
                  {breakdown.deductions.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center italic">No deductions applied</p>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-red-200 mt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 uppercase">Total Deductions</span>
                <span className="text-base font-bold text-red-600 tabular-nums">
                  {formatCurrency(breakdown.total_deductions)}
                </span>
              </div>
            </div>
          </div>

          {/* Net Salary Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white flex justify-between items-center shadow-md">
            <div>
              <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Net Salary Payable</p>
              <p className="text-3xl font-extrabold mt-1 tabular-nums">
                {formatCurrency(breakdown.net_salary)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-indigo-200">Payment Mode</p>
              <p className="font-semibold capitalize mt-0.5 text-sm">
                {data.payment_mode}
              </p>
              {data.transaction_id && (
                <p className="text-[10px] text-indigo-300 mt-0.5 font-mono">
                  Txn: {data.transaction_id}
                </p>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Processed / Paid on</span>
              <span className="text-slate-700 font-medium">
                {formatDate(data.payment_date)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Processed by</span>
              <span className="text-slate-700 font-medium">
                {data.paid_by_username}
              </span>
            </div>
            {data.note && (
              <div className="flex justify-between text-xs gap-4">
                <span className="text-slate-400 shrink-0">Note</span>
                <span className="text-slate-700 font-medium text-right">
                  {data.note}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={onDownloadPdf}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-200 cursor-pointer"
          >
            <Printer size={15} /> Print / Save PDF (1 Page)
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Generate Salary Modal ──────────────────────────────────────────────────────
//
// PAYLOAD SENT TO BACKEND — exactly what the API expects:
// {
//   staff: number,              ← integer ID only (category name is UI-only)
//   salary_month: string,       ← "2026-05"
//   payment_mode: "offline" | "online",
//   note?: string               ← optional
//   transaction_id?: string     ← online only
// }

const GenerateModal = ({
  staff,
  salaryMonth,
  onClose,
  onSuccess,
}: {
  staff?: StaffMember;
  salaryMonth: string;
  onClose: () => void;
  onSuccess: (data: SalaryPayment) => void;
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("offline");
  const [transactionId, setTransactionId] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankName, setBankName] = useState("State Bank of India");
  const [chequeDate, setChequeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdPayment, setCreatedPayment] = useState<SalaryPayment | null>(null);
  const [missingPunchWarning, setMissingPunchWarning] = useState<{
    message: string;
    dates?: string[];
  } | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffMember[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<number>(0);
  const [openDropdown, setOpenDropdown] = useState<"category" | "staff" | null>(null);
  const [preview, setPreview] = useState<SalaryPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const cycleDateRange = useMemo(() => {
    if (!salaryMonth) return "";
    const parts = String(salaryMonth).split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month)) return "";
    const lastDay = new Date(year, month, 0).getDate();
    return `01-${String(month).padStart(2, "0")}-${year} to ${String(lastDay).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  }, [salaryMonth]);

  const isAlreadyGenerated = useMemo(() => {
    if (!staff) return false;
    return Boolean(
      staff.salary_generated ||
      staff.payment_status === "paid" ||
      (staff.payment_record && staff.payment_record.salary_month === salaryMonth)
    );
  }, [staff, salaryMonth]);

  const targetStaff = useMemo(() => {
    return staffOptions.find((s) => s.id === selectedStaffId) || staff;
  }, [staffOptions, selectedStaffId, staff]);

  const isNotJoinedYet = useMemo(() => {
    return isStaffJoinedAfterMonth(targetStaff?.joining_date, salaryMonth);
  }, [targetStaff, salaryMonth]);

  useEffect(() => {
    if (staff && staff.id !== 0) {
      setSelectedStaffId(staff.id);
      setSelectedCategory(staff.department || staff.role || staff.category || "Staff");
    }
  }, [staff]);

  useEffect(() => {
    const targetId = selectedStaffId || (staff && staff.id !== 0 ? staff.id : 0);
    if (!targetId || !salaryMonth) {
      setPreview(null);
      return;
    }
    let isMounted = true;
    async function fetchPreview() {
      setPreviewLoading(true);
      setError("");
      setMissingPunchWarning(null);
      try {
        const data = await getSalaryPreview(targetId, salaryMonth);
        if (isMounted) {
          setPreview(data);
          if (data.requires_regularization) {
            setMissingPunchWarning({
              message: data.message || "Attendance regularization required.",
              dates: data.missing_punch_dates,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("Salary preview notice:", err?.message);
        }
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    }
    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [selectedStaffId, staff, salaryMonth]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);


  const handleSubmit = async () => {
    if (isNotJoinedYet) {
      setError(`Cannot generate salary: ${targetStaff?.name || "Staff"} joined on ${targetStaff?.joining_date}. Salary cannot be generated for months prior to joining date.`);
      return;
    }

    if (!selectedCategory) {
      setError("Category is required.");
      return;
    }

    if (!selectedStaffId) {
      setError("Staff name is required.");
      return;
    }

    if (!paymentMode) {
      setError("Payment mode is required.");
      return;
    }

    if (!note.trim()) {
      setError("Note is required.");
      return;
    }

    if (paymentMode === "cheque" && !chequeNumber.trim()) {
      setError("Cheque Number is required.");
      return;
    }
    if ((paymentMode === "online" || paymentMode === "bank_transfer") && !transactionId.trim()) {
      setError("Transaction ID / Reference is required.");
      return;
    }
    setError("");
    setMissingPunchWarning(null);
    setLoading(true);

    const body: Record<string, unknown> = {
      staff: selectedStaffId,
      salary_month: salaryMonth,
      payment_mode: paymentMode === "cheque" ? "cheque" : paymentMode === "bank_transfer" ? "bank_transfer" : paymentMode,
      receipt_number: `SAL-${salaryMonth}-${selectedStaffId}`,
      note: note.trim() || (paymentMode === "cheque" ? `Cheque #${chequeNumber} (${bankName})` : undefined),
    };
    if (paymentMode === "cheque") {
      body.transaction_id = chequeNumber.trim();
    } else if (transactionId.trim()) {
      body.transaction_id = transactionId.trim();
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await generateSalary(body as any);
      if (paymentMode === "cheque") {
        setCreatedPayment(data);
      } else {
        onSuccess(data);
      }
    } catch (e: any) {
      const msg =
        e?.data?.message ||
        (e instanceof Error ? e.message : "Failed to generate salary.");
      setError(msg);
      if (
        e?.data?.requires_regularization ||
        msg.toLowerCase().includes("regularization") ||
        msg.toLowerCase().includes("missing punch")
      ) {
        setMissingPunchWarning({
          message: msg,
          dates: e?.data?.dates || [],
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const categories = useMemo(() => {
    return [
      ...new Set(
        staffOptions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any) => s.category)
          .filter(Boolean),
      ),
    ];
  }, [staffOptions]);
  const filteredStaff = useMemo(() => {
    if (!selectedCategory) return [];

    return staffOptions.filter((s: any) => s.category === selectedCategory);
  }, [staffOptions, selectedCategory]);
  useEffect(() => {
    async function loadStaff() {
      try {
        const data = await getStaffList();
        const formatted = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          role: s.category,
          department: s.category,
          basic_salary: Number(s.salary || 0),
          salary_generated: false,
          joining_date: s.joining_date || s.joiningDate || s.date_of_joining,
        }));

        setStaffOptions(formatted);
      } catch (err) {
        console.error(err);
      }
    }

    loadStaff();
  }, []);


  const handleRazorpayOnline = async () => {
    if (isNotJoinedYet) {
      setError(`Cannot generate salary: ${targetStaff?.name || "Staff"} joined on ${targetStaff?.joining_date}. Salary cannot be generated for months prior to joining date.`);
      return;
    }
    if (!selectedStaffId) {
      setError("Staff name is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError("Razorpay SDK could not be loaded. Check your internet connection.");
        setLoading(false);
        return;
      }
      const st = staffOptions.find((s) => s.id === selectedStaffId) || staff;
      const amountNumber = Math.round((parseFloat(preview?.net_salary || "0") || 1000) * 100);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SFctsjgfvcrQ6h",
        amount: amountNumber,
        currency: "INR",
        name: "School Trustee Payroll",
        description: `Salary Payment for ${st?.name || "Staff"} (${formatMonth(salaryMonth)})`,
        handler: async function (response: any) {
          const txnId = response.razorpay_payment_id || `RZP-${Date.now()}`;
          setTransactionId(txnId);
          try {
            const body = {
              staff: selectedStaffId,
              salary_month: salaryMonth,
              payment_mode: "online",
              receipt_number: `SAL-${salaryMonth}-${selectedStaffId}`,
              transaction_id: txnId,
              note: `Razorpay Online Payment (ID: ${txnId})`,
            };
            const data = await generateSalary(body as any);
            onSuccess(data);
          } catch (err: any) {
            setError(err?.message || "Failed to finalize salary record.");
          }
        },
        prefill: {
          name: st?.name || "Staff",
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        setError(`Payment declined: ${resp.error?.description || "Transaction failed"}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err?.message || "Razorpay initialization error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative z-[210] bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 rounded-xl p-2.5">
              <Wallet size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Generate Salary</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">
                  {formatMonth(salaryMonth)}
                </span>
                {cycleDateRange && (
                  <span className="text-[10px] font-semibold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                    Cycle: {cycleDateRange}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors cursor-pointer"
          >
            <X size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Duplicate Prevention Alert */}
        {isAlreadyGenerated && (
          <div className="mx-5 mt-4 bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Salary Already Generated for This Cycle
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Salary for <strong>{staff?.name}</strong> has already been generated and recorded for {formatMonth(salaryMonth)} ({cycleDateRange}). Duplicate generation for the same date/cycle is not allowed.
              </p>
            </div>
          </div>
        )}

        {/* Staff Info Strip
            Shows category label for the fee manager's reference.
            Only staff.id is included in the POST payload below. */}
        {staff && staff.id !== 0 && (
          <div className="mx-5 mt-5 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${getAvatarColor(staff.id)} shrink-0`}
            >
              <span className="text-xs font-bold text-white">
                {getInitials(staff.name)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">
                {staff.name}
              </p>

              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {staff.role}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                Basic
              </p>

              <p className="text-sm font-bold text-indigo-700">
                {formatCurrency(staff.basic_salary)}
              </p>
            </div>
          </div>
        )}

        {/* Cheque Success Direct Print Screen */}
        {createdPayment && (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Salary Cheque Record Generated!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Cheque #{chequeNumber} for {createdPayment.staff_name} ({formatCurrency(createdPayment.net_salary)}) has been recorded.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Link
                href={`/trustee/cheque-printing?payee=${encodeURIComponent(createdPayment.staff_name || "")}&amount=${createdPayment.net_salary}&date=${chequeDate}&bank=${encodeURIComponent(bankName)}&memo=${encodeURIComponent(`Salary - ${salaryMonth}`)}`}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Printer size={15} /> Open & Print Cheque Now
              </Link>
              <button
                type="button"
                onClick={() => {
                  onSuccess(createdPayment);
                  onClose();
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
        {!createdPayment && (
        <div className="p-5 space-y-4">
          {/* Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="relative" data-dropdown>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Category *
              </label>
              <button
                type="button"
                data-dropdown
                onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-left flex items-center justify-between focus:outline-none focus:border-indigo-400 transition bg-white"
                style={{ color: selectedCategory ? "#374151" : "#9ca3af" }}
              >
                <span>{selectedCategory || "Select Category"}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${openDropdown === "category" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "category" && (
                <div data-dropdown className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  <button type="button" data-dropdown
                    onClick={() => { setSelectedCategory(""); setSelectedStaffId(0); setOpenDropdown(null); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 transition-colors">
                    Select Category
                  </button>
                  {categories.map((cat, index) => (
                    <button key={`${cat}-${index}`} type="button" data-dropdown
                      onClick={() => { setSelectedCategory(cat); setSelectedStaffId(0); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${selectedCategory === cat ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Staff */}
            <div className="relative" data-dropdown>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Staff Name *
              </label>
              <button
                type="button"
                data-dropdown
                disabled={!selectedCategory}
                onClick={() => selectedCategory && setOpenDropdown(openDropdown === "staff" ? null : "staff")}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-left flex items-center justify-between focus:outline-none focus:border-indigo-400 transition bg-white disabled:bg-slate-50"
                style={{ color: selectedStaffId ? "#374151" : "#9ca3af" }}
              >
                <span>
                  {selectedStaffId
                    ? (() => { const s = filteredStaff.find(s => s.id === selectedStaffId); return s ? `${s.name} (${(s as any).category})` : "Select Staff"; })()
                    : "Select Staff"}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${openDropdown === "staff" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "staff" && (
                <div data-dropdown className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  <button type="button" data-dropdown
                    onClick={() => { setSelectedStaffId(0); setOpenDropdown(null); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${!selectedStaffId ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-400"}`}>
                    Select Staff
                  </button>
                  {filteredStaff.map((s) => (
                    <button key={s.id} type="button" data-dropdown
                      onClick={() => { setSelectedStaffId(s.id); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${selectedStaffId === s.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"}`}>
                      {s.name} ({(s as any).category})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isAlreadyGenerated && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
              <span>Salary record already exists for this staff member in {formatMonth(salaryMonth)}.</span>
            </div>
          )}

          {isNotJoinedYet && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>
                Staff joined on <strong>{targetStaff?.joining_date}</strong>. Salary cannot be generated for months prior to joining date.
              </span>
            </div>
          )}

          {/* Dynamic Attendance, Leave & Auto-Deduction Statistics */}
          {previewLoading && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-xs text-slate-500">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span>Calculating attendance records & LWP auto-deductions...</span>
            </div>
          )}

          {preview && !previewLoading && (
            <div className="bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-600" /> Duty & Attendance Metrics
                </span>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                  Period: {(preview as any).effective_start || `01-${salaryMonth}`} to {(preview as any).effective_end || `30-${salaryMonth}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-indigo-100/60 pb-1.5">
                <span>Working Days Rate:</span>
                <span className="text-slate-800 font-bold font-mono">Per-Day: {formatCurrency(preview.per_day_salary)}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white rounded-xl p-2 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Days</span>
                  <span className="text-sm font-bold text-slate-800">{preview.working_days}</span>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] text-emerald-600 block font-semibold uppercase">Present</span>
                  <span className="text-sm font-bold text-emerald-700">{preview.present_days}</span>
                </div>
                <div className="bg-blue-50 rounded-xl p-2 border border-blue-200 shadow-2xs">
                  <span className="text-[10px] text-blue-600 block font-semibold uppercase">Paid Leaves</span>
                  <span className="text-sm font-bold text-blue-700">{preview.paid_leaves}</span>
                </div>
                <div className="bg-rose-50 rounded-xl p-2 border border-rose-200 shadow-2xs">
                  <span className="text-[10px] text-rose-600 block font-semibold uppercase">LWP</span>
                  <span className="text-sm font-bold text-rose-700">{preview.lwp_days}</span>
                </div>
              </div>

              {parseFloat(preview.lwp_deduction || "0") > 0 && (
                <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-rose-100/70 text-rose-800 border border-rose-200">
                  <span>LWP Auto-Deduction ({preview.lwp_days} day{preview.lwp_days > 1 ? "s" : ""} @ {formatCurrency(preview.per_day_salary)}):</span>
                  <span className="font-bold font-mono">-{formatCurrency(preview.lwp_deduction)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-indigo-100/80">
                <span className="text-xs font-semibold text-slate-600">Calculated Net Payable:</span>
                <span className="text-base font-black text-indigo-700 font-mono">{formatCurrency(preview.net_salary)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
              Payment Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "offline", label: "Cash", icon: Banknote },
                { id: "cheque", label: "Cheque", icon: FileText },
                { id: "online", label: "Razorpay", icon: CreditCard },
                { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMode(id as PaymentMode)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-xs font-bold ${
                    paymentMode === id
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cheque Payment Inputs */}
          {paymentMode === "cheque" && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <FileText size={13} className="text-indigo-600" /> Cheque Issue Details
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100 px-2 py-0.5 rounded">
                  Direct Cheque Printing Ready
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Cheque Number *
                  </label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="e.g. 004812"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Bank Name *
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Bank of Baroda">Bank of Baroda</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Razorpay Online Payment Integration */}
          {paymentMode === "online" && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={13} className="text-indigo-600" /> Razorpay Payment Gateway
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  Instant Verification
                </span>
              </div>
              <button
                type="button"
                onClick={handleRazorpayOnline}
                disabled={loading || !selectedStaffId}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Sparkles size={14} /> Pay {formatCurrency(preview?.net_salary || 0)} with Razorpay
              </button>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Or Manual Razorpay Txn / Payment ID
                </label>
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-indigo-400 font-mono"
                  placeholder="e.g. pay_Q8abcdef123456"
                />
              </div>
            </div>
          )}

          {/* Bank Transfer Reference */}
          {paymentMode === "bank_transfer" && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                UTR / Bank Transfer Reference ID *
              </label>
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition font-mono"
                placeholder="e.g. UTR1234567890"
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Note{" "}
              <span className="normal-case font-normal text-slate-300">
                (optional)
              </span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition resize-none"
              placeholder={`e.g. ${formatMonth(salaryMonth)} salary paid by ${paymentMode === "online" ? "online transfer" : "cash"
                }`}
            />
          </div>

          {missingPunchWarning ? (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-900">
                  ⚠️ Action Required: Missing Punch Detected
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {missingPunchWarning.message}
                </p>
                {missingPunchWarning.dates && missingPunchWarning.dates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {missingPunchWarning.dates.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded-md border border-amber-300 font-mono"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-amber-700 mt-2 font-medium">
                  Calculation has been aborted in accordance with Priority 2. Attendance must be regularized and approved before salary can be calculated.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
            </div>
          ) : null}
        </div>
        )}

        {/* Footer */}
        {!createdPayment && (
        <div className="border-t border-slate-100 p-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || isAlreadyGenerated || isNotJoinedYet}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 cursor-pointer"
          >
            {isAlreadyGenerated ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-300" /> Already Generated
              </>
            ) : isNotJoinedYet ? (
              <>
                <AlertCircle size={14} className="text-amber-300" /> Not Joined in {formatMonth(salaryMonth)}
              </>
            ) : loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Processing…
              </>
            ) : (
              <>
                <IndianRupee size={14} /> Generate Salary
              </>
            )}
          </button>
        </div>
        )}
      </div>
    </div>
  );
};

// ─── Bulk Generate Salary Modal ────────────────────────────────────────────────
const BulkGenerateModal = ({
  salaryMonth,
  totalStaff,
  onClose,
  onSuccess,
}: {
  salaryMonth: string;
  totalStaff: number;
  onClose: () => void;
  onSuccess: (result: any) => void;
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("offline");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBulkSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await bulkGenerateSalaries(salaryMonth, paymentMode);
      onSuccess(result);
    } catch (e: any) {
      setError(e?.message || "Failed to bulk generate salaries.");
    } finally {
      setLoading(false);
    }
  };

  const cycleDateRange = useMemo(() => {
    if (!salaryMonth) return "";
    const parts = String(salaryMonth).split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month)) return "";
    const lastDay = new Date(year, month, 0).getDate();
    return `01-${String(month).padStart(2, "0")}-${year} to ${String(lastDay).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  }, [salaryMonth]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative z-[210] bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-base">Bulk Salary Generation</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-indigo-100">
                  {formatMonth(salaryMonth)}
                </span>
                {cycleDateRange && (
                  <span className="text-[10px] font-mono bg-white/20 text-white px-2 py-0.5 rounded-md">
                    {cycleDateRange}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors cursor-pointer"
          >
            <X size={15} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-950">
              <Users size={16} className="text-indigo-600" />
              <span>Batch Process All Active Staff ({totalStaff})</span>
            </div>
            <p className="text-indigo-800 leading-relaxed">
              This automated engine will audit each employee's monthly biometric attendance, calculate total working days, sum approved paid leaves vs. LWP (Leave Without Pay), auto-deduct LWP per-day amounts, and generate draft salary records for your audit and verification before disbursement.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
              Disbursement Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["offline", "online"] as PaymentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMode(m)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                    paymentMode === m
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  }`}
                >
                  {m === "offline" ? <Banknote size={15} /> : <CreditCard size={15} />}
                  <span className="capitalize">{m}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 font-medium">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate All Drafts</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Month Selector ─────────────────────────────────────────────────────────────

const MonthPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  const months = useMemo(() => {
    const result: Array<{ val: string; label: string }> = [];
    const now = new Date();
    // Include 2 months ahead and up to 18 months in the past
    for (let i = -2; i <= 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!result.some((m) => m.val === val)) {
        result.push({ val, label: formatMonth(val) });
      }
    }
    if (value && !result.some((m) => m.val === value)) {
      result.unshift({ val: value, label: formatMonth(value) });
    }
    return result;
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-monthpicker]")) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handlePrev = () => {
    const [y, m] = value.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    onChange(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNext = () => {
    const [y, m] = value.split("-").map(Number);
    const next = new Date(y, m, 1);
    onChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  const selectedLabel = months.find((m) => m.val === value)?.label ?? formatMonth(value);

  return (
    <div className="relative inline-flex items-center gap-1.5" data-monthpicker>
      <button
        type="button"
        onClick={handlePrev}
        title="Previous Month"
        className="p-2 border border-white/20 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition cursor-pointer backdrop-blur-md"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="relative">
        <button
          type="button"
          data-monthpicker
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-2 px-3.5 py-2 border border-white/20 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition cursor-pointer backdrop-blur-md shadow-xs"
        >
          <Calendar size={15} className="text-purple-200 shrink-0" />
          <span>{selectedLabel}</span>
          <ChevronDown
            size={14}
            className={`text-purple-200 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            data-monthpicker
            className="absolute z-[300] top-full right-0 mt-2 bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto min-w-[220px] p-1.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
              Select Salary Month
            </div>
            {months.map((m) => {
              const isSelected = value === m.val;
              return (
                <button
                  key={m.val}
                  type="button"
                  data-monthpicker
                  onClick={() => {
                    onChange(m.val);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <span>{m.label}</span>
                  {isSelected && <CheckCircle2 size={13} className="text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        title="Next Month"
        className="p-2 border border-white/20 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition cursor-pointer backdrop-blur-md"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function GenerateSalaryPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [salaryMonth, setSalaryMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [disbursingAll, setDisbursingAll] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [activePayslip, setActivePayslip] = useState<PayrollPayslip | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipAutoPrint, setPayslipAutoPrint] = useState(false);
  const [skippedStaffWarnings, setSkippedStaffWarnings] = useState<
    Array<{
      staff_id: number;
      staff_name: string;
      flag: string;
      reason: string;
      missing_punch_dates?: string[];
    }>
  >([]);

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // ── GET /api/staff-salary-payment/?salary_month=YYYY-MM + Staff Directory ────────────────────
  const fetchStaff = useCallback(async (month: string, isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setPageLoading(true);
    setFetchError("");
    try {
      const [paymentsData, staffData] = await Promise.all([
        getSalaryPayments(month),
        getStaffList().catch(() => []),
      ]);
      setStaffList(paymentsData.map(transformStaff));
      if (staffData && staffData.length > 0) {
        const formatted = staffData.map((s: any) => ({
          id: s.id,
          name: s.name,
          role: s.category || s.role || "Staff",
          department: s.category || s.department || "General",
          basic_salary: Number(s.salary || 0),
          salary_generated: false,
          joining_date: s.joining_date || s.joiningDate || s.date_of_joining,
        }));
        setAllStaff(formatted);
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleBulkSuccess = useCallback(
    async (result: any) => {
      setShowBulkModal(false);
      if (result.skipped && result.skipped.length > 0) {
        setSkippedStaffWarnings(result.skipped);
        showToast(
          `Bulk salaries generated: ${result.total_processed} processed, ${result.total_skipped} skipped.`,
          "error"
        );
      } else {
        showToast(
          `Bulk salaries generated successfully! ${result.total_processed} draft payslips created.`,
          "success"
        );
      }
      await fetchStaff(salaryMonth, true);
    },
    [fetchStaff, salaryMonth, showToast]
  );

  const buildPayslipObj = useCallback(
    (s: StaffMember): PayrollPayslip => {
      const pRecord = s.payment_record;
      const bDown = (pRecord?.component_breakdown || {}) as Record<string, any>;
      const grossVal =
        pRecord?.total_earnings ||
        bDown.gross_earnings ||
        s.net_salary ||
        s.basic_salary;
      return {
        id: pRecord?.id || s.id,
        school: pRecord?.school || 0,
        staff: s.id,
        staff_name: s.name,
        staff_category: s.role || s.department,
        designation: s.role,
        department: s.department,
        salary_month: salaryMonth,
        basic_salary: s.basic_salary,
        gross_earnings: grossVal,
        total_earnings: grossVal,
        total_deductions: pRecord?.total_deductions || bDown.total_deductions || "0.00",
        net_salary: s.net_salary != null ? s.net_salary : s.basic_salary,
        payment_mode: s.payment_mode || "offline",
        payment_status: s.payment_status || "paid",
        receipt_number: s.receipt_number || `SAL-${salaryMonth}-${s.id}`,
        payment_date: s.payment_date || pRecord?.payment_date,
        working_days: pRecord?.working_days || bDown.working_days,
        present_days: pRecord?.present_days ?? bDown.present_days ?? "0",
        paid_leaves: bDown.paid_leaves ?? 0,
        unpaid_leaves: bDown.unpaid_leaves ?? bDown.lwp_days ?? 0,
        component_breakdown: bDown,
        created_at: pRecord?.created_at || new Date().toISOString(),
      } as unknown as PayrollPayslip;
    },
    [salaryMonth]
  );

  const handleDirectPdfDownload = useCallback(
    async (s: StaffMember) => {
      try {
        const payslipObj = buildPayslipObj(s);
        await downloadPayslipPdf(payslipObj);
        showToast(`Downloaded payslip PDF for ${s.name}`, "success");
      } catch (err: any) {
        showToast(err?.message || "Failed to download PDF.", "error");
      }
    },
    [buildPayslipObj, showToast]
  );

  const openPayslipModal = useCallback(
    (s: StaffMember, autoPrint: boolean = false) => {
      const payslipObj = buildPayslipObj(s);
      setActivePayslip(payslipObj);
      setPayslipAutoPrint(autoPrint);
      setShowPayslipModal(true);
    },
    [buildPayslipObj]
  );

  const handleRunPayrollEngine = async () => {
    setEngineRunning(true);
    setSkippedStaffWarnings([]);
    try {
      const result = await triggerPayrollGeneration(salaryMonth);
      if (result.skipped && result.skipped.length > 0) {
        setSkippedStaffWarnings(result.skipped);
        showToast(
          `Payroll generated with warnings: ${result.total_processed} processed, ${result.total_skipped} skipped.`,
          "error"
        );
      } else {
        showToast(
          `Payroll engine completed successfully! ${result.total_processed} payslip(s) generated.`,
          "success"
        );
      }
      await fetchStaff(salaryMonth, true);
    } catch (err: any) {
      showToast(err?.message || "Failed to run payroll engine.", "error");
    } finally {
      setEngineRunning(false);
    }
  };

  useEffect(() => {
    fetchStaff(salaryMonth);
  }, [salaryMonth, fetchStaff]);

  // ── POST success: update row + open payslip modal with real backend data ───
  const handleSuccess = useCallback((data: SalaryPayment) => {
    const transformed = transformStaff(data);
    setStaffList((prev) => {
      const filteredPrev = prev.filter(
        (s) => s.id !== transformed.id && (!s.payment_record || s.payment_record.staff !== data.staff)
      );
      return [transformed, ...filteredPrev];
    });
    setSelectedStaff(null);
    showToast(
      `Salary generated successfully for ${data.staff_name}`,
      "success",
    );
    const payslipObj = buildPayslipObj(transformed);
    setActivePayslip(payslipObj);
    setShowPayslipModal(true);
  }, [buildPayslipObj, showToast]);

  // ── Unified Staff List (All Active Staff + their Salary Payment status for salaryMonth) ──
  const unifiedStaffList = useMemo(() => {
    if (!allStaff.length) return staffList;

    // Index payment records strictly by staff ID
    const paymentMap = new Map<number, StaffMember>();
    staffList.forEach((p) => {
      const sId = Number(p.payment_record?.staff ?? p.id);
      if (sId) {
        paymentMap.set(sId, p);
      }
    });

    const merged: StaffMember[] = allStaff.map((st) => {
      const payment = paymentMap.get(st.id);
      if (payment) {
        return {
          ...st,
          ...payment,
          id: st.id,
          name: st.name || payment.name,
          role: st.role || payment.role,
          department: st.department || payment.department,
          basic_salary: payment.basic_salary || st.basic_salary,
          salary_generated: true,
          payment_status: payment.payment_status || "pending",
          net_salary: payment.net_salary,
          payment_mode: payment.payment_mode,
          receipt_number: payment.receipt_number,
          payment_date: payment.payment_date,
          payment_record: payment.payment_record,
          joining_date: st.joining_date || payment.joining_date,
        };
      }
      return {
        ...st,
        salary_generated: false,
        payment_status: undefined,
        net_salary: undefined,
        payment_mode: undefined,
        receipt_number: undefined,
        payment_date: undefined,
        payment_record: undefined,
        joining_date: st.joining_date,
      };
    });

    // Also include any payment record that might not be in allStaff
    staffList.forEach((p) => {
      const pStaffId = Number(p.payment_record?.staff ?? p.id);
      if (pStaffId && !allStaff.some((st) => st.id === pStaffId)) {
        merged.push({
          ...p,
          id: pStaffId,
        });
      }
    });

    return merged;
  }, [allStaff, staffList]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    // Only count staff who have generated salary OR were joined during or before salaryMonth
    const eligibleStaff = unifiedStaffList.filter(
      (s) => s.salary_generated || !isStaffJoinedAfterMonth(s.joining_date, salaryMonth)
    );
    const total = eligibleStaff.length;
    const paid = eligibleStaff.filter(
      (s) => s.salary_generated && s.payment_status === "paid"
    ).length;
    const generated = eligibleStaff.filter((s) => s.salary_generated).length;
    const draft = eligibleStaff.filter(
      (s) => s.salary_generated && s.payment_status !== "paid"
    ).length;
    const pending = total - paid;
    const totalNetPaid = unifiedStaffList
      .filter((s) => s.salary_generated && s.payment_status === "paid" && s.net_salary != null)
      .reduce((sum, s) => sum + (s.net_salary ?? 0), 0);
    return { total, generated, pending, paid, draft, totalNetPaid };
  }, [unifiedStaffList, salaryMonth]);

  // ── Departments list for filter dropdown ─────────────────────────────────────
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    unifiedStaffList.forEach((s) => {
      const d = (s.department || "").trim();
      if (d && d !== "-" && d !== "—") depts.add(d);
      const r = (s.role || "").trim();
      if (r && r !== "-" && r !== "—") depts.add(r);
    });
    return Array.from(depts).sort();
  }, [unifiedStaffList]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return unifiedStaffList.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        (s.receipt_number && s.receipt_number.toLowerCase().includes(q));

      const matchFilter =
        filterStatus === "all" ||
        (filterStatus === "paid" && s.salary_generated && s.payment_status === "paid") ||
        (filterStatus === "pending" && (!s.salary_generated || s.payment_status !== "paid")) ||
        (filterStatus === "generated" && s.salary_generated);

      const matchDept =
        selectedDept === "all" ||
        s.department.toLowerCase() === selectedDept.toLowerCase() ||
        s.role.toLowerCase() === selectedDept.toLowerCase();

      return matchSearch && matchFilter && matchDept;
    });
  }, [unifiedStaffList, search, filterStatus, selectedDept]);

  // Filtered staff whose salary has been generated but not yet marked 'paid'
  const pendingFiltered = useMemo(() => {
    return filtered.filter(
      (s) => s.salary_generated && s.payment_status !== "paid"
    );
  }, [filtered]);

  const handleApproveDisburseAll = async () => {
    if (pendingFiltered.length === 0) {
      showToast("No pending/draft salaries to disburse in current view.", "error");
      return;
    }

    const confirmMsg = `Approve and mark as Disbursed/Paid for ${pendingFiltered.length} staff member(s) for ${formatMonth(salaryMonth)}?`;
    if (!window.confirm(confirmMsg)) return;

    setDisbursingAll(true);
    try {
      const paymentIds = pendingFiltered
        .map((s) => s.payment_record?.id)
        .filter((id): id is number => typeof id === "number" && id > 0);
      const staffIds = pendingFiltered.map((s) => s.id);

      const res = await bulkDisburseSalaries(
        salaryMonth,
        paymentIds.length > 0 ? paymentIds : undefined,
        staffIds
      );
      showToast(
        res.message || `Approved & disbursed ${res.disbursed_count} salaries successfully!`,
        "success"
      );
      await fetchStaff(salaryMonth, true);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to disburse salaries.",
        "error"
      );
    } finally {
      setDisbursingAll(false);
    }
  };

  const progressPct = stats.total
    ? Math.round((stats.generated / stats.total) * 100)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl"
            style={
              toast.type === "success"
                ? {
                  background: "#052e16",
                  color: "white",
                  border: "1px solid #166534",
                }
                : {
                  background: "#450a0a",
                  color: "white",
                  border: "1px solid #991b1b",
                }
            }
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}

            <p className="text-xs font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Page Header Banner ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#5c28e8] via-[#4d20cb] to-[#361399] p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Payroll Disbursement
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Generate Salary</h1>
            <p className="text-purple-100 max-w-xl text-sm md:text-base">
              Process monthly disbursements, manage payment receipts, and record payouts.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={engineRunning || refreshing || pageLoading || disbursingAll}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm shadow-indigo-200 cursor-pointer"
              title="Batch generate draft salaries for all active staff"
            >
              <Sparkles size={15} />
              Generate Bulk Salaries
            </button>
            <button
              onClick={handleApproveDisburseAll}
              disabled={disbursingAll || engineRunning || refreshing || pageLoading || pendingFiltered.length === 0}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm shadow-emerald-200 cursor-pointer"
              title="Approve and disburse all currently filtered pending salaries in one click"
            >
              {disbursingAll ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Disbursing…
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Approve & Disburse All {pendingFiltered.length > 0 ? `(${pendingFiltered.length})` : ""}
                </>
              )}
            </button>
            <button
              onClick={() =>
                setSelectedStaff({
                  id: 0,
                  name: "",
                  role: "",
                  department: "",
                  basic_salary: 0,
                  salary_generated: false,
                })
              }
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-semibold transition flex items-center gap-2 backdrop-blur-md shadow-sm"
            >
              <IndianRupee size={15} />
              Generate Salary
            </button>
            <MonthPicker value={salaryMonth} onChange={setSalaryMonth} />
            <button
              onClick={() => fetchStaff(salaryMonth, true)}
              disabled={refreshing || pageLoading || engineRunning}
              title="Refresh"
              className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="space-y-6">
        {/* Loading */}
        {pageLoading && (
          <div className="flex flex-col items-center justify-center py-36 gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading salary data…</p>
          </div>
        )}

        {/* Skipped Staff / Missing Punch Warning Banner */}
        {skippedStaffWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900">
                    Attendance Regularization Required ({skippedStaffWarnings.length} staff member{skippedStaffWarnings.length > 1 ? "s" : ""} skipped)
                  </h3>
                  <p className="text-xs text-amber-800 mt-1">
                    The following staff members have unregularized missing punches (check-in without check-out). Their payroll calculation was aborted in accordance with Priority 2:
                  </p>
                  <div className="mt-3 space-y-2">
                    {skippedStaffWarnings.map((item) => (
                      <div
                        key={item.staff_id}
                        className="bg-white/90 border border-amber-200 rounded-xl px-3.5 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="font-semibold text-slate-900">{item.staff_name}</span>
                        <span className="text-[11px] text-amber-700">{item.reason}</span>
                        {item.missing_punch_dates && item.missing_punch_dates.length > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-medium">
                            Missing Punches: {item.missing_punch_dates.join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSkippedStaffWarnings([])}
                className="p-1 text-amber-600 hover:text-amber-900 rounded-lg hover:bg-amber-100 transition-colors"
                title="Dismiss warning"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {!pageLoading && fetchError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">
                Failed to load salary data
              </p>
              <p className="text-xs text-red-500 mt-0.5">{fetchError}</p>
            </div>
            <button
              onClick={() => fetchStaff(salaryMonth)}
              className="text-xs font-bold text-red-600 hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {!pageLoading && !fetchError && (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                icon={Users}
                label="Total Staff"
                value={stats.total}
                sub={formatMonth(salaryMonth)}
                iconBg="bg-slate-700"
              />
              <StatCard
                icon={BadgeCheck}
                label="Salary Paid"
                value={stats.paid}
                sub={`${progressPct}% disbursed`}
                iconBg="bg-emerald-500"
              />
              <StatCard
                icon={Hourglass}
                label="Pending"
                value={stats.pending}
                sub={
                  stats.pending === 0
                    ? "All done! 🎉"
                    : `${stats.pending} remaining`
                }
                iconBg="bg-amber-500"
              />
            </div>

            {/* ── Progress Bar ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-slate-700">
                  Monthly Progress ·{" "}
                  <span className="text-slate-400 font-normal">
                    {formatMonth(salaryMonth)}
                  </span>
                </p>
                <p className="text-sm font-bold text-indigo-600">
                  {stats.paid}
                  <span className="text-slate-300 font-normal">
                    /{stats.total} paid
                  </span>
                </p>
              </div>
              <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {progressPct === 100
                  ? "✓ All salaries paid for this month"
                  : `${progressPct}% salaries disbursed for this month`}
              </p>
            </div>

            {/* ── Search + Filter ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, role, department…"
                  className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white transition"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Department Dropdown Filter */}
              <div className="min-w-[170px]">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                  title="Filter staff by department or category"
                >
                  <option value="all">All Departments</option>
                  {departmentOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "all", label: "All", count: stats.total },
                  { id: "paid", label: "Paid", count: stats.paid },
                  { id: "pending", label: "Pending", count: stats.pending },
                  { id: "generated", label: "Generated", count: stats.generated },
                ].map(({ id, label, count }) => (
                  <button
                    key={id}
                    onClick={() => setFilterStatus(id as FilterStatus)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterStatus === id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        filterStatus === id
                          ? "bg-white/25 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Staff List ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* List header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-600">
                    {filtered.length} staff member
                    {filtered.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {stats.totalNetPaid > 0 && (
                  <p className="text-xs text-slate-400">
                    Disbursed:{" "}
                    <span className="text-indigo-600 font-semibold">
                      {formatCurrency(stats.totalNetPaid)}
                    </span>
                  </p>
                )}
              </div>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="py-16 flex flex-col items-center text-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Search size={22} className="text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-semibold">No staff found</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {search
                      ? `No results for "${search}"`
                      : filterStatus !== "all"
                        ? `No ${filterStatus} salaries for ${formatMonth(salaryMonth)}`
                        : `No records for ${formatMonth(salaryMonth)}`}
                  </p>
                  {(search || filterStatus !== "all") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("all");
                      }}
                      className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {/* Rows */}
              {filtered.length > 0 && (
                <div className="divide-y divide-slate-50">
                  {filtered.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${getAvatarColor(s.id)} shrink-0 shadow-sm`}
                      >
                        <span className="text-xs font-bold text-white">
                          {getInitials(s.name)}
                        </span>
                      </div>

                      {/* Name + category (display only) + status badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {s.name}
                          </p>
                          <StatusBadge
                            generated={s.salary_generated}
                            mode={
                              s.salary_generated ? s.payment_mode : undefined
                            }
                            status={s.payment_status}
                          />
                        </div>
                        {/* Category label — display-only, not in any payload */}
                        <p className="text-xs text-slate-400 mt-0.5 truncate uppercase tracking-wide">
                          {s.role}
                          {s.receipt_number && s.salary_generated && (
                            <span className="text-slate-300 font-mono ml-2 normal-case tracking-normal">
                              · {s.receipt_number}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Salary amounts */}
                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-xs text-slate-400">Basic Salary</p>
                        <p className="text-sm font-bold text-slate-700 tabular-nums">
                          {formatCurrency(s.basic_salary)}
                        </p>
                        {s.salary_generated && s.net_salary != null && (
                          <p className="text-xs text-emerald-600 font-semibold tabular-nums">
                            Net: {formatCurrency(s.net_salary)}
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                        {s.salary_generated ? (
                          <>
                            {/* Eye (View) Icon Button: Opens Payslip Modal */}
                            <button
                              onClick={() => openPayslipModal(s)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors shadow-2xs"
                              title="Audit structured Payslip with attendance and deductions"
                            >
                              <Eye size={13} /> Payslip
                            </button>

                            {/* Direct PDF Download Button */}
                            <button
                              onClick={() => handleDirectPdfDownload(s)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                              title="Download Payslip PDF directly"
                            >
                              <Download size={13} /> PDF
                            </button>

                            {s.payment_status === "paid" ? (
                              <Link
                                href={`/trustee/cheque-printing?payee=${encodeURIComponent(s.name)}&amount=${s.net_salary != null ? s.net_salary : s.basic_salary}&memo=${encodeURIComponent("Salary - " + formatMonth(salaryMonth))}`}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Print Cheque for this disbursement"
                              >
                                <Printer size={13} /> Cheque
                              </Link>
                            ) : (
                              <button
                                onClick={() => setSelectedStaff(s)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                                title="Disburse and record payment for this draft"
                              >
                                <CheckCircle2 size={13} /> Disburse
                              </button>
                            )}
                          </>
                        ) : isStaffJoinedAfterMonth(s.joining_date, salaryMonth) ? (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium border border-slate-200"
                            title={`Staff joined on ${s.joining_date}. Salary cannot be generated for months prior to joining date.`}
                          >
                            Joined {s.joining_date}
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedStaff(s)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 cursor-pointer"
                            title="Calculate and generate salary for this staff member"
                          >
                            <IndianRupee size={13} /> Generate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Pending reminder ── */}
            {stats.pending > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">
                    {stats.pending} salary{stats.pending > 1 ? "ies" : ""}{" "}
                    pending for {formatMonth(salaryMonth)}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Click <strong>Pending</strong> above to filter and process
                    outstanding salaries quickly.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showBulkModal && (
        <BulkGenerateModal
          salaryMonth={salaryMonth}
          totalStaff={allStaff.length || staffList.length}
          onClose={() => setShowBulkModal(false)}
          onSuccess={handleBulkSuccess}
        />
      )}

      {showPayslipModal && activePayslip && (
        <SalarySlipModal
          isOpen={showPayslipModal}
          onClose={() => {
            setShowPayslipModal(false);
            setPayslipAutoPrint(false);
          }}
          payslip={activePayslip}
          autoPrint={payslipAutoPrint}
        />
      )}

      {selectedStaff && (
        <GenerateModal
          staff={selectedStaff}
          salaryMonth={salaryMonth}
          onClose={() => setSelectedStaff(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
