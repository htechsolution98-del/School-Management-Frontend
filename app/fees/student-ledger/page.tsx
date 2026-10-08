"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReceiptModal from "./ReceiptModal";
import ReceiptHistoryModal from "./ReceiptHistoryModal";
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
  Printer,
  Receipt,
  FileText,
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
import type { Payment } from "@/types/fees";
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

  const initialMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    student: "",
    academic_year: "",
    fee_wise_class: "",
    feetype: "",
    billing_period: initialMonth,
    due_date: `${initialMonth}-10`,
    selected_class: "",
  });

  useEffect(() => {
    setFeeType(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      const curMonth = new Date().toISOString().slice(0, 7);
      setForm({
        student: "",
        academic_year: "",
        fee_wise_class: "",
        feetype: "",
        billing_period: curMonth,
        due_date: `${curMonth}-10`,
        selected_class: "",
      });
      setErrors({});
      setToast(null);
    }
  }, [isOpen]);

  const uniqueClassOptions = Array.from(
    new Map([
      ...feeWiseClasses.map((fc) => [String(fc.school_class), fc.school_class_name] as [string, string]),
      ...students.filter((s) => s.school_class && s.class_name).map((s) => [String(s.school_class), s.class_name!] as [string, string]),
    ]).entries(),
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

    let finalDueDate = form.due_date;
    if (!finalDueDate && form.billing_period) {
      finalDueDate = `${form.billing_period}-10`;
    }
    if (!finalDueDate) {
      errs.due_date = "Due date is required";
    }

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
        due_date: finalDueDate,
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
              .filter((s) => {
                if (!form.selected_class) return false;
                const matchId = String(s.school_class) === String(form.selected_class);
                const selectedClsObj = uniqueClassOptions.find((c) => String(c.id) === String(form.selected_class));
                const matchName = selectedClsObj && s.class_name && selectedClsObj.name.toLowerCase() === s.class_name.toLowerCase();
                const matchDirectName = s.class_name && s.class_name.toLowerCase() === form.selected_class.toLowerCase();
                return matchId || matchName || matchDirectName;
              })
              .map((s) => {
                const fName = s.name === "null" ? "" : (s.name || "");
                const lName = s.surname === "null" ? "" : (s.surname || "");
                const fthName = s.father_name === "null" ? "" : (s.father_name || "");
                const fullName = [fName, lName].filter(Boolean).join(" ");
                return { 
                  value: String(s.id), 
                  label: `${fullName || "Student #" + s.id} - Father: ${fthName || "N/A"}` 
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
            onChange={(e) => {
              const val = e.target.value;
              update("billing_period", val);
              if (val && /^\d{4}-\d{2}$/.test(val)) {
                update("due_date", `${val}-10`);
              }
            }}
          />
        </FormField>

        <FormField
          label="Due Date"
          error={errors.due_date}
          required
        >
          <input
            type="date"
            className={inputClass}
            value={form.due_date}
            onChange={(e) => update("due_date", e.target.value)}
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

const CollectFeeModal = ({
  isOpen,
  onClose,
  fee,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  fee: StudentFee | null;
  onSuccess: (receiptNumber?: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [payerType, setPayerType] = useState<"student" | "government">("student");
  
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
      const isGovtDefault = Boolean(fee.is_rte_govt_claim && parseFloat(fee.balance_amount || "0") <= 0);
      const initialPayer = isGovtDefault ? "government" : "student";
      setPayerType(initialPayer);
      
      const defaultAmount = initialPayer === "government"
        ? (parseFloat(fee.rte_govt_claim_amount || fee.amount) - parseFloat(fee.rte_govt_paid_amount || "0")).toFixed(2)
        : (fee.balance_amount || "0.00");

      setForm({
        amount: defaultAmount,
        payment_mode: initialPayer === "government" ? "govt_rte" : "cash",
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: "",
        receipt_number: "",
        note: initialPayer === "government" ? "RTE Government reimbursement payment" : "",
      });
    }
  }, [fee]);

  const handlePayerChange = (newPayer: "student" | "government") => {
    setPayerType(newPayer);
    if (!fee) return;
    if (newPayer === "government") {
      const govtBal = Math.max(0, parseFloat(fee.rte_govt_claim_amount || fee.amount) - parseFloat(fee.rte_govt_paid_amount || "0"));
      setForm((prev) => ({
        ...prev,
        amount: govtBal.toFixed(2),
        payment_mode: "govt_rte",
        note: "RTE Government reimbursement payment",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        amount: fee.balance_amount || "0.00",
        payment_mode: "cash",
        note: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee) return;
    const errs: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Invalid amount";
    if (!form.payment_mode) errs.payment_mode = "Payment mode is required";
    if (!form.payment_date) errs.payment_date = "Payment date is required";
    
    if (["cheque", "upi", "card", "govt_rte"].includes(form.payment_mode) && !form.transaction_id && form.payment_mode !== "govt_rte") {
       errs.transaction_id = form.payment_mode === "cheque" ? "Cheque No. is required" : "Reference No. is required";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { collectStudentFeePayment } = await import("@/lib/fees/fee-generation");
      const result = await collectStudentFeePayment({
        student_fee: fee.id,
        payer_type: payerType,
        ...form
      });
      if (result.success) {
        setToast({ type: "success", message: payerType === "government" ? "Government RTE claim payment recorded!" : "Fee collected successfully!" });
        const receiptNo = result.data?.receipt_number;
        setTimeout(() => {
          onSuccess(receiptNo);
          onClose();
        }, 1200);
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
    <Modal isOpen={isOpen} onClose={onClose} title={payerType === "government" ? "Record RTE Government Claim Payment" : "Collect Student Fee"}>
      {fee && (
        <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-gray-900">{fee.student_name}</p>
                {fee.is_rte_govt_claim && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    🏛️ RTE Claim
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{fee.class_name} • {formatBillingPeriod(fee.billing_period)}</p>
            </div>
            <div className="text-right">
              {payerType === "government" ? (
                <>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Govt Claim Receivable</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {formatCurrency(
                      (parseFloat(fee.rte_govt_claim_amount || fee.amount) - parseFloat(fee.rte_govt_paid_amount || "0")).toFixed(2)
                    )}
                  </p>
                  <p className="text-[10px] text-gray-500">Status: {fee.rte_govt_status || "pending"}</p>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-center justify-end gap-1 text-red-500 text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      {formatCurrency(fee.amount)} BASE 
                      {parseFloat(fee.fine_amount || "0") > 0 && ` + ${formatCurrency(fee.fine_amount || "0")} PENALTY`} 
                      {parseFloat(fee.discount_amount || "0") > 0 && ` - ${formatCurrency(fee.discount_amount || "0")} DISCOUNT`}
                      =
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Student Balance</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(fee.balance_amount)}</p>
                </>
              )}
            </div>
        </div>
      )}

      {fee?.is_rte_govt_claim && (
        <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
          <button
            type="button"
            onClick={() => handlePayerChange("government")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              payerType === "government"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🏛️ Government RTE Claim
          </button>
          <button
            type="button"
            onClick={() => handlePayerChange("student")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              payerType === "student"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            👤 Student / Guardian
          </button>
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
          <FormField label={payerType === "government" ? "Govt Reimbursement Amount (₹)" : "Amount to Collect (₹)"} error={errors.amount} required>
            <input type="number" className={inputClass} value={form.amount} onChange={(e) => update("amount", e.target.value)} min="0" step="0.01" />
          </FormField>
          
          <FormField label="Payment Mode" error={errors.payment_mode} required>
             <select className={inputClass} value={form.payment_mode} onChange={(e) => update("payment_mode", e.target.value)}>
                {payerType === "government" ? (
                  <>
                    <option value="govt_rte">Government Direct Credit (RTGS/Treasury)</option>
                    <option value="cheque">Cheque / Demand Draft</option>
                    <option value="upi">UPI / Online</option>
                    <option value="cash">Cash Voucher</option>
                  </>
                ) : (
                  <>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </>
                )}
             </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Payment Date" error={errors.payment_date} required>
             <input type="date" className={inputClass} value={form.payment_date} onChange={(e) => update("payment_date", e.target.value)} />
          </FormField>
          <FormField label="Receipt / Sanction No. (Optional)" error={errors.receipt_number}>
             <input type="text" className={inputClass} value={form.receipt_number} onChange={(e) => update("receipt_number", e.target.value)} />
          </FormField>
        </div>

        {(form.payment_mode === "cheque" || form.payment_mode === "upi" || form.payment_mode === "card" || form.payment_mode === "govt_rte") && (
          <FormField label={form.payment_mode === "cheque" ? "Cheque No. *" : form.payment_mode === "govt_rte" ? "Govt Claim / Sanction Order Ref No." : "Reference / Transaction No. *"} error={errors.transaction_id}>
             <input type="text" className={inputClass} value={form.transaction_id} onChange={(e) => update("transaction_id", e.target.value)} />
          </FormField>
        )}

        <FormField label="Note (Optional)" error={errors.note}>
          <textarea className={`${inputClass} resize-none`} rows={2} value={form.note} onChange={(e) => update("note", e.target.value)} />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${payerType === "government" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Recording...</> : (payerType === "government" ? "Record Govt Reimbursement" : "Collect Payment")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const CollectMultipleFeesModal = ({
  isOpen,
  onClose,
  fees,
  student,
  academicYearId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  fees: StudentFee[];
  student: Student | null;
  academicYearId: number | null;
  onSuccess: (receiptNumber?: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [payerType, setPayerType] = useState<"student" | "government">("student");

  const [form, setForm] = useState({
    payment_mode: "cash",
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: "",
    note: "",
  });

  useEffect(() => {
    if (fees.length > 0) {
      const isGovt = fees.every(f => f.is_rte_govt_claim && parseFloat(f.balance_amount || "0") <= 0);
      setPayerType(isGovt ? "government" : "student");
      setForm({
        payment_mode: isGovt ? "govt_rte" : "cash",
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: "",
        note: isGovt ? `RTE Government claim reimbursement for ${fees.length} installments` : `Combined payment for ${fees.length} fee items`,
      });
    }
  }, [fees]);

  const handlePayerChange = (newPayer: "student" | "government") => {
    setPayerType(newPayer);
    if (newPayer === "government") {
      setForm((prev) => ({
        ...prev,
        payment_mode: "govt_rte",
        note: `RTE Government claim reimbursement for ${fees.length} installments`,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        payment_mode: "cash",
        note: `Combined payment for ${fees.length} fee items`,
      }));
    }
  };

  const totalCalculatedAmount = fees.reduce((sum, f) => {
    if (payerType === "government") {
      const claim = parseFloat(f.rte_govt_claim_amount || f.amount || "0");
      const paid = parseFloat(f.rte_govt_paid_amount || "0");
      return sum + Math.max(0, claim - paid);
    }
    return sum + parseFloat(f.balance_amount || "0");
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fees.length === 0) return;

    const errs: Record<string, string> = {};
    if (totalCalculatedAmount <= 0) errs.amount = "Total payable amount must be greater than 0";
    if (!form.payment_mode) errs.payment_mode = "Payment mode is required";
    if (!form.payment_date) errs.payment_date = "Payment date is required";

    if (["cheque", "upi", "card"].includes(form.payment_mode) && !form.transaction_id) {
       errs.transaction_id = form.payment_mode === "cheque" ? "Cheque No. is required" : "Reference No. is required";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { bulkCollectStudentFeePayments } = await import("@/lib/fees/fee-generation");
      const items = fees.map(f => ({
        student_fee_id: f.is_virtual ? undefined : f.id,
        student: student?.id || (typeof f.student === "object" ? (f.student as any)?.id : f.student),
        academic_year: academicYearId || undefined,
        fee_wise_class: f.fee_wise_class,
        billing_period: f.billing_period,
        due_date: f.due_date,
        amount: payerType === "government" 
          ? Math.max(0, parseFloat(f.rte_govt_claim_amount || f.amount || "0") - parseFloat(f.rte_govt_paid_amount || "0")).toFixed(2)
          : f.balance_amount,
      }));

      const result = await bulkCollectStudentFeePayments({
        items,
        payer_type: payerType,
        ...form
      });

      if (result.success && result.data) {
        setToast({ type: "success", message: `Successfully collected ${fees.length} fees! Generating combined receipt...` });
        const receiptNo = result.data?.receipt_number;
        setTimeout(() => {
          onSuccess(receiptNo);
          onClose();
        }, 1200);
      } else {
        setToast({ type: "error", message: result.error || "Failed to collect fees" });
      }
    } catch (error: any) {
      setToast({ type: "error", message: error.message || "Failed to collect fees" });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Collect Multiple Fees (${fees.length} Selected)`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {toast && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${toast.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {toast.message}
          </div>
        )}

        {/* Selected Student Details */}
        {student && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3.5 border border-blue-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{student.name} {student.surname}</p>
              <p className="text-xs text-gray-500">GR No: {student.gr_no || "-"} • Class: {student.class_name || "-"}</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm">
                {fees.length} Fees
              </span>
            </div>
          </div>
        )}

        {/* Payer Type Selection */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => handlePayerChange("student")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              payerType === "student" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            👤 Student / Parent Payment
          </button>
          <button
            type="button"
            onClick={() => handlePayerChange("government")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              payerType === "government" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            🏛️ Government RTE Claim
          </button>
        </div>

        {/* Selected Items List */}
        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold sticky top-0">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">Period / Fee</th>
                <th className="p-2.5 text-right">Base</th>
                <th className="p-2.5 text-right">{payerType === "government" ? "Govt Claim" : "Payable"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fees.map((f, idx) => {
                const itemPayable = payerType === "government"
                  ? Math.max(0, parseFloat(f.rte_govt_claim_amount || f.amount || "0") - parseFloat(f.rte_govt_paid_amount || "0"))
                  : parseFloat(f.balance_amount || "0");
                return (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="p-2.5 text-gray-400">{idx + 1}</td>
                    <td className="p-2.5 font-medium text-gray-800">
                      {f.feetype_name} ({formatBillingPeriod(f.billing_period || "")})
                      {f.is_rte_govt_claim && <span className="ml-1 text-[10px] text-indigo-600 font-bold">🏛️ RTE</span>}
                    </td>
                    <td className="p-2.5 text-right text-gray-600">₹{parseFloat(f.amount || "0").toLocaleString("en-IN")}</td>
                    <td className="p-2.5 text-right font-bold text-gray-900">₹{itemPayable.toLocaleString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Grand Total Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-900 uppercase">Total Amount to Collect:</span>
          <span className="text-lg font-black text-blue-700">₹{totalCalculatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Payment Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode *</label>
            <select
              value={form.payment_mode}
              onChange={(e) => update("payment_mode", e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {payerType === "government" ? (
                <>
                  <option value="govt_rte">Government RTE Direct Credit</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </>
              ) : (
                <>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </>
              )}
            </select>
            {errors.payment_mode && <p className="text-[11px] text-red-500 mt-0.5">{errors.payment_mode}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date *</label>
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => update("payment_date", e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {errors.payment_date && <p className="text-[11px] text-red-500 mt-0.5">{errors.payment_date}</p>}
          </div>

          {["cheque", "upi", "card", "bank_transfer"].includes(form.payment_mode) && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {form.payment_mode === "cheque" ? "Cheque Number *" : "Reference / Transaction ID *"}
              </label>
              <input
                type="text"
                placeholder={form.payment_mode === "cheque" ? "e.g. CHQ-981240" : "e.g. UPI-TXN-872134"}
                value={form.transaction_id}
                onChange={(e) => update("transaction_id", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              {errors.transaction_id && <p className="text-[11px] text-red-500 mt-0.5">{errors.transaction_id}</p>}
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              placeholder="Optional notes or remarks..."
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || totalCalculatedAmount <= 0}
            className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-blue-200 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            {loading ? "Processing..." : `Collect ₹${totalCalculatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} & Get Receipt`}
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
            <span>Student Payable Amount</span>
            <span className="text-blue-600">
              {formatCurrency(fee.payable_amount)}
            </span>
          </div>
        </div>

        {fee.is_rte_govt_claim && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                🏛️ RTE Government Claim / Receivable
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                fee.rte_govt_status === "received"
                  ? "bg-green-100 text-green-700"
                  : fee.rte_govt_status === "partially_received"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-orange-100 text-orange-700"
              }`}>
                {fee.rte_govt_status || "pending"}
              </span>
            </div>
            <div className="flex justify-between text-sm text-indigo-900">
              <span>Total Government Claim</span>
              <span className="font-bold">{formatCurrency(fee.rte_govt_claim_amount || fee.amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-700">
              <span>Reimbursement Received</span>
              <span className="font-bold">{formatCurrency(fee.rte_govt_paid_amount || "0")}</span>
            </div>
            <div className="flex justify-between text-sm text-orange-700 pt-1 border-t border-indigo-100">
              <span>Pending Government Balance</span>
              <span className="font-bold">
                {formatCurrency(
                  (parseFloat(fee.rte_govt_claim_amount || fee.amount) - parseFloat(fee.rte_govt_paid_amount || "0")).toFixed(2)
                )}
              </span>
            </div>
          </div>
        )}

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

  // Multi-selection state
  const [selectedFeeKeys, setSelectedFeeKeys] = useState<string[]>([]);
  const [isCollectMultipleModalOpen, setIsCollectMultipleModalOpen] = useState(false);

  // Modals
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Receipt Search & History
  const [receiptSearchQuery, setReceiptSearchQuery] = useState("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReceiptHistoryModalOpen, setIsReceiptHistoryModalOpen] = useState(false);
  const [searchedReceiptNumber, setSearchedReceiptNumber] = useState<string | null>(null);
  const [selectedReceiptPayments, setSelectedReceiptPayments] = useState<Payment[] | null>(null);

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
      setSelectedFeeKeys([]);
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

  // Helper to get unique key for fee item
  const getFeeKey = (fee: StudentFee): string => String(fee.id);

  // Compute selectable fees
  const selectableFees = useMemo(() => {
    return ledgerFees.filter((fee: StudentFee) => {
      const studentBal = parseFloat(fee.balance_amount || "0");
      const govtBal = fee.is_rte_govt_claim
        ? Math.max(0, parseFloat(fee.rte_govt_claim_amount || fee.amount || "0") - parseFloat(fee.rte_govt_paid_amount || "0"))
        : 0;
      return (studentBal > 0 || govtBal > 0 || fee.status !== "paid");
    });
  }, [ledgerFees]);

  const isAllSelected = selectableFees.length > 0 && selectedFeeKeys.length === selectableFees.length;
  const isSomeSelected = selectedFeeKeys.length > 0 && selectedFeeKeys.length < selectableFees.length;

  const toggleSelectFee = (fee: StudentFee | string) => {
    const key = typeof fee === "string" ? fee : getFeeKey(fee);
    setSelectedFeeKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFeeKeys([]);
    } else {
      setSelectedFeeKeys(selectableFees.map((f: StudentFee) => getFeeKey(f)));
    }
  };

  const selectedFeeObjects = useMemo(() => {
    return ledgerFees.filter((f: StudentFee) => selectedFeeKeys.includes(getFeeKey(f)));
  }, [ledgerFees, selectedFeeKeys]);

  const selectedTotalAmount = useMemo(() => {
    return selectedFeeObjects.reduce((sum: number, f: StudentFee) => {
      const studentBal = parseFloat(f.balance_amount || "0");
      if (f.is_rte_govt_claim && studentBal <= 0) {
        const govtBal = parseFloat(f.rte_govt_claim_amount || f.amount || "0") - parseFloat(f.rte_govt_paid_amount || "0");
        return sum + Math.max(0, govtBal);
      }
      return sum + studentBal;
    }, 0);
  }, [selectedFeeObjects]);

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
           {(() => {
             const isRteStudent = Boolean(
               selectedLedgerStudent?.is_rte ||
               ledgerFees.some((f) => f.is_rte_student || f.is_rte_govt_claim)
             );

             const totalBaseFees = ledgerFees.reduce((sum, f) => sum + parseFloat(f.amount || "0"), 0);
             const totalPenalty = ledgerFees.reduce((sum, f) => sum + parseFloat(f.fine_amount || "0"), 0);
             const totalStudentPayable = ledgerFees.reduce((sum, f) => sum + parseFloat(f.payable_amount || "0"), 0);
             const totalStudentPaid = ledgerFees.reduce((sum, f) => sum + parseFloat(f.paid_amount || "0"), 0);
             const totalStudentBalance = ledgerFees.reduce((sum, f) => sum + parseFloat(f.balance_amount || "0"), 0);

             const totalGovtClaim = ledgerFees.reduce(
               (sum, f) => sum + (f.is_rte_govt_claim ? parseFloat(f.rte_govt_claim_amount || f.amount || "0") : 0),
               0
             );
             const totalGovtPaid = ledgerFees.reduce(
               (sum, f) => sum + (f.is_rte_govt_claim ? parseFloat(f.rte_govt_paid_amount || "0") : 0),
               0
             );
             const totalGovtPending = Math.max(0, totalGovtClaim - totalGovtPaid);

             return isRteStudent ? (
               <div className="space-y-3 mb-6">
                 {/* RTE Student Tag Banner */}
                 <div className="flex flex-wrap items-center justify-between bg-indigo-50/80 border border-indigo-200 px-4 py-2.5 rounded-2xl gap-2">
                   <div className="flex items-center gap-2">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[11px]">
                       RTE
                     </span>
                     <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                       RTE Quota Student — Fee & Government Reimbursement Breakdown
                     </span>
                   </div>
                   <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-sm">
                     Total Govt Claim: ₹{totalGovtClaim.toLocaleString("en-IN")}
                   </span>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                   {/* 1. Base Fees */}
                   <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 rounded-2xl border border-gray-200">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-7 h-7 rounded-lg bg-gray-500 flex items-center justify-center text-white">
                         <IndianRupee size={14} />
                       </div>
                       <p className="text-xs font-medium text-gray-700">Base Fees</p>
                     </div>
                     <p className="text-lg font-bold text-gray-950">₹{totalBaseFees.toLocaleString("en-IN")}</p>
                   </div>

                   {/* 2. Student Payable */}
                   <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-100">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                         <IndianRupee size={14} />
                       </div>
                       <p className="text-xs font-medium text-blue-900">Student Payable</p>
                     </div>
                     <p className="text-lg font-bold text-blue-950">₹{totalStudentPayable.toLocaleString("en-IN")}</p>
                   </div>

                   {/* 3. Student Paid */}
                   <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                         <CheckCircle2 size={14} />
                       </div>
                       <p className="text-xs font-medium text-emerald-900">Student Paid</p>
                     </div>
                     <p className="text-lg font-bold text-emerald-950">₹{totalStudentPaid.toLocaleString("en-IN")}</p>
                   </div>

                   {/* 4. Student Balance */}
                   <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-2xl border border-red-100">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center text-white">
                         <AlertCircle size={14} />
                       </div>
                       <p className="text-xs font-medium text-red-900">Student Balance</p>
                     </div>
                     <p className="text-lg font-bold text-red-950">₹{totalStudentBalance.toLocaleString("en-IN")}</p>
                   </div>

                   {/* 5. Govt Paid (Received) */}
                   <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100/60 p-4 rounded-2xl border-2 border-indigo-300 shadow-sm">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs">
                         🏛️
                       </div>
                       <p className="text-xs font-bold text-indigo-900">Govt Paid (Received)</p>
                     </div>
                     <p className="text-lg font-extrabold text-indigo-950">₹{totalGovtPaid.toLocaleString("en-IN")}</p>
                     <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">Cleared by Govt</p>
                   </div>

                   {/* 6. Govt Pending (Receivable) */}
                   <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 p-4 rounded-2xl border-2 border-amber-300 shadow-sm">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white">
                         <Clock size={14} />
                       </div>
                       <p className="text-xs font-bold text-amber-900">Govt Pending</p>
                     </div>
                     <p className="text-lg font-extrabold text-amber-950">₹{totalGovtPending.toLocaleString("en-IN")}</p>
                     <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Claim Receivable</p>
                   </div>
                 </div>
               </div>
             ) : (
               /* Normal Student Summary Cards */
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                 <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 rounded-2xl border border-gray-200">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white"><IndianRupee size={16} /></div>
                     <p className="text-sm font-medium text-gray-900">Base Fees</p>
                   </div>
                   <p className="text-xl font-bold text-gray-950">₹{totalBaseFees.toLocaleString("en-IN")}</p>
                 </div>
                 <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-2xl border border-orange-200">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white"><AlertCircle size={16} /></div>
                     <p className="text-sm font-medium text-orange-900">Total Penalty</p>
                   </div>
                   <p className="text-xl font-bold text-orange-950">₹{totalPenalty.toLocaleString("en-IN")}</p>
                 </div>
                 <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-100">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white"><IndianRupee size={16} /></div>
                     <p className="text-sm font-medium text-blue-900">Student Payable</p>
                   </div>
                   <p className="text-xl font-bold text-blue-950">₹{totalStudentPayable.toLocaleString("en-IN")}</p>
                 </div>
                 <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-2xl border border-green-100">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><CheckCircle2 size={16} /></div>
                     <p className="text-sm font-medium text-green-900">Student Paid</p>
                   </div>
                   <p className="text-xl font-bold text-green-950">₹{totalStudentPaid.toLocaleString("en-IN")}</p>
                 </div>
                 <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-2xl border border-red-100">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white"><AlertCircle size={16} /></div>
                     <p className="text-sm font-medium text-red-900">Student Balance</p>
                   </div>
                   <p className="text-xl font-bold text-red-950">₹{totalStudentBalance.toLocaleString("en-IN")}</p>
                 </div>
               </div>
             );
           })()}

           {/* Ledger Table / Cards */}
           <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white mb-20">
             <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                   {selectableFees.length > 0 && (
                     <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
                       <input
                         type="checkbox"
                         checked={isAllSelected}
                         ref={(el) => {
                           if (el) el.indeterminate = isSomeSelected;
                         }}
                         onChange={toggleSelectAll}
                         className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                       />
                       <span>Select All Pending ({selectableFees.length})</span>
                     </label>
                   )}
                   <span className="text-xs font-medium bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm text-gray-600">
                     {ledgerFees.length} Records
                   </span>
                   {(selectedLedgerStudent?.is_rte || ledgerFees.some(f => f.is_rte_student || f.is_rte_govt_claim)) && (
                     <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200">
                       RTE Student
                     </span>
                   )}
                </div>

                {/* View Switcher Toggle & View Receipts */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsReceiptHistoryModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-gray-700 hover:text-blue-600 border border-gray-200 shadow-sm hover:shadow transition-all hover:bg-gray-50 active:scale-95"
                    title="View all receipts for this student"
                  >
                    <Receipt size={14} className="text-blue-600" />
                    <span>View Receipts</span>
                  </button>

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
                    {ledgerFees.map(fee => {
                      const isPaid = fee.status === "paid";
                      const isSelectable = !isPaid;
                      const isSelected = selectedFeeKeys.includes(getFeeKey(fee));

                      return (
                        <div
                          key={fee.id}
                          className={`rounded-2xl border transition-all overflow-hidden flex flex-col ${
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-white"
                              : isPaid
                                ? "border-emerald-200 bg-emerald-50/25 shadow-sm hover:shadow-md"
                                : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                          }`}
                        >
                          <div className={`p-4 border-b flex justify-between items-start gap-2 ${
                            isPaid ? "border-emerald-100 bg-emerald-50/50" : "border-gray-100 bg-gray-50/50"
                          }`}>
                            <div className="flex items-start gap-2.5">
                              {isSelectable && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectFee(fee)}
                                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                />
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                    {fee.feetype_name}
                                  </span>
                                  {fee.is_rte_govt_claim && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                                      🏛️ RTE Claim
                                    </span>
                                  )}
                                </div>
                                {fee.billing_period ? (
                                  <h4 className="font-semibold text-gray-900">{formatBillingPeriod(fee.billing_period)}</h4>
                                ) : (
                                  <h4 className="font-semibold text-gray-900">Due: {formatDisplayDate(fee.due_date)}</h4>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <StatusBadge status={fee.status as any} />
                              {fee.is_rte_govt_claim && (
                                <span className={`text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded ${
                                  fee.rte_govt_status === 'received' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  Govt: {fee.rte_govt_status || 'pending'}
                                </span>
                              )}
                            </div>
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
                               <p className="text-[10px] uppercase text-gray-500 font-medium">Student Payable</p>
                               <p className="text-sm font-bold text-gray-900">₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}</p>
                            </div>
                            {fee.is_rte_govt_claim && (
                              <div className="col-span-2 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                                <div>
                                  <span className="font-semibold text-indigo-900">Govt Claim:</span> ₹{parseFloat(fee.rte_govt_claim_amount || fee.amount).toLocaleString("en-IN")}
                                </div>
                                <span className="text-indigo-700 font-medium">
                                  Paid: ₹{parseFloat(fee.rte_govt_paid_amount || "0").toLocaleString("en-IN")}
                                </span>
                              </div>
                            )}
                            <div className={`col-span-2 pt-3 mt-1 border-t flex justify-between items-center -mx-4 -mb-4 px-4 py-3 ${
                              isPaid ? "border-emerald-100 bg-emerald-50/40" : "border-gray-100 bg-gray-50"
                            }`}>
                               <div>
                                 <p className="text-[10px] uppercase text-gray-500 font-medium">Student Paid</p>
                                 <p className="text-sm font-bold text-green-600">₹{parseFloat(fee.paid_amount || "0").toLocaleString("en-IN")}</p>
                               </div>
                               <div className="text-right">
                                 <p className="text-[10px] uppercase text-gray-500 font-medium">Student Balance</p>
                                 <p className="text-sm font-bold text-red-600">₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}</p>
                               </div>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-white border-t border-gray-100 mt-4">
                            {isPaid ? (
                              <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200">
                                <CheckCircle2 size={15} /> Fee Paid & Cleared
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleCollect(fee)}
                                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                                >
                                  <IndianRupee size={14} /> Collect Pay
                                </button>
                                {!fee.is_virtual && (
                                  <button
                                    onClick={() => handleDiscount(fee)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                                  >
                                    <Percent size={14} className="text-gray-500" /> Discount
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
                                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-red-100 text-red-600 text-xs font-medium rounded-xl hover:bg-red-50 transition-colors shadow-sm"
                                  >
                                    <X size={14} /> Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
             ) : (
                /* Table View */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <th className="py-3.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeSelected;
                            }}
                            onChange={toggleSelectAll}
                            disabled={selectableFees.length === 0}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer disabled:opacity-40"
                            title="Select / Deselect all pending fees"
                          />
                        </th>
                        <th className="py-3.5 px-4">Fee Name / Period</th>
                        <th className="py-3.5 px-4">Due Date</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right">Base Amount</th>
                        <th className="py-3.5 px-4 text-right">Penalty</th>
                        <th className="py-3.5 px-4 text-right">Discount</th>
                        <th className="py-3.5 px-4 text-right">Student Payable</th>
                        <th className="py-3.5 px-4 text-right">Student Paid</th>
                        <th className="py-3.5 px-4 text-right">Student Balance</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {ledgerFees.map((fee) => {
                        const isPaid = fee.status === "paid";
                        const isSelectable = !isPaid;
                        const isSelected = selectedFeeKeys.includes(getFeeKey(fee));

                        return (
                          <tr
                            key={fee.id}
                            className={`transition-colors ${
                              isSelected
                                ? "bg-blue-50/80"
                                : isPaid
                                  ? "bg-emerald-50/70 hover:bg-emerald-100/60"
                                  : "hover:bg-blue-50/30"
                            }`}
                          >
                            <td className="py-3.5 px-3 text-center">
                              {isSelectable ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectFee(fee)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                />
                              ) : (
                                <span className="w-4 h-4 inline-block text-emerald-500 font-bold">✓</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 w-fit border border-blue-100">
                                    {fee.feetype_name}
                                  </span>
                                  {fee.is_rte_govt_claim && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 w-fit border border-indigo-200">
                                      🏛️ RTE Claim
                                    </span>
                                  )}
                                </div>
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
                              {fee.is_rte_govt_claim && (
                                <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                                  Govt: {fee.rte_govt_status || 'pending'}
                                </div>
                              )}
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
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 size={13} /> Paid
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleCollect(fee)}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                      title="Collect Pay"
                                    >
                                      <IndianRupee size={12} /> Collect
                                    </button>
                                    {!fee.is_virtual && (
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
                                  </>
                                )}
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

           {/* Floating Bottom Action Bar for Multi-Fee Selection */}
           {selectedFeeKeys.length > 0 && (
             <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-3xl bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gray-700 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300">
               <div className="flex items-center gap-4">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                   {selectedFeeKeys.length}
                 </div>
                 <div>
                   <p className="text-xs text-gray-400 uppercase font-medium">Selected Fees Total</p>
                   <p className="text-lg font-bold text-white">
                     ₹{selectedTotalAmount.toLocaleString("en-IN")}
                   </p>
                 </div>
               </div>

               <div className="flex items-center gap-2.5">
                 <button
                   onClick={() => setSelectedFeeKeys([])}
                   className="px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
                 >
                   Clear Selection
                 </button>
                 <button
                   onClick={() => setIsCollectMultipleModalOpen(true)}
                   className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                 >
                   <IndianRupee size={16} />
                   Collect Selected Fees ({selectedFeeKeys.length})
                 </button>
               </div>
             </div>
           )}
         </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View and manage complete fee history for any student
          </p>
        </div>
      </div>
      {studentLedgerView}

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
        onSuccess={(receiptNo) => {
          loadLedgerData();
          if (receiptNo) {
            setSearchedReceiptNumber(receiptNo);
            setIsReceiptModalOpen(true);
          }
        }}
      />
      <CollectMultipleFeesModal
        isOpen={isCollectMultipleModalOpen}
        onClose={() => setIsCollectMultipleModalOpen(false)}
        fees={selectedFeeObjects}
        student={selectedLedgerStudent}
        academicYearId={activeAcademicYearId}
        onSuccess={(receiptNo) => {
          setSelectedFeeKeys([]);
          loadLedgerData();
          if (receiptNo) {
            setSearchedReceiptNumber(receiptNo);
            setIsReceiptModalOpen(true);
          }
        }}
      />
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSearchedReceiptNumber(null);
          setSelectedReceiptPayments(null);
        }}
        receiptNumber={searchedReceiptNumber}
        initialPayments={selectedReceiptPayments}
      />
      <ReceiptHistoryModal
        isOpen={isReceiptHistoryModalOpen}
        onClose={() => setIsReceiptHistoryModalOpen(false)}
        student={selectedLedgerStudent}
        onSelectReceipt={(receiptNo, items) => {
          setSearchedReceiptNumber(receiptNo);
          setSelectedReceiptPayments(items);
          setIsReceiptModalOpen(true);
        }}
      />
    </div>
  );
}
