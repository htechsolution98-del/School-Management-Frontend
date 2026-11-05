import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { normalizeList } from "./helpers";
import type { GenerateSalaryPayload, SalaryPayment } from "@/types/fees";

export async function getSalaryPayments(month?: string): Promise<SalaryPayment[]> {
  const params = new URLSearchParams();
  if (month) params.set("salary_month", month);
  const url = `${API_BASE_URL}${API_ENDPOINTS.STAFF_SALARY_PAYMENT}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetchWithAuth(url);
  if (!response.ok) throw new Error("Failed to fetch salary payments.");
  return normalizeList<SalaryPayment>(await response.json());
}

export async function generateSalary(
  payload: GenerateSalaryPayload
): Promise<SalaryPayment> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.STAFF_SALARY_PAYMENT}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    let errorMsg = data?.message || data?.detail;
    if (!errorMsg && Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
      errorMsg = data.non_field_errors[0];
    }
    if (!errorMsg && typeof data === "object" && data !== null) {
      const firstVal = Object.values(data).flat()[0];
      if (typeof firstVal === "string") {
        errorMsg = firstVal;
      }
    }
    if (!errorMsg) {
      errorMsg = "Failed to generate salary.";
    }
    const err: any = new Error(String(errorMsg));
    err.data = data;
    throw err;
  }
  return data;
}

export interface PayrollGenerationResult {
  payroll_run_id: number;
  salary_month: string;
  status: string;
  total_eligible_staff: number;
  total_processed: number;
  total_skipped: number;
  processed: Array<{
    staff_id: number;
    staff_name: string;
    payable_days: number;
    net_salary: string;
  }>;
  skipped: Array<{
    staff_id: number;
    staff_name: string;
    flag: string;
    reason: string;
    missing_punch_dates?: string[];
  }>;
}

export async function triggerPayrollGeneration(
  month: string,
  staffId?: number
): Promise<PayrollGenerationResult> {
  const response = await fetchWithAuth(`${API_BASE_URL}/payroll-runs/generate/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ salary_month: month, staff_id: staffId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Failed to trigger payroll generation.");
  }
  return data;
}

export async function lockPayrollRun(runId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/payroll-runs/${runId}/lock/`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to lock payroll run.");
}

export async function unlockPayrollRun(runId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/payroll-runs/${runId}/unlock/`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to unlock payroll run.");
}

export interface SalaryPreviewData {
  status: string;
  staff_id: number;
  staff_name: string;
  staff_category?: string;
  salary_month: string;
  working_days: number;
  eligible_working_days?: number;
  present_days: number;
  paid_leaves: number;
  unpaid_leaves: number;
  lwp_days: number;
  per_day_salary: string;
  lwp_deduction: string;
  absent_days?: number;
  payable_days?: number;
  basic_salary: string;
  gross_earnings: string;
  total_deductions: string;
  net_salary: string;
  requires_regularization?: boolean;
  message?: string;
  missing_punch_dates?: string[];
  breakdown?: any;
}

export async function getSalaryPreview(
  staffId: number,
  salaryMonth: string
): Promise<SalaryPreviewData> {
  const url = `${API_BASE_URL}/payroll/preview/?staff=${staffId}&salary_month=${salaryMonth}`;
  const response = await fetchWithAuth(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Failed to fetch salary preview.");
  }
  return data;
}

export async function bulkGenerateSalaries(
  salaryMonth: string,
  paymentMode: string = "offline"
): Promise<PayrollGenerationResult> {
  const response = await fetchWithAuth(`${API_BASE_URL}/payroll/bulk-generate/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ salary_month: salaryMonth, payment_mode: paymentMode }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || data?.detail || data?.message || "Failed to bulk generate salaries.");
  }
  return data;
}

export function getPayslipViewUrl(
  paymentId: number,
  format: "html" | "json" = "html",
  salaryMonth?: string,
  token?: string,
  staffId?: number
): string {
  const params = new URLSearchParams();
  params.set("format", format);
  if (salaryMonth) params.set("salary_month", salaryMonth);
  if (token) params.set("token", token);
  if (staffId) params.set("staff_id", String(staffId));
  return `${API_BASE_URL}/payroll/payslip/${paymentId}/?${params.toString()}`;
}

export async function bulkDisburseSalaries(
  salaryMonth: string,
  paymentIds?: number[],
  staffIds?: number[],
  paymentMode: string = "offline"
): Promise<{ status: string; disbursed_count: number; message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/payroll/bulk-disburse/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      salary_month: salaryMonth,
      payment_ids: paymentIds,
      staff_ids: staffIds,
      payment_mode: paymentMode,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || data?.detail || data?.message || "Failed to disburse salaries.");
  }
  return data;
}
