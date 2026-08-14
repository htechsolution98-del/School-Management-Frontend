export interface BillingPeriod {
  code: string;
  label: string;
}

export interface AcademicYear {
  id: number;
  name?: string;
  start_year: number;
  end_year: number;
  start_month: number;
  end_month: number;
  billing_periods: string[];
  is_active?: boolean;
  status?: "Active" | "Completed" | "Upcoming";
}

export type BillingCycle =
  | "single"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

export interface FeeType {
  id: number;
  name: string;
  billing_cycle: BillingCycle;
}

export interface FeeTypeFormData {
  name: string;
  billing_cycle: BillingCycle;
}

export type LateFeeType = "per_day" | "flat";

export interface FeeWiseClass {
  id: number;
  feetype: number;
  feetype_name: string;
  billing_cycle: string;
  school_class: number;
  school_class_name: string;
  amount: string;
  late_fee_enabled: boolean;
  grace_days: number | null;
  late_fee_type: LateFeeType | null;
  late_fee_amount: string | null;
  max_late_fee: string | null;
}

export interface FeeWiseClassPayload {
  feetype: number;
  school_class: number;
  amount: string;
  late_fee_enabled: boolean;
  grace_days?: number | null;
  late_fee_type?: LateFeeType | null;
  late_fee_amount?: string | null;
  max_late_fee?: string | null;
}

export type StudentFeeStatusValue =
  | "paid"
  | "unpaid"
  | "partially_paid"
  | "overdue"
  | "pending"
  | "partial"
  | "cancelled";

export interface StudentFee {
  id: number;
  student: number;
  student_name: string;
  student_surname: string | null;
  academic_year: number;
  academic_year_name: string;
  fee_wise_class: number;
  fee_wise_class_name: string;
  feetype_name: string;
  class_name: string;
  billing_period: string;
  due_date: string;
  amount: string;
  payable_amount: string;
  discount_amount: string;
  discount_reference: string | null;
  discount_note: string | null;
  status: StudentFeeStatusValue;
  fine_amount: string;
  paid_amount: string;
  actual_payable_amount: string;
  balance_amount: string;
  is_virtual?: boolean;
  payments?: Payment[];
}

export type PaymentMode = "cash" | "online" | "cheque" | "bank_transfer" | "upi";

export interface Payment {
  id: number;
  school?: number;
  school_name?: string | null;
  student_fee?: number;
  student?: number;
  student_name?: string;
  student_gr_no?: string | null;
  student_class?: string | null;
  student_division?: string | null;
  feetype?: number;
  feetype_name?: string;
  academic_year?: number;
  academic_year_name?: string;
  fee_billing_cycle?: BillingCycle | string;
  fee_billing_period?: string | null;
  fee_due_date?: string | null;
  fee_amount?: string;
  fee_penalty?: string;
  fee_discount?: string;
  fee_payable_amount?: string;
  fee_paid_amount?: string;
  fee_balance_amount?: string;
  fee_status?: StudentFeeStatusValue | string;
  amount: string;
  payment_mode: PaymentMode | string;
  transaction_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  receipt_number?: string | null;
  payment_date?: string;
  date?: string;
  created_at?: string;
  note?: string;
  collected_by?: number | null;
  collected_by_username?: string | null;
  is_verified?: boolean;
  is_bounced?: boolean;
  verified_by?: number | null;
  verified_by_username?: string | null;
  verified_at?: string | null;
  balance_after_payment?: string;
}

export interface StudentFeePayload {
  student: number;
  academic_year: number;
  fee_wise_class: number;
  billing_period: string;
  due_date: string;
}

export interface DiscountPayload {
  discount_amount: string;
  discount_reference: string;
  discount_note: string;
}

export interface StudentForFee {
  id: number;
  name: string;
  surname: string | null;
  admission_number: string;
  gr_no: string | null;
  division: number;
  division_name?: string;
  school_class?: number;
}

export interface StudentFeeStatus {
  student_id: number;
  fee_wise_class_id: number;
  billing_period: string;
  already_generated: boolean;
  student_fee_id?: number;
}

