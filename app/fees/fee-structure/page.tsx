"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
  Check,
  DollarSign,
  Bus,
  FlaskConical,
  Library,
  GraduationCap,
  FileText,
  ChevronDown,
  Info,
} from "lucide-react";

import {
  getFeeTypes,
  getFeeWiseClasses,
  createFeeWiseClass,
  updateFeeWiseClass,
  deleteFeeWiseClass,
  type FeeType,
  type FeeWiseClass,
  type FeeWiseClassPayload,
  type LateFeeType,
} from "@/lib/fees";
import { getSchoolClasses } from "@/lib/clerk";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const feeFormSchema = z
  .object({
    school_classes: z.array(z.number()).min(1, "Select at least one class"),
    feetype: z.number().min(1, "Select a fee type"),
    amount: z
      .string()
      .min(1, "Amount is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
    late_fee_enabled: z.boolean(),
    grace_days: z.string().optional(),
    late_fee_type: z.enum(["per_day", "flat"]).optional(),
    late_fee_amount: z.string().optional(),
    max_late_fee: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.late_fee_enabled) {
      if (!data.grace_days || isNaN(Number(data.grace_days)))
        ctx.addIssue({ code: "custom", path: ["grace_days"], message: "Required" });
      if (!data.late_fee_type)
        ctx.addIssue({ code: "custom", path: ["late_fee_type"], message: "Required" });
      if (!data.late_fee_amount || !/^\d+(\.\d{1,2})?$/.test(data.late_fee_amount))
        ctx.addIssue({ code: "custom", path: ["late_fee_amount"], message: "Required" });
      if (!data.max_late_fee || !/^\d+(\.\d{1,2})?$/.test(data.max_late_fee))
        ctx.addIssue({ code: "custom", path: ["max_late_fee"], message: "Required" });
    }
  });

type FeeFormValues = z.infer<typeof feeFormSchema>;

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  accent: "#6366f1",
  accentSoft: "#ede9fe",
  accentHover: "#4f46e5",
  danger: "#ef4444",
  dangerSoft: "#fee2e2",
  success: "#16a34a",
  successSoft: "#dcfce7",
  warn: "#d97706",
  warnSoft: "#fef3c7",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#94a3b8",
  subtle: "#f1f5f9",
};

// ─── Icon helper ──────────────────────────────────────────────────────────────
function FeeIcon({ name, size = 18 }: { name: string; size?: number }) {
  const n = name.toLowerCase();
  if (n.includes("tuition")) return <BookOpen size={size} />;
  if (n.includes("transport")) return <Bus size={size} />;
  if (n.includes("exam")) return <FileText size={size} />;
  if (n.includes("library")) return <Library size={size} />;
  if (n.includes("lab")) return <FlaskConical size={size} />;
  if (n.includes("admission")) return <GraduationCap size={size} />;
  return <DollarSign size={size} />;
}

const iconBgMap: Record<string, string> = {
  tuition: "#ede9fe",
  transport: "#ffedd5",
  exam: "#dbeafe",
  library: "#d1fae5",
  lab: "#f3e8ff",
  admission: "#fce7f3",
};
function iconBg(name: string) {
  for (const k of Object.keys(iconBgMap)) {
    if (name.toLowerCase().includes(k)) return iconBgMap[k];
  }
  return "#e0e7ff";
}
function iconColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("tuition")) return "#7c3aed";
  if (n.includes("transport")) return "#ea580c";
  if (n.includes("exam")) return "#2563eb";
  if (n.includes("library")) return "#059669";
  if (n.includes("lab")) return "#9333ea";
  if (n.includes("admission")) return "#db2777";
  return "#4f46e5";
}

