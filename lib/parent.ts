import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";

export interface ChildProfile {
  id: number;
  name: string;
  surname: string;
  gr_no: string;
  roll_no: string;
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
    id: number;
    title: string;
    description: string;
    created_at: string;
  }>;
}

export interface ParentDueFee {
  id: number;
  student: number;
  academic_year?: number;
  amount: number | string;
  paid_amount: number | string;
  due_date?: string;
  status: string;
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
