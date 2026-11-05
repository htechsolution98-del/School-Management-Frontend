import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";

export interface ChildProfile {
  id: number;
  name: string;
  surname: string;
  gr_no: string;
  roll_no: string;
  father_name?: string;
  mother_name?: string;
  school_class_id?: number;
  school_class_name: string;
  division: string;
  date_of_birth: string;
  is_rte: boolean;
  school_name: string;
  attendance_percentage: number;
  total_working_days: number;
  present_days: number;
  total_fees: number;
  paid_fees: number;
  pending_fees: number;
  fee_status: string;
  notices: Array<{
    id: number | string;
    title: string;
    description: string;
    created_at: string;
    notification_type?: string;
    is_attendance?: boolean;
    is_absent?: boolean;
  }>;
  attendance_notifications?: Array<{
    id: number | string;
    title: string;
    description?: string;
    message?: string;
    notification_type?: string;
    created_at: string;
    is_absent?: boolean;
  }>;
}

export interface AttendanceNotificationItem {
  id?: number | string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
}

export interface ParentDueFee {
  id: number;
  student: number;
  student_name?: string;
  academic_year?: number;
  academic_year_name?: string;
  feetype?: number;
  feetype_name?: string;
  amount: number | string;
  paid_amount: number | string;
  payable_amount?: number | string;
  due_date?: string;
  status: string;
}

export interface ParentStudentFee {
  id: number;
  student: number;
  student_name?: string;
  student_gr_no?: string;
  student_class_display?: string;
  feetype?: number;
  feetype_name?: string;
  fee_billing_cycle?: string;
  amount: number | string;
  paid_amount: number | string;
  due_date?: string;
  status: string;
  created_at?: string;
}

export interface ParentPaymentHistoryItem {
  id: number;
  receipt_no?: string;
  transaction_id?: string;
  student?: number;
  student_name?: string;
  student_gr_no?: string;
  student_class?: string;
  student_division?: string;
  feetype_name?: string;
  amount: number | string;
  payment_date: string;
  payment_mode?: string;
  school_name?: string;
  school_logo?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  academic_year_name?: string;
  fee_billing_cycle?: string;
  fee_amount?: number | string;
  payment_details?: any;
  remarks?: string;
  is_bounced?: boolean;
}

export interface ParentExamNotification {
  id: number;
  title: string;
  message?: string;
  exam?: any;
  created_at: string;
}

export async function getParentChildren(): Promise<ChildProfile[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.PARENT_CHILDREN}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load child profiles.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getParentDueFees(): Promise<{ total_due: number; fees: ParentDueFee[] }> {
  const res = await fetchWithAuth(`${API_BASE_URL}/duefeesview/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return { total_due: 0, fees: [] };
  }

  return res.json();
}

export async function getParentFees(): Promise<ParentStudentFee[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/fee-payment/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getParentPaymentHistory(): Promise<ParentPaymentHistoryItem[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/payment-history/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createFeePaymentOrder(feeId: number): Promise<{ order_id: string; amount_payable: number; key: string }> {
  const res = await fetchWithAuth(`${API_BASE_URL}/fee-payment/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fee_id: feeId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Failed to initiate payment order.");
  }

  return res.json();
}

export async function verifyFeePayment(payload: {
  fee_id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/verify-payment/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Payment verification failed.");
  }

  return res.json();
}

export async function getParentExamNotifications(): Promise<ParentExamNotification[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/exam-notification/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getParentMonthlyReports(): Promise<any[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/monthly-report/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getParentAttendanceNotifications(): Promise<AttendanceNotificationItem[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/attendance-notification/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getParentChildResults(studentId?: number): Promise<any[]> {
  const query = studentId ? `?student_id=${studentId}` : "";
  const res = await fetchWithAuth(`${API_BASE_URL}/results/my-results/${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}