// ─── Billing cycle badge ──────────────────────────────────────────────────────
const cycleMap: Record<string, { label: string; bg: string; color: string }> = {
  single: { label: "One-time", bg: "#dbeafe", color: "#1d4ed8" },
  monthly: { label: "Monthly", bg: "#f3e8ff", color: "#7c3aed" },
  quarterly: { label: "Quarterly", bg: "#ffedd5", color: "#c2410c" },
  half_yearly: { label: "Half-Yearly", bg: "#d1fae5", color: "#065f46" },
  yearly: { label: "Yearly", bg: "#dcfce7", color: "#15803d" },
};
function CycleBadge({ cycle }: { cycle: string }) {
  const c = cycleMap[cycle] ?? { label: cycle, bg: C.subtle, color: C.muted };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

// ─── Late fee badge ───────────────────────────────────────────────────────────
function LateBadge({ enabled }: { enabled: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
      background: enabled ? C.successSoft : C.subtle,
      color: enabled ? C.success : C.muted,
    }}>
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 24 }: { size?: number }) {
  return (
    <>
      <Loader2 size={size} color={C.accent} style={{ animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5, letterSpacing: "0.03em" }}>
      {children} {required && <span style={{ color: C.danger }}>*</span>}
    </label>
  );
}

// ─── Input style ──────────────────────────────────────────────────────────────
const inp = (err?: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "9px 12px",
  border: `1.5px solid ${err ? C.danger : C.border}`,
  borderRadius: 8,
  fontSize: 13,
  color: C.text,
  background: err ? "#fff8f8" : "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
});

