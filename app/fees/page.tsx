"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Hash,
  IndianRupee,
  Loader2,
  RefreshCw,
  BadgeCheck,
  CreditCard,
  Wifi,
  WifiOff,
  Calendar,
  Receipt,
  ShieldCheck,
  Banknote,
  X,
  ArrowRight,
  Sparkles,
  Search,
} from "lucide-react";
import {
  getFeeVerifyList,
  verifyFee,
  type FeeVerifyRecord,
} from "@/lib/fees";
import { getClasses } from "@/lib/clerk";
import { cn } from "@/lib/utils";

/* ─── Animated counter ───────────────────────────────────────────────────── */
function AnimatedNumber({
  value,
  prefix = "",
}: {
  value: number;
  prefix?: string;
}) {
  const spring = useSpring(0, { stiffness: 60, damping: 16 });
  const display = useTransform(
    spring,
    (v) => `${prefix}${Math.round(v).toLocaleString("en-IN")}`,
  );
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  return <motion.span>{display}</motion.span>;
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
const STAT_STYLES = {
  total: {
    from: "#111827",
    to: "#1f2937",
    accent: "#60a5fa",
    label: "text-slate-300",
  },
  pending: {
    from: "#78350f",
    to: "#b45309",
    accent: "#fbbf24",
    label: "text-amber-100",
  },
  verified: {
    from: "#064e3b",
    to: "#047857",
    accent: "#34d399",
    label: "text-emerald-100",
  },
  amount: {
    from: "#312e81",
    to: "#4338ca",
    accent: "#818cf8",
    label: "text-indigo-100",
  },
};

function StatCard({
  label,
  value,
  prefix = "",
  icon: Icon,
  variant,
  delay,
}: {
  label: string;
  value: number;
  prefix?: string;
  icon: React.ElementType;
  variant: keyof typeof STAT_STYLES;
  delay: number;
}) {
  const s = STAT_STYLES[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.18 } }}
      style={{
        background: `linear-gradient(140deg, ${s.from} 0%, ${s.to} 100%)`,
      }}
      className="relative rounded-2xl p-4 md:p-5 overflow-hidden cursor-default shadow-xl"
    >
      <div
        className="pointer-events-none absolute -right-5 -top-5 h-28 w-28 rounded-full opacity-20"
        style={{ background: s.accent }}
      />
      <div
        className="pointer-events-none absolute -left-3 -bottom-6 h-20 w-20 rounded-full opacity-10"
        style={{ background: s.accent }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", s.label)}>
            {label}
          </p>
          <div
            className="rounded-xl p-2 shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-3xl font-black text-white tabular-nums leading-none tracking-tight">
          <AnimatedNumber value={value} prefix={prefix} />
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Mode badge ─────────────────────────────────────────────────────────── */
function ModeBadge({ mode }: { mode: "online" | "offline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border whitespace-nowrap",
        mode === "online"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-purple-50 text-purple-700 border-purple-200",
      )}
    >
      {mode === "online" ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {mode === "online" ? "Online" : "Offline"}
    </span>
  );
}

/* ─── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border whitespace-nowrap",
        verified
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200",
      )}
    >
      {verified ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {verified ? "Verified" : "Pending"}
    </span>
  );
}

/* ─── Field item ─────────────────────────────────────────────────────────── */
function FieldItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-0.5">
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}

