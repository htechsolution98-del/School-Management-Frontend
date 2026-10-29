"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import CashDenominationCalculator, {
  CashDenominationState,
  INITIAL_CASH_STATE,
  calculateCashDetails,
} from "@/components/fees/cash-denomination-calculator";
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
  ChevronDown,
  ChevronUp,
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
  Layers,
  ExternalLink,
  Package,
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
  fetchStudentInventoryIssues,
  formatInventoryReceivedSummary,
  type StudentInventoryIssueRecord,
} from "@/lib/fees";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";
import ReceiptModal, { formatCashBreakdown } from "../student-ledger/ReceiptModal";

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
  zIndex = "z-[100]",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}>
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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
          <DatePicker
            value={form.due_date}
            onChange={(val) => update("due_date", val)}
            className="w-full"
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

// Bulk Generate Fee Modal (Class-Wise)
const BulkGenerateFeeModal = ({
  isOpen,
  onClose,
  students,
  academicYears,
  feeWiseClasses,
  onSuccess,
  defaultClass = "",
  defaultPeriod = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  academicYears: AcademicYear[];
  feeWiseClasses: FeeWiseClass[];
  onSuccess: () => void;
  defaultClass?: string;
  defaultPeriod?: string;
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const initialMonth = defaultPeriod || new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    selected_class: defaultClass,
    academic_year: "",
    fee_wise_class: "",
    feetype: "",
    billing_period: initialMonth,
    due_date: `${initialMonth}-10`,
  });

  const uniqueClassOptions = Array.from(
    new Map([
      ...feeWiseClasses.map((fc) => [String(fc.school_class), fc.school_class_name] as [string, string]),
      ...students.filter((s) => s.school_class && s.class_name).map((s) => [String(s.school_class), s.class_name!] as [string, string]),
    ]).entries(),
  ).map(([id, name]) => ({ id, name }));

  useEffect(() => {
    if (isOpen) {
      const activeYear = academicYears.find((y) => y.is_active);
      const curMonth = defaultPeriod || new Date().toISOString().slice(0, 7);

      let initialClassId = "";
      if (defaultClass) {
        const matched = uniqueClassOptions.find(
          (c) => c.name.toLowerCase() === defaultClass.toLowerCase() || String(c.id) === String(defaultClass)
        );
        if (matched) initialClassId = String(matched.id);
      }

      setForm({
        selected_class: initialClassId,
        academic_year: activeYear ? String(activeYear.id) : (academicYears[0] ? String(academicYears[0].id) : ""),
        fee_wise_class: "",
        feetype: "",
        billing_period: curMonth,
        due_date: `${curMonth}-10`,
      });
      setErrors({});
      setToast(null);
    }
  }, [isOpen, defaultClass, defaultPeriod, academicYears]);

  const targetStudents = students.filter((s) => {
    if (!form.selected_class) return false;
    const matchId = String(s.school_class) === String(form.selected_class);
    const selectedClsObj = uniqueClassOptions.find((c) => String(c.id) === String(form.selected_class));
    const matchName = selectedClsObj && s.class_name && selectedClsObj.name.toLowerCase() === s.class_name.toLowerCase();
    const matchDirectName = s.class_name && s.class_name.toLowerCase() === form.selected_class.toLowerCase();
    return matchId || matchName || matchDirectName;
  });

  const filteredFeeClasses = form.selected_class
    ? feeWiseClasses.filter((fc) => String(fc.school_class) === form.selected_class)
    : feeWiseClasses;

  const selectedFeeClass = feeWiseClasses.find((fc) => String(fc.id) === form.fee_wise_class);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!form.selected_class) errs.selected_class = "Class is required";
    if (!form.academic_year) errs.academic_year = "Academic year is required";
    if (!form.fee_wise_class) errs.fee_wise_class = "Fee structure is required";
    if (!form.billing_period) errs.billing_period = "Billing period is required";
    if (!form.due_date) errs.due_date = "Due date is required";

    if (form.selected_class && targetStudents.length === 0) {
      errs.selected_class = "No students found in the selected class";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setToast(null);

    let created = 0;
    let alreadyExisted = 0;
    let failed = 0;

    try {
      const yearId = parseInt(form.academic_year);
      const feeWiseClassId = parseInt(form.fee_wise_class);
      const feetypeId = parseInt(form.feetype);

      for (const student of targetStudents) {
        try {
          const res = await createMonthlyStudentFee({
            student: student.id,
            academic_year: yearId,
            fee_wise_class: feeWiseClassId,
            feetype: feetypeId,
            billing_period: form.billing_period,
            due_date: form.due_date,
          });

          if (res.success) {
            created++;
          } else {
            const errLower = (res.error || "").toLowerCase();
            if (errLower.includes("already exist")) {
              alreadyExisted++;
            } else {
              failed++;
            }
          }
        } catch {
          failed++;
        }
      }

      if (created > 0) {
        setToast({
          type: "success",
          message: `Generated fees for ${created} student(s) successfully!${alreadyExisted > 0 ? ` (${alreadyExisted} already existed)` : ""}`,
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else if (alreadyExisted > 0 && failed === 0) {
        setToast({
          type: "success",
          message: `All ${alreadyExisted} students in this class already have fees generated for this period.`,
        });
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setToast({
          type: "error",
          message: `Failed to generate fees. (${failed} errors encountered)`,
        });
      }
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Bulk fee generation failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Bulk Fees (Class-Wise)">
      {toast && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} className="flex-shrink-0" />
          ) : (
            <XCircle size={16} className="flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Class Selection */}
        <FormField label="Target Class" error={errors.selected_class} required>
          <CustomDropdown
            value={form.selected_class}
            onChange={(v) => {
              update("selected_class", v);
              update("fee_wise_class", "");
              update("feetype", "");
            }}
            options={uniqueClassOptions.map((cls) => ({ value: String(cls.id), label: cls.name }))}
            placeholder="Select class for bulk generation..."
            error={!!errors.selected_class}
          />
        </FormField>

        {form.selected_class && (
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <span className="font-medium">Students enrolled in selected class:</span>
            <span className="font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {targetStudents.length} Students
            </span>
          </div>
        )}

        {/* Academic Year */}
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

        {/* Fee Structure */}
        <FormField label="Fee Structure" error={errors.fee_wise_class} required>
          <CustomDropdown
            value={form.fee_wise_class}
            onChange={(v) => {
              const sel = feeWiseClasses.find((fc) => fc.id === Number(v));
              update("fee_wise_class", v);
              update("feetype", sel ? String(sel.feetype) : "");
            }}
            disabled={!form.selected_class}
            placeholder={form.selected_class ? "Select fee structure..." : "Select class first"}
            options={filteredFeeClasses.map((fc) => ({
              value: String(fc.id),
              label: `${fc.feetype_name} — ₹${parseFloat(fc.amount).toLocaleString("en-IN")}`,
            }))}
            error={!!errors.fee_wise_class}
          />
        </FormField>

        {/* Billing Period */}
        <FormField label="Billing Month / Period" error={errors.billing_period} required>
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

        {/* Due Date */}
        <FormField label="Due Date" error={errors.due_date} required>
          <DatePicker
            value={form.due_date}
            onChange={(val) => update("due_date", val)}
            className="w-full"
          />
        </FormField>

        {/* Estimated Summary */}
        {selectedFeeClass && targetStudents.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Class Students:</span>
              <span className="font-semibold text-gray-900">{targetStudents.length}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Fee per Student:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(selectedFeeClass.amount)}</span>
            </div>
            <div className="flex justify-between text-blue-700 font-bold pt-2 border-t border-gray-200">
              <span>Total Class Billable:</span>
              <span>{formatCurrency(String(parseFloat(selectedFeeClass.amount) * targetStudents.length))}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (form.selected_class !== "" && targetStudents.length === 0)}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Generating Fees...
              </>
            ) : (
              <>
                <Users size={16} /> Generate Class Fees
              </>
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
  const [payerType, setPayerType] = useState<"student" | "government">("student");

  const [form, setForm] = useState({
    amount: "",
    payment_mode: "cash",
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: "",
    receipt_number: "",
    note: "",
  });

  const [cashState, setCashState] = useState<CashDenominationState>(INITIAL_CASH_STATE);

  useEffect(() => {
    if (fee) {
      const studentBal = parseFloat(fee.balance_amount || "0");
      const govtBal = Math.max(0, parseFloat(fee.rte_govt_claim_amount || fee.amount || "0") - parseFloat(fee.rte_govt_paid_amount || "0"));
      const isGovtDefault = Boolean(fee.is_rte_govt_claim && studentBal <= 0 && govtBal > 0);
      const initialPayer = isGovtDefault ? "government" : "student";
      setPayerType(initialPayer);

      const defaultAmount = initialPayer === "government"
        ? govtBal.toFixed(2)
        : Math.max(0, studentBal).toFixed(2);

      setForm({
        amount: defaultAmount,
        payment_mode: initialPayer === "government" ? "govt_rte" : "cash",
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: "",
        receipt_number: "",
        note: initialPayer === "government" ? "RTE Government reimbursement payment" : "",
      });

      setCashState(INITIAL_CASH_STATE);
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
      const studentBal = Math.max(0, parseFloat(fee.balance_amount || "0"));
      setForm((prev) => ({
        ...prev,
        amount: studentBal.toFixed(2),
        payment_mode: "cash",
        note: "",
      }));
    }
    setCashState(INITIAL_CASH_STATE);
  };

  const currentBalance =
    payerType === "government"
      ? Math.max(
          0,
          parseFloat(fee?.rte_govt_claim_amount || fee?.amount || "0") -
            parseFloat(fee?.rte_govt_paid_amount || "0")
        )
      : Math.max(0, parseFloat(fee?.balance_amount || "0"));

  const isZeroBalance = !fee || currentBalance <= 0;

  const currentAmountNum = isZeroBalance ? 0 : (parseFloat(form.amount || "0") || 0);
  const isCashMode = form.payment_mode === "cash";
  const cashCalculation = calculateCashDetails(cashState, currentAmountNum);
  const isCashInsufficient = !isZeroBalance && isCashMode && currentAmountNum > 0 && cashCalculation.totalReceived < currentAmountNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee || isZeroBalance) return;
    const errs: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Invalid amount";
    if (!form.payment_mode) errs.payment_mode = "Payment mode is required";
    if (!form.payment_date) errs.payment_date = "Payment date is required";

    if (["cheque", "upi", "card", "govt_rte"].includes(form.payment_mode) && !form.transaction_id && form.payment_mode !== "govt_rte") {
      errs.transaction_id = form.payment_mode === "cheque" ? "Cheque No. is required" : "Reference No. is required";
    }

    if (isCashMode && currentAmountNum > 0 && cashCalculation.totalReceived < currentAmountNum) {
      errs.amount = `Total cash received (₹${cashCalculation.totalReceived.toLocaleString("en-IN")}) is less than amount to collect (₹${currentAmountNum.toLocaleString("en-IN")}).`;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { collectStudentFeePayment } = await import("@/lib/fees/fee-generation");
      const payload: any = {
        student_fee: fee.id,
        payer_type: payerType,
        ...form,
      };

      if (isCashMode) {
        payload.payment_details = cashCalculation.payloadJson;
        const cashNote = `[Cash Recd: ₹${cashCalculation.totalReceived.toLocaleString("en-IN")}, Change Ret: ₹${cashCalculation.changeToReturn.toLocaleString("en-IN")}]`;
        payload.note = form.note ? `${form.note} ${cashNote}` : cashNote;
      }

      const result = await collectStudentFeePayment(payload);
      if (result.success) {
        setToast({ type: "success", message: payerType === "government" ? "Government RTE claim payment recorded!" : "Fee collected successfully!" });
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
    <Modal isOpen={isOpen} onClose={onClose} title={payerType === "government" ? "Record RTE Government Claim Payment" : "Collect Student Fee"}>
      {fee && (
        <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-gray-900">{fee.student_name}</p>
              {fee.is_rte_govt_claim && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  RTE Student Claim
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${payerType === "government"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
              }`}
          >
            🏛️ Government RTE Claim
          </button>
          <button
            type="button"
            onClick={() => handlePayerChange("student")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${payerType === "student"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
              }`}
          >
            👤 Student / Guardian
          </button>
        </div>
      )}

      {isZeroBalance && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-900">✅ This fee is already fully paid (Balance is ₹0.00).</p>
            <p className="text-[11px] font-normal text-emerald-700 mt-0.5">No outstanding dues remain for this record. Further payments are disabled.</p>
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
          <FormField label={payerType === "government" ? "Govt Reimbursement Amount (₹)" : "Amount to Collect (₹)"} error={errors.amount} required>
            <input
              type="number"
              className={`${inputClass} ${isZeroBalance ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
              value={isZeroBalance ? "0.00" : form.amount}
              onChange={(e) => !isZeroBalance && update("amount", e.target.value)}
              disabled={isZeroBalance}
              readOnly={isZeroBalance}
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Payment Mode" error={errors.payment_mode} required>
            <select
              className={`${inputClass} ${isZeroBalance ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
              value={form.payment_mode}
              onChange={(e) => update("payment_mode", e.target.value)}
              disabled={isZeroBalance}
            >
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

        {/* ── Conditional Cash Denomination Breakdown Section ── */}
        {!isZeroBalance && form.payment_mode === "cash" && (
          <div className="animate-in fade-in duration-200">
            <CashDenominationCalculator
              amountToCollect={form.amount}
              cashState={cashState}
              onChange={setCashState}
              onReset={() => setCashState(INITIAL_CASH_STATE)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Payment Date" error={errors.payment_date} required>
            <DatePicker value={form.payment_date} onChange={(val) => update("payment_date", val)} className="w-full" />
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
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            {isZeroBalance ? "Close" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={loading || isZeroBalance || isCashInsufficient}
            title={
              isZeroBalance
                ? "This fee is already fully paid"
                : isCashInsufficient
                ? `Received cash is less than amount to collect (Short by ₹${(
                  currentAmountNum - cashCalculation.totalReceived
                ).toLocaleString("en-IN")})`
                : undefined
            }
            className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors ${
              isZeroBalance
                ? "bg-gray-400 cursor-not-allowed"
                : isCashInsufficient
                ? "bg-gray-400"
                : payerType === "government"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Recording...</>
            ) : isZeroBalance ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-300" />
                Fully Paid (₹0.00)
              </>
            ) : isCashInsufficient ? (
              `Short by ₹${(currentAmountNum - cashCalculation.totalReceived).toLocaleString("en-IN")}`
            ) : payerType === "government" ? (
              "Record Govt Reimbursement"
            ) : (
              "Collect Payment"
            )}
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
  academicYears,
  onSuccess,
  onViewReceipt,
}: {
  isOpen: boolean;
  onClose: () => void;
  fee: StudentFee | null;
  academicYears?: AcademicYear[];
  onSuccess?: () => void;
  onViewReceipt?: (receiptNo: string) => void;
}) => {
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);

  if (!fee) return null;

  const yearDisplay =
    fee.academic_year_name ||
    academicYears?.find((y) => y.id === fee.academic_year)?.name ||
    (fee.academic_year ? `Year ID: ${fee.academic_year}` : "N/A");

  const classSectionDisplay =
    fee.student_class_display ||
    (fee.school_class_name
      ? `${fee.school_class_name.toLowerCase().startsWith("class") ? fee.school_class_name : `Class ${fee.school_class_name}`}${fee.student_division ? ` - ${fee.student_division} Section` : ""}`
      : (fee.class_name ? (fee.class_name.toLowerCase().startsWith("class") ? fee.class_name : `Class ${fee.class_name}`) : "Class N/A"));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fee Details">
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <StudentAvatar name={fee.student_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-base leading-tight">
              {fee.student_name} {fee.student_surname || ""}
            </p>
            <p className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5 inline-block mt-1 mb-1.5">
              {classSectionDisplay}
            </p>
            <div>
              <StatusBadge status={fee.status} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Academic Year",
              value: yearDisplay,
              icon: CalendarDays,
            },
            {
              label: "Fee Structure",
              value: fee.feetype_name || "N/A",
              subtitle: (fee.discount_note && !fee.discount_note.includes("[Cash Recd")) ? fee.discount_note : null,
              icon: BookOpen,
            },
            ...(fee.discount_note && !fee.discount_note.includes("[Cash Recd")
              ? [
                  {
                    label: "Particulars",
                    value: fee.discount_note,
                    icon: Tag,
                  },
                ]
              : []),
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
          ].map(({ label, value, subtitle, icon: Icon }: any) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">
                  {label}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-xs font-medium text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 mt-1 border border-amber-200 w-fit">
                  {subtitle}
                </p>
              )}
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
                  {(() => {
                    const cb = formatCashBreakdown(payment);
                    if (!cb.hasBreakdown && !cb.cleanNote) return null;
                    return (
                      <div className="mt-1.5 space-y-0.5">
                        {cb.hasBreakdown && (
                          <p className="text-xs font-semibold text-gray-800">{cb.breakdown}</p>
                        )}
                        {cb.cleanNote && (
                          <p className="text-xs text-gray-500 italic">{cb.cleanNote}</p>
                        )}
                      </div>
                    );
                  })()}

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
// Student Fee Grouping for Student-Centric Dashboard View
export interface StudentFeeGroup {
  student_id: number;
  student_name: string;
  student_surname?: string | null;
  student_class_display?: string;
  school_class_name?: string;
  class_name?: string;
  student_division?: string;
  is_rte_govt_claim?: boolean;
  fees: StudentFee[];
  totalAmount: number;
  totalDiscount: number;
  totalPayable: number;
  totalPaid: number;
  totalBalance: number;
  consolidatedStatus: "paid" | "partial" | "unpaid" | "overdue";
  billingPeriods: string[];
}

// Slide-Out Panel for Student Individual Fee Items
const StudentFeesSlideOut = ({
  isOpen,
  onClose,
  group,
  onViewFee,
  onCollectFee,
  onDiscountFee,
  academicYears,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: StudentFeeGroup | null;
  onViewFee: (fee: StudentFee) => void;
  onCollectFee: (fee: StudentFee) => void;
  onDiscountFee: (fee: StudentFee) => void;
  academicYears?: AcademicYear[];
}) => {
  const [inventoryIssues, setInventoryIssues] = useState<StudentInventoryIssueRecord[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !group?.student_id) {
      setInventoryIssues([]);
      return;
    }
    let isCancelled = false;
    setInventoryLoading(true);

    async function loadInventory() {
      try {
        const res = await fetchStudentInventoryIssues(group!.student_id);
        if (!isCancelled && res.success && res.data) {
          setInventoryIssues(res.data);
        }
      } catch (err) {
        console.error('Failed to load student inventory in slide-out:', err);
      } finally {
        if (!isCancelled) {
          setInventoryLoading(false);
        }
      }
    }

    loadInventory();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, group?.student_id]);

  const targetYearId =
    group?.fees?.[0]?.academic_year ||
    academicYears?.find((y) => y.is_active || y.status === 'Active')?.id;

  const thisYearIssues = useMemo(() => {
    if (!inventoryIssues || inventoryIssues.length === 0) return [];
    if (!targetYearId) return inventoryIssues;
    const filtered = inventoryIssues.filter((i) => i.academic_year === targetYearId);
    return filtered.length > 0 ? filtered : inventoryIssues;
  }, [inventoryIssues, targetYearId]);

  const inventorySummary = useMemo(() => {
    return formatInventoryReceivedSummary(thisYearIssues);
  }, [thisYearIssues]);

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-3">
              <StudentAvatar name={group.student_name} size="md" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {group.student_name} {group.student_surname || ""}
                  </h3>
                  {group.is_rte_govt_claim && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      RTE Quota
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-700 font-semibold mt-0.5">
                  {group.student_class_display ||
                    (group.school_class_name
                      ? `${group.school_class_name.toLowerCase().startsWith("class") ? group.school_class_name : `Class ${group.school_class_name}`}${group.student_division ? ` - ${group.student_division} Section` : ""}`
                      : (group.class_name || "Class N/A"))}
                  <span className="text-gray-400 font-normal ml-1.5">ID#{group.student_id.toString().padStart(3, "0")}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Financial Summary Cards */}
          <div className="p-4 bg-blue-50/40 border-b border-blue-100/60 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-gray-500">Total Payable</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">₹{group.totalPayable.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-emerald-600">Total Paid</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">₹{group.totalPaid.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-rose-100 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-rose-600">Balance</p>
              <p className="text-sm font-bold text-rose-700 mt-0.5">₹{group.totalBalance.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* Fee Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Fee Items Breakdown ({group.fees.length})
              </h4>
              <span className="text-xs text-gray-400">
                {group.billingPeriods.map(formatBillingPeriod).join(", ") || "Monthly"}
              </span>
            </div>

            {group.fees.map((fee) => {
              const isPaid = fee.status === "paid";
              return (
                <div
                  key={fee.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isPaid ? "bg-emerald-50/20 border-emerald-200/70" : "bg-white border-gray-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {fee.feetype_name}
                        </span>
                        <StatusBadge status={fee.status} />
                      </div>
                      {(fee.discount_note && !fee.discount_note.includes("[Cash Recd")) && (
                        <div className="mt-1.5 flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-1 rounded-md text-xs">
                          <span>📦</span>
                          <span className="text-[10px] uppercase font-bold text-amber-800">Particulars:</span>
                          <span className="font-semibold">{fee.discount_note}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Due: {formatDisplayDate(fee.due_date)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 py-2 border-y border-gray-100 text-xs">
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase">Base</p>
                      <p className="font-semibold text-gray-800">₹{parseFloat(fee.amount).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase">Discount</p>
                      <p className="font-semibold text-green-600">
                        {parseFloat(fee.discount_amount ?? "0") > 0 ? `-₹${parseFloat(fee.discount_amount ?? "0").toLocaleString("en-IN")}` : "₹0"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase">Payable</p>
                      <p className="font-bold text-gray-900">₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase">Balance</p>
                      <p className="font-bold text-rose-600">₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5">
                    <button
                      onClick={() => onViewFee(fee)}
                      className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={13} /> View
                    </button>
                    {!isPaid && (
                      <button
                        onClick={() => onDiscountFee(fee)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Percent size={13} /> Discount
                      </button>
                    )}
                    {!isPaid ? (
                      <button
                        onClick={() => onCollectFee(fee)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <IndianRupee size={13} /> Collect
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Paid
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick Summary: Inventory Received (This Year) */}
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Package size={14} className="text-blue-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Inventory Received (This Year)
                  </span>
                </div>
                {inventoryLoading && (
                  <Loader2 size={12} className="animate-spin text-gray-400" />
                )}
              </div>
              {inventoryLoading ? (
                <p className="text-xs text-gray-400 animate-pulse">Checking issued inventory...</p>
              ) : inventorySummary ? (
                <p className="text-xs font-medium text-gray-800 leading-relaxed">
                  {inventorySummary}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  No inventory items recorded for this student this year.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <a
              href={`/fees/student-ledger`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
            >
              <span>Go to Student Ledger</span>
              <ChevronRight size={14} />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [searchedReceiptNumber, setSearchedReceiptNumber] = useState<string | null>(null);

  // Student-centric state
  const [expandedStudentIds, setExpandedStudentIds] = useState<number[]>([]);
  const [slideOutGroup, setSlideOutGroup] = useState<StudentFeeGroup | null>(null);
  const [isSlideOutOpen, setIsSlideOutOpen] = useState(false);

  const toggleExpandStudent = (studentId: number) => {
    setExpandedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleOpenSlideOut = (group: StudentFeeGroup) => {
    setSlideOutGroup(group);
    setIsSlideOutOpen(true);
  };

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

  // Student-Centric Grouping for Monthly Fees Tab
  const studentFeeGroups = useMemo(() => {
    if (activeTab !== "monthly") return [];

    const groupMap = new Map<number, StudentFeeGroup>();

    filteredFees.forEach((fee) => {
      const studentId = fee.student;
      if (!groupMap.has(studentId)) {
        groupMap.set(studentId, {
          student_id: studentId,
          student_name: fee.student_name,
          student_surname: fee.student_surname,
          student_class_display: fee.student_class_display,
          school_class_name: fee.school_class_name,
          class_name: fee.class_name,
          student_division: fee.student_division,
          is_rte_govt_claim: Boolean(fee.is_rte_govt_claim),
          fees: [],
          totalAmount: 0,
          totalDiscount: 0,
          totalPayable: 0,
          totalPaid: 0,
          totalBalance: 0,
          consolidatedStatus: "unpaid",
          billingPeriods: [],
        });
      }

      const grp = groupMap.get(studentId)!;
      grp.fees.push(fee);
      grp.totalAmount += parseFloat(fee.amount || "0");
      grp.totalDiscount += parseFloat(fee.discount_amount || "0");
      grp.totalPayable += parseFloat(fee.payable_amount || "0");
      grp.totalPaid += parseFloat(fee.paid_amount || "0");
      grp.totalBalance += parseFloat(fee.balance_amount || "0");
      if (fee.is_rte_govt_claim) grp.is_rte_govt_claim = true;
      if (fee.billing_period && !grp.billingPeriods.includes(fee.billing_period)) {
        grp.billingPeriods.push(fee.billing_period);
      }
    });

    return Array.from(groupMap.values()).map((grp) => {
      let status: "paid" | "partial" | "unpaid" | "overdue" = "unpaid";
      if (grp.totalBalance <= 0) {
        status = "paid";
      } else if (grp.totalPaid > 0) {
        status = "partial";
      } else if (grp.fees.some((f) => f.status === "overdue")) {
        status = "overdue";
      } else {
        status = "unpaid";
      }
      return {
        ...grp,
        consolidatedStatus: status,
      };
    });
  }, [filteredFees, activeTab]);

  const totalItems = activeTab === "monthly" ? studentFeeGroups.length : filteredFees.length;
  const paginatedGroups = studentFeeGroups.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const paginatedFees = filteredFees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

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
    <div className="space-y-6 max-w-7xl mx-auto">
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

            {/* Generate Bulk Fees Button */}
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-all shadow-xs hover:border-blue-300 flex-shrink-0 cursor-pointer"
              title="Generate fees in bulk for an entire class"
            >
              <Users size={16} className="text-blue-600" />
              <span>Generate Bulk Fees</span>
            </button>

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
          ) : (activeTab === "monthly" ? paginatedGroups.length === 0 : paginatedFees.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Filter size={40} className="mb-3 opacity-50" />
              <p className="font-medium">No fees found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : activeTab === "monthly" ? (
            /* Student-Centric Monthly Table */
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-10 px-3 py-3 text-center text-xs font-semibold text-gray-400"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Student Name / Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Fee Breakdown / Particulars
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Total Payable (₹)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Total Paid (₹)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Total Balance (₹)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedGroups.map((group) => {
                  const isExpanded = expandedStudentIds.includes(group.student_id);

                  return (
                    <React.Fragment key={group.student_id}>
                      <tr className={`hover:bg-blue-50/30 transition-colors border-b border-gray-100 ${isExpanded ? "bg-blue-50/20" : ""}`}>
                        <td className="px-3 py-3.5 text-center">
                          <button
                            onClick={() => toggleExpandStudent(group.student_id)}
                            className="p-1.5 hover:bg-gray-200/70 rounded-md text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse fee items" : "Expand fee items"}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <StudentAvatar name={group.student_name} />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900">
                                  {group.student_name} {group.student_surname || ""}
                                </p>
                                {group.is_rte_govt_claim && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    RTE
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-blue-700 font-semibold mt-0.5">
                                {group.student_class_display ||
                                  (group.school_class_name
                                    ? `${group.school_class_name.toLowerCase().startsWith("class") ? group.school_class_name : `Class ${group.school_class_name}`}${group.student_division ? ` - ${group.student_division} Section` : ""}`
                                    : (group.class_name || "Class N/A"))}
                                <span className="text-gray-400 font-normal ml-1.5">ID#{group.student_id.toString().padStart(3, "0")}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td
                          className="px-4 py-3.5 cursor-pointer hover:bg-blue-50/40 transition-colors"
                          onClick={() => handleOpenSlideOut(group)}
                          title="Click to view full fee breakdown in slide-out panel"
                        >
                          <div className="flex flex-col gap-1 max-w-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 border border-gray-200 transition-colors cursor-pointer"
                                title="Click to view breakdown"
                              >
                                {group.fees.length} {group.fees.length === 1 ? "Item" : "Items"}
                              </span>
                              {group.fees.slice(0, 2).map((f) => (
                                <span
                                  key={f.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-[130px]"
                                >
                                  {f.feetype_name}
                                </span>
                              ))}
                              {group.fees.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSlideOut(group);
                                  }}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                  title="Click to view all fee items in slide-out panel"
                                >
                                  +{group.fees.length - 2} more
                                </button>
                              )}
                            </div>
                            {group.fees.some((f) => f.discount_note && !f.discount_note.includes("[Cash Recd")) && (
                              <p
                                className="text-[11px] font-medium text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200 truncate"
                                title={group.fees.map((f) => f.discount_note).filter((n): n is string => Boolean(n && !n.includes("[Cash Recd"))).join(", ")}
                              >
                                📦 {group.fees.map((f) => f.discount_note).filter((n): n is string => Boolean(n && !n.includes("[Cash Recd"))).join(", ")}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-gray-900 text-sm whitespace-nowrap">
                          ₹{group.totalPayable.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-emerald-600 text-sm whitespace-nowrap">
                          ₹{group.totalPaid.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-rose-600 text-sm whitespace-nowrap">
                          ₹{group.totalBalance.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {group.consolidatedStatus === "paid" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} /> Paid
                            </span>
                          ) : group.consolidatedStatus === "partial" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock size={12} /> Partial
                            </span>
                          ) : group.consolidatedStatus === "overdue" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle size={12} /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              <XCircle size={12} /> Unpaid
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleOpenSlideOut(group)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                              title="View Individual Fee Items"
                            >
                              <Eye size={13} />
                              <span>Breakdown</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-blue-50/20 border-b border-gray-200">
                          <td colSpan={8} className="p-3 pl-12 pr-6">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                              <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                                  Fee Items for {group.student_name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {group.fees.length} {group.fees.length === 1 ? "record" : "records"}
                                </span>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50/40">
                                    <th className="py-2.5 px-3">Fee Type</th>
                                    <th className="py-2.5 px-3">Particulars</th>
                                    <th className="py-2.5 px-3">Due Date</th>
                                    <th className="py-2.5 px-3 text-right">Payable</th>
                                    <th className="py-2.5 px-3 text-right">Paid</th>
                                    <th className="py-2.5 px-3 text-right">Balance</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                    <th className="py-2.5 px-3 text-center">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.fees.map((fee) => (
                                    <tr key={fee.id} className="hover:bg-gray-50/60">
                                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                                        {fee.feetype_name}
                                      </td>
                                      <td className="py-2.5 px-3 text-gray-700">
                                        {fee.discount_note || fee.discount_reference ? (
                                          <span className="inline-flex items-center gap-1 font-semibold text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">
                                            📦 {fee.discount_note || fee.discount_reference}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                                        {formatDisplayDate(fee.due_date)}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                                        ₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                                        ₹{parseFloat(fee.paid_amount || "0").toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                        ₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <StatusBadge status={fee.status} />
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            onClick={() => handleView(fee)}
                                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                                            title="View Fee"
                                          >
                                            <Eye size={13} />
                                          </button>
                                          <button
                                            onClick={() => handleCollect(fee)}
                                            className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                            title="Collect Fee"
                                          >
                                            <IndianRupee size={13} />
                                          </button>
                                          {fee.status !== "paid" && (
                                            <button
                                              onClick={() => handleDiscount(fee)}
                                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                              title="Discount"
                                            >
                                              <Percent size={13} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* Single Fees Table */
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Student",
                    "Class & Section",
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">
                              {fee.student_name}
                            </p>
                            {fee.is_rte_govt_claim && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                RTE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            ID#{fee.student.toString().padStart(3, "0")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {fee.student_class_display ? (
                        <p className="text-sm text-gray-900 font-semibold">
                          {fee.student_class_display}
                        </p>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-900 font-semibold capitalize">
                            {fee.school_class_name
                              ? (fee.school_class_name.toLowerCase().startsWith("class") ? fee.school_class_name : `Class ${fee.school_class_name}`)
                              : (fee.class_name?.replace(/_/g, " ") || "—")}
                          </p>
                          {fee.student_division ? (
                            <p className="text-xs text-gray-500 font-medium uppercase mt-0.5">
                              {fee.student_division} Section
                            </p>
                          ) : null}
                        </div>
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
                      ₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}
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
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700 cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleCollect(fee)}
                          className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-gray-400 hover:text-green-600 cursor-pointer"
                        >
                          <IndianRupee size={15} />
                        </button>
                        {fee.status !== "paid" && (
                          <button
                            onClick={() => handleDiscount(fee)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600 cursor-pointer"
                          >
                            <Percent size={15} />
                          </button>
                        )}
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
          ) : (activeTab === "monthly" ? paginatedGroups.length === 0 : paginatedFees.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Filter size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">No fees found</p>
            </div>
          ) : activeTab === "monthly" ? (
            /* Student-Centric Mobile Cards */
            paginatedGroups.map((group) => {
              const isExpanded = expandedStudentIds.includes(group.student_id);

              return (
                <div key={group.student_id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <StudentAvatar name={group.student_name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {group.student_name} {group.student_surname || ""}
                        </p>
                        <p className="text-xs text-blue-700 font-semibold">
                          {group.student_class_display ||
                            (group.school_class_name
                              ? `${group.school_class_name}${group.student_division ? ` - ${group.student_division} Section` : ""}`
                              : (group.class_name || "Class N/A"))}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold border border-gray-200">
                            {group.fees.length} {group.fees.length === 1 ? "Item" : "Items"}
                          </span>
                          {group.fees.some((f) => f.discount_note || f.discount_reference) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium truncate max-w-[170px]">
                              📦 {group.fees.find((f) => f.discount_note || f.discount_reference)?.discount_note || group.fees.find((f) => f.discount_note || f.discount_reference)?.discount_reference}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {group.consolidatedStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Paid
                      </span>
                    ) : group.consolidatedStatus === "partial" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        Unpaid
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] uppercase text-gray-400">Payable</p>
                      <p className="font-bold text-gray-900 mt-0.5">₹{group.totalPayable.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <p className="text-[10px] uppercase text-emerald-600">Paid</p>
                      <p className="font-bold text-emerald-700 mt-0.5">₹{group.totalPaid.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-2">
                      <p className="text-[10px] uppercase text-rose-600">Balance</p>
                      <p className="font-bold text-rose-700 mt-0.5">₹{group.totalBalance.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleOpenSlideOut(group)}
                      className="flex-1 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye size={13} /> View Items ({group.fees.length})
                    </button>
                    <button
                      onClick={() => toggleExpandStudent(group.student_id)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200 text-xs">
                      {group.fees.map((f) => (
                        <div key={f.id} className="p-2 bg-white rounded-lg border border-gray-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-gray-900">{f.feetype_name}</span>
                            <StatusBadge status={f.status} />
                          </div>
                          {(f.discount_note || f.discount_reference) && (
                            <p className="text-[11px] text-amber-800 bg-amber-50 p-1 rounded mb-1 font-medium">
                              📦 Particulars: {f.discount_note || f.discount_reference}
                            </p>
                          )}
                          <div className="flex justify-between text-gray-500 text-[11px]">
                            <span>Payable: ₹{parseFloat(f.payable_amount).toLocaleString("en-IN")}</span>
                            <span className="text-rose-600 font-bold">Bal: ₹{parseFloat(f.balance_amount || "0").toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* Single Fees Mobile Cards */
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
                      <p className="text-xs text-gray-500 font-medium capitalize">
                        {fee.student_class_display || (
                          fee.school_class_name
                            ? `${fee.school_class_name}${fee.student_division ? ` - ${fee.student_division} Section` : ""}`
                            : (fee.class_name?.replace(/_/g, " ") || "")
                        )}
                      </p>
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
        {(activeTab === "monthly" ? studentFeeGroups.length : filteredFees.length) > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              {Math.min(
                (currentPage - 1) * ITEMS_PER_PAGE + 1,
                activeTab === "monthly" ? studentFeeGroups.length : filteredFees.length,
              )}{" "}
              to {Math.min(currentPage * ITEMS_PER_PAGE, activeTab === "monthly" ? studentFeeGroups.length : filteredFees.length)}{" "}
              of {activeTab === "monthly" ? studentFeeGroups.length : filteredFees.length} {activeTab === "monthly" ? "students" : "entries"}
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

      <BulkGenerateFeeModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        students={students}
        academicYears={academicYears}
        feeWiseClasses={feeWiseClasses}
        onSuccess={() => { loadData(); }}
        defaultClass={filterClass}
        defaultPeriod={filterPeriod}
      />

      <StudentFeesSlideOut
        isOpen={isSlideOutOpen}
        onClose={() => {
          setIsSlideOutOpen(false);
          setSlideOutGroup(null);
        }}
        group={slideOutGroup}
        academicYears={academicYears}
        onViewFee={(f) => {
          setSelectedFee(f);
          setViewModalOpen(true);
        }}
        onCollectFee={(f) => {
          setSelectedFee(f);
          setIsCollectFeeModalOpen(true);
        }}
        onDiscountFee={(f) => {
          setSelectedFee(f);
          setDiscountModalOpen(true);
        }}
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
        academicYears={academicYears}
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
