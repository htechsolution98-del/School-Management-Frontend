import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth, getAccessToken } from "./auth";

export interface SubscriptionPlanModule {
  id: number;
  plan: number;
  module: number;
  module_code: string;
  module_name: string;
  is_enabled: boolean;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  pricing_model: "PER_STUDENT" | "FLAT";
  monthly_price: number | string;
  quarterly_price: number | string;
  half_yearly_price: number | string;
  yearly_price: number | string;
  trial_available: boolean;
  trial_duration_days: number;
  max_students: number;
  max_teachers: number;
  max_staff: number;
  max_admin_users: number;
  storage_limit_mb: number;
  gst_included?: boolean;
  gst_percentage?: number | string;
  is_active: boolean;
  plan_modules?: SubscriptionPlanModule[];
  enabled_module_ids?: number[];
  subscribed_schools_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SchoolSubscription {
  id: number;
  school: number;
  school_name: string;
  school_code: string;
  school_email: string;
  school_phone: string;
  school_city: string;
  school_is_active: boolean;
  plan?: number;
  plan_name?: string;
  plan_type: "TRIAL" | "PAID";
  billing_model: "FLAT" | "PER_STUDENT";
  billing_cycle: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM";
  flat_amount: string | number;
  per_student_rate: string | number;
  student_count_at_purchase?: number;
  price_snapshot?: Record<string, any>;
  trial_start_date?: string;
  trial_end_date?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  start_date: string;
  due_date: string;
  grace_period_days: number;
  gst_included?: boolean;
  gst_percentage?: number | string;
  status:
    | "TRIAL"
    | "TRIAL_EXPIRED"
    | "PENDING_PAYMENT"
    | "ACTIVE"
    | "EXPIRING"
    | "EXPIRED"
    | "GRACE_PERIOD"
    | "SUSPENDED"
    | "CANCELLED";
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
  plan_name?: string;
  invoice_number: string;
  billing_model: "FLAT" | "PER_STUDENT";
  billing_cycle: string;
  student_count: number;
  unit_rate: string | number;
  subtotal: string | number;
  tax_percentage: string | number;
  tax_amount: string | number;
  discount_amount: string | number;
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

export interface SubscriptionPayment {
  id: number;
  payment_id: string;
  school: number;
  school_name: string;
  subscription?: number;
  invoice?: number;
  invoice_number?: string;
  transaction_id?: string;
  gateway: string;
  amount: string | number;
  currency: string;
  status: "INITIATED" | "SUCCESS" | "FAILED" | "REFUNDED" | "CANCELLED";
  payment_method: string;
  paid_at?: string;
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SubscriptionAuditLog {
  id: number;
  school?: number;
  school_name?: string;
  user?: number;
  user_name?: string;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  notes?: string;
  timestamp: string;
}

export interface SubscriptionSetting {
  id?: number;
  key: string;
  value: string;
  description?: string;
}

export interface SubscriptionSummary {
  total_schools: number;
  active_paid: number;
  active_trials: number;
  expiring_soon: number;
  expired_overdue: number;
  projected_monthly_revenue: number;
  projected_annual_revenue: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken() || (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const err = await res.json();
    if (!err) return fallback;
    if (typeof err === "string") return err;
    if (err.detail) return String(err.detail);
    if (err.message) return String(err.message);
    if (err.error) return String(err.error);
    if (typeof err === "object") {
      const firstVal = Object.values(err)[0];
      if (Array.isArray(firstVal) && firstVal.length > 0) return String(firstVal[0]);
      if (typeof firstVal === "string") return firstVal;
    }
  } catch {
    /* ignore json parse failure */
  }
  return fallback;
}

export async function getSubscriptions(): Promise<SchoolSubscription[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch subscriptions");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function getCurrentSchoolSubscription(): Promise<{
  subscription: SchoolSubscription;
  enabled_modules: string[];
  live_student_count: number;
}> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}current/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch current school subscription");
  return res.json();
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}summary/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch subscription summary");
  return res.json();
}

export async function getPublicPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PLANS}public/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch public plans");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PLANS}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function createPlan(payload: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PLANS}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await extractErrorMessage(res, "Failed to create plan");
    throw new Error(msg);
  }
  return res.json();
}

export async function updatePlan(id: number, payload: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PLANS}${id}/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await extractErrorMessage(res, "Failed to update plan");
    throw new Error(msg);
  }
  return res.json();
}

export async function deletePlan(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PLANS}${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete plan");
}

export async function checkoutCalculate(payload: {
  school_id?: number;
  plan_id?: number;
  billing_cycle?: string;
  months_count?: number;
  custom_student_count?: number;
  discount_amount?: number;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}checkout-calculate/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to calculate checkout billing");
  return res.json();
}

