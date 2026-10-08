"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, TrendingUp, TrendingDown,
  Loader2, AlertCircle, RefreshCw, Sparkles,
  CheckCircle2, X, Layers, BadgeIndianRupee,
} from "lucide-react";
import {
  createSalaryComponent,
  getSalaryComponents,
  type SalaryComponent,
} from "@/lib/fees";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComponentType = "earning" | "deduction";

const PRESETS: { name: string; type: ComponentType; icon: string }[] = [
  { name: "HRA",     type: "earning",   icon: "🏠" },
  { name: "DA",      type: "earning",   icon: "📈" },
  { name: "Bonus",   type: "earning",   icon: "🎁" },
  { name: "Medical", type: "earning",   icon: "🏥" },
  { name: "PF",      type: "deduction", icon: "🏦" },
  { name: "Tax",     type: "deduction", icon: "📋" },
  { name: "ESI",     type: "deduction", icon: "🛡️" },
  { name: "TDS",     type: "deduction", icon: "💸" },
];

// ─── Component Badge ──────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ComponentType }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border"
      style={
        type === "earning"
          ? { background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }
          : { background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }
      }
    >
      {type === "earning"
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />}
      {type === "earning" ? "Earning" : "Deduction"}
    </span>
  );
}

// ─── Preset Chip ─────────────────────────────────────────────────────────────

