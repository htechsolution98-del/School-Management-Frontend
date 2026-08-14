"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  TrendingUp,
  Clock,
  Building2,
  Download,
} from "lucide-react";
import { getSalaryPayments, generateSalary, getStaffList } from "@/lib/fees";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ComponentSnapshot {
  component_id: number;
  name: string;
  component_type: "earning" | "deduction";
  calculation_type: string;
  value: string;
  amount: string;
}

interface SalaryPayment {
  id: number;
  school: number;
  staff: number;
  staff_name: string;
  staff_category: string;
  salary_month: string;
  basic_salary: string;
  total_earnings: string;
  total_deductions: string;
  working_days: number;
  present_days: string;
  absent_days: number;
  half_days: number;
  attendance_deduction: string;
  component_snapshot: ComponentSnapshot[];
  net_salary: string;
  paid_amount: string;
  payment_mode: string;
  payment_status: string;
  transaction_id: string | null;
  receipt_number: string;
  payment_date: string;
  note: string;
  paid_by: number;
  paid_by_username: string;
  created_at: string;
  updated_at: string;
}

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
}

type PaymentMode = "offline" | "online";
type FilterStatus = "all" | "generated" | "pending";

// ─── Transform raw API response → StaffMember ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStaff(raw: any): StaffMember {
  const isPaid = raw.payment_status === "paid";
  return {
    id: raw.id ?? raw.staff,
    name: raw.staff_name ?? raw.name ?? raw.full_name ?? "—",
    role: raw.staff_category ?? raw.role ?? raw.designation ?? "—",
    department: raw.staff_category ?? raw.department ?? "—",
    basic_salary: parseFloat(raw.basic_salary ?? "0"),
    salary_generated: isPaid,
    payment_status: raw.payment_status,
    net_salary: raw.net_salary != null ? parseFloat(raw.net_salary) : undefined,
    payment_mode: raw.payment_mode,
    receipt_number: raw.receipt_number,
    payment_date: raw.payment_date,
    payment_record: isPaid ? (raw as SalaryPayment) : undefined,
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
}: {
  generated: boolean;
  mode?: string;
}) =>
  generated ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 size={10} />
      Paid
      {mode && (
        <span className="capitalize text-emerald-500 font-normal">
          · {mode}
        </span>
      )}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
      <Hourglass size={10} />
      Pending
    </span>
  );

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

// ─── Receipt Modal ──────────────────────────────────────────────────────────────
// Shows ONLY data that came from the backend. No fabricated fields.