export async function createRazorpayOrder(payload: {
  school_id?: number;
  plan_id?: number;
  billing_cycle?: string;
  months_count?: number;
}): Promise<{
  order_id: string;
  amount: number;
  currency: string;
  key: string;
  payment_id: string;
  invoice_number: string;
  months_count: number;
  current_due_date: string;
  new_due_date: string;
  expanded_days: number;
}> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PAYMENTS}create-razorpay-order/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const msg = await extractErrorMessage(res, "Failed to create Razorpay payment order");
    throw new Error(msg);
  }
  return res.json();
}

export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{
  message: string;
  new_due_date: string;
  days_left: number;
  months_added: number;
  invoice_number: string;
}> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PAYMENTS}verify-razorpay-payment/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const msg = await extractErrorMessage(res, "Failed to verify Razorpay payment");
    throw new Error(msg);
  }
  return res.json();
}

export async function updateSubscription(
  id: number,
  payload: Partial<SchoolSubscription>
): Promise<SchoolSubscription> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${id}/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await extractErrorMessage(res, "Failed to update subscription");
    throw new Error(msg);
  }
  return res.json();
}

export async function generateSchoolInvoice(subscriptionId: number) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${subscriptionId}/generate-invoice/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
  if (!res.ok) {
    const msg = await extractErrorMessage(res, "Failed to generate invoice");
    throw new Error(msg);
  }
  return res.json();
}

export async function recordSubscriptionPayment(
  subscriptionId: number,
  payload: {
    plan_id?: number;
    amount?: number;
    payment_method?: string;
    payment_reference?: string;
    billing_cycle?: string;
    months_count?: number;
    next_due_date?: string;
    discount_amount?: number;
    notes?: string;
  }
) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${subscriptionId}/record-payment/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const msg = await extractErrorMessage(res, "Failed to record payment");
    throw new Error(msg);
  }
  return res.json();
}

export async function extendTrial(subscriptionId: number, days: number, notes?: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${subscriptionId}/extend-trial/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ days, notes }),
  });
  if (!res.ok) throw new Error("Failed to extend trial");
  return res.json();
}

export async function createManualSubscription(payload: {
  school_id: number;
  plan_id?: number;
  billing_cycle: string;
  start_date?: string;
  due_date?: string;
  amount: number;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}manual-subscription/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create manual subscription");
  return res.json();
}

export async function toggleSchoolLock(subscriptionId: number) {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTIONS}${subscriptionId}/toggle-lock/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to toggle school lock");
  return res.json();
}

export async function getSchoolInvoices(schoolId?: number): Promise<SchoolInvoice[]> {
  const url = schoolId
    ? `${API_BASE_URL}${API_ENDPOINTS.INVOICES}?school=${schoolId}`
    : `${API_BASE_URL}${API_ENDPOINTS.INVOICES}`;
  const res = await fetchWithAuth(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function markInvoicePaid(invoiceId: number, payload?: { payment_method?: string; payment_reference?: string }) {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INVOICES}${invoiceId}/mark-paid/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error("Failed to mark invoice as paid");
  return res.json();
}

export async function deleteSchoolInvoice(invoiceId: number) {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INVOICES}${invoiceId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove pending invoice");
  return true;
}

export async function getSubscriptionPayments(): Promise<SubscriptionPayment[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_PAYMENTS}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch payments");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function getSubscriptionAuditLogs(): Promise<SubscriptionAuditLog[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_AUDIT_LOGS}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function getSaaSGlobalSettings(): Promise<SubscriptionSetting[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_SETTINGS}all/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch global SaaS settings");
  return res.json();
}

export async function updateSaaSGlobalSettings(settingsDict: Record<string, string>): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SUBSCRIPTION_SETTINGS}update-bulk/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(settingsDict),
  });
  if (!res.ok) throw new Error("Failed to update global SaaS settings");
  return res.json();
}

/**
 * Safely parses any date format (DD-MM-YYYY, YYYY-MM-DD, ISO-8601).
 * DRF uses DD-MM-YYYY which standard Date() cannot parse in V8.
 */
export function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (/^\d{1,2}-\d{1,2}-\d{4}/.test(str)) {
    const parts = str.split("T")[0].split(" ")[0].split("-");
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[2]);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateSafe(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = parseDateSafe(dateStr);
  if (!d) return String(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeSafe(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const str = String(dateStr).trim();
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
    return formatDateSafe(str);
  }
  const d = parseDateSafe(dateStr);
  if (!d) return String(dateStr);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