export interface Student {
  id: number;
  surname: string | null;
  name: string;
  father_name: string;
  mother_name: string;
  school_class: number | null;
  class_name?: string;
  gr_no?: string | null;
}

export interface CreateSingleFeePayload {
  student: number;
  academic_year: number;
  fee_wise_class: number;
  billing_period: string;
  due_date: string;
}

export interface CreateMonthlyFeePayload {
  student: number;
  academic_year: number;
  fee_wise_class: number;
  billing_period: string;
  due_date?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface CollectFeePayload {
  student_fee: number;
  amount: string;
  payment_mode: string;
  transaction_id?: string;
  receipt_number?: string;
  note?: string;
  payment_date?: string;
}

export interface FeeVerifyRecord {
  id: number;
  school: number;
  admission_number: string;
  fee_amount: number | null;
  status: string;
  fee_verified: boolean;
  fee_verified_at: string | null;
  fee_data: {
    id: number;
    amount: number;
    currency: string;
    payment_mode: "online" | "offline";
    fee_verify: boolean;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    paid_at: string;
    created_at: string;
  } | null;
  field_values: {
    id: number;
    field: number;
    field_label: string;
    value: string;
  }[];
}

export type ComponentType = "earning" | "deduction";
export type CalcType = "fixed" | "percentage";

export type SalaryComponent = {
  id: number;
  name: string;
  component_type: ComponentType;
};

export type StaffMember = {
  id: number;
  name: string;
  category?: string;
  employee_id?: string;
  designation?: string;
};

export type StaffSalaryComponent = {
  id: number;
  staff: number;
  component: number;
  calculation_type: CalcType;
  value: string;
};

export interface StaffSalaryAssignment {
  id: number;
  staffId: number;
  staffName: string;
  component: number;
  componentName: string;
  componentType: ComponentType;
  calculation_type: CalcType;
  value: string;
  isActive: boolean;
}

export interface ComponentSnapshot {
  component_id: number;
  name: string;
  component_type: ComponentType;
  calculation_type: string;
  value: string;
  amount: string;
}

export interface SalaryPayment {
  id: number;
  school: number;
  staff: number;
  staff_name: string;
  staff_category: string;
  salary_month: string;
  basic_salary: string;
  total_earnings: string;
  total_deductions: string;
  working_days: number;
  present_days: string;
  absent_days: number;
  half_days: number;
  attendance_deduction: string;
  component_snapshot: ComponentSnapshot[];
  net_salary: string;
  paid_amount: string;
  payment_mode: string;
  payment_status: string;
  transaction_id: string | null;
  receipt_number: string;
  payment_date: string;
  note: string;
  paid_by: number;
  paid_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateSalaryPayload {
  staff: number;
  salary_month: string;
  payment_mode: "online" | "offline";
  receipt_number: string;
  transaction_id?: string;
  note?: string;
}

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface OfflinePaymentPayload {
  student_fee: number;
  amount: string;
  payment_mode: PaymentMode;
  receipt_number: string;
  note?: string;
}
export type FeeStatus = "pending" | "partial" | "paid" | "cancelled";

export interface FeeFilters {
  student?: number;
  school_class?: number;
  academic_year?: number;
  status?: FeeStatus | "all";
  billing_period?: string;
}

export interface MyStudentFee {
  id: number;
  student: number;
  school_class?: number;
  academic_year?: number;
  billing_period: string;
  status: FeeStatus;
  amount: string;
  discount_amount: string;
  fine_amount: string;
  paid_amount: string;
  actual_payable_amount: string;
  balance_amount: string;
  payments: Payment[];
}

export interface PaymentFilters {
  student_fee?: number;
  student?: number;
  school_class?: number;
  payment_mode?: PaymentMode;
  date_from?: string;
  date_to?: string;
}

export interface FeeSummary {
  totalFees: number;
  paidAmount: number;
  pendingAmount: number;
  remainingBalance: number;
}
