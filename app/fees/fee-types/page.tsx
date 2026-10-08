"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef } from "react";
import {
  Plus,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  BookOpen,
  Bus,
  FlaskConical,
  Library,
  GraduationCap,
  FileText,
  DollarSign,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  feeTypeSchema,
  FeeTypeFormData,
  FeeType,
  billingCycleOptions,
  createFeeType,
  getFeeTypes,
  deleteFeeType,
  updateFeeType,
  getBillingCycleLabel,
  getBillingCycleBadgeColor,
  getFeeTypeIconBg,
} from "@/lib/fees";

// ─── Icon Map ────────────────────────────────────────────────────────────────
const getIconComponent = (name: string) => {
  const lowerName = name.toLowerCase();
  const iconClass = "w-7 h-7";

  if (lowerName.includes("tuition"))
    return <BookOpen className={`${iconClass} text-purple-600`} />;
  if (lowerName.includes("transport"))
    return <Bus className={`${iconClass} text-orange-500`} />;
  if (lowerName.includes("exam"))
    return <FileText className={`${iconClass} text-blue-500`} />;
  if (lowerName.includes("library"))
    return <Library className={`${iconClass} text-emerald-600`} />;
  if (lowerName.includes("lab"))
    return <FlaskConical className={`${iconClass} text-violet-600`} />;
  if (lowerName.includes("admission"))
    return <GraduationCap className={`${iconClass} text-rose-500`} />;
  return <DollarSign className={`${iconClass} text-indigo-600`} />;
};

