import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { TeacherWorkload, UpdateTeacherWorkloadPayload } from "@/types/clerk";

export async function getTeacherWorkloads(search?: string): Promise<TeacherWorkload[]> {
  const timestamp = new Date().getTime();
  let url = `${API_BASE_URL}${API_ENDPOINTS.TEACHER_WORKLOAD}?_t=${timestamp}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch teacher workloads.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? data.data ?? [];
}

export async function updateTeacherWorkload(
  id: number,
  payload: UpdateTeacherWorkloadPayload
): Promise<TeacherWorkload> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.TEACHER_WORKLOAD}${id}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    let message = "Failed to update teacher workload.";
    try {
      const err = await response.json();
      if (typeof err === "object" && err !== null) {
        // Collect field validation errors
        const errorEntries = Object.entries(err);
        if (errorEntries.length > 0) {
          const [field, val] = errorEntries[0];
          const valText = Array.isArray(val) ? val.join(" ") : String(val);
          message = `${valText}`;
        }
      }
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return await response.json();
}

export async function bulkUpdateTeacherWorkloads(payload: {
  teacher_ids?: number[];
  max_periods_mon?: number;
  max_periods_tue?: number;
  max_periods_wed?: number;
  max_periods_thu?: number;
  max_periods_fri?: number;
  max_periods_sat?: number;
  uniform_daily_periods?: number;
  max_weekly_periods?: number;
  max_consecutive_periods?: number;
}): Promise<{ message: string; count: number }> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.TEACHER_WORKLOAD}bulk-update/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    let message = "Failed to bulk update teacher workloads.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return await response.json();
}