// ─── Error text ───────────────────────────────────────────────────────────────
function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p style={{ margin: "4px 0 0", fontSize: 11, color: C.danger, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} />{msg}</p>;
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: checked ? "#10b981" : "#cbd5e1",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, width = 520 }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; width?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 16, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
            {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: C.muted }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: C.subtle, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 2000,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", borderRadius: 12,
      background: type === "success" ? C.successSoft : C.dangerSoft,
      border: `1px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
      color: type === "success" ? C.success : C.danger,
      fontSize: 13, fontWeight: 500, maxWidth: 360,
      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    }}>
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", alignItems: "center" }}><X size={14} /></button>
    </div>
  );
}

// ─── Late Fee Settings Panel ──────────────────────────────────────────────────
function LateFeePanel({ fee }: { fee: FeeWiseClass }) {
  if (!fee.late_fee_enabled) return null;
  return (
    <div style={{ margin: "0 16px 16px", background: "#fafbff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <h4 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: C.text }}>
        Late Fee Settings — {fee.feetype_name}
      </h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { label: "Late Fee Enabled", value: <Toggle checked={true} onChange={() => { }} /> },
          { label: "Grace Days", value: <div style={{ ...inp(), padding: "8px 12px", display: "inline-block" }}>{fee.grace_days}</div> },
          { label: "Late Fee Type", value: <div style={{ ...inp(), padding: "8px 12px", display: "inline-block" }}>{fee.late_fee_type === "per_day" ? "Per Day" : "Flat"}</div> },
          { label: "Late Fee Amount (₹)", value: <div style={{ ...inp(), padding: "8px 12px", display: "inline-block" }}>{fee.late_fee_amount}</div> },
          { label: "Max Late Fee (₹)", value: <div style={{ ...inp(), padding: "8px 12px", display: "inline-block" }}>{fee.max_late_fee}</div> },
        ].map(item => (
          <div key={item.label}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
            {item.value}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Add / Edit Fee Modal ─────────────────────────────────────────────────────
function FeeModal({
  feeTypes, classes, selectedClassIds, editing, onClose, onSave,
}: {
  feeTypes: FeeType[];
  classes: { id: number; school_class: string }[];
  selectedClassIds: number[];
  editing: FeeWiseClass | null;
  onClose: () => void;
  onSave: (classIds: number[], data: any) => Promise<void>;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FeeFormValues>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: {
      school_classes: editing ? (editing.school_class ? [editing.school_class] : selectedClassIds) : selectedClassIds,
      feetype: editing ? feeTypes.find(ft => ft.name === editing.feetype_name)?.id ?? 0 : 0,
      amount: editing?.amount ?? "",
      late_fee_enabled: editing?.late_fee_enabled ?? false,
      grace_days: editing?.grace_days?.toString() ?? "",
      late_fee_type: (editing?.late_fee_type ?? "per_day") as LateFeeType,
      late_fee_amount: editing?.late_fee_amount ?? "",
      max_late_fee: editing?.max_late_fee ?? "",
    },
  });

  const lateEnabled = watch("late_fee_enabled");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (vals: FeeFormValues) => {
    setSaving(true);
    try {
      const payloadBase = {
        feetype: vals.feetype,
        amount: vals.amount,
        late_fee_enabled: vals.late_fee_enabled,
        ...(vals.late_fee_enabled && {
          grace_days: Number(vals.grace_days),
          late_fee_type: vals.late_fee_type as LateFeeType,
          late_fee_amount: vals.late_fee_amount,
          max_late_fee: vals.max_late_fee,
        }),
        ...(!vals.late_fee_enabled && {
          grace_days: 0,
          late_fee_type: null,
          late_fee_amount: "0",
          max_late_fee: null,
        }),
      };
      await onSave(vals.school_classes, payloadBase);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Edit Fee" : "Add New Fee"}
      subtitle={editing ? "Update fee details for this class" : "Configure a new fee for this class"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Classes Multi-Select */}
        {!editing ? (
          <div>
            <Label required>Apply to Classes</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 150, overflowY: "auto", border: `1.5px solid ${!!errors.school_classes ? C.danger : C.border}`, padding: 10, borderRadius: 8 }}>
              {classes.map(cls => {
                const isSelected = watch("school_classes")?.includes(cls.id) ?? false;
                return (
                  <label key={cls.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", background: isSelected ? C.accentSoft : "#fff", padding: "6px 10px", borderRadius: 6, border: `1px solid ${isSelected ? C.accent : C.border}`, color: isSelected ? C.accent : C.text, fontWeight: isSelected ? 600 : 400, whiteSpace: "nowrap" }}>
                    <input type="checkbox" style={{ display: "none" }} checked={isSelected} onChange={(e) => {
                      const current = watch("school_classes") || [];
                      if (e.target.checked) setValue("school_classes", [...current, cls.id], { shouldValidate: true });
                      else setValue("school_classes", current.filter(id => id !== cls.id), { shouldValidate: true });
                    }} />
                    {cls.school_class}
                  </label>
                );
              })}
            </div>
            <ErrMsg msg={errors.school_classes?.message} />
          </div>
        ) : (
          <div>
            <Label>Class</Label>
            <div style={{ ...inp(), background: C.subtle, color: C.muted }}>
              {classes.find(c => c.id === watch("school_classes")?.[0])?.school_class || "Unknown"}
            </div>
          </div>
        )}

        {/* Fee Type */}
        <div>
          <Label required>Fee Type</Label>
          <CustomSelect
            value={watch("feetype")}
            onChange={(v) => setValue("feetype", Number(v), { shouldValidate: true })}
            options={[{ value: 0, label: "Select fee type…" }, ...feeTypes.map(ft => ({ value: ft.id, label: ft.name }))]}
            placeholder="Select fee type…"
            error={!!errors.feetype}
          />
          <ErrMsg msg={errors.feetype?.message} />
        </div>

        {/* Amount */}
        <div>
          <Label required>Amount (₹)</Label>
          <input {...register("amount")} placeholder="e.g. 1500.00" style={inp(!!errors.amount)} />
          <ErrMsg msg={errors.amount?.message} />
        </div>

        {/* Late Fee Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.subtle, borderRadius: 10 }}>
          <Toggle
            checked={lateEnabled}
            onChange={(v) => setValue("late_fee_enabled", v)}
          />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>Enable Late Fee</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Charge extra after grace period</p>
          </div>
        </div>

        {/* Late fee fields */}
        {lateEnabled && (
          <div style={{ background: "#fafbff", border: `1.5px solid #e0e7ff`, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.accent, display: "flex", alignItems: "center", gap: 6 }}>
              <Info size={13} /> Late Fee Configuration
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label required>Grace Days</Label>
                <input {...register("grace_days")} type="number" min={0} placeholder="5" style={inp(!!errors.grace_days)} />
                <ErrMsg msg={errors.grace_days?.message} />
              </div>
              <div>
                <Label required>Late Fee Type</Label>
                <CustomSelect
                  value={watch("late_fee_type") ?? "per_day"}
                  onChange={(v) => setValue("late_fee_type", v as "per_day" | "flat", { shouldValidate: true })}
                  options={[
                    { value: "per_day", label: "Per Day" },
                    { value: "flat", label: "Flat" },
                  ]}
                  error={!!errors.late_fee_type}
                />
                <ErrMsg msg={errors.late_fee_type?.message} />
              </div>
              <div>
                <Label required>Late Fee Amount (₹)</Label>
                <input {...register("late_fee_amount")} placeholder="20.00" style={inp(!!errors.late_fee_amount)} />
                <ErrMsg msg={errors.late_fee_amount?.message} />
              </div>
              <div>
                <Label required>Max Late Fee (₹)</Label>
                <input {...register("max_late_fee")} placeholder="500.00" style={inp(!!errors.max_late_fee)} />
                <ErrMsg msg={errors.max_late_fee?.message} />
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ flex: 2, padding: "10px 0", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
            {saving ? <Spinner size={15} /> : <Check size={15} />}
            {editing ? "Save Changes" : "Add Fee"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Custom Select Dropdown (generic) ────────────────────────────────────────
function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  error,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          ...inp(error),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ color: selected ? C.text : C.muted }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          color={C.muted}
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div style={{
          position: "absolute", zIndex: 300, top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: C.card, border: `1.5px solid ${C.border}`,
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          maxHeight: 200, overflowY: "auto",
        }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(String(opt.value)); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left",
                padding: "10px 14px", border: "none", cursor: "pointer",
                fontSize: 13, fontFamily: "inherit",
                background: String(value) === String(opt.value) ? C.accentSoft : C.card,
                color: String(value) === String(opt.value) ? C.accent : C.text,
                fontWeight: String(value) === String(opt.value) ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ name, onConfirm, onCancel, deleting }: {
  name: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <Modal title="Delete Fee" subtitle={`"${name}" will be permanently removed from this class.`} onClose={onCancel} width={400}>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer" }}>Cancel</button>
        <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: C.danger, color: "#fff", fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: deleting ? 0.7 : 1 }}>
          {deleting ? <Spinner size={14} /> : <Trash2 size={14} />}
          Delete
        </button>
      </div>
    </Modal>
  );
}

