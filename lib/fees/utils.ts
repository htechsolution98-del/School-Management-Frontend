import type { Student } from "@/types/fees";

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "Rs. 0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatBillingPeriod(period: string): string {
  if (!period) return "-";

  const groupedPeriod = period.match(/^(.+)-(Q[1-4]|H[1-2])$/);
  if (groupedPeriod) {
    return `${groupedPeriod[2]} ${groupedPeriod[1]}`;
  }

  const [year, month] = period.split("-");
  if (!month || !/^\d{1,2}$/.test(month)) return period;

  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function formatDisplayDate(value?: string | null): string {
  const date = parseApiDate(value);
  if (!date) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;

  const indianDate = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const normalized = indianDate
    ? `${indianDate[3]}-${indianDate[2]}-${indianDate[1]}T00:00:00`
    : value;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getUniqueClasses(students: Student[]): string[] {
  const classes = students.filter((s) => s.class_name).map((s) => s.class_name as string);
  return [...new Set(classes)].sort();
}

export function validateMonthlyFeeForm(data: {
  student: string;
  academic_year: string;
  fee_wise_class: string;
  billing_period: string;
  due_date: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.student) errors.student = "Student is required";
  if (!data.academic_year) errors.academic_year = "Academic year is required";
  if (!data.fee_wise_class) errors.fee_wise_class = "Fee structure is required";
  if (!data.billing_period) errors.billing_period = "Billing period is required";
  if (!data.due_date) errors.due_date = "Due date is required";
  return errors;
}

export function validateSingleFeeForm(data: {
  student: string;
  academic_year: string;
  fee_wise_class: string;
  due_date: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.student) errors.student = "Student is required";
  if (!data.academic_year) errors.academic_year = "Academic year is required";
  if (!data.fee_wise_class) errors.fee_wise_class = "Fee structure is required";
  if (!data.due_date) errors.due_date = "Due date is required";
  return errors;
}

export function validateDiscountForm(data: {
  discount_amount: string;
  discount_reference: string;
  discount_note: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.discount_amount) {
    errors.discount_amount = "Discount amount is required";
  } else if (isNaN(parseFloat(data.discount_amount)) || parseFloat(data.discount_amount) <= 0) {
    errors.discount_amount = "Enter a valid discount amount";
  }
  if (!data.discount_reference) errors.discount_reference = "Reference is required";
  return errors;
}
