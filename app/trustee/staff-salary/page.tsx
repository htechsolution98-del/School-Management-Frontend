"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Percent,
  IndianRupee,
  Search,
  X,
  Send,
  ChevronDown,
  Users,
  Banknote,
  BarChart3,
  CircleDot,
  Shield,
  Trash2,
  Pencil,   // ← NEW: edit icon
} from "lucide-react";
import {
  getSalaryComponents,
  createStaffSalaryComponent,
  getStaffList,
  getAllStaffSalaryComponents,
  deleteStaffSalaryComponent,
  updateStaffSalaryComponent,
  type CalcType,
  type SalaryComponent,
  type StaffSalaryAssignment as Assignment,
  type StaffMember,
} from "@/lib/fees";

// ─── Types ────────────────────────────────────────────────────────────────────
// ─── API helpers ──────────────────────────────────────────────────────────────
// ─── NEW: Update API helper ───────────────────────────────────────────────────
// PATCH /staff-salary-component/{id}/ with { calculation_type, value }
// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#e0e7ff", "#4f46e5"],
  ["#dcfce7", "#16a34a"],
  ["#fce7f3", "#db2777"],
  ["#ffedd5", "#ea580c"],
  ["#f0fdf4", "#15803d"],
  ["#fef9c3", "#ca8a04"],
];
function avatarStyle(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl"
      style={
        type === "success"
          ? { background: "#052e16", color: "#4ade80", border: "1px solid #166534" }
          : { background: "#450a0a", color: "#f87171", border: "1px solid #991b1b" }
      }
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <p className="text-sm font-semibold">{msg}</p>
    </motion.div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  assignment,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assignment: Assignment | null;
  deleting: boolean;
}) {
  return (
    <AnimatePresence>
      {open && assignment && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto"
              style={{
                background: "white",
                boxShadow: "0 32px 80px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)",
              }}
            >
              <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Remove Assignment?</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    This will remove{" "}
                    <span className="font-bold text-slate-700">{assignment.componentName}</span>{" "}
                    from{" "}
                    <span className="font-bold text-slate-700">{assignment.staffName}</span>.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onConfirm}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}
                  >
                    {deleting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Removing…</>
                    ) : (
                      <><Trash2 className="h-4 w-4" /> Remove</>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── NEW: Edit Modal ──────────────────────────────────────────────────────────
// Opens pre-filled with the existing calculation_type & value.
// On save it calls PATCH /staff-salary-component/{id}/ and updates local state.
function EditModal({
  open,
  onClose,
  assignment,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  onUpdated: (id: number, calcType: CalcType, value: string) => void;
}) {
  const [calcType, setCalcType] = useState<CalcType>("fixed");
  const [value, setValue] = useState("");
  const [formErr, setFormErr] = useState("");
  const [submitting, setSubmitting] = useState(false);



  // Pre-fill form when assignment changes
  useEffect(() => {
    if (assignment) {
      setCalcType(assignment.calculation_type);
      setValue(assignment.value);
      setFormErr("");
    }
  }, [assignment]);

  const handleSave = async () => {
    const v = value.trim();
    if (!v || isNaN(Number(v)) || Number(v) <= 0) {
      setFormErr("Enter a valid positive value.");
      return;
    }
    if (calcType === "percentage" && Number(v) > 100) {
      setFormErr("Percentage cannot exceed 100%.");
      return;
    }
    setFormErr("");
    setSubmitting(true);
    try {
      await updateStaffSalaryComponent(assignment!.id, {
        calculation_type: calcType,
        value: v,
      });
      onUpdated(assignment!.id, calcType, v);
      onClose();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const isEarning = assignment?.componentType === "earning";

  return (
    <AnimatePresence>
      {open && assignment && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md rounded-3xl overflow-hidden pointer-events-auto"
              style={{
                background: "white",
                boxShadow: "0 32px 80px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)",
              }}
            >
              {/* Top accent bar — amber for edit */}
              <div
                className="h-1.5 w-full"
                style={{ background: "linear-gradient(90deg, #f59e0b, #d97706, #b45309)" }}
              />

              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                  >
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 leading-none">Edit Assignment</h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Update calculation type & value</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                > 
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 pb-7 space-y-5">

                {/* Read-only info pill */}
                <div
                  className="rounded-2xl border-2 p-4 flex items-center gap-3"
                  style={{
                    borderColor: isEarning ? "#bbf7d0" : "#fecaca",
                    background: isEarning ? "#f0fdf4" : "#fef2f2",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isEarning ? "#dcfce7" : "#fee2e2" }}
                  >
                    {isEarning
                      ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                      : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{assignment.componentName}</p>
                    <p className="text-xs font-medium text-slate-500 truncate">
                      {assignment.staffName} ·{" "}
                      <span style={{ color: isEarning ? "#15803d" : "#b91c1c" }}>
                        {isEarning ? "Earning" : "Deduction"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Calculation type toggle */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Calculation Type
                  </label>
                  <div className="flex rounded-xl border-2 border-slate-100 bg-slate-50 p-1 gap-1">
                    {(["fixed", "percentage"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setCalcType(t); setFormErr(""); }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold capitalize transition-all"
                        style={
                          calcType === t
                            ? { background: "white", color: "#d97706", boxShadow: "0 2px 8px rgba(217,119,6,0.15)" }
                            : { color: "#94a3b8" }
                        }
                      >
                        {t === "fixed" ? <IndianRupee className="h-3 w-3" /> : <Percent className="h-3 w-3" />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Value input */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Value <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">
                      {calcType === "fixed" ? "₹" : "%"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={calcType === "fixed" ? "100" : "0.5"}
                      placeholder={calcType === "fixed" ? "5000" : "10"}
                      value={value}
                      onChange={(e) => { setValue(e.target.value); setFormErr(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                      className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 pl-9 pr-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50 transition-all"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    />
                  </div>
                </div>

                {/* Live preview */}
                <AnimatePresence>
                  {value && Number(value) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-amber-700">New value preview</p>
                        <p
                          className="text-lg font-black text-amber-700"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {calcType === "fixed"
                            ? `₹${Number(value).toLocaleString("en-IN")}`
                            : `${value}%`}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {formErr && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm font-semibold text-red-500"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" /> {formErr}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={submitting}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      boxShadow: "0 8px 24px -4px rgba(245,158,11,0.4)",
                    }}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Pencil className="h-4 w-4" /> Save Changes</>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Assignment Modal ─────────────────────────────────────────────────────────
function AssignModal({
  open,
  onClose,
  components,
  staffList,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  components: SalaryComponent[];
  staffList: StaffMember[];
  onAssigned: (a: Assignment) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<number | "">("");
  const [selComponent, setSelComponent] = useState<number | "">("");
  const [calcType, setCalcType] = useState<CalcType>("fixed");
  const [value, setValue] = useState("");
  const [formErr, setFormErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"category" | "staff" | "component" | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedCategory("");
      setSelectedStaff("");
      setSelComponent("");
      setCalcType("fixed");
      setValue("");
      setFormErr("");
      setOpenDropdown(null);
    }
  }, [open]);

  const selectedComp = components.find((c) => c.id === selComponent);

  const handleSubmit = async () => {
    if (!selectedStaff) { setFormErr("Select a staff member."); return; }
    if (!selComponent) { setFormErr("Select a salary component."); return; }
    const v = value.trim();
    if (!v || isNaN(Number(v)) || Number(v) <= 0) { setFormErr("Enter a valid positive value."); return; }
    if (calcType === "percentage" && Number(v) > 100) { setFormErr("Percentage cannot exceed 100%."); return; }
    setFormErr("");
    setSubmitting(true);
    try {
      const created = await createStaffSalaryComponent({
        staff: selectedStaff as number,
        component: selComponent as number,
        calculation_type: calcType,
        value: v,
      });
      const comp = components.find((c) => c.id === selComponent)!;
      const staff = staffList.find((s) => s.id === selectedStaff);
      onAssigned({
        id: created.id,
        staffId: selectedStaff as number,
        staffName: staff?.name ?? `Staff #${selectedStaff}`,
        component: selComponent as number,
        componentName: comp.name,
        componentType: comp.component_type,
        calculation_type: calcType,
        value: v,
        isActive: true,
      });
      onClose();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Assignment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg rounded-3xl overflow-hidden pointer-events-auto mx-2 sm:mx-0"
              style={{
                background: "white",
                boxShadow: "0 32px 80px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)",
              }}
            >
              <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />

              <div className="flex items-start justify-between px-4 sm:px-7 pt-5 sm:pt-6 pb-4 sm:pb-5 gap-3">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    <Banknote className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 leading-none">Assign Component</h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Link salary to staff member</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              <div className="px-4 sm:px-7 pb-5 sm:pb-7 space-y-5 max-h-[85vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ── Category ── */}
                  <div className="relative" data-dropdown>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      data-dropdown
                      onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
                      className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-left flex items-center justify-between focus:outline-none focus:border-indigo-400 transition-all"
                      style={{ color: selectedCategory ? "#1e293b" : "#94a3b8" }}
                    >
                      <span>{selectedCategory || "Select Category"}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${openDropdown === "category" ? "rotate-180" : ""}`} />
                    </button>
                    {openDropdown === "category" && (
                      <div data-dropdown className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border-2 border-slate-100 rounded-xl shadow-2xl max-h-44 overflow-y-auto">
                        <button type="button" data-dropdown
                          onClick={() => { setSelectedCategory(""); setSelectedStaff(""); setOpenDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${!selectedCategory ? "bg-indigo-50 text-indigo-700" : "text-slate-400"}`}>
                          Select Category
                        </button>
                        {[...new Set(staffList.map((s) => s.designation ?? s.category ?? ""))].filter(Boolean).map((cat) => (
                          <button key={cat} type="button" data-dropdown
                            onClick={() => { setSelectedCategory(cat); setSelectedStaff(""); setOpenDropdown(null); }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${selectedCategory === cat ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}>
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Staff Name ── */}
                  <div className="relative" data-dropdown>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Staff Name <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      data-dropdown
                      onClick={() => setOpenDropdown(openDropdown === "staff" ? null : "staff")}
                      className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-left flex items-center justify-between focus:outline-none focus:border-indigo-400 transition-all"
                      style={{ color: selectedStaff ? "#1e293b" : "#94a3b8" }}
                    >
                      <span>{selectedStaff ? staffList.find(s => s.id === selectedStaff)?.name : "Select Staff"}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${openDropdown === "staff" ? "rotate-180" : ""}`} />
                    </button>
                    {openDropdown === "staff" && (
                      <div data-dropdown className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border-2 border-slate-100 rounded-xl shadow-2xl max-h-44 overflow-y-auto">
                        <button type="button" data-dropdown
                          onClick={() => { setSelectedStaff(""); setOpenDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${!selectedStaff ? "bg-indigo-50 text-indigo-700" : "text-slate-400"}`}>
                          Select Staff
                        </button>
                        {staffList.filter(s => (s.designation ?? s.category ?? "") === selectedCategory).map(s => (
                          <button key={s.id} type="button" data-dropdown
                            onClick={() => { setSelectedStaff(s.id); setFormErr(""); setOpenDropdown(null); }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${selectedStaff === s.id ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Component ── */}
                  <div className="relative md:col-span-2" data-dropdown>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Component <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      data-dropdown
                      onClick={() => setOpenDropdown(openDropdown === "component" ? null : "component")}
                      className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-left flex items-center justify-between focus:outline-none focus:border-indigo-400 transition-all"
                      style={{ color: selComponent ? "#1e293b" : "#94a3b8" }}
                    >
                      <span>{selComponent ? components.find(c => c.id === selComponent)?.name : "Select…"}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${openDropdown === "component" ? "rotate-180" : ""}`} />
                    </button>
                    {openDropdown === "component" && (
                      <div data-dropdown className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border-2 border-slate-100 rounded-xl shadow-2xl max-h-44 overflow-y-auto">
                        <button type="button" data-dropdown
                          onClick={() => { setSelComponent(""); setOpenDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${!selComponent ? "bg-indigo-50 text-indigo-700" : "text-slate-400"}`}>
                          Select…
                        </button>
                        {components.map(c => (
                          <button key={c.id} type="button" data-dropdown
                            onClick={() => { setSelComponent(c.id); setFormErr(""); setOpenDropdown(null); }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${selComponent === c.id ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Calculation</label>
                    <div className="flex rounded-xl border-2 border-slate-100 bg-slate-50 p-1 gap-1">
                      {(["fixed", "percentage"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setCalcType(t); setFormErr(""); }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold capitalize transition-all"
                          style={calcType === t
                            ? { background: "white", color: "#4f46e5", boxShadow: "0 2px 8px rgba(99,102,241,0.15)" }
                            : { color: "#94a3b8" }}
                        >
                          {t === "fixed" ? <IndianRupee className="h-3 w-3" /> : <Percent className="h-3 w-3" />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Value <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">
                        {calcType === "fixed" ? "₹" : "%"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step={calcType === "fixed" ? "100" : "0.5"}
                        placeholder={calcType === "fixed" ? "5000" : "10"}
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setFormErr(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 pl-9 pr-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedStaff && selComponent && value && Number(value) > 0 && selectedComp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-2xl border-2 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        style={{
                          borderColor: selectedComp.component_type === "earning" ? "#bbf7d0" : "#fecaca",
                          background: selectedComp.component_type === "earning" ? "#f0fdf4" : "#fef2f2",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: selectedComp.component_type === "earning" ? "#dcfce7" : "#fee2e2" }}
                          >
                            {selectedComp.component_type === "earning"
                              ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                              : <TrendingDown className="h-4 w-4 text-red-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{selectedComp.name}</p>
                            <p className="text-xs font-medium" style={{ color: selectedComp.component_type === "earning" ? "#15803d" : "#b91c1c" }}>
                              {selectedComp.component_type === "earning" ? "Earning" : "Deduction"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xl font-black" style={{ fontFamily: "'DM Mono', monospace", color: selectedComp.component_type === "earning" ? "#15803d" : "#b91c1c" }}>
                          {calcType === "fixed" ? `₹${Number(value).toLocaleString("en-IN")}` : `${value}%`}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {formErr && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm font-semibold text-red-500"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" /> {formErr}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3.5 sm:py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 24px -4px rgba(99,102,241,0.5)" }}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Assigning…</>
                  ) : (
                    <><Send className="h-4 w-4" /> Assign Component</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Employee Card ────────────────────────────────────────────────────────────
// CHANGED: added onEdit prop and edit button (pencil) alongside the delete button
function EmployeeCard({
  a,
  index,
  onDelete,
  onEdit,   // ← NEW
}: {
  a: Assignment;
  index: number;
  onDelete: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;   // ← NEW
}) {
  const isEarning = a.componentType === "earning";
  const [bg, fg] = avatarStyle(a.staffId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 28 }}
      className="group relative bg-white rounded-2xl border border-slate-100 p-5 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      {/* Hover gradient */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.02), rgba(139,92,246,0.04))" }}
      />

      {/* Type stripe */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
        style={{ background: isEarning ? "#10b981" : "#ef4444" }}
      />

      {/* ── Action buttons: edit + delete ── */}
      {/* CHANGED: was only delete; now edit (amber) + delete (red) side by side */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onEdit(a)}
          className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-amber-50 transition-colors"
          style={{ color: "#d97706" }}
          title="Edit assignment"
        >
          <Pencil className="h-3.5 w-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onDelete(a)}
          className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors"
          style={{ color: "#ef4444" }}
          title="Remove assignment"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </motion.button>
      </div>

      <div className="flex items-start gap-4 pl-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black shrink-0 leading-tight text-center"
          style={{ background: bg, color: fg }}
        >
          {a.staffName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-16">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">{a.staffName}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{a.componentName}</p>
            </div>

            {/* Value badge */}
            <div
              className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-black shrink-0"
              style={
                a.calculation_type === "fixed"
                  ? { background: "#fefce8", color: "#b45309", border: "1.5px solid #fde68a" }
                  : { background: "#f0f9ff", color: "#0284c7", border: "1.5px solid #bae6fd" }
              }
            >
              {a.calculation_type === "fixed" ? (
                <><IndianRupee className="h-3.5 w-3.5" />{Number(a.value).toLocaleString("en-IN")}</>
              ) : (
                <><Percent className="h-3.5 w-3.5" />{a.value}</>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={isEarning ? { background: "#dcfce7", color: "#15803d" } : { background: "#fee2e2", color: "#b91c1c" }}
            >
              {isEarning ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isEarning ? "Earning" : "Deduction"}
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <CircleDot className="h-3 w-3" />
              {a.calculation_type === "fixed" ? "Fixed Amount" : "Percentage"}
            </span>

            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${a.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${a.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
              {a.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffSalaryPage() {
  const [allComponents, setAllComponents] = useState<SalaryComponent[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "earning" | "deduction">("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── NEW: Edit state ──
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [components, staff, existing] = await Promise.all([
        getSalaryComponents(),
        getStaffList(),
        getAllStaffSalaryComponents(),
      ]);
      setAllComponents(components);
      setStaffList(staff);
      setAssignments(existing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleAssigned = (a: Assignment) => {
    setAssignments((prev) => [a, ...prev]);
    showToast(`${a.componentName} assigned to ${a.staffName}!`, "success");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStaffSalaryComponent(deleteTarget.id);
      setAssignments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      showToast(`${deleteTarget.componentName} removed successfully.`, "success");
      setDeleteTarget(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── NEW: handle successful edit — update local state without refetch ──
  const handleUpdated = (id: number, calcType: CalcType, value: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, calculation_type: calcType, value } : a
      )
    );
    showToast("Assignment updated successfully.", "success");
  };

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const matchType = filter === "all" || a.componentType === filter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        a.staffName.toLowerCase().includes(q) ||
        String(a.staffId).includes(q) ||
        a.componentName.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [assignments, search, filter]);

  const earnings = assignments.filter((a) => a.componentType === "earning").length;
  const deductions = assignments.filter((a) => a.componentType === "deduction").length;

  return (
    <div className="min-h-screen w-full" style={{ background: "#f8f9fc", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500;600&display=swap');
      `}</style>

      <AnimatePresence>{toast && <Toast key="toast" msg={toast.msg} type={toast.type} />}</AnimatePresence>

      <AssignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        components={allComponents}
        staffList={staffList}
        onAssigned={handleAssigned}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        assignment={deleteTarget}
        deleting={deleting}
      />

      {/* ── NEW: Edit modal ── */}
      <EditModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        assignment={editTarget}
        onUpdated={handleUpdated}
      />

      <div className="w-full px-3 sm:px-4 md:px-6 xl:px-10 py-5 space-y-6 overflow-x-hidden">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Payroll</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">Staff Salary</h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">Manage salary component assignments for all staff</p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-500 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setModalOpen(true)}
              disabled={loading || allComponents.length === 0}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}
            >
              <Plus className="h-4 w-4" />
              Assign Salary Component
            </motion.button>
          </div>
        </motion.div>

        {/* ── Loading / Error ── */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Loading…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={loadAll} className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Stats ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {[
                { label: "Total Assigned", value: assignments.length, icon: Users, color: "#4f46e5", bg: "#eef2ff", border: "#e0e7ff" },
                { label: "Earnings", value: earnings, icon: TrendingUp, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                { label: "Deductions", value: deductions, icon: TrendingDown, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
              ].map(({ label, value, icon: Icon, color, bg, border }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="rounded-3xl border p-5 flex items-center gap-4 hover:shadow-lg transition-all duration-300"
                  style={{ background: bg, borderColor: border }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-black" style={{ color, fontFamily: "'DM Mono', monospace" }}>{value}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{ color: `${color}88` }}>{label}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* ── List Panel ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-full bg-white rounded-3xl border border-slate-100 overflow-hidden"
              style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100 flex-wrap">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Assignment Records</p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                    {(["all", "earning", "deduction"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all capitalize"
                        style={
                          filter === f
                            ? { background: "white", color: "#4f46e5", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }
                            : { color: "#94a3b8" }
                        }
                      >
                        {f === "all" ? "All" : f === "earning" ? "Earnings" : "Deductions"}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search staff or component…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all w-full sm:w-52"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* List body */}
              <div className="p-5">
                {assignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-5 py-14 md:py-20 text-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
                        <Users className="h-9 w-9 text-indigo-300" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center">
                        <Plus className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-700">No assignments yet</p>
                      <p className="text-sm text-slate-400 font-medium mt-1 max-w-xs">
                        Click "Assign Salary Component" to link a salary component to a staff member
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setModalOpen(true)}
                      className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
                    >
                      <Plus className="h-4 w-4" /> Assign Salary Component
                    </motion.button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <Search className="h-8 w-8 text-slate-200" />
                    <p className="text-sm font-semibold text-slate-400">No results found</p>
                    <p className="text-xs text-slate-300">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence initial={false}>
                      {filtered.map((a, i) => (
                        <EmployeeCard
                          key={a.id}
                          a={a}
                          index={i}
                          onDelete={(a) => setDeleteTarget(a)}
                          onEdit={(a) => setEditTarget(a)}   // ← NEW
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              {assignments.length > 0 && (
                <div
                  className="px-6 py-4 border-t border-slate-50 flex items-center justify-between gap-3 flex-wrap"
                  style={{ background: "#fafbff" }}
                >
                  <p className="text-xs text-slate-400 font-semibold">
                    Showing <span className="text-slate-700 font-bold">{filtered.length}</span> of{" "}
                    <span className="text-slate-700 font-bold">{assignments.length}</span> records
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {earnings} Earnings
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {deductions} Deductions
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
