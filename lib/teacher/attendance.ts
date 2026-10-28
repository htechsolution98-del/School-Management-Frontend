import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import type {
  TodayAttendance,
  AttendanceRecord,
} from "@/types/teacher";

interface AttendanceCacheRecord<T> {
  data: T;
  timestamp: number;
}

const attendanceMemoryCache = new Map<string, AttendanceCacheRecord<any>>();
const ATTENDANCE_CACHE_TTL = 30 * 1000; // 30 seconds

function getPersistentAttendanceCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`sms_att_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
      return parsed.data;
    }
  } catch {}
  return null;
}

function setPersistentAttendanceCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`sms_att_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function getStoredTodayAttendance(): TodayAttendance | null {
  return getPersistentAttendanceCache<TodayAttendance>("today_attendance");
}

export function getStoredAttendanceHistory(): AttendanceRecord[] {
  const cached = getPersistentAttendanceCache<AttendanceRecord[]>("attendance_history_");
  return Array.isArray(cached) ? cached : [];
}

export function invalidateAttendanceCache() {
  attendanceMemoryCache.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("sms_att_today_attendance");
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("sms_att_")) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {}
  }
}

// ─── Get today's attendance ───────────────────────────────────────────────────

export async function getTodayAttendance(forceFresh = false): Promise<TodayAttendance | null> {
  const cacheKey = "today_attendance";
  if (!forceFresh) {
    const entry = attendanceMemoryCache.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < ATTENDANCE_CACHE_TTL) {
      return entry.data;
    }
    const persisted = getPersistentAttendanceCache<TodayAttendance>(cacheKey);
    if (persisted !== null) {
      attendanceMemoryCache.set(cacheKey, { data: persisted, timestamp: Date.now() });
      return persisted;
    }
  }

  const url = `${API_BASE_URL}${API_ENDPOINTS.ATTENDANCE_TODAY}`;
  const response = await fetchWithAuth(url);

  if (response.status === 404) {
    // No record yet — fresh day, not an error
    attendanceMemoryCache.set(cacheKey, { data: null, timestamp: Date.now() });
    setPersistentAttendanceCache(cacheKey, null);
    return null;
  }

  if (!response.ok) {
    let message = "Failed to fetch today's attendance.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  const data = await response.json();
  attendanceMemoryCache.set(cacheKey, { data, timestamp: Date.now() });
  setPersistentAttendanceCache(cacheKey, data);
  return data;
}

// ─── Mark attendance (check-in OR check-out) ─────────────────────────────────

export async function markAttendance(payload: {
  latitude: number;
  longitude: number;
  verification_token?: string;
}): Promise<void> {
  const url = `${API_BASE_URL}/attendance/`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Attendance action failed.";
    try {
      const err = await response.json();
      message =
        err?.non_field_errors?.[0] ||
        err?.detail ||
        err?.message ||
        message;
    } catch { }
    throw new Error(message);
  }

  invalidateAttendanceCache();
}

// ─── Get all attendance records (history) ────────────────────────────────────

export async function getAttendanceHistory(params?: { staff_id?: number }, forceFresh = false): Promise<AttendanceRecord[]> {
  const query = new URLSearchParams();
  if (params?.staff_id) query.set("staff_id", String(params.staff_id));
  const cacheKey = `attendance_history_${query.toString()}`;
  if (!forceFresh) {
    const entry = attendanceMemoryCache.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < ATTENDANCE_CACHE_TTL) {
      return entry.data;
    }
    const persisted = getPersistentAttendanceCache<AttendanceRecord[]>(cacheKey);
    if (persisted) {
      attendanceMemoryCache.set(cacheKey, { data: persisted, timestamp: Date.now() });
      return persisted;
    }
  }

  const url = `${API_BASE_URL}/attendance/${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch attendance history.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  const data = await response.json();
  const result = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
  attendanceMemoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
  setPersistentAttendanceCache(cacheKey, result);
  return result;
}

export interface AttendanceCalendarStatus {
  date: string;
  is_sunday_week_off: boolean;
  entries: Array<{
    classification: "HOLIDAY" | "WEEK_OFF";
    reason?: string | null;
    target_audience?: string | null;
  }>;
}

export async function getAttendanceCalendarStatus(date: string): Promise<AttendanceCalendarStatus> {
  const query = new URLSearchParams({ date });
  const response = await fetchWithAuth(`${API_BASE_URL}/attendance/calendar-status/?${query.toString()}`);
  if (!response.ok) {
    let message = "Failed to fetch the school attendance calendar.";
    try {
      const error = await response.json();
      message = error?.detail || error?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function getStaffAttendance(params?: {
  date?: string;
  start_date?: string;
  end_date?: string;
  department?: string | number;
  category?: string;
  staff_id?: number;
}): Promise<AttendanceRecord[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.start_date) query.set("start_date", params.start_date);
  if (params?.end_date) query.set("end_date", params.end_date);
  if (params?.department) query.set("department", String(params.department));
  if (params?.category) query.set("category", params.category);
  if (params?.staff_id) query.set("staff_id", String(params.staff_id));

  const url = `${API_BASE_URL}${API_ENDPOINTS.ATTENDANCE}${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch staff attendance records.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.results ?? data.data ?? []);
}

// ─── Face verification & enrollment ──────────────────────────────────────────

export async function checkFaceStatus(): Promise<{ enrolled: boolean }> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.FACE_VERIFY}`;
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    let message = "Failed to check face enrollment status.";
    try {
      const error = await response.json();
      message = error?.detail || error?.error || error?.message || message;
    } catch { }
    throw new Error(message);
  }
  const data = await response.json();
  return { enrolled: data?.enrolled ?? data?.is_enrolled ?? false };
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export async function verifyFace(imageBase64: string): Promise<any> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.FACE_VERIFY}`;
  const file = dataURLtoFile(imageBase64, "face.png");
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Face verification failed.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}

export async function enrollFace(imageBase64: string): Promise<{ success: boolean; message?: string }> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.FACE_ENROLL}`;
  const file = dataURLtoFile(imageBase64, "face.png");
  const formData = new FormData();
  formData.append("face_image", file);

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Face enrollment failed.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}