/* ─── Verify modal ───────────────────────────────────────────────────────── */
function VerifyModal({
  record,
  verifyingId,
  onClose,
  onConfirm,
  getClassName,
}: {
  record: FeeVerifyRecord;
  verifyingId: number | null;
  onClose: () => void;
  onConfirm: () => void;
  getClassName: (value: string) => string;
}) {
  const studentName =
    record.field_values.find((f) => f.field_label.toLowerCase() === "first name")?.value ??
    record.field_values.find((f) => f.field_label.toLowerCase().includes("full name"))?.value ??
    record.field_values.find((f) => f.field_label.toLowerCase().includes("name") && !f.field_label.toLowerCase().includes("surname") && !f.field_label.toLowerCase().includes("last"))?.value ??
    "Student";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* header */}
        <div
          className="relative shrink-0 px-6 py-6 text-white overflow-hidden"
          style={{ background: "linear-gradient(140deg, #4338ca 0%, #7c3aed 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.18), transparent 55%)" }}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-50 rounded-lg bg-white/20 hover:bg-white/35 p-1.5 transition-colors touch-manipulation"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="relative flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-indigo-200 text-[11px] font-bold">Confirm Verification</p>
              <h2 className="text-lg font-black leading-tight">{studentName}</h2>
            </div>
          </div>
          {record.fee_data && (
            <div className="relative rounded-xl bg-white/15 border border-white/25 px-4 py-3 flex items-center justify-between">
              <span className="text-indigo-200 text-xs font-bold">Fee Amount</span>
              <span className="text-2xl font-black">
                ₹{record.fee_data.amount.toLocaleString("en-IN")}
                <span className="text-xs font-semibold text-indigo-300 ml-1.5">
                  {record.fee_data.currency}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <Hash className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Admission Number
              </p>
              <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                {record.admission_number}
              </p>
            </div>
          </div>

          {record.fee_data && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Payment Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Mode</p>
                  <ModeBadge mode={record.fee_data.payment_mode} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1">Paid At</p>
                  <p className="text-xs font-bold text-slate-800">
                    {new Date(record.fee_data.paid_at).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                {record.fee_data.razorpay_order_id && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1">Order ID</p>
                    <p className="font-mono text-[11px] bg-slate-100 rounded-lg px-3 py-2 text-slate-700 border border-slate-200 truncate">
                      {record.fee_data.razorpay_order_id}
                    </p>
                  </div>
                )}
                {record.fee_data.razorpay_payment_id && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1">Payment ID</p>
                    <p className="font-mono text-[11px] bg-slate-100 rounded-lg px-3 py-2 text-slate-700 border border-slate-200 truncate">
                      {record.fee_data.razorpay_payment_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2.5">
              Student Information
            </p>
            <div className="grid grid-cols-2 gap-2">
              {record.field_values.map((fv) => (
                <FieldItem
                  key={fv.id}
                  label={fv.field_label}
                  value={fv.field_label === "Applying For Class" ? getClassName(fv.value) : fv.value}
                />
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-xs"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={verifyingId === record.id}
            onClick={onConfirm}
            className="w-full sm:flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 py-2.5 px-3 font-bold text-white shadow-lg shadow-emerald-200/60 transition-colors text-[11px] sm:text-xs flex items-center justify-center gap-1.5 text-center leading-tight"
          >
            {verifyingId === record.id ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Verifying…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" />Confirm Verification</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Record card ────────────────────────────────────────────────────────── */
function RecordCard({
  record,
  index,
  verifyingId,
  onVerifyClick,
  getClassName,
}: {
  record: FeeVerifyRecord;
  index: number;
  verifyingId: number | null;
  onVerifyClick: (r: FeeVerifyRecord) => void;
  getClassName: (value: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  const studentName =
    record.field_values.find((f) => f.field_label.toLowerCase() === "first name")?.value ??
    record.field_values.find((f) => f.field_label.toLowerCase().includes("full name"))?.value ??
    record.field_values.find((f) => f.field_label.toLowerCase().includes("name") && !f.field_label.toLowerCase().includes("surname") && !f.field_label.toLowerCase().includes("last"))?.value ??
    "—";

  const initials = studentName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <div
        className={cn(
          "rounded-2xl border-2 transition-all duration-300 overflow-hidden",
          record.fee_verified
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white"
            : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/80",
        )}
      >
        {/* color stripe */}
        <div
          className={cn(
            "h-1 w-full",
            record.fee_verified
              ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
              : "bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500",
          )}
        />

        <div className="px-4 md:px-5 pt-4 pb-0">
          {/* top row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* avatar + name */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-black",
                  record.fee_verified
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-indigo-100 text-indigo-700",
                )}
              >
                {initials || <User className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-black text-base text-slate-900 leading-tight truncate">
                  {studentName}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Hash className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px] text-slate-500">
                    {record.admission_number}
                  </span>
                </div>
              </div>
            </div>

            {/* badges + verify */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {record.fee_data && <ModeBadge mode={record.fee_data.payment_mode} />}
              <StatusBadge verified={record.fee_verified} />
              {!record.fee_verified && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onVerifyClick(record)}
                  disabled={verifyingId === record.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 text-xs font-black text-white shadow-lg shadow-indigo-200/60 transition-colors"
                >
                  {verifyingId === record.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verify Fee
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* fee info strip */}
          {record.fee_data && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <IndianRupee className="h-3 w-3 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Amount</p>
                  <p className="text-sm font-black text-emerald-600 leading-tight">
                    ₹{record.fee_data.amount.toLocaleString("en-IN")}
                    <span className="text-[10px] font-semibold text-slate-400 ml-1">
                      {record.fee_data.currency}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-3 w-3 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Paid At</p>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {new Date(record.fee_data.paid_at).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {record.fee_data.razorpay_order_id && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Receipt className="h-3 w-3 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Order ID</p>
                    <p className="font-mono text-[11px] text-slate-700 max-w-[130px] truncate leading-tight">
                      {record.fee_data.razorpay_order_id}
                    </p>
                  </div>
                </div>
              )}

              {record.fee_data.razorpay_payment_id && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                    <CreditCard className="h-3 w-3 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Payment ID</p>
                    <p className="font-mono text-[11px] text-slate-700 max-w-[130px] truncate leading-tight">
                      {record.fee_data.razorpay_payment_id}
                    </p>
                  </div>
                </div>
              )}

              {record.fee_verified_at && (
                <div className="ml-auto flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-black text-emerald-600">
                    Verified · {new Date(record.fee_verified_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3.5 mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <motion.span
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.18 }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.span>
            {expanded ? "Hide student details" : "Show student details"}
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-500">
              {record.field_values.length} fields
            </span>
          </button>
        </div>

        {/* expandable fields */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 md:px-5 pb-4 pt-0 border-t border-slate-100">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                  {record.field_values.map((fv, i) => (
                    <motion.div
                      key={fv.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <FieldItem
                        label={fv.field_label}
                        value={fv.field_label === "Applying For Class" ? getClassName(fv.value) : fv.value}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function ClerkDashboard() {
  const [records, setRecords] = useState<FeeVerifyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<FeeVerifyRecord | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "verified">("all");

  const fetchClasses = useCallback(async () => {
    try {
      const data = await getClasses();
      setClasses(data);
    } catch (err) {
      console.error("Failed to fetch classes", err);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFeeVerifyList();
      const sortedData = data.sort((a, b) => {
        if (a.fee_verified === b.fee_verified) return 0;
        return a.fee_verified ? 1 : -1;
      });
      setRecords(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchClasses();
  }, [fetchRecords, fetchClasses]);

  const handleVerify = async (record: FeeVerifyRecord) => {
    setVerifyingId(record.id);
    try {
      await verifyFee(record.admission_number);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? { ...r, fee_verified: true, fee_verified_at: new Date().toISOString() }
            : r,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const getClassName = useCallback(
    (value: string) => {
      const foundClass = classes.find((c) => String(c.id) === String(value));
      return foundClass?.school_class || value;
    },
    [classes],
  );

  const pending = records.filter((r) => !r.fee_verified).length;
  const verified = records.filter((r) => r.fee_verified).length;
  const verifiedAmount = records
    .filter((r) => r.fee_verified)
    .reduce((sum, r) => sum + (r.fee_data?.amount ?? 0), 0);

  // ── Search + filter logic ──────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => {
      // status filter
      if (filterStatus === "pending" && r.fee_verified) return false;
      if (filterStatus === "verified" && !r.fee_verified) return false;

      // search: name, admission number, payment IDs, amount
      if (!q) return true;
      const name =
        r.field_values.find((f) => f.field_label.toLowerCase() === "first name")?.value ??
        r.field_values.find((f) => f.field_label.toLowerCase().includes("full name"))?.value ??
        r.field_values.find((f) => f.field_label.toLowerCase().includes("name") && !f.field_label.toLowerCase().includes("surname") && !f.field_label.toLowerCase().includes("last"))?.value ?? "";
      const fields = r.field_values.map((f) => f.value).join(" ").toLowerCase();
      return (
        name.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        fields.includes(q) ||
        r.fee_data?.razorpay_order_id?.toLowerCase().includes(q) ||
        r.fee_data?.razorpay_payment_id?.toLowerCase().includes(q) ||
        String(r.fee_data?.amount ?? "").includes(q)
      );
    });
  }, [records, searchQuery, filterStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 xl:px-8 py-5 space-y-5">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600">
                Clerk Panel
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">
              Fee Verification
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm font-medium">
              Review and confirm student admission fee payments
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700 hover:shadow-md transition-all disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </motion.button>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total" value={records.length} icon={User} variant="total" delay={0.08} />
          <StatCard label="Pending" value={pending} icon={Clock} variant="pending" delay={0.14} />
          <StatCard label="Verified" value={verified} icon={ShieldCheck} variant="verified" delay={0.2} />
          <StatCard label="Verified Amount" value={verifiedAmount} prefix="₹" icon={Banknote} variant="amount" delay={0.26} />
        </div>

        {/* ── Search + Filter bar ── */}
        {!loading && !error && records.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="flex items-center gap-3 flex-wrap"
          >
            {/* Search input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, admission no., payment ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-9 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
              {(["all", "pending", "verified"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-black capitalize transition-all",
                    filterStatus === f
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {f === "all" ? `All (${records.length})` : f === "pending" ? `Pending (${pending})` : `Verified (${verified})`}
                </button>
              ))}
            </div>

            {/* Result count when searching */}
            {searchQuery && (
              <span className="text-[11px] font-bold text-slate-400">
                {filteredRecords.length} result{filteredRecords.length !== 1 ? "s" : ""}
              </span>
            )}
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="h-10 w-10 text-indigo-400" />
            </motion.div>
            <p className="text-slate-400 font-bold text-sm">Loading records…</p>
          </div>
        )}

        {/* ── Error ── */}
        <AnimatePresence>
          {!loading && error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-5"
            >
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm text-red-700">Failed to load records</p>
                <p className="text-xs mt-0.5 text-red-500 font-semibold">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {!loading && !error && records.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="rounded-2xl bg-slate-100 p-8 mb-4">
              <BadgeCheck className="h-12 w-12 text-slate-300" />
            </div>
            <p className="font-black text-lg text-slate-700">No records found</p>
            <p className="text-slate-400 mt-1.5 font-semibold text-sm">
              There are no fee verification requests yet
            </p>
          </motion.div>
        )}

        {/* ── No search results ── */}
        {!loading && !error && records.length > 0 && filteredRecords.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="rounded-2xl bg-slate-100 p-6 mb-3">
              <Search className="h-10 w-10 text-slate-300" />
            </div>
            <p className="font-black text-base text-slate-700">No matches found</p>
            <p className="text-slate-400 mt-1 text-sm font-medium">
              Try a different name, admission number, or payment ID
            </p>
            <button
              onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
              className="mt-4 text-xs font-bold text-indigo-600 hover:underline"
            >
              Clear search
            </button>
          </motion.div>
        )}

        {/* ── Records ── */}
        {!loading && !error && filteredRecords.length > 0 && (
          <div className="space-y-3">
            {filteredRecords.map((record, index) => (
              <RecordCard
                key={record.id}
                record={record}
                index={index}
                verifyingId={verifyingId}
                onVerifyClick={(r) => setSelectedRecord(r)}
                getClassName={getClassName}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {selectedRecord && (
          <VerifyModal
            record={selectedRecord}
            verifyingId={verifyingId}
            getClassName={getClassName}
            onClose={() => setSelectedRecord(null)}
            onConfirm={async () => {
              await handleVerify(selectedRecord);
              setSelectedRecord(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
