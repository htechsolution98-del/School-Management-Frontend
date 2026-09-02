import { API_BASE_URL, API_ENDPOINTS } from "./config";

export interface SchoolSubscription {
  id: number;
  school: number;
  school_name: string;
  school_code: string;
  school_email: string;
  school_phone: string;
  school_city: string;
  school_is_active: boolean;
  plan_type: "TRIAL" | "PAID";
  billing_model: "FLAT" | "PER_STUDENT";
  billing_cycle: "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";
  flat_amount: string | number;
  per_student_rate: string | number;
  start_date: string;
  due_date: string;
  grace_period_days: number;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
  auto_lock_on_due: boolean;
  notes?: string;
  live_student_count: number;
  calculated_amount: number;
  days_left: number;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolInvoice {
  id: number;
  school: number;
  school_name: string;
  school_code: string;
  subscription?: number;
  invoice_number: string;
  billing_model: "FLAT" | "PER_STUDENT";
  student_count: number;
  unit_rate: string | number;
  subtotal: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  paid_at?: string;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionSummary {
  total_schools: number;
  active_paid: number;
  active_trials: number;
  expired_overdue: number;
  projected_monthly_revenue: number;
}

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function getSubscriptions(): Promise<SchoolSubscription[]> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch subscriptions");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}summary/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch subscription summary");
  return res.json();
}

export async function updateSubscription(
  id: number,
  payload: Partial<SchoolSubscription>
): Promise<SchoolSubscription> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${id}/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update subscription");
  }
  return res.json();
}

export async function recordSubscriptionPayment(
  subscriptionId: number,
  payload: {
    amount?: number;
    payment_method?: string;
    payment_reference?: string;
    billing_cycle?: string;
    next_due_date?: string;
    billing_model?: string;
    flat_amount?: number;
    per_student_rate?: number;
    notes?: string;
  }
) {
  const res = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${subscriptionId}/record-payment/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to record payment");
  }
  return res.json();
}

export async function generateSchoolInvoice(subscriptionId: number) {
  const res = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${subscriptionId}/generate-invoice/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to generate invoice");
  }
  return res.json();
}

export async function toggleSchoolLock(subscriptionId: number) {
  const res = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${subscriptionId}/toggle-lock/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to toggle school lock");
  }
  return res.json();
}

export async function getSchoolInvoices(schoolId?: number): Promise<SchoolInvoice[]> {
  const url = schoolId
    ? `${API_BASE_URL}${API_ENDPOINTS.INVOICES}?school=${schoolId}`
    : `${API_BASE_URL}${API_ENDPOINTS.INVOICES}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch school invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function markInvoicePaid(invoiceId: number, payload?: { payment_method?: string; payment_reference?: string }) {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.INVOICES}${invoiceId}/mark-paid/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error("Failed to mark invoice as paid");
  return res.json();
}
