"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReceiptModal from "./ReceiptModal";
import {
  Users,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Eye,
  MoreVertical,
  Download,
  ChevronLeft,
  ChevronRight,
  Tag,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Percent,
  CalendarDays,
  BookOpen,
  GraduationCap,
  UserX,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import {
  fetchStudents,
  fetchStudentFees,
  fetchAcademicYearsForFee,
  fetchFeeWiseClassesForFee,
  createMonthlyStudentFee,
  createSingleStudentFee,
  addDiscountToStudentFee,
  deleteStudentFee,
  formatCurrency,
  formatBillingPeriod,
  formatDisplayDate,
  validateMonthlyFeeForm,
  validateSingleFeeForm,
  validateDiscountForm,
  type Student,
  type StudentFee,
  type AcademicYear,
  type FeeWiseClass,
} from "@/lib/fees";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";

// Status Badge Component
const StatusBadge = ({ status }: { status: StudentFee["status"] }) => {
  const config = {
    paid: {
      label: "Paid",
      className: "bg-green-100 text-green-700 border-green-200",
      icon: CheckCircle2,
    },
    unpaid: {
      label: "Unpaid",
      className: "bg-red-100 text-red-700 border-red-200",
      icon: XCircle,
    },
    partially_paid: {
      label: "Partial",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: Clock,
    },
    partial: {
      label: "Partial",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: Clock,
    },
    pending: {
      label: "Unpaid",
      className: "bg-red-100 text-red-700 border-red-200",
      icon: XCircle,
    },
    overdue: {
      label: "Overdue",
      className: "bg-orange-100 text-orange-700 border-orange-200",
      icon: AlertCircle,
    },
  };
  const { label, className, icon: Icon } = config[status as keyof typeof config] || config.unpaid;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      <Icon size={10} />
      {label}
    </span>
  );
};