const ReceiptModal = ({
  data,
  onClose,
}: {
  data: SalaryPayment;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
      {/* Gradient Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
        >
          <X size={15} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/15 rounded-xl p-2.5">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-indigo-200 tracking-widest uppercase">
              Salary Slip
            </p>
            <p className="font-bold text-lg leading-tight">{data.staff_name}</p>
            <p className="text-xs text-indigo-200 mt-0.5">
              {data.staff_category}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Month", val: formatMonth(data.salary_month) },
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
      <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Attendance */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Attendance
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                label: "Working",
                val: data.working_days,
                color: "text-slate-700",
              },
              {
                label: "Present",
                val: data.present_days,
                color: "text-emerald-600",
              },
              { label: "Absent", val: data.absent_days, color: "text-red-500" },
              {
                label: "Half Day",
                val: data.half_days,
                color: "text-amber-500",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center"
              >
                <p className={`text-xl font-bold ${color}`}>{val}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
              Total Earnings
            </p>
            <p className="text-xl font-bold text-emerald-700">
              {formatCurrency(data.total_earnings)}
            </p>
            <p className="text-xs text-emerald-500 mt-1">
              Basic: {formatCurrency(data.basic_salary)}
            </p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">
              Total Deductions
            </p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(data.total_deductions)}
            </p>
            <p className="text-xs text-red-400 mt-1">
              Attendance: {formatCurrency(data.attendance_deduction)}
            </p>
          </div>
        </div>

        {/* Salary Components */}
        {data.component_snapshot?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Salary Components
            </p>
            <div className="space-y-1.5">
              {data.component_snapshot.map((c) => (
                <div
                  key={c.component_id}
                  className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {c.component_type} · {c.calculation_type} · {c.value}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold tabular-nums ${c.component_type === "earning"
                      ? "text-emerald-600"
                      : "text-red-500"
                      }`}
                  >
                    {c.component_type === "deduction" ? "−" : "+"}
                    {formatCurrency(c.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Net Salary Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 text-white flex justify-between items-center">
          <div>
            <p className="text-xs text-indigo-200">Net Salary Paid</p>
            <p className="text-2xl font-bold mt-0.5 tabular-nums">
              {formatCurrency(data.net_salary)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-200">Payment Mode</p>
            <p className="font-semibold capitalize mt-0.5">
              {data.payment_mode}
            </p>
            {data.transaction_id && (
              <p className="text-[10px] text-indigo-300 mt-0.5 font-mono">
                {data.transaction_id}
              </p>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Paid on</span>
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
      <div className="border-t border-slate-100 p-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Close
        </button>
        <button className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200">
          <Download size={14} /> Download PDF
        </button>
      </div>
    </div>
  </div>
);

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
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staffOptions, setStaffOptions] = useState<StaffMember[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<number>(0);
  const [openDropdown, setOpenDropdown] = useState<"category" | "staff" | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);


  const handleSubmit = async () => {
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

    if (paymentMode === "online" && !transactionId.trim()) {
      setError("Transaction ID is required.");
      return;
    }
    setError("");
    setLoading(true);

    // ── Backend payload — staff id only, no category, no receipt_number ───
    const body: Record<string, unknown> = {
      staff: selectedStaffId,
      salary_month: salaryMonth,
      payment_mode: paymentMode,

      // required by backend
      receipt_number: `SAL-${salaryMonth}-${selectedStaffId}`,
      // optional note
      note: note.trim(),
    };
    if (note.trim()) body.note = note.trim();
    if (paymentMode === "online") body.transaction_id = transactionId.trim();
    // ──────────────────────────────────────────────────────────────────────

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await generateSalary(body as any);
      onSuccess(data);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to generate salary.";
      setError(msg);
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
        }));

        setStaffOptions(formatted);
      } catch (err) {
        console.error(err);
      }
    }

    loadStaff();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 rounded-xl p-2.5">
              <Wallet size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Generate Salary</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatMonth(salaryMonth)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
          >
            <X size={15} className="text-slate-500" />
          </button>
        </div>

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

        {/* Form */}
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
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
              Payment Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["offline", "online"] as PaymentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMode(m)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${paymentMode === m
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                    }`}
                >
                  {m === "offline" ? (
                    <Banknote size={15} />
                  ) : (
                    <CreditCard size={15} />
                  )}
                  <span className="capitalize">{m}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID — online only */}
          {paymentMode === "online" && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Transaction ID *
              </label>
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition font-mono"
                placeholder="e.g. TXN123456"
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

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
          >
            {loading ? (
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
    const result = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      result.push({ val, label: formatMonth(val) });
    }
    return result;
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-monthpicker]")) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selectedLabel = months.find((m) => m.val === value)?.label ?? value;

  return (
    <div className="relative" data-monthpicker>
      <button
        type="button"
        data-monthpicker
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 pl-3 pr-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-400 transition cursor-pointer"
      >
        <Calendar size={14} className="text-slate-400 shrink-0" />
        <span className="font-medium">{selectedLabel}</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          data-monthpicker
          className="absolute z-[200] top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto min-w-[180px]"
        >
          {months.map((m) => (
            <button
              key={m.val}
              type="button"
              data-monthpicker
              onClick={() => { onChange(m.val); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${value === m.val
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-700"
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
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
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [receiptData, setReceiptData] = useState<SalaryPayment | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // ── GET /api/staff-salary-payment/?salary_month=YYYY-MM ────────────────────
  const fetchStaff = useCallback(async (month: string, isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setPageLoading(true);
    setFetchError("");
    try {
      const data = await getSalaryPayments(month);
      setStaffList(data.map(transformStaff));
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff(salaryMonth);

    async function loadAllStaff() {
      try {
        const data = await getStaffList();

        const formatted = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          role: s.category,
          department: s.category,
          basic_salary: Number(s.salary || 0),
          salary_generated: false,
        }));

        setAllStaff(formatted);
      } catch (err) {
        console.error(err);
      }
    }

    loadAllStaff();
  }, [salaryMonth, fetchStaff]);
  // ── POST success: update row + open receipt modal with real backend data ───
  const handleSuccess = useCallback((data: SalaryPayment) => {
    setStaffList((prev) => [transformStaff(data), ...prev]);
    setSelectedStaff(null);
    setReceiptData(data);
    showToast(
      `Salary generated successfully for ${data.staff_name}`,
      "success",
    );
  }, [showToast]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = allStaff.length;
    const generated = staffList.filter((s) => s.salary_generated).length;
    const pending = total - generated;
    const totalNetPaid = staffList
      .filter((s) => s.salary_generated && s.net_salary != null)
      .reduce((sum, s) => sum + (s.net_salary ?? 0), 0);
    return { total, generated, pending, totalNetPaid };
  }, [staffList]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return staffList.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);
      const matchFilter =
        filterStatus === "all" ||
        (filterStatus === "generated" && s.salary_generated) ||
        (filterStatus === "pending" && !s.salary_generated);
      return matchSearch && matchFilter;
    });
  }, [staffList, search, filterStatus]);

  const progressPct = stats.total
    ? Math.round((stats.generated / stats.total) * 100)
    : 0;

  // ── Open receipt — prefer stored payment_record (real data) ─────────────────
  const openReceipt = useCallback(
    (s: StaffMember) => {
      if (s.payment_record) {
        setReceiptData(s.payment_record);
        return;
      }
      // Fallback: build minimal object from list-level fields
      // (only used if the GET list endpoint doesn't return full payment details)
      setReceiptData({
        id: s.id,
        school: 0,
        staff: s.id,
        staff_name: s.name,
        staff_category: s.department,
        salary_month: salaryMonth,
        basic_salary: String(s.basic_salary),
        total_earnings: "0.00",
        total_deductions: "0.00",
        working_days: 0,
        present_days: "0",
        absent_days: 0,
        half_days: 0,
        attendance_deduction: "0.00",
        component_snapshot: [],
        net_salary: String(s.net_salary ?? s.basic_salary),
        paid_amount: String(s.net_salary ?? s.basic_salary),
        payment_mode: s.payment_mode ?? "offline",
        payment_status: "paid",
        transaction_id: null,
        receipt_number: s.receipt_number ?? "—",
        payment_date: s.payment_date ?? new Date().toISOString(),
        note: "",
        paid_by: 0,
        paid_by_username: "—",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    [salaryMonth],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
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
      {/* ── Page Header — NOT sticky ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Generate Salary
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Process and manage staff salary payments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm shadow-indigo-200"
            >
              <IndianRupee size={15} />
              Generate Salary
            </button>
            <MonthPicker value={salaryMonth} onChange={setSalaryMonth} />
            <button
              onClick={() => setStaffList([])}
              disabled={refreshing || pageLoading}
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
      <div className="p-6 space-y-6">
        {/* Loading */}
        {pageLoading && (
          <div className="flex flex-col items-center justify-center py-36 gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading salary data…</p>
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
                label="Salary Generated"
                value={stats.generated}
                sub={`${progressPct}% complete`}
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
                  {stats.generated}
                  <span className="text-slate-300 font-normal">
                    /{stats.total}
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
                  ? "✓ All salaries processed for this month"
                  : `${progressPct}% salaries processed for this month`}
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

              <div className="flex gap-2">
                {(["all", "generated", "pending"] as FilterStatus[]).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setFilterStatus(f)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${filterStatus === f
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                    >
                      {f}
                    </button>
                  ),
                )}
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
                      <div className="shrink-0">
                        {s.salary_generated ? (
                          <button
                            onClick={() => openReceipt(s)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          >
                            <Eye size={13} /> View Receipt
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedStaff(s)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
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
      {selectedStaff && (
        <GenerateModal
          staff={selectedStaff}
          salaryMonth={salaryMonth}
          onClose={() => setSelectedStaff(null)}
          onSuccess={handleSuccess}
        />
      )}
      {receiptData && (
        <ReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </div>
  );
}