// ─── Toast Component ─────────────────────────────────────────────────────────
type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-slide-in max-w-sm
      ${type === "success"
          ? "bg-white border-emerald-200 text-emerald-800"
          : "bg-white border-red-200 text-red-800"
        }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  isOpen: boolean;
  feeName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function ConfirmDialog({
  isOpen,
  feeName,
  onConfirm,
  onCancel,
  isDeleting,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-scale-in">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mx-auto mb-5">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          Delete Fee Type
        </h3>
        <p className="text-gray-500 text-center mb-8 text-sm leading-relaxed">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-800">"{feeName}"</span>? This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fee Type Card ────────────────────────────────────────────────────────────
interface FeeCardProps {
  fee: FeeType;
  onEdit: (fee: FeeType) => void;
  onDelete: (fee: FeeType) => void;
}

function FeeCard({ fee, onEdit, onDelete }: FeeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getFeeTypeIconBg(
              fee.name
            )}`}
          >
            {getIconComponent(fee.name)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-tight">
              {fee.name}
            </h3>
            <span
              className={`inline-block mt-1.5 text-xs font-semibold px-3 py-1 rounded-full ${getBillingCycleBadgeColor(
                fee.billing_cycle
              )}`}
            >
              {getBillingCycleLabel(fee.billing_cycle)}
            </span>
          </div>
        </div>

        {/* Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden animate-scale-in">
              <button
                onClick={() => {
                  onEdit(fee);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => {
                  onDelete(fee);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">
          Billing Cycle
        </p>
        <p className="text-sm text-gray-700 font-medium">
          {getBillingCycleLabel(fee.billing_cycle)} billing for {fee.name.toLowerCase()}
        </p>
      </div>

      {/* Status & RTE Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
        {fee.is_rte_applicable ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            RTE: Student Pays
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            RTE: Govt Claim (₹0 Student)
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FeeTypeFormData) => Promise<void>;
  editingFee: FeeType | null;
  isSubmitting: boolean;
}

function FeeTypeModal({
  isOpen,
  onClose,
  onSubmit,
  editingFee,
  isSubmitting,
}: ModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeeTypeFormData>({
    resolver: zodResolver(feeTypeSchema),
    defaultValues: { name: "", billing_cycle: "monthly", is_rte_applicable: false },
  });
  const billingCycleValue = watch("billing_cycle");
  const isRteApplicableValue = watch("is_rte_applicable") ?? false;

  useEffect(() => {
    if (editingFee) {
      reset({
        name: editingFee.name,
        billing_cycle: editingFee.billing_cycle,
        is_rte_applicable: editingFee.is_rte_applicable ?? false,
      });
    } else {
      reset({ name: "", billing_cycle: "monthly", is_rte_applicable: false });
    }
  }, [editingFee, reset, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-7 pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingFee ? "Edit Fee Type" : "Create Fee Type"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {editingFee
                ? "Update the fee type details"
                : "Add a new fee type to manage billing"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-7 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fee Type Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Tuition Fee, Lab Fee..."
              className={`w-full px-4 py-3.5 rounded-xl border-2 text-gray-900 placeholder-gray-400 text-sm
                outline-none transition-all focus:ring-0
                ${errors.name
                  ? "border-red-300 focus:border-red-400 bg-red-50"
                  : "border-gray-200 focus:border-indigo-400 bg-gray-50 focus:bg-white"
                }`}
            />
            {errors.name && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Billing Cycle Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Billing Cycle <span className="text-red-500">*</span>
            </label>
            <BillingCycleDropdown
              value={billingCycleValue}
              onChange={(v) => setValue("billing_cycle", v as FeeTypeFormData["billing_cycle"], { shouldValidate: true })}
              error={!!errors.billing_cycle}
            />
            {errors.billing_cycle && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.billing_cycle.message}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {billingCycleOptions.map((opt) => (
                <span
                  key={opt.value}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${getBillingCycleBadgeColor(opt.value)}`}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>

          {/* Applicable for RTE Students Field */}
          <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                Applicable for RTE Students
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                RTE Fee Policy
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Select how fees are treated for Right to Education (RTE) enrolled students.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Option No (Govt Claim) */}
              <button
                type="button"
                onClick={() => setValue("is_rte_applicable", false, { shouldValidate: true })}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  !isRteApplicableValue
                    ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>No (Govt Pays)</span>
                  {!isRteApplicableValue && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </div>
                <p className="text-[11px] leading-tight text-gray-500">
                  Student pays ₹0; school claims ₹ from Government.
                </p>
              </button>

              {/* Option Yes (Student Pays) */}
              <button
                type="button"
                onClick={() => setValue("is_rte_applicable", true, { shouldValidate: true })}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  isRteApplicableValue
                    ? "border-[#5826df] bg-indigo-50 text-[#5826df] shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>Yes (Student Pays)</span>
                  {isRteApplicableValue && (
                    <span className="w-2 h-2 rounded-full bg-[#5826df]" />
                  )}
                </div>
                <p className="text-[11px] leading-tight text-gray-500">
                  RTE student must pay this fee normally.
                </p>
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-95 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingFee ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {editingFee ? (
                    <>
                      <Edit2 className="w-4 h-4" /> Update Fee Type
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Create Fee Type
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BillingCycleDropdown({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = billingCycleOptions.find((o) => o.value === value);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-sm text-gray-900 bg-gray-50 outline-none transition-all
          ${error ? "border-red-300" : open ? "border-indigo-400 bg-white" : "border-gray-200"}`}
      >
        <span>{selected?.label ?? "Select..."}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {billingCycleOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-indigo-50 hover:text-indigo-700
                ${value === opt.value ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
        <DollarSign className="w-12 h-12 text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">No Fee Types Yet</h3>
      <p className="text-gray-500 text-sm max-w-sm mb-8 leading-relaxed">
        Get started by creating your first fee type. You can manage billing
        cycles and track all fees here.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all text-sm"
      >
        <Plus className="w-4 h-4" /> Create First Fee Type
      </button>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-14 h-14 bg-gray-200 rounded-2xl" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded-lg w-3/4 mb-2" />
          <div className="h-6 bg-gray-200 rounded-full w-20" />
        </div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-5" />
      <div className="h-7 bg-gray-200 rounded-full w-16" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FeeTypePage() {
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCycle, setFilterCycle] = useState<string>("all");
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const loadFeeTypes = async () => {
    setLoading(true);
    try {
      const data = await getFeeTypes();
      setFeeTypes(data);
    } catch {
      showToast("Failed to load fee types. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeTypes();
  }, []);

  const handleSubmit = async (data: FeeTypeFormData) => {
    setIsSubmitting(true);
    try {
      if (editingFee) {
        const updated = await updateFeeType(editingFee.id, data);
        setFeeTypes((prev) =>
          prev.map((f) => (f.id === editingFee.id ? updated : f))
        );
        showToast("Fee type updated successfully!", "success");
      } else {
        const created = await createFeeType(data);
        setFeeTypes((prev) => [...prev, created]);
        showToast("Fee type created successfully!", "success");
      }
      setIsModalOpen(false);
      setEditingFee(null);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Something went wrong.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteFeeType(deleteTarget.id);
      setFeeTypes((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      showToast("Fee type deleted successfully!", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete fee type.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingFee(null);
    setIsModalOpen(true);
  };

  const openEdit = (fee: FeeType) => {
    setEditingFee(fee);
    setIsModalOpen(true);
  };

  // Filter + Search
  const filtered = feeTypes.filter((fee) => {
    const matchSearch = fee.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchCycle =
      filterCycle === "all" || fee.billing_cycle === filterCycle;
    return matchSearch && matchCycle;
  });

  const stats = {
    total: feeTypes.length,
    monthly: feeTypes.filter((f) => f.billing_cycle === "monthly").length,
    yearly: feeTypes.filter((f) => f.billing_cycle === "yearly").length,
    single: feeTypes.filter((f) => f.billing_cycle === "single").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.92);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        feeName={deleteTarget?.name || ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />

      {/* Fee Type Modal */}
      <FeeTypeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFee(null);
        }}
        onSubmit={handleSubmit}
        editingFee={editingFee}
        isSubmitting={isSubmitting}
      />

      {/* Main Content */}
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fee Types</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Manage all fee types and billing cycles
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadFeeTypes}
              className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#5826df] hover:bg-[#4a1ec2] text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Fee Type
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && feeTypes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Total Fee Types",
                value: stats.total,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                label: "Monthly",
                value: stats.monthly,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "Yearly",
                value: stats.yearly,
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                label: "One-time",
                value: stats.single,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <div
                  className={`text-3xl font-bold ${stat.color} mb-1`}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filter Bar */}
        {!loading && feeTypes.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fee types..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 transition-all"
              />
            </div>
            <BillingCycleDropdown
              value={filterCycle}
              onChange={setFilterCycle}
            />
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : feeTypes.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-1">
              No results found
            </h3>
            <p className="text-gray-400 text-sm">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4 font-medium">
              Showing {filtered.length} of {feeTypes.length} fee types
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((fee) => (
                <FeeCard
                  key={fee.id}
                  fee={fee}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
