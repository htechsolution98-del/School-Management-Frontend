import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";

export type StaffReportRow = Record<string, string | number | boolean | null>;
export interface StaffReport {
  school: string; generated_at: string; from_date: string; to_date: string;
  permissions: { salary: boolean; contacts: boolean };
  unavailable: Record<string, string>; summary: StaffReportRow;
  staff: { count: number; page: number; page_size: number; results: StaffReportRow[] };
  distribution: Record<string, { label: string; count: number }[]>;
  attendance: Record<"daily" | "weekly" | "monthly" | "yearly", StaffReportRow[]>;
  attendance_records: StaffReportRow[]; attendance_record_count: number;
  leave_records: StaffReportRow[]; leave_record_count: number; leave_balances: StaffReportRow[]; leave_balance_count: number;
  leave_types: StaffReportRow[]; leave_departments: StaffReportRow[]; leave_trends: StaffReportRow[];
  payroll_records: StaffReportRow[]; payroll_record_count: number; payroll_components: StaffReportRow[]; payroll_component_count: number;
  payroll_months: StaffReportRow[]; payroll_years: StaffReportRow[]; payroll_departments: StaffReportRow[];
  strength_trends: StaffReportRow[]; frequent_absence: StaffReportRow[]; notes: string[];
  options: { academic_years: { id: number; name: string }[]; departments: { id: number; name: string }[]; designations: string[]; categories: string[]; staff: { id: number; name: string }[] };
}
export async function getStaffReport(params: Record<string, string>, signal?: AbortSignal): Promise<StaffReport> {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ""));
  const response = await fetchWithAuth(`${API_BASE_URL.replace(/\/$/, "")}/trustee/staff-report/?${query}`, { cache: "no-store", signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.detail || data?.non_field_errors?.[0] || (data && Object.values(data).flat().find(value => typeof value === "string"));
    throw new Error(typeof error === "string" ? error : "Unable to load staff report.");
  }
  return data;
}
