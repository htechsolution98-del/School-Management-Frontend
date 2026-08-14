"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Calendar, CheckCircle2, Clock, FileText,
    Plus, Pencil, Trash2, Loader2, X, AlertCircle, Power,
} from "lucide-react";
import {
    getAcademicYearsForPrincipal,
    createAcademicYearForPrincipal,
    updateAcademicYearForPrincipal,
    deleteAcademicYearForPrincipal,
    type AcademicYear,
} from "@/lib/principal";

// ─── MONTHS ───────────────────────────────────────────────────────────────────
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

function monthLabel(m: number) {
    return MONTHS.find((x) => x.value === m)?.label ?? "—";
}

function monthCount(start: number, end: number) {
    if (!start || !end) return 0;
    return end >= start ? end - start + 1 : 12 - start + end + 1;
}

// ─── BILLING PERIODS ─────────────────────────────────────────────────────────
function buildBillingPeriods(
    name: string,
    start_month: number,
    end_month: number
): { code: string; label: string }[] {
    if (!name || !start_month || !end_month) return [];
    const [startYearStr] = name.split("-");
    const startYear = parseInt(startYearStr, 10);
    if (isNaN(startYear)) return [];

    const periods: { code: string; label: string }[] = [];
    let month = start_month;
    let year = startYear;

    while (true) {
        const code = `${year}-${String(month).padStart(2, "0")}`;
        const label = new Date(year, month - 1, 1).toLocaleString("en-IN", {
            month: "short",
            year: "numeric",
        });
        periods.push({ code, label });
        if (month === end_month) break;
        month++;
        if (month > 12) { month = 1; year++; }
        if (periods.length > 24) break; // safety
    }
    return periods;
}

