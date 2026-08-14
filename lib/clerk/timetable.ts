import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { TimetablePayload, TimetableRecord } from "@/types/clerk";

export async function getTimetable(
  classDivision: number,
  day?: string
): Promise<TimetableRecord[]> {
  const params = new URLSearchParams();
  params.set("class_division", String(classDivision));
  if (day) params.set("day", day);

  const response = await fetchWithAuth(`${API_BASE_URL}/timetable/?${params.toString()}`);

  if (!response.ok) {
    let message = "Failed to fetch timetable.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? data.data ?? [];
}

export async function createTimetable(
  payload: TimetablePayload
): Promise<TimetableRecord> {
  const response = await fetchWithAuth(`${API_BASE_URL}/timetable/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to create timetable.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function updateTimetable(
  id: number,
  payload: TimetablePayload
): Promise<TimetableRecord> {
  const response = await fetchWithAuth(`${API_BASE_URL}/timetable/${id}/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to update timetable.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export interface AutoGeneratePreviewResponse {
  status: string;
  message: string;
  draft_timetables: Array<{
    class_division: number;
    class_name: string;
    division_name: string;
    day: string;
    total_lecture: number;
    start_time: string;
    end_time: string;
    slots: Array<{
      slot_number: number;
      is_lecture: boolean;
      is_break: boolean;
      slot_start_time: string;
      slot_end_time: string;
      teacher: number | null;
      teacher_name: string;
      subject: number | null;
      subject_name: string;
    }>;
  }>;
  missing_divisions?: string[];
  error?: string;
}

export async function autoGenerateTimetablePreview(options?: {
  days?: string[];
  total_lecture?: number;
  start_time?: string;
  end_time?: string;
  include_break?: boolean;
  break_duration?: number;
  break_after_lecture?: number;
}): Promise<AutoGeneratePreviewResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/timetable/auto-generate-preview/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options || {}),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorObj = new Error(data?.error || data?.detail || "Failed to auto generate timetable draft.") as Error & {
      missing_divisions?: string[];
    };
    if (data?.missing_divisions) {
      errorObj.missing_divisions = data.missing_divisions;
    }
    throw errorObj;
  }

  return data;
}

export async function publishBulkTimetables(timetables: any[]): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/timetable/bulk-publish/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timetables }),
  });

  if (!response.ok) {
    let message = "Failed to publish timetables.";
    try {
      const err = await response.json();
      message = err?.detail || err?.error || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}