// Avatar Component
const StudentAvatar = ({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "md";
}) => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  valueColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  valueColor?: string;
}) => (
  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3">
      <div className={`${iconBg} p-2.5 rounded-lg flex-shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
        <p
          className={`text-lg font-bold mt-0.5 ${valueColor || "text-gray-900"}`}
        >
          {value}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  </div>
);

// Modal Wrapper
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// Form Field Component
const FormField = ({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle size={12} />
        {error}
      </p>
    )}
  </div>
);

const inputClass =
  "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";
const selectClass =
  "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none cursor-pointer";

// Create Fee Modal
const CreateFeeModal = ({
  isOpen,
  onClose,
  students,
  academicYears,
  feeWiseClasses,
  onSuccess,
  activeTab,
}: {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  academicYears: AcademicYear[];
  feeWiseClasses: FeeWiseClass[];
  onSuccess: () => void;
  activeTab: "monthly" | "single";
}) => {
  const [feeType, setFeeType] = useState<"monthly" | "single">(activeTab);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [form, setForm] = useState({
    student: "",
    academic_year: "",
    fee_wise_class: "",
    feetype: "",
    billing_period: new Date().toISOString().slice(0, 7),
    selected_class: "",
  });

  useEffect(() => {
    setFeeType(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      setForm({
        student: "",
        academic_year: "",
        fee_wise_class: "",
        feetype: "",
        billing_period: new Date().toISOString().slice(0, 7),
        selected_class: "",
      });
      setErrors({});
      setToast(null);
    }
  }, [isOpen]);

  const uniqueClassOptions = Array.from(
    new Map(
      feeWiseClasses.map((fc) => [fc.school_class, fc.school_class_name]),
    ).entries(),
  ).map(([id, name]) => ({ id, name }));
  const filteredFeeClasses = form.selected_class 
    ? feeWiseClasses.filter((fc) => String(fc.school_class) === form.selected_class)
    : feeWiseClasses;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const errs: Record<string, string> = {};
    if (!form.student) errs.student = "Student is required";
    if (!form.academic_year) errs.academic_year = "Academic year is required";
    if (!form.fee_wise_class) errs.fee_wise_class = "Fee structure is required";
    if (!form.billing_period) errs.billing_period = "Billing period is required";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        student: parseInt(form.student),
        academic_year: parseInt(form.academic_year),
        fee_wise_class: parseInt(form.fee_wise_class),
        feetype: parseInt(form.feetype),
        billing_period: form.billing_period,
      };

      const result = await createMonthlyStudentFee(payload); // Using this as it passes all fields including billing_period

      if (result.success) {
        setToast({ type: "success", message: "Fee created successfully!" });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setToast({
          type: "error",
          message: result.error || "Failed to create fee",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Student Fee">

      {toast && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${toast.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* UI-only class filter */}
        <FormField label="Class" required>
          <CustomDropdown
            value={form.selected_class}
            onChange={(v) => { update("selected_class", v); update("student", ""); }}
            options={uniqueClassOptions.map((cls) => ({ value: String(cls.id), label: cls.name }))}
            placeholder="Select class..."
          />
        </FormField>

        <FormField label="Student" error={errors.student} required>
          <CustomDropdown
            value={form.student}
            onChange={(v) => update("student", v)}
            disabled={!form.selected_class}
            placeholder={form.selected_class ? "Select student..." : "Select class first"}
            options={students
              .filter((s) => String(s.school_class) === form.selected_class)
              .map((s) => {
                const fName = s.name === "null" ? "" : s.name;
                const lName = s.surname === "null" ? "" : s.surname;
                const fthName = s.father_name === "null" ? "" : s.father_name;
                const fullName = [fName, lName].filter(Boolean).join(" ");
                return { 
                  value: String(s.id), 
                  label: `${fullName || "No Name"} - Father: ${fthName || "N/A"}` 
                };
              })}
            error={!!errors.student}
            searchable={true}
          />
        </FormField>

        <FormField label="Academic Year" error={errors.academic_year} required>
          <CustomDropdown
            value={form.academic_year}
            onChange={(v) => update("academic_year", v)}
            placeholder="Select academic year..."
            options={academicYears.map((ay) => ({
              value: String(ay.id),
              label: `${ay.name}${ay.is_active ? " (Active)" : ""}`,
            }))}
            error={!!errors.academic_year}
          />
        </FormField>

        <FormField label="Fee Structure" error={errors.fee_wise_class} required>
          <CustomDropdown
            value={form.fee_wise_class}
            onChange={(v) => {
              const selectedFeeClass = feeWiseClasses.find((fc) => fc.id === Number(v));
              update("fee_wise_class", v);
              update("feetype", selectedFeeClass ? String(selectedFeeClass.feetype) : "");
            }}
            placeholder="Select fee structure..."
            options={filteredFeeClasses.map((fc) => ({
              value: String(fc.id),
              label: `${fc.feetype_name} — ₹${parseFloat(fc.amount).toLocaleString("en-IN")}`,
            }))}
            error={!!errors.fee_wise_class}
          />
        </FormField>

        <FormField
          label="Billing Period"
          error={errors.billing_period}
          required
        >
          <input
            type="month"
            className={inputClass}
            value={form.billing_period}
            onChange={(e) => update("billing_period", e.target.value)}
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creating...
              </>
            ) : (
              "Create Fee"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Custom Dropdown (replaces native <select> on mobile) ─────────────────────
function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  error = false,
  searchable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const filteredOptions = searchable 
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-left flex items-center justify-between transition-all bg-white
          ${error ? "border-red-400 focus:ring-red-400" : "border-gray-200 focus:ring-blue-500"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer hover:border-gray-300"}
          focus:outline-none focus:ring-2 focus:border-transparent`}
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronRight
          size={14}
          className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-[500] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${value === opt.value
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"}`}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Discount Modal
const DiscountModal = ({
  isOpen,
  onClose,
  fee,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  fee: StudentFee | null;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [form, setForm] = useState({
    discount_amount: "",
    discount_reference: "",
    discount_note: "",
  });

  useEffect(() => {
    if (fee) {
      setForm({
        discount_amount:
          fee.discount_amount && fee.discount_amount !== "0.00"
            ? fee.discount_amount
            : "",
        discount_reference: fee.discount_reference || "",
        discount_note: fee.discount_note || "",
      });
    }
  }, [fee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateDiscountForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!fee) return;

    setLoading(true);
    try {
      const result = await addDiscountToStudentFee(fee.id, form);
      if (result.success) {
        setToast({
          type: "success",
          message: "Discount applied successfully!",
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setToast({
          type: "error",
          message: result.error || "Failed to apply discount",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply Discount">
      {fee && (
        <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100">
          <div className="flex items-center gap-3">
            <StudentAvatar name={fee.student_name} size="md" />
            <div>
              <p className="font-semibold text-gray-900">{fee.student_name}</p>
              <p className="text-sm text-gray-500">
                {fee.class_name} • {formatBillingPeriod(fee.billing_period)}
              </p>
              <p className="text-sm font-medium text-blue-600 mt-0.5">
                Fee Amount: {formatCurrency(fee.amount)}
              </p>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${toast.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Discount Amount (₹)"
          error={errors.discount_amount}
          required
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
              ₹
            </span>
            <input
              type="number"
              className={`${inputClass} pl-7`}
              placeholder="0.00"
              value={form.discount_amount}
              onChange={(e) => update("discount_amount", e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </FormField>

        <FormField
          label="Reference / Approval"
          error={errors.discount_reference}
          required
        >
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Principal approval #123"
            value={form.discount_reference}
            onChange={(e) => update("discount_reference", e.target.value)}
          />
        </FormField>

        <FormField label="Note (Optional)" error={errors.discount_note}>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="e.g. Sibling discount, scholarship..."
            value={form.discount_note}
            onChange={(e) => update("discount_note", e.target.value)}
          />
        </FormField>

        {form.discount_amount &&
          fee &&
          !isNaN(parseFloat(form.discount_amount)) && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Original Amount:</span>
                <span>{formatCurrency(fee.amount)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>- {formatCurrency(form.discount_amount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-green-200 mt-2">
                <span>Payable Amount:</span>
                <span>
                  {formatCurrency(
                    Math.max(
                      0,
                      parseFloat(fee.amount) - parseFloat(form.discount_amount),
                    ),
                  )}
                </span>
              </div>
            </div>
          )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Applying...
              </>
            ) : (
              <>
                <Tag size={14} /> Apply Discount
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Collect Fee Modal
const CollectFeeModal = ({
  isOpen,
  onClose,
  fee,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  fee: StudentFee | null;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  const [form, setForm] = useState({
    amount: "",
    payment_mode: "cash",
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: "",
    receipt_number: "",
    note: "",
  });

  useEffect(() => {
    if (fee) {
      setForm({
        amount: fee.balance_amount || "0.00",
        payment_mode: "cash",
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: "",
        receipt_number: "",
        note: "",
      });
    }
  }, [fee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee) return;
    const errs: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Invalid amount";
    if (!form.payment_mode) errs.payment_mode = "Payment mode is required";
    if (!form.payment_date) errs.payment_date = "Payment date is required";
    
    if (["cheque", "upi", "card"].includes(form.payment_mode) && !form.transaction_id) {
       errs.transaction_id = form.payment_mode === "cheque" ? "Cheque No. is required" : "Reference No. is required";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { collectStudentFeePayment } = await import("@/lib/fees/fee-generation");
      const result = await collectStudentFeePayment({
        student_fee: fee.id,
        ...form
      });
      if (result.success) {
        setToast({ type: "success", message: "Fee collected successfully!" });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setToast({ type: "error", message: result.error || "Failed to collect fee" });
      }
    } catch (error: any) {
       setToast({ type: "error", message: error.message || "Failed to collect fee" });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Collect Fee">
      {fee && (
        <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{fee.student_name}</p>
              <p className="text-sm text-gray-500">{fee.class_name} • {formatBillingPeriod(fee.billing_period)}</p>
            </div>
            <div className="text-right">
              <div className="mb-1 flex items-center justify-end gap-1 text-red-500 text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {formatCurrency(fee.amount)} BASE 
                  {parseFloat(fee.fine_amount || "0") > 0 && ` + ${formatCurrency(fee.fine_amount || "0")} PENALTY`} 
                  {parseFloat(fee.discount_amount || "0") > 0 && ` - ${formatCurrency(fee.discount_amount || "0")} DISCOUNT`}
                  =
                </span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Balance</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(fee.balance_amount)}</p>
            </div>
        </div>
      )}

      {toast && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${toast.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount to Collect (₹)" error={errors.amount} required>
            <input type="number" className={inputClass} value={form.amount} onChange={(e) => update("amount", e.target.value)} min="0" step="0.01" max={fee?.balance_amount} />
          </FormField>
          
          <FormField label="Payment Mode" error={errors.payment_mode} required>
             <select className={inputClass} value={form.payment_mode} onChange={(e) => update("payment_mode", e.target.value)}>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
             </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Payment Date" error={errors.payment_date} required>
             <input type="date" className={inputClass} value={form.payment_date} onChange={(e) => update("payment_date", e.target.value)} />
          </FormField>
          <FormField label="Receipt No. (Optional)" error={errors.receipt_number}>
             <input type="text" className={inputClass} value={form.receipt_number} onChange={(e) => update("receipt_number", e.target.value)} />
          </FormField>
        </div>

        {(form.payment_mode === "cheque" || form.payment_mode === "upi" || form.payment_mode === "card") && (
          <FormField label={form.payment_mode === "cheque" ? "Cheque No. *" : "Reference No. *"} error={errors.transaction_id}>
             <input type="text" className={inputClass} value={form.transaction_id} onChange={(e) => update("transaction_id", e.target.value)} />
          </FormField>
        )}

        <FormField label="Note (Optional)" error={errors.note}>
          <textarea className={`${inputClass} resize-none`} rows={2} value={form.note} onChange={(e) => update("note", e.target.value)} />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Collecting...</> : "Collect Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// View Fee Modal
const ViewFeeModal = ({
  isOpen,
  onClose,
  fee,
  onSuccess,
  onViewReceipt,
}: {
  isOpen: boolean;
  onClose: () => void;
  fee: StudentFee | null;
  onSuccess?: () => void;
  onViewReceipt?: (receiptNo: string) => void;
}) => {
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  
  if (!fee) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fee Details">
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <StudentAvatar name={fee.student_name} size="md" />
          <div>
            <p className="font-semibold text-gray-900 text-base">
              {fee.student_name} {fee.student_surname || ""}
            </p>
            <p className="text-sm text-gray-500">{fee.class_name}</p>
            <StatusBadge status={fee.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Academic Year",
              value: fee.academic_year ? `Year ID: ${fee.academic_year}` : "N/A",
              icon: CalendarDays,
            },
            {
              label: "Fee Structure",
              value: fee.feetype_name || "N/A",
              icon: BookOpen,
            },
            {
              label: "Billing Period",
              value: formatBillingPeriod(fee.billing_period),
              icon: CalendarDays,
            },
            {
              label: "Due Date",
              value: formatDisplayDate(fee.due_date),
              icon: Clock,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">
                  {label}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Fee Amount</span>
            <span className="font-medium">{formatCurrency(fee.amount)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span className="font-medium">
              - {formatCurrency(fee.discount_amount ?? "0")}
            </span>
          </div>
          {parseFloat(fee.fine_amount || "0") >= 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Penalty</span>
              <span className="font-medium">
                + {formatCurrency(fee.fine_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-blue-200">
            <span>Payable Amount</span>
            <span className="text-blue-600">
              {formatCurrency(fee.payable_amount)}
            </span>
          </div>
        </div>

        {fee.discount_reference && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <p className="text-xs font-medium text-yellow-700 mb-1">
              Discount Reference
            </p>
            <p className="text-sm text-gray-700">{fee.discount_reference}</p>
            {fee.discount_note && (
              <p className="text-xs text-gray-500 mt-1">{fee.discount_note}</p>
            )}
          </div>
        )}

        {/* Payments History */}
        {fee.payments && fee.payments.length > 0 && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payments History</h3>
            <div className="space-y-3">
              {fee.payments.map((payment) => (
                <div key={payment.id} className={`p-3 rounded-xl border ${payment.is_bounced ? 'bg-red-50 border-red-100' : (!payment.is_verified && payment.payment_mode === 'cheque' ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100')}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500 capitalize">{payment.payment_mode} • {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("en-IN") : "—"}</p>
                    </div>
                    <div className="text-right">
                       {payment.is_bounced ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">Bounced</span>
                       ) : (!payment.is_verified && payment.payment_mode.toLowerCase() === 'cheque' ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">Pending Clearance</span>
                       ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">Cleared</span>
                       ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 bg-white bg-opacity-50 p-2.5 rounded-lg mt-2 flex justify-between items-center gap-2 border border-gray-100">
                    <div className="flex flex-col gap-0.5">
                      {payment.transaction_id && <span>Ref: <span className="font-mono text-gray-800">{payment.transaction_id}</span></span>}
                      {payment.receipt_number ? (
                        <span>Receipt: <span className="font-mono text-gray-800">{payment.receipt_number}</span></span>
                      ) : (
                        <span>Receipt ID: <span className="font-mono text-gray-800">#{payment.id}</span></span>
                      )}
                    </div>
                    {onViewReceipt && (
                      <button
                        onClick={() => onViewReceipt(payment.receipt_number || String(payment.id))}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors font-medium text-xs shadow-sm shrink-0 cursor-pointer"
                      >
                        <Download size={14} /> Download Receipt
                      </button>
                    )}
                  </div>
                  {payment.note && <p className="text-xs text-gray-500 mt-1 italic">{payment.note}</p>}
                  
                  {/* Action Buttons for Pending Cheques */}
                  {!payment.is_verified && !payment.is_bounced && payment.payment_mode.toLowerCase() === 'cheque' && onSuccess && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-orange-200/50">
                      <button
                        onClick={async () => {
                          if (processingPayment) return;
                          setProcessingPayment(payment.id);
                          const { clearStudentFeePayment } = await import("@/lib/fees/fee-generation");
                          const res = await clearStudentFeePayment(payment.id);
                          setProcessingPayment(null);
                          if (res.success) {
                             onSuccess();
                             onClose();
                          } else alert(res.error || "Failed to clear cheque.");
                        }}
                        disabled={!!processingPayment}
                        className="flex-1 bg-white border border-green-200 text-green-700 text-xs font-medium py-1.5 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                      >
                        {processingPayment === payment.id ? "Processing..." : "Clear Cheque"}
                      </button>
                      <button
                        onClick={async () => {
                          if (processingPayment) return;
                          if (!confirm("Are you sure you want to mark this cheque as bounced? The fee balance will be restored.")) return;
                          setProcessingPayment(payment.id);
                          const { bounceStudentFeePayment } = await import("@/lib/fees/fee-generation");
                          const res = await bounceStudentFeePayment(payment.id);
                          setProcessingPayment(null);
                          if (res.success) {
                             onSuccess();
                             onClose();
                          } else alert(res.error || "Failed to bounce cheque.");
                        }}
                        disabled={!!processingPayment}
                        className="flex-1 bg-white border border-red-200 text-red-700 text-xs font-medium py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {processingPayment === payment.id ? "Processing..." : "Bounce Cheque"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// View Fee Modal
const ViewFeeDetailsModal = ({
  isOpen,
  onClose,
  fee,
}: {
  isOpen: boolean;
  onClose: () => void;
  fee: StudentFee | null;
}) => {
  if (!fee) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fee Details">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Academic Year",
              value: fee.academic_year ? `Year ID: ${fee.academic_year}` : "N/A",
              icon: CalendarDays,
            },
            {
              label: "Fee Structure",
              value: fee.feetype_name || "N/A",
              icon: BookOpen,
            },
            {
              label: "Billing Period",
              icon: Clock,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">
                  {label}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Fee Amount</span>
            <span className="font-medium">{formatCurrency(fee.amount)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span className="font-medium">
              - {formatCurrency(fee.discount_amount ?? "0")}
            </span>
          </div>
          {parseFloat(fee.fine_amount || "0") >= 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Penalty</span>
              <span className="font-medium">
                + {formatCurrency(fee.fine_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-blue-200">
            <span>Payable Amount</span>
            <span className="text-blue-600">
              {formatCurrency(fee.payable_amount)}
            </span>
          </div>
        </div>

        {fee.discount_reference && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <p className="text-xs font-medium text-yellow-700 mb-1">
              Discount Reference
            </p>
            <p className="text-sm text-gray-700">{fee.discount_reference}</p>
            {fee.discount_note && (
              <p className="text-xs text-gray-500 mt-1">{fee.discount_note}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

// Main Page Component
export default function StudentLedgerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [selectedLedgerStudent, setSelectedLedgerStudent] = useState<Student | null>(null);
  const [ledgerFees, setLedgerFees] = useState<StudentFee[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showLedgerDropdown, setShowLedgerDropdown] = useState(false);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modals
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Receipt Search
  const [receiptSearchQuery, setReceiptSearchQuery] = useState("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [searchedReceiptNumber, setSearchedReceiptNumber] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentsAndYears() {
      const [studentsRes, yearsRes] = await Promise.all([
        fetchStudents(),
        fetchAcademicYearsForFee()
      ]);
      if (studentsRes.success && studentsRes.data) setStudents(studentsRes.data);
      if (yearsRes.success && yearsRes.data) {
        const activeYear = yearsRes.data.find(y => y.is_active || y.status === "Active") || yearsRes.data[0];
        if (activeYear) setActiveAcademicYearId(activeYear.id);
      }
    }
    loadStudentsAndYears();
  }, []);

  const loadLedgerData = useCallback(async () => {
    if (!selectedLedgerStudent) {
      setLedgerFees([]);
      return;
    }
    setLedgerLoading(true);
    try {
      const { fetchStudentLedgerSchedule } = await import("@/lib/fees/fee-generation");
      const res = await fetchStudentLedgerSchedule(selectedLedgerStudent.id, activeAcademicYearId || 0);
      if (res.success && res.data) {
        setLedgerFees(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLedgerLoading(false);
    }
  }, [selectedLedgerStudent, activeAcademicYearId]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData]);

  const handleDiscount = (fee: StudentFee) => {
    setSelectedFee(fee);
    setDiscountModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCollect = async (fee: StudentFee) => {
    setOpenMenuId(null);
    if (fee.is_virtual) {
      if (!selectedLedgerStudent) return;
      setLedgerLoading(true);
      try {
        const { generateSingleVirtualFee } = await import("@/lib/fees/fee-generation");
        const res = await generateSingleVirtualFee({
          student: selectedLedgerStudent.id,
          academic_year: activeAcademicYearId || 0,
          fee_wise_class: fee.fee_wise_class,
          billing_period: fee.billing_period,
          due_date: fee.due_date,
        });
        if (res.success && res.data) {
          setSelectedFee(res.data);
          setIsCollectFeeModalOpen(true);
          loadLedgerData();
        } else {
          alert("Failed to generate fee for collection.");
        }
      } catch (err) {
        alert("An error occurred while generating fee.");
      } finally {
        setLedgerLoading(false);
      }
    } else {
      setSelectedFee(fee);
      setIsCollectFeeModalOpen(true);
    }
  };
  const handleView = (fee: StudentFee) => {
    setSelectedFee(fee);
    setViewModalOpen(true);
    setOpenMenuId(null);
  };

  const studentLedgerView = (
    <div className="p-5">
      {/* Search Box */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 max-w-4xl mx-auto">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student by name, GR no., or class..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
            value={ledgerSearchQuery}
            onChange={(e) => {
              setLedgerSearchQuery(e.target.value);
              setShowLedgerDropdown(true);
              if (!e.target.value) {
                setSelectedLedgerStudent(null);
              }
            }}
            onFocus={() => setShowLedgerDropdown(true)}
          />
          {showLedgerDropdown && ledgerSearchQuery && (
            <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto">
              {students
                .filter((s) => {
                  const fName = s.name === "null" ? "" : s.name;
                  const lName = s.surname === "null" ? "" : s.surname;
                  const fullName = [fName, lName].filter(Boolean).join(" ").toLowerCase();
                  const className = (s.class_name || "").toLowerCase();
                  const grNo = (s.gr_no || "").toLowerCase();
                  const query = ledgerSearchQuery.toLowerCase();
                  return fullName.includes(query) || className.includes(query) || grNo.includes(query);
                })
                .map((s) => {
                  const fName = s.name === "null" ? "" : s.name;
                  const lName = s.surname === "null" ? "" : s.surname;
                  const fullName = [fName, lName].filter(Boolean).join(" ");
                  return (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50/50 border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors"
                      onClick={() => {
                        setSelectedLedgerStudent(s);
                        setLedgerSearchQuery(fullName);
                        setShowLedgerDropdown(false);
                      }}
                    >
                      <StudentAvatar name={fullName} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fullName}</p>
                        <p className="text-xs text-gray-500">ID#{String(s.id).padStart(3, '0')} • {s.class_name?.replace(/_/g, " ")} • GR: {s.gr_no || "N/A"}</p>
                      </div>
                    </button>
                  );
                })}
              {students.filter((s) => {
                  const fName = s.name === "null" ? "" : s.name;
                  const lName = s.surname === "null" ? "" : s.surname;
                  const fullName = [fName, lName].filter(Boolean).join(" ").toLowerCase();
                  const className = (s.class_name || "").toLowerCase();
                  const grNo = (s.gr_no || "").toLowerCase();
                  const query = ledgerSearchQuery.toLowerCase();
                  return fullName.includes(query) || className.includes(query) || grNo.includes(query);
              }).length === 0 && (
                <div className="p-8 text-center flex flex-col items-center">
                   <UserX size={24} className="text-gray-300 mb-2" />
                   <p className="text-sm font-medium text-gray-600">No students found</p>
                   <p className="text-xs text-gray-400">Try a different name</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Receipt Search Box */}
        <div className="relative w-full sm:w-64 shrink-0">
          <input
            type="text"
            placeholder="Find Receipt No..."
            className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
            value={receiptSearchQuery}
            onChange={(e) => setReceiptSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && receiptSearchQuery.trim()) {
                setSearchedReceiptNumber(receiptSearchQuery.trim());
                setIsReceiptModalOpen(true);
              }
            }}
          />
          <button 
            onClick={() => {
              if (receiptSearchQuery.trim()) {
                setSearchedReceiptNumber(receiptSearchQuery.trim());
                setIsReceiptModalOpen(true);
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {/* Dashboard Cards & Table */}
      {selectedLedgerStudent && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Summary Cards */}
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
             <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 rounded-2xl border border-gray-200">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white"><IndianRupee size={16} /></div>
                  <p className="text-sm font-medium text-gray-900">Base Fees</p>
               </div>
               <p className="text-xl font-bold text-gray-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
             <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-2xl border border-orange-200">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white"><AlertCircle size={16} /></div>
                  <p className="text-sm font-medium text-orange-900">Total Penalty</p>
               </div>
               <p className="text-xl font-bold text-orange-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.fine_amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
             <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white"><IndianRupee size={16} /></div>
                  <p className="text-sm font-medium text-blue-900">Total Payable</p>
               </div>
               <p className="text-xl font-bold text-blue-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.payable_amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
             <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-2xl border border-green-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><CheckCircle2 size={16} /></div>
                  <p className="text-sm font-medium text-green-900">Total Paid</p>
               </div>
               <p className="text-xl font-bold text-green-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.paid_amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
             <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-2xl border border-red-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white"><AlertCircle size={16} /></div>
                  <p className="text-sm font-medium text-red-900">Total Balance</p>
               </div>
               <p className="text-xl font-bold text-red-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.balance_amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
           </div>

           {/* Ledger Table / Cards */}
           <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
             <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                   <h3 className="font-semibold text-gray-900">Fee Records for Academic Year</h3>
                   <span className="text-xs font-medium bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm text-gray-600">
                     {ledgerFees.length} Records
                   </span>
                </div>

                {/* View Switcher Toggle */}
                <div className="flex items-center bg-gray-200/70 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewMode === "cards"
                        ? "bg-white text-blue-600 shadow-sm font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <LayoutGrid size={14} /> Cards
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewMode === "table"
                        ? "bg-white text-blue-600 shadow-sm font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <TableIcon size={14} /> Table
                  </button>
                </div>
             </div>

             {ledgerLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
             ) : ledgerFees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                   <Filter size={32} className="mb-2 opacity-50" />
                   <p className="text-sm font-medium">No fees found for this student.</p>
                </div>
             ) : viewMode === "cards" ? (
                /* Cards View */
                <div className="p-5 pb-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {ledgerFees.map(fee => (
                      <div key={fee.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                          <div>
                             <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100 mb-2">
                               {fee.feetype_name}
                             </span>
                             {fee.billing_period ? (
                               <h4 className="font-semibold text-gray-900">{formatBillingPeriod(fee.billing_period)}</h4>
                             ) : (
                               <h4 className="font-semibold text-gray-900">Due: {formatDisplayDate(fee.due_date)}</h4>
                             )}
                          </div>
                          <StatusBadge status={fee.status as any} />
                        </div>
                        
                        <div className="p-4 grid grid-cols-2 gap-4 flex-1">
                          <div>
                             <p className="text-[10px] uppercase text-gray-500 font-medium">Base Amount</p>
                             <p className="text-sm font-semibold text-gray-900">₹{parseFloat(fee.amount).toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase text-gray-500 font-medium">Penalty</p>
                             <p className="text-sm font-semibold text-orange-600">{parseFloat(fee.fine_amount ?? "0") > 0 ? `+ ₹${parseFloat(fee.fine_amount ?? "0").toLocaleString("en-IN")}` : "₹0.00"}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase text-gray-500 font-medium">Discount</p>
                             <p className="text-sm font-semibold text-green-600">{parseFloat(fee.discount_amount ?? "0") > 0 ? `- ₹${parseFloat(fee.discount_amount ?? "0").toLocaleString("en-IN")}` : "₹0.00"}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase text-gray-500 font-medium">Payable</p>
                             <p className="text-sm font-bold text-gray-900">₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}</p>
                          </div>
                          <div className="col-span-2 pt-3 mt-1 border-t border-gray-100 flex justify-between items-center bg-gray-50 -mx-4 -mb-4 px-4 py-3">
                             <div>
                               <p className="text-[10px] uppercase text-gray-500 font-medium">Paid</p>
                               <p className="text-sm font-bold text-green-600">₹{parseFloat(fee.paid_amount || "0").toLocaleString("en-IN")}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] uppercase text-gray-500 font-medium">Balance</p>
                               <p className="text-sm font-bold text-red-600">₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}</p>
                             </div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-white border-t border-gray-100 grid grid-cols-2 gap-2 mt-4">
                          {!fee.is_virtual && (
                             <button onClick={() => handleView(fee)} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                               <Eye size={14} className="text-gray-500" /> View Details
                             </button>
                          )}
                          {fee.status !== "paid" && (
                             <button onClick={() => handleCollect(fee)} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                               <IndianRupee size={14} /> Collect Pay
                             </button>
                          )}
                          {!fee.is_virtual && fee.status !== "paid" && (
                             <button onClick={() => handleDiscount(fee)} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                               <Percent size={14} className="text-gray-500" /> Discount
                             </button>
                          )}
                          {!fee.is_virtual && fee.status === "unpaid" && (
                             <button onClick={async () => {
                               if(confirm('Are you sure you want to delete this fee record?')) {
                                 await deleteStudentFee(fee.id);
                                 setLedgerFees((prev) => prev.filter((f) => f.id !== fee.id));
                               }
                             }} className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-red-100 text-red-600 text-xs font-medium rounded-xl hover:bg-red-50 transition-colors shadow-sm">
                               <X size={14} /> Delete
                             </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             ) : (
                /* Table View */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <th className="py-3.5 px-4">Fee Name / Period</th>
                        <th className="py-3.5 px-4">Due Date</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right">Base Amount</th>
                        <th className="py-3.5 px-4 text-right">Penalty</th>
                        <th className="py-3.5 px-4 text-right">Discount</th>
                        <th className="py-3.5 px-4 text-right">Payable</th>
                        <th className="py-3.5 px-4 text-right">Paid</th>
                        <th className="py-3.5 px-4 text-right">Balance</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {ledgerFees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 w-fit mb-1 border border-blue-100">
                                {fee.feetype_name}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {fee.billing_period ? formatBillingPeriod(fee.billing_period) : "Single Fee"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                            {formatDisplayDate(fee.due_date)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <StatusBadge status={fee.status as any} />
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-gray-900 whitespace-nowrap">
                            ₹{parseFloat(fee.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-orange-600 whitespace-nowrap">
                            {parseFloat(fee.fine_amount ?? "0") > 0 ? `+ ₹${parseFloat(fee.fine_amount ?? "0").toLocaleString("en-IN")}` : "₹0.00"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-green-600 whitespace-nowrap">
                            {parseFloat(fee.discount_amount ?? "0") > 0 ? `- ₹${parseFloat(fee.discount_amount ?? "0").toLocaleString("en-IN")}` : "₹0.00"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                            ₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-green-600 whitespace-nowrap">
                            ₹{parseFloat(fee.paid_amount || "0").toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-red-600 whitespace-nowrap">
                            ₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {!fee.is_virtual && (
                                <button
                                  onClick={() => handleView(fee)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                              {fee.status !== "paid" && (
                                <button
                                  onClick={() => handleCollect(fee)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                  title="Collect Pay"
                                >
                                  <IndianRupee size={12} /> Collect
                                </button>
                              )}
                              {!fee.is_virtual && fee.status !== "paid" && (
                                <button
                                  onClick={() => handleDiscount(fee)}
                                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Discount"
                                >
                                  <Percent size={16} />
                                </button>
                              )}
                              {!fee.is_virtual && fee.status === "unpaid" && (
                                <button
                                  onClick={async () => {
                                    if (confirm("Are you sure you want to delete this fee record?")) {
                                      await deleteStudentFee(fee.id);
                                      setLedgerFees((prev) => prev.filter((f) => f.id !== fee.id));
                                    }
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             )}
           </div>
         </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Ledger</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View and manage complete fee history for any student
            </p>
          </div>
        </div>
        {studentLedgerView}
      </div>

      <DiscountModal
        isOpen={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        fee={selectedFee}
        onSuccess={() => { loadLedgerData(); }}
      />
      <ViewFeeModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        fee={selectedFee}
        onSuccess={() => { loadLedgerData(); }}
        onViewReceipt={(receiptNo) => {
          setSearchedReceiptNumber(receiptNo);
          setIsReceiptModalOpen(true);
        }}
      />
      <CollectFeeModal
        isOpen={isCollectFeeModalOpen}
        onClose={() => {
          setIsCollectFeeModalOpen(false);
          setSelectedFee(null);
        }}
        fee={selectedFee}
        onSuccess={() => { loadLedgerData(); }}
      />
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSearchedReceiptNumber(null);
        }}
        receiptNumber={searchedReceiptNumber}
      />
    </div>
  );
}
