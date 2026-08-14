"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

// ─── Import from your forms.ts ────────────────────────────────────────────────
import {
  getAcademicYears,
  createAcademicYear,
  type AcademicYear,
} from "@/lib/fees"; 

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "2026-04" → "Apr 2026" */
function formatPeriodLabel(code: string): string {
  const [year, month] = code.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** Derive status — 4 states:
 *   Active      → is_active === true
 *   Deactivated → is_active === false AND year has started
 *   Upcoming    → year hasn't started yet
 *   Completed   → year has fully ended
 */
function deriveStatus(year: AcademicYear): "Active" | "Deactivated" | "Completed" | "Upcoming" {
  if (year.is_active === true) return "Active";
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periods = year.billing_periods ?? [];
  if (periods.length > 0) {
    const first = periods[0];
    const last = periods[periods.length - 1];
    if (currentPeriod > last) return "Completed";
    if (currentPeriod >= first) return year.is_active === false ? "Deactivated" : "Active";
    return "Upcoming";
  }
  return "Upcoming";
}

/** Month options for the create form */
const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "Active" | "Completed" | "Upcoming" | "Deactivated" }) {
  const config = {
    Active: {
      bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",
      icon: <CheckCircle2 size={12} className="text-emerald-600" />,
    },
    Completed: {
      bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200",
      icon: <Clock size={12} className="text-slate-400" />,
    },
    Upcoming: {
      bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200",
      icon: <Calendar size={12} className="text-blue-500" />,
    },
    Deactivated: {
      bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200",
      icon: <Clock size={12} className="text-rose-500" />,
    },
  }[status] ?? {
    bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200",
    icon: <Clock size={12} className="text-slate-400" />,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      {status}
    </span>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function MonthDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = MONTHS.find((m) => m.value === value);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-monthdd="${label}"]`)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [label]);

  return (
    <div className="relative" data-monthdd={label}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <button
        type="button"
        data-monthdd={label}
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      >
        <span>{selected?.label}</span>
        <ChevronRight
          size={14}
          className={`text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div
          data-monthdd={label}
          className="absolute z-[300] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto"
        >
          {MONTHS.map((m) => (
            <button
              key={m.value}
              type="button"
              data-monthdd={label}
              onClick={() => { onChange(m.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${value === m.value
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
}

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (year: AcademicYear) => void;
}

function CreateAcademicYearModal({ open, onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [startMonth, setStartMonth] = useState<number>(4); // April default
  const [endMonth, setEndMonth] = useState<number>(3); // March default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever modal opens
  useEffect(() => {
    if (open) { setName(""); setStartMonth(4); setEndMonth(3); setError(null); }
  }, [open]);

  // ── POST /api/academic-year/ ──────────────────────────────────────────────
  async function handleSubmit() {
    if (!name.trim()) { setError("Year name is required."); return; }
    setLoading(true);
    setError(null);
    try {
      const created = await createAcademicYear({
        name: name.trim(),
        start_month: startMonth,
        end_month: endMonth,
      });
      onCreated(created); // bubble up to parent so list updates instantly
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fadeIn">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Create Academic Year</h2>
            <p className="text-sm text-slate-500 mt-0.5">Set up a new academic year and billing cycle.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          {/* Year Name — sent as `name` to POST /api/academic-year/ */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Year Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2026-27"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* start_month & end_month — sent as numbers */}
          <div className="grid grid-cols-2 gap-3">
            <MonthDropdown label="Start Month" value={startMonth} onChange={setStartMonth} />
            <MonthDropdown label="End Month" value={endMonth} onChange={setEndMonth} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Creating…" : "Create Year"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AcademicYearPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ── GET /api/academic-year/ on mount ─────────────────────────────────────
  const fetchYears = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getAcademicYears();
      setYears(data);
      if (data.length > 0) setSelectedYear(data[0]); // auto-select first year
    } catch (err: any) {
      setFetchError(err?.message ?? "Failed to load academic years.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  // ── Optimistic update after POST ─────────────────────────────────────────
  function handleCreated(newYear: AcademicYear) {
    setYears((prev) => [newYear, ...prev]);
    setSelectedYear(newYear);
  }

  // Billing periods array from the selected year's API response
  const billingPeriods = selectedYear?.billing_periods ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <CreateAcademicYearModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />

      <div className="min-h-full bg-slate-50 p-6 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-400">
          <span className="hover:text-indigo-600 cursor-pointer transition">Fees</span>
          <ChevronRight size={14} />
          <span className="font-semibold text-slate-700">Academic Year</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Academic Years
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              View academic years and billing periods
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading academic years…</span>
          </div>
        )}

        {/* Fetch Error */}
        {!loading && fetchError && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            <span>{fetchError}</span>
            <button onClick={fetchYears} className="ml-auto text-xs font-semibold underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* Academic Years Table */}
        {!loading && !fetchError && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[2fr_2.5fr_1.5fr_1.5fr] px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Year Name</span>
              <span>Duration</span>
              <span>Period Count</span>
              <span>Status</span>
            </div>

            {/* Empty state */}
            {years.length === 0 && (
              <div className="py-14 text-center text-slate-400 text-sm">
                No academic years available.
              </div>
            )}

            {/* One row per year returned by GET /api/academic-year/ */}
            {years.map((year, i) => {
              const status = deriveStatus(year);
              const periods = year.billing_periods ?? [];
              const first = periods[0] ? formatPeriodLabel(periods[0]) : "—";
              const last = periods[periods.length - 1] ? formatPeriodLabel(periods[periods.length - 1]) : "—";
              const isSelected = selectedYear?.id === year.id;

              return (
                <div
                  key={year.id}
                  onClick={() => setSelectedYear(year)}
                  className={`
    cursor-pointer transition-colors duration-100 group px-5 py-4
    ${i !== years.length - 1 ? "border-b border-slate-100" : ""}
    ${isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"}
  `}
                >
                  {/* ── Mobile card layout ── */}
                  <div className="sm:hidden flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">{year.name}</span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Calendar size={12} className="text-slate-300 shrink-0" />
                      {periods.length > 0 ? `${first} – ${last}` : "—"}
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600 font-medium">{periods.length} {periods.length === 1 ? "Month" : "Months"}</span>
                    </div>
                  </div>

                  {/* ── Desktop grid layout ── */}
                  <div className="hidden sm:grid grid-cols-[2fr_2.5fr_1.5fr_1.5fr] items-center">
                    <span className="font-bold text-slate-800 text-sm">{year.name}</span>
                    <span className="text-slate-500 text-sm flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-300 shrink-0" />
                      {periods.length > 0 ? `${first} – ${last}` : "—"}
                    </span>
                    <span className="text-slate-600 text-sm font-medium">
                      {periods.length} {periods.length === 1 ? "Month" : "Months"}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Billing Periods — rendered from selected year's billing_periods array */}
        {selectedYear && billingPeriods.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Billing Periods
                  <span className="ml-2 text-indigo-600">· {selectedYear.name}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {billingPeriods.length} billing cycles
                </p>
              </div>
              <StatusBadge status={deriveStatus(selectedYear)} />
            </div>

            {/* Period pills — each string from billing_periods e.g. "2026-04" */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {billingPeriods.map((code) => (
                <div
                  key={code}
                  className="flex flex-col items-center justify-center gap-0.5 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-sm transition-all duration-150 cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-indigo-400 group-hover:text-indigo-600 transition-colors tracking-wider">
                    {code}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-700 transition-colors">
                    {formatPeriodLabel(code)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
    </>
  );
}
