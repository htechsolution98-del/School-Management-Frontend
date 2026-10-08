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
    const errorMsg =
      data?.message || data?.detail || "Failed to generate salary.";
    const err: any = new Error(errorMsg);
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
