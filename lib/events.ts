import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface SchoolEventPayload {
  name?: string;
  title: string;
  event_type: "HOLIDAY" | "EVENT" | "EXAM" | "MEETING" | "CELEBRATION" | "OTHER" | string;
  is_holiday?: boolean;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  description?: string;
  target_audience?: "ALL" | "STUDENTS_PARENTS" | "STUDENT" | "PARENT" | "TEACHER" | "STAFF" | string;
  location?: string;
  color?: string;
}

export interface SchoolEventResponse {
  id: number;
  school?: number;
  name?: string;
  title: string;
  event_type: "HOLIDAY" | "EVENT" | "EXAM" | "MEETING" | "CELEBRATION" | "OTHER" | string;
  is_holiday: boolean;
  start_date: string;
  end_date?: string | null;
  description?: string;
  target_audience?: string;
  location?: string;
  color?: string;
  created_by?: number | string;
  created_by_name?: string;
  can_manage?: boolean;
  created_at?: string;
  updated_at?: string;
}

const EVENTS_CACHE_KEY = "sms_cached_events";

export function getStoredSchoolEvents(): SchoolEventResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < 10 * 60 * 1000 && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {}
  return [];
}

export function setStoredSchoolEvents(data: SchoolEventResponse[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function invalidateEventsCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EVENTS_CACHE_KEY);
  } catch {}
}

export async function getSchoolEvents(params?: {
  year?: number | string;
  month?: number | string;
  event_type?: string;
  is_holiday?: boolean;
}): Promise<SchoolEventResponse[]> {
  let url = `${API_BASE_URL}/events/?`;
  if (params?.year) url += `year=${params.year}&`;
  if (params?.month) url += `month=${params.month}&`;
  if (params?.event_type) url += `event_type=${params.event_type}&`;
  if (params?.is_holiday !== undefined) url += `is_holiday=${params.is_holiday}&`;

  const response = await fetchWithAuth(url);
  if (!response.ok) {
    let message = "Failed to fetch events and holidays.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
  if (list.length > 0 && !params?.event_type) {
    setStoredSchoolEvents(list);
  }
  return list;
}

export async function createSchoolEvent(payload: SchoolEventPayload): Promise<SchoolEventResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/events/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to create event.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  invalidateEventsCache();
  return response.json();
}

export async function updateSchoolEvent(
  id: number,
  payload: Partial<SchoolEventPayload>
): Promise<SchoolEventResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/events/${id}/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to update event.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  invalidateEventsCache();
  return response.json();
}

export async function seedDefaultSchoolHolidays(): Promise<{ message: string; events: SchoolEventResponse[] }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/events/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "seed_defaults" }),
  });

  if (!response.ok) {
    let message = "Failed to load default holidays.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  invalidateEventsCache();
  return response.json();
}

export async function deleteSchoolEvent(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/events/${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let message = "Failed to delete event.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  invalidateEventsCache();
}