// ─── Fee Row Card (mobile) ────────────────────────────────────────────────────
// On mobile, each fee row becomes a card with all info stacked
function FeeRowCard({ fee, expandedLateFee, setExpandedLateFee, openEdit, setDeleteTarget }: {
  fee: FeeWiseClass;
  expandedLateFee: number | null;
  setExpandedLateFee: (id: number | null) => void;
  openEdit: (fee: FeeWiseClass) => void;
  setDeleteTarget: (fee: FeeWiseClass) => void;
}) {
  const isExpanded = expandedLateFee === fee.id;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: isExpanded ? "#fafbff" : C.card }}>
      <div style={{ padding: "14px 16px" }}>
        {/* Top row: icon + name + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg(fee.feetype_name), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: iconColor(fee.feetype_name) }}>
            <FeeIcon name={fee.feetype_name} size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fee.feetype_name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: C.accent }}>
              ₹{Number(fee.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => openEdit(fee)}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}
              title="Edit"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={() => setDeleteTarget(fee)}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid #fecaca`, background: "#fff8f8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.danger }}
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Bottom row: badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <CycleBadge cycle={fee.billing_cycle} />
          <LateBadge enabled={fee.late_fee_enabled} />
          {fee.late_fee_enabled && (
            <button
              onClick={() => setExpandedLateFee(isExpanded ? null : fee.id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: C.accent, fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}
            >
              <Settings2 size={10} />
              {isExpanded ? "Hide" : "View"} late fee
            </button>
          )}
        </div>
      </div>

      {/* Late fee panel */}
      {isExpanded && <LateFeePanel fee={fee} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FeeStructurePage() {
  const [classes, setClasses] = useState<{ id: number; school_class: string }[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [fees, setFees] = useState<FeeWiseClass[]>([]);
  const [expandedLateFee, setExpandedLateFee] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeWiseClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeWiseClass | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getFeeTypes(), getSchoolClasses()])
      .then(([ft, cls]) => {
        setFeeTypes(ft);
        setClasses(cls);
      })
      .catch(() => setError("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  // ── Load all fees ───────────────────────────────────────────────────────────
  const loadFees = useCallback(async () => {
    setFeesLoading(true);
    setError("");
    try {
      const data = await getFeeWiseClasses({});
      setFees(data);
    } catch {
      setError("Failed to load fee structure.");
    } finally {
      setFeesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSave = async (classIds: number[], basePayload: any) => {
    try {
      if (editingFee) {
        const payload = { ...basePayload, school_class: classIds[0] };
        const updated = await updateFeeWiseClass(editingFee.id, payload);
        setFees(prev => prev.map(f => f.id === editingFee.id ? updated : f));
        showToast("Fee updated successfully!", "success");
      } else {
        const promises = classIds.map(cid => createFeeWiseClass({ ...basePayload, school_class: cid }));
        await Promise.all(promises);
        loadFees(); // Refresh all fees
        showToast(`Fee added to ${classIds.length} class(es) successfully!`, "success");
      }
    } catch (e: any) {
      showToast(e.message ?? "Something went wrong.", "error");
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFeeWiseClass(deleteTarget.id);
      setFees(prev => prev.filter(f => f.id !== deleteTarget.id));
      if (expandedLateFee === deleteTarget.id) setExpandedLateFee(null);
      showToast("Fee deleted.", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete fee.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => { setEditingFee(null); setShowModal(true); };
  const openEdit = (fee: FeeWiseClass) => { setEditingFee(fee); setShowModal(true); };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Spinner size={32} />
          <p style={{ margin: 0, fontSize: 14, color: C.muted }}>Loading fee structure…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: 16 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }

        /* ── Responsive layout ── */
        .fee-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: flex-start;
        }
        /* Class selector: horizontal scrollable pill row on mobile */
        .fee-class-panel {
          width: 100%;
        }
        .fee-class-scroll {
          display: flex;
          flex-direction: row;
          overflow-x: auto;
          gap: 8px;
          padding: 8px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .fee-class-scroll::-webkit-scrollbar { display: none; }
        .fee-class-btn-mobile {
          flex-shrink: 0;
          padding: 7px 14px;
          border-radius: 20px;
          border: 1.5px solid transparent;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
        }
        /* Fee table: card list on mobile */
        .fee-table-panel {
          width: 100%;
        }
        .fee-desktop-header { display: none; }
        .fee-desktop-row { display: none; }
        .fee-mobile-cards { display: flex; flex-direction: column; gap: 10px; padding: 12px; }

        /* ── Desktop (≥ 640px): restore original side-by-side layout ── */
        @media (min-width: 640px) {
          .fee-layout {
            flex-direction: row;
            gap: 20px;
          }
          .fee-class-panel {
            width: 200px;
            flex-shrink: 0;
          }
          .fee-class-scroll {
            flex-direction: column;
            overflow-x: visible;
            gap: 0;
          }
          .fee-class-btn-mobile {
            width: 100%;
            border-radius: 9px;
            border: none !important;
            padding: 10px 12px;
          }
          .fee-table-panel { flex: 1; }
          .fee-desktop-header { display: grid; }
          .fee-desktop-row { display: grid; }
          .fee-mobile-cards { display: none; }
        }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Fee Structure</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>Configure class-wise fees and late fee policies</p>
      </div>

      {error && (
        <div style={{ background: C.dangerSoft, color: C.danger, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} /> {error}
          <button onClick={() => loadFees()} style={{ marginLeft: "auto", background: "none", border: "none", color: C.danger, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      <div className="fee-layout">

        {/* ── Fee table / card panel ── */}
        <div className="fee-table-panel" style={{ background: C.card, borderRadius: 14, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>

          {/* Panel header */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                All Fees
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: C.muted }}>
                {fees.length} fee{fees.length !== 1 ? "s" : ""} configured
              </p>
            </div>
            <button
              onClick={openAdd}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, boxShadow: "0 4px 14px rgba(99,102,241,0.28)" }}
            >
              <Plus size={14} />
              Add Fee
            </button>
          </div>

          {/* Content */}
          {feesLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
              <Spinner size={26} />
            </div>
          ) : fees.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: C.muted }}>
              <DollarSign size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ margin: "0 0 16px", fontSize: 14 }}>No fees configured for this class yet</p>
              <button onClick={openAdd} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Plus size={14} /> Add First Fee
              </button>
            </div>
          ) : (
            <>
              {/* ── Desktop: column headers + grid rows ── */}
              <div
                className="fee-desktop-header"
                style={{ gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr auto", gap: "0 8px", padding: "10px 24px", background: C.bg, borderBottom: `1px solid ${C.border}` }}
              >
                {["Class", "Fee Type", "Amount (₹)", "Billing Cycle", "Late Fee", "Action"].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

              {fees.map((fee, i) => (
                <React.Fragment key={fee.id}>
                  {/* Desktop row */}
                  <div
                    className="fee-desktop-row"
                    style={{
                      gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr auto",
                      gap: "0 8px",
                      padding: "16px 24px",
                      borderBottom: i < fees.length - 1 || expandedLateFee === fee.id ? `1px solid ${C.border}` : "none",
                      alignItems: "center",
                      background: expandedLateFee === fee.id ? "#fafbff" : C.card,
                      transition: "background 0.15s",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>{fee.school_class_name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg(fee.feetype_name), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: iconColor(fee.feetype_name) }}>
                        <FeeIcon name={fee.feetype_name} size={17} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>{fee.feetype_name}</p>
                        {fee.late_fee_enabled && (
                          <button
                            onClick={() => setExpandedLateFee(expandedLateFee === fee.id ? null : fee.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: C.accent, fontWeight: 500, display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}
                          >
                            <Settings2 size={10} />
                            {expandedLateFee === fee.id ? "Hide" : "View"} late fee settings
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>
                      {Number(fee.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <CycleBadge cycle={fee.billing_cycle} />
                    <LateBadge enabled={fee.late_fee_enabled} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(fee)} style={{ width: 32, height: 32, borderRadius: 7, border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }} title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(fee)} style={{ width: 32, height: 32, borderRadius: 7, border: `1.5px solid #fecaca`, background: "#fff8f8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.danger }} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {expandedLateFee === fee.id && (
                    <div className="fee-desktop-row" style={{ gridTemplateColumns: "1fr" }}>
                      <LateFeePanel fee={fee} />
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* ── Mobile: card list ── */}
              <div className="fee-mobile-cards">
                {fees.map(fee => (
                  <FeeRowCard
                    key={fee.id}
                    fee={fee}
                    expandedLateFee={expandedLateFee}
                    setExpandedLateFee={setExpandedLateFee}
                    openEdit={openEdit}
                    setDeleteTarget={setDeleteTarget}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <FeeModal
          feeTypes={feeTypes}
          classes={classes}
          selectedClassIds={[]}
          editing={editingFee}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.feetype_name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