function PresetChip({
  preset,
  used,
  onClick,
}: {
  preset: typeof PRESETS[0];
  used: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={!used ? { scale: 1.04, y: -2 } : {}}
      whileTap={!used ? { scale: 0.97 } : {}}
      onClick={!used ? onClick : undefined}
      className="flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all"
      style={
        used
          ? {
              background: "#f8fafc",
              borderColor: "#e2e8f0",
              color: "#94a3b8",
              cursor: "not-allowed",
            }
          : preset.type === "earning"
          ? {
              background: "#f0fdf4",
              borderColor: "#86efac",
              color: "#15803d",
              cursor: "pointer",
            }
          : {
              background: "#fef2f2",
              borderColor: "#fca5a5",
              color: "#b91c1c",
              cursor: "pointer",
            }
      }
    >
      <span>{preset.icon}</span>
      {preset.name}
      {used && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
    </motion.button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalaryComponentsPage() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [creating, setCreating]     = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Form state
  const [name, setName]                 = useState("");
  const [componentType, setComponentType] = useState<ComponentType>("earning");
  const [formError, setFormError]       = useState("");

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSalaryComponents();
      setComponents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load components");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComponents(); }, [fetchComponents]);

  const usedNames = new Set(components.map((c) => c.name.toLowerCase()));

  const handleCreate = async (customName?: string, customType?: ComponentType) => {
    const finalName = (customName ?? name).trim();
    const finalType = customType ?? componentType;

    if (!finalName) { setFormError("Component name is required."); return; }
    if (usedNames.has(finalName.toLowerCase())) {
      setFormError("A component with this name already exists."); return;
    }

    setFormError("");
    setCreating(true);
    try {
      const created = await createSalaryComponent({ name: finalName, component_type: finalType });
      setComponents((prev) => [...prev, created]);
      setName("");
      showToast(`"${finalName}" component created successfully!`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create component", "error");
    } finally {
      setCreating(false);
    }
  };

  const earnings   = components.filter((c) => c.component_type === "earning");
  const deductions = components.filter((c) => c.component_type === "deduction");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl"
            style={
              toast.type === "success"
                ? { background: "#052e16", color: "white", border: "1px solid #166534" }
                : { background: "#450a0a", color: "white", border: "1px solid #991b1b" }
            }
          >
            {toast.type === "success"
              ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              : <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
            <p className="text-xs font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5c28e8] via-[#4d20cb] to-[#361399] p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Payroll Configuration
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Salary Components</h1>
            <p className="text-purple-100 max-w-xl text-sm md:text-base">
              Define earning and deduction components for your institutional payroll structure.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={fetchComponents}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all shadow-sm disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* ── Create Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
        className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm"
      >
        {/* Card header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
            <Plus className="h-4.5 w-4.5 text-[#5826df]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Add New Component</p>
            <p className="text-[11px] text-slate-500 font-medium">
              Create a custom or preset salary component
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Presets */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Quick Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <PresetChip
                  key={p.name}
                  preset={p}
                  used={usedNames.has(p.name.toLowerCase())}
                  onClick={() => handleCreate(p.name, p.type)}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or custom</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Custom form */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Name input */}
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Component Name
              </label>
              <input
                type="text"
                placeholder="e.g. Transport Allowance"
                value={name}
                onChange={(e) => { setName(e.target.value); setFormError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5826df] focus:ring-2 focus:ring-[#5826df]/20 transition-all shadow-2xs"
              />
            </div>

            {/* Type toggle */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Type
              </label>
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 h-[42px]">
                {(["earning", "deduction"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setComponentType(t)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all"
                    style={
                      componentType === t
                        ? t === "earning"
                          ? { background: "#dcfce7", color: "#15803d", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                          : { background: "#fee2e2", color: "#b91c1c", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                        : { color: "#94a3b8" }
                    }
                  >
                    {t === "earning"
                      ? <TrendingUp className="h-3.5 w-3.5" />
                      : <TrendingDown className="h-3.5 w-3.5" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCreate()}
                disabled={creating || !name.trim()}
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 h-[42px] bg-[#5826df] hover:bg-[#4a1ec4] shadow-md shadow-indigo-500/25"
              >
                {creating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  : <><Plus className="h-4 w-4" /> Create</>}
              </motion.button>
            </div>
          </div>

          {/* Form error */}
          <AnimatePresence>
            {formError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs font-bold text-red-500 flex items-center gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5" /> {formError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Components List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-28 gap-3">
          <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
          <p className="text-xs font-bold text-slate-400">Loading components…</p>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-5"
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-xs font-bold text-red-600">{error}</p>
        </motion.div>
      ) : components.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="rounded-2xl bg-orange-50 p-8 mb-4">
            <BadgeIndianRupee className="h-12 w-12 text-orange-300" />
          </div>
          <p className="font-black text-lg text-slate-700">No components yet</p>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Add your first salary component above
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14 }}
            className="bg-white rounded-2xl border-2 border-emerald-100 overflow-hidden"
            style={{ boxShadow: "0 4px 20px -4px rgba(16,185,129,0.1)" }}
          >
            <div
              className="px-5 py-3.5 border-b border-emerald-100 flex items-center gap-2.5"
              style={{ background: "linear-gradient(135deg, #f0fdf4, #fff)" }}
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">Earnings</p>
                <p className="text-[10px] text-slate-500 font-medium">{earnings.length} component{earnings.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <AnimatePresence>
                {earnings.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400 font-medium">No earning components yet</p>
                ) : (
                  earnings.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-sm font-bold text-slate-800">{c.name}</span>
                      </div>
                      <TypeBadge type="earning" />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Deductions */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-white rounded-2xl border-2 border-red-100 overflow-hidden"
            style={{ boxShadow: "0 4px 20px -4px rgba(239,68,68,0.08)" }}
          >
            <div
              className="px-5 py-3.5 border-b border-red-100 flex items-center gap-2.5"
              style={{ background: "linear-gradient(135deg, #fef2f2, #fff)" }}
            >
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">Deductions</p>
                <p className="text-[10px] text-slate-500 font-medium">{deductions.length} component{deductions.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <AnimatePresence>
                {deductions.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400 font-medium">No deduction components yet</p>
                ) : (
                  deductions.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-sm font-bold text-slate-800">{c.name}</span>
                      </div>
                      <TypeBadge type="deduction" />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}

      {/* Summary footer */}
      {components.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-3.5"
          style={{ boxShadow: "0 2px 10px -2px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-bold text-slate-600">
              {components.length} total component{components.length !== 1 ? "s" : ""} defined
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> {earnings.length} Earning
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-400" /> {deductions.length} Deduction
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
