import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface ActivityLogItem {
  id: number;
  school_id: number | null;
  school_name: string;
  school_slug?: string;
  user_id: number | null;
  user_username?: string;
  user_name: string;
  user_role: string;
  module: string;
  action: string;
  title: string;
  description: string;
  ip_address: string;
  user_agent: string;
  extra_data: Record<string, any>;
  created_at: string;
}

export interface ActivityLogPaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ActivityLogItem[];
}

export interface ActivityLogStats {
  total_count: number;
  today_count: number;
  login_count: number;
  password_changes_count: number;
  modifications_count: number;
  module_counts: { module: string; count: number }[];
  is_super_admin: boolean;
  schools: { id: number; name: string; slug?: string }[];
}

export interface ActivityLogFilters {
  page?: number;
  page_size?: number;
  school_id?: string | number;
  module?: string;
  action?: string;
  role?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export async function getActivityLogs(
  filters: ActivityLogFilters = {}
): Promise<ActivityLogPaginatedResponse> {
  const query = new URLSearchParams();

  if (filters.page) query.set("page", String(filters.page));
  if (filters.page_size) query.set("page_size", String(filters.page_size));
  if (filters.school_id && filters.school_id !== "ALL") {
    query.set("school_id", String(filters.school_id));
  }
  if (filters.module && filters.module !== "ALL") {
    query.set("module", filters.module);
  }
  if (filters.action && filters.action !== "ALL") {
    query.set("action", filters.action);
  }
  if (filters.role && filters.role !== "ALL") {
    query.set("role", filters.role);
  }
  if (filters.search) {
    query.set("search", filters.search);
  }
  if (filters.start_date) {
    query.set("start_date", filters.start_date);
  }
  if (filters.end_date) {
    query.set("end_date", filters.end_date);
  }

  const queryString = query.toString();
  const url = `${API_BASE_URL}/activity-logs/${queryString ? `?${queryString}` : ""}`;

  const response = await fetchWithAuth(url);
  if (!response.ok) {
    let message = "Failed to load activity logs.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }
  return data;
}

export async function getActivityLogStats(
  params?: { school_id?: string | number }
): Promise<ActivityLogStats> {
  const query = new URLSearchParams();
  if (params?.school_id && params.school_id !== "ALL") {
    query.set("school_id", String(params.school_id));
  }
  const qs = query.toString();
  const url = `${API_BASE_URL}/activity-logs/stats/${qs ? `?${qs}` : ""}`;

  const response = await fetchWithAuth(url);
  if (!response.ok) {
    let message = "Failed to load activity log statistics.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}