// ─── DERIVE STATUS ────────────────────────────────────────────────────────────
// 4 states:
//   Active      → is_active === true
//   Deactivated → is_active === false  AND  year has started (current date ≥ first billing period)
//   Upcoming    → year hasn't started yet (current date < first billing period)
//   Completed   → year has fully ended   (current date > last billing period)
function deriveStatus(year: AcademicYear): "Active" | "Deactivated" | "Completed" | "Upcoming" {
    if (year.is_active === true) return "Active";

    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let periods = year.billing_periods ?? [];
    if ((!periods || periods.length === 0) && year.name) {
        const startYearStr = year.name.split("-")[0];
        let startYear = parseInt(startYearStr, 10);
        if (isNaN(startYear) && year.start_year) startYear = year.start_year;
        if (!isNaN(startYear) && year.start_month && year.end_month) {
            const built = buildBillingPeriods(year.name || `${startYear}-${startYear + 1}`, year.start_month, year.end_month);
            periods = built.map((p) => p.code);
        }
    }

    if (periods.length > 0) {
        const first = periods[0];
        const last = periods[periods.length - 1];

        if (currentPeriod > last) return "Completed";
        if (currentPeriod >= first) {
            // Year has started — if manually deactivated show "Deactivated", else "Active"
            return year.is_active === false ? "Deactivated" : "Active";
        }
        // currentPeriod < first → year hasn't started yet
        return "Upcoming";
    }

    return "Upcoming";
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({
    icon, iconBg, iconColor, label, value, sub, badge,
}: {
    icon: React.ReactNode; iconBg: string; iconColor: string;
    label: string; value: React.ReactNode; sub?: string; badge?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-5 flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <span className={iconColor}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
                {badge && <div className="mt-1">{badge}</div>}
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── CREATE/EDIT MODAL ────────────────────────────────────────────────────────
function AcademicYearModal({
    editing,
    onClose,
    onSaved,
}: {
    editing: AcademicYear | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [startYear, setStartYear] = useState(editing?.start_year ?? new Date().getFullYear());
    const [endYear, setEndYear] = useState(editing?.end_year ?? new Date().getFullYear() + 1);
    const [openDropdown, setOpenDropdown] = useState<"start" | "end" | null>(null);

    const [startMonth, setStartMonth] = useState(editing?.start_month ?? 4);
    const [endMonth, setEndMonth] = useState(editing?.end_month ?? 3);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const close = () => setOpenDropdown(null);
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);


    const handleSave = async () => {
        if (!startYear || !endYear) { setError("Start year and end year are required."); return; }
        setSaving(true);
        setError(null);
        try {
            if (editing) {
                await updateAcademicYearForPrincipal(editing.id, {
                    start_year: startYear,
                    end_year: endYear,
                    start_month: startMonth,
                    end_month: endMonth,
                });
            } else {
                await createAcademicYearForPrincipal({
                    start_year: startYear,
                    end_year: endYear,
                    start_month: startMonth,
                    end_month: endMonth,
                });
            }
            onSaved();
            onClose();
        } catch (e: unknown) {
            if (e instanceof Error) {
                const msg = e.message;
                try {
                    const parsed = JSON.parse(msg);
                    // Handle array values: { name: ["error"], start_month: ["error"] }
                    const allValues = Object.values(parsed).flat();
                    const firstString = allValues.find((v) => typeof v === "string");
                    setError(typeof firstString === "string" ? firstString : msg);
                } catch {
                    // msg is already a plain string
                    setError(msg);
                }
            } else {
                setError("Failed to save.");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-black text-gray-900">
                        {editing ? "Edit Academic Year" : "Create Academic Year"}
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 rounded-xl mb-4">
                        <AlertCircle size={13} /> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">
                                Start Year <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                value={startYear}
                                onChange={(e) => setStartYear(Number(e.target.value))}
                                placeholder="2026"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">
                                End Year <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                value={endYear}
                                onChange={(e) => setEndYear(Number(e.target.value))}
                                placeholder="2027"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Start Month */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">Start Month</label>
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === "start" ? null : "start")}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <span>{MONTHS.find(m => m.value === startMonth)?.label}</span>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === "start" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {openDropdown === "start" && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {MONTHS.map(m => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => { setStartMonth(m.value); setOpenDropdown(null); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${startMonth === m.value ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700"}`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* End Month */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">End Month</label>
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === "end" ? null : "end")}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <span>{MONTHS.find(m => m.value === endMonth)?.label}</span>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === "end" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {openDropdown === "end" && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {MONTHS.map(m => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => { setEndMonth(m.value); setOpenDropdown(null); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${endMonth === m.value ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700"}`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {startYear && endYear && startMonth && endMonth && (
                        <div className="bg-indigo-50 rounded-xl px-3 py-2 text-xs text-indigo-700 font-medium">
                            Duration: {monthCount(startMonth, endMonth)} months
                            ({monthLabel(startMonth)} → {monthLabel(endMonth)})
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                        {saving ? "Saving…" : editing ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AcademicYearPage() {
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<AcademicYear | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAcademicYearsForPrincipal();
            setYears(Array.isArray(data) ? data : []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await deleteAcademicYearForPrincipal(id);
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Delete failed.");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const [togglingId, setTogglingId] = useState<number | null>(null);

    const handleToggleActive = async (year: AcademicYear) => {
        setTogglingId(year.id);
        const newActiveState = !year.is_active;
        try {
            await updateAcademicYearForPrincipal(year.id, {
                is_active: newActiveState,
            });
            toast.success(newActiveState ? "Academic Year activated!" : "Academic Year deactivated!");
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to update status.");
        } finally {
            setTogglingId(null);
        }
    };

    // derive stats
    const activeYear = years.find((y) => deriveStatus(y) === "Active");
    const upcomingCount = years.filter((y) => deriveStatus(y) === "Upcoming").length;
    const activePeriod = activeYear
        ? monthCount(activeYear.start_month, activeYear.end_month)
        : 0;

    const billingPeriods = activeYear
        ? buildBillingPeriods(
            `${activeYear.start_year}-${activeYear.end_year}`,
            activeYear.start_month,
            activeYear.end_month
        )
        : [];

    return (
        <div className="min-h-screen bg-[#f5f6fa] p-3 sm:p-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Academic Years</h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Create, manage and organize academic years and billing periods.
                    </p>
                </div>
                <button
                    onClick={() => { setEditing(null); setShowModal(true); }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200"
                >
                    <Plus size={16} /> Create Academic Year
                </button>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <StatCard
                    icon={<Calendar size={22} />}
                    iconBg="bg-indigo-50" iconColor="text-indigo-500"
                    label="Total Academic Years" value={years.length} sub="All Years"
                />
                <StatCard
                    icon={<Clock size={22} />}
                    iconBg="bg-amber-50" iconColor="text-amber-500"
                    label="Upcoming Years" value={upcomingCount} sub="Next in line"
                />
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-indigo-500" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-red-500">
                        <AlertCircle size={18} /> <span className="text-sm font-semibold">{error}</span>
                    </div>
                ) : years.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">No academic years yet</p>
                        <p className="text-sm mt-1">Click "Create Academic Year" to add one</p>
                    </div>
                ) : (
                    <div className="min-w-[600px]">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {["Year Name", "Duration", "Period", "Status", "Action"].map((h, i) => (
                                        <th key={h} className={`text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4 ${i === 4 ? "text-right" : "text-left"}`}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {years.map((year, i) => {
                                    const period = monthCount(year.start_month, year.end_month);
                                    const status = deriveStatus(year);
                                    return (
                                        <tr key={year.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i === years.length - 1 ? "border-b-0" : ""}`}>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800">
                                                {year.start_year && year.end_year
                                                    ? `${year.start_year}-${year.end_year}`
                                                    : (year as any).name ?? "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Calendar size={14} className="text-gray-300 flex-shrink-0" />
                                                    {year.start_month && year.end_month
                                                        ? `${monthLabel(year.start_month)} – ${monthLabel(year.end_month)}`
                                                        : <span className="text-gray-300">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{period} Month{period !== 1 ? "s" : ""}</td>
                                            <td className="px-6 py-4">
                                                {status === "Active" ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                                                    </span>
                                                ) : status === "Deactivated" ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Deactivated
                                                    </span>
                                                ) : status === "Completed" ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
                                                        <CheckCircle2 size={12} className="text-gray-500" /> Completed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                                        <Clock size={10} /> Upcoming
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleActive(year)}
                                                        disabled={togglingId === year.id}
                                                        title={year.is_active ? "Deactivate Academic Year" : "Activate Academic Year"}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 ${
                                                            year.is_active
                                                                ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200"
                                                                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                        }`}
                                                    >
                                                        {togglingId === year.id ? (
                                                            <Loader2 size={14} className="animate-spin text-emerald-600" />
                                                        ) : (
                                                            <Power size={15} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditing(year); setShowModal(true); }}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(year.id)}
                                                        disabled={deletingId === year.id}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                                                    >
                                                        {deletingId === year.id
                                                            ? <Loader2 size={14} className="animate-spin" />
                                                            : <Trash2 size={15} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Billing Periods ── */}
            {activeYear && billingPeriods.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <h2 className="text-base font-black text-gray-900">
                                Billing Periods – <span className="text-indigo-600">{activeYear.start_year}-{activeYear.end_year}</span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">{billingPeriods.length} billing cycles</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
                        {billingPeriods.map((bp) => (
                            <div key={bp.code} className="border border-gray-100 rounded-xl px-3 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all cursor-pointer">
                                <p className="text-[11px] font-bold text-indigo-500 mb-0.5">{bp.code}</p>
                                <p className="text-sm font-bold text-gray-800">{bp.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && (
                <AcademicYearModal
                    editing={editing}
                    onClose={() => setShowModal(false)}
                    onSaved={load}
                />
            )}

            {/* ── Delete Confirm Dialog ── */}
            {confirmDeleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={22} className="text-red-500" />
                        </div>
                        <h2 className="text-base font-black text-gray-900 text-center mb-1">Delete Academic Year?</h2>
                        <p className="text-sm text-gray-400 text-center mb-6">
                            This action cannot be undone. All billing periods associated with this year will also be removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                disabled={deletingId === confirmDeleteId}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all"
                            >
                                {deletingId === confirmDeleteId
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Trash2 size={14} />}
                                {deletingId === confirmDeleteId ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}


