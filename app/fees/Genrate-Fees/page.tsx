"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  getUniqueClasses,
  validateMonthlyFeeForm,
  validateSingleFeeForm,
  validateDiscountForm,
  type Student,
  type StudentFee,
  type AcademicYear,
  type FeeWiseClass,
} from "@/lib/fees";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";
import ReceiptModal from "../student-ledger/ReceiptModal";

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
                  {(payment.transaction_id || payment.receipt_number) && (
                    <div className="text-xs text-gray-600 bg-white bg-opacity-50 p-2 rounded mt-2 flex justify-between items-center gap-2 border border-gray-100">
                      <div className="flex flex-col gap-1">
                        {payment.transaction_id && <span>Ref: {payment.transaction_id}</span>}
                        {payment.receipt_number && <span>Receipt: <span className="font-mono text-gray-800">{payment.receipt_number}</span></span>}
                      </div>
                      {payment.receipt_number && onViewReceipt && (
                        <button
                          onClick={() => onViewReceipt(payment.receipt_number!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors font-medium shadow-sm"
                        >
                          <Download size={14} /> Download
                        </button>
                      )}
                    </div>
                  )}
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
// Main Page Component
export default function GenerateFeesPage() {
  const [activeTab, setActiveTab] = useState<"monthly" | "single">("monthly");
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [feeWiseClasses, setFeeWiseClasses] = useState<FeeWiseClass[]>([]);


  // Filters
  const [filterClass, setFilterClass] = useState("");
  const [filterPeriod, setFilterPeriod] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [searchedReceiptNumber, setSearchedReceiptNumber] = useState<string | null>(null);

  const uniqueClasses = getUniqueClasses(students);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, feesRes, yearsRes, feeClassesRes] = await Promise.all(
        [
          fetchStudents(),
          fetchStudentFees({
            class_name: filterClass,
            billing_period: filterPeriod,
            search: searchQuery,
            page: currentPage,
          }),
          fetchAcademicYearsForFee(),
          fetchFeeWiseClassesForFee(),
        ],
      );

      if (studentsRes.success && studentsRes.data)
        setStudents(studentsRes.data);
      if (feesRes.success && feesRes.data) {
        setFees(feesRes.data.results);
      }

      if (yearsRes.success && yearsRes.data) setAcademicYears(yearsRes.data);
      if (feeClassesRes.success && feeClassesRes.data)
        setFeeWiseClasses(feeClassesRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterPeriod, searchQuery, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // Client-side filtering for mock data
  const filteredFees = fees.filter((fee) => {
    const matchTab =
      activeTab === "monthly"
        ? fee.billing_period !== "" && fee.billing_period != null
        : fee.billing_period === "" || fee.billing_period == null;
    return matchTab;
  });


  const paginatedFees = filteredFees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const totalPages = Math.ceil(filteredFees.length / ITEMS_PER_PAGE);

  // Stats
  const totalStudents = students.length;
  const totalOutstanding = fees
    .filter((f) => f.status !== "paid")
    .reduce((a, f) => a + parseFloat(f.payable_amount), 0);
  const totalCollected = fees
    .filter((f) => f.status === "paid")
    .reduce((a, f) => a + parseFloat(f.payable_amount), 0);
  const overdueFees = fees
    .filter((f) => f.status === "overdue")
    .reduce((a, f) => a + parseFloat(f.payable_amount), 0);
  const totalDiscount = fees.reduce(
    (a, f) => a + (parseFloat(f.discount_amount ?? "0") || 0),
    0,
  );

  const discountedStudents = fees.filter(
    (f) => parseFloat(f.discount_amount ?? "0") > 0,
  ).length;

  const avgDiscount =
    discountedStudents > 0 ? totalDiscount / discountedStudents : 0;

  const handleDiscount = (fee: StudentFee) => {
    setSelectedFee(fee);
    setDiscountModalOpen(true);
    setOpenMenuId(null);
  };
  const handleCollect = (fee: StudentFee) => {
    setSelectedFee(fee);
    setIsCollectFeeModalOpen(true);
    setOpenMenuId(null);
  };
  const handleView = (fee: StudentFee) => {
    setSelectedFee(fee);
    setViewModalOpen(true);
    setOpenMenuId(null);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Fee</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage student fees, billing and discounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Download size={15} /> Export
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} /> Create Fee
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Total Students"
            value={totalStudents.toLocaleString()}
            subtitle="Active students"
            icon={Users}
            iconBg="bg-blue-500"
          />
          <StatCard
            title="Total Outstanding"
            value={`₹${(totalOutstanding / 100000).toFixed(2)}L`}
            subtitle="Pending amount"
            icon={IndianRupee}
            iconBg="bg-purple-500"
            valueColor="text-purple-600"
          />
          <StatCard
            title="Total Collected"
            value={`₹${(totalCollected / 1000).toFixed(1)}K`}
            subtitle="This academic year"
            icon={TrendingUp}
            iconBg="bg-green-500"
            valueColor="text-green-600"
          />
          <StatCard
            title="Overdue Fees"
            value={`₹${(overdueFees / 1000).toFixed(1)}K`}
            subtitle="Requires attention"
            icon={AlertCircle}
            iconBg="bg-orange-500"
            valueColor="text-orange-600"
          />
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-5 pt-4">
            {(["monthly", "single"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                {tab === "monthly" ? "Monthly Fees" : "Single Fees"}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Class Filter */}
              <div className="relative flex-1 min-w-0">
                <GraduationCap
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>
                      {c
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Filter */}
              {activeTab === "monthly" && (
                <div className="relative flex-1 min-w-0">
                  <CalendarDays
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="month"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={filterPeriod}
                    onChange={(e) => {
                      setFilterPeriod(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}

              {/* Search */}
              <div className="relative flex-1 min-w-0 sm:max-w-xs">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search student..."
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto pb-32">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : paginatedFees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Filter size={40} className="mb-3 opacity-50" />
                <p className="font-medium">No fees found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "Student",
                      "Class & Section",
                      "Billing Period",
                      "Due Date",
                      "Amount (₹)",
                      "Discount (₹)",
                      "Payable (₹)",
                      "Paid (₹)",
                      "Balance (₹)",
                      "Status",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedFees.map((fee) => (
                    <tr
                      key={fee.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar name={fee.student_name} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {fee.student_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              ID#{fee.student.toString().padStart(3, "0")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 font-medium capitalize">
                          {fee.class_name?.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-400">A Section</p>
                      </td>
                      <td className="px-4 py-3">
                        {fee.billing_period ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                            {formatBillingPeriod(fee.billing_period)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDisplayDate(fee.due_date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        ₹{parseFloat(fee.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {parseFloat(fee.discount_amount ?? "0") > 0 ? (
                          `₹${parseFloat(fee.discount_amount ?? "0").toLocaleString("en-IN")}`
                        ) : (
                          <span className="text-gray-400 font-normal">
                            ₹0.00
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        ₹
                        {parseFloat(fee.payable_amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">
                        ₹{parseFloat(fee.paid_amount || "0").toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600">
                        ₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={fee.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(fee)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleCollect(fee)}
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-gray-400 hover:text-green-600"
                          >
                            <IndianRupee size={15} />
                          </button>
                          {fee.status !== "paid" && (
                            <button
                              onClick={() => handleDiscount(fee)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                            >
                              <Percent size={15} />
                            </button>
                          )}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId === fee.id ? null : fee.id,
                                )
                              }
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {openMenuId === fee.id && (
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-36 py-1">
                                <button
                                  onClick={() => handleView(fee)}
                                  className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Eye size={14} /> View
                                </button>
                                <button
                                  onClick={() => handleCollect(fee)}
                                  className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <IndianRupee size={14} /> Collect
                                </button>
                                {fee.status !== "paid" && (
                                  <button
                                    onClick={() => handleDiscount(fee)}
                                    className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Percent size={14} /> Discount
                                  </button>
                                )}
                                <hr className="my-1 border-gray-100" />
                                <button
                                  onClick={async () => {
                                    await deleteStudentFee(fee.id);
                                    setFees((prev) =>
                                      prev.filter((f) => f.id !== fee.id),
                                    );
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <X size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : paginatedFees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Filter size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No fees found</p>
              </div>
            ) : (
              paginatedFees.map((fee) => (
                <div
                  key={fee.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <StudentAvatar name={fee.student_name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {fee.student_name}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {fee.class_name?.replace(/_/g, " ")}
                        </p>
                        {fee.billing_period && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium mt-1">
                            {formatBillingPeriod(fee.billing_period)}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={fee.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] uppercase text-gray-400">Amount</p>
                      <p className="text-xs font-bold text-gray-900">
                        ₹{parseFloat(fee.amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] uppercase text-gray-400">Payable</p>
                      <p className="text-xs font-bold text-blue-600">
                        ₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] uppercase text-gray-400">Paid</p>
                      <p className="text-xs font-bold text-green-600">
                        ₹{parseFloat(fee.paid_amount || "0").toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] uppercase text-gray-400">Balance</p>
                      <p className="text-xs font-bold text-red-600">
                        ₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleView(fee)}
                      className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Eye size={12} /> View
                    </button>
                    {fee.status !== "paid" && (
                      <button
                        onClick={() => handleDiscount(fee)}
                        className="flex-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors"
                      >
                        <Percent size={12} /> Discount
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredFees.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Showing{" "}
                {Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredFees.length,
                )}{" "}
                to {Math.min(currentPage * ITEMS_PER_PAGE, filteredFees.length)}{" "}
                of {filteredFees.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) page = currentPage - 2 + i;
                    if (currentPage > totalPages - 2) page = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Discount Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Discount Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Tag size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Discount Given</p>
                <p className="text-base font-bold text-gray-900">
                  ₹
                  {totalDiscount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-gray-400">This month</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Discounted Fees</p>
                <p className="text-base font-bold text-gray-900">
                  {discountedStudents}
                </p>
                <p className="text-xs text-gray-400">Students</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl col-span-2 sm:col-span-1">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Percent size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Average Discount</p>
                <p className="text-base font-bold text-gray-900">
                  ₹{avgDiscount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">Per student</p>
              </div>
            </div>
          </div>
          <button className="mt-4 w-full sm:w-auto float-right flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            View All Discounts →
          </button>
        </div>
      </div>

      {/* Click outside to close menu */}
      {openMenuId !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* Modals */}
      <CreateFeeModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        students={students}
        academicYears={academicYears}
        feeWiseClasses={feeWiseClasses}
        onSuccess={() => { loadData(); }}
        activeTab={activeTab}
      />

      <DiscountModal
        isOpen={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        fee={selectedFee}
        onSuccess={() => { loadData(); }}
      />

      <ViewFeeModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        fee={selectedFee}
        onSuccess={() => { loadData(); }}
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
        onSuccess={() => { loadData(); }}
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
