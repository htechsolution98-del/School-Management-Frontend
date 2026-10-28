import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface RemainingLeave {
  leave_type_id: number;
  leave_type: string;
  leave_type_name?: string;
  total_allowed?: number;
  allocated?: number;
  carry_forward?: number;
  used: number;
  pending?: number;
  remaining: number;
  remaining_leaves?: number;
  is_paid?: boolean;
}

export interface MyLeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day?: boolean;
  half_day_session?: "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF" | string;
  reason: string;
  leave_type: string | number; // Can be a string or dynamic type object/ID
  dynamic_leave_type?: number | null;
  dynamic_leave_type_name?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | string;
  rejection_reason?: string;
  cancellation_status?: "NONE" | "REQUESTED" | "APPROVED" | "REJECTED" | string;
  cancellation_reason?: string;
  cancellation_requested_at?: string;
  cancellation_rejection_reason?: string;
  created_at: string;
}

export interface LeaveRequestPayload {
  start_date: string;
  end_date: string;
  total_days?: number;
  is_half_day?: boolean;
  half_day_session?: "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF" | string;
  reason: string;
  leave_type: number;
  dynamic_leave_type?: number;
}

interface LeavesCacheRecord<T> {
  data: T;
  timestamp: number;
}

const leavesMemoryCache = new Map<string, LeavesCacheRecord<any>>();
const LEAVES_CACHE_TTL = 30 * 1000; // 30 seconds

function getPersistentLeavesCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`sms_leaves_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
      return parsed.data;
    }
  } catch {}
  return null;
}

function setPersistentLeavesCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`sms_leaves_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function getStoredRemainingLeaves(): RemainingLeave[] {
  const cached = getPersistentLeavesCache<RemainingLeave[]>("remaining_leaves");
  return Array.isArray(cached) ? cached : [];
}

export function getStoredMyLeaveRequests(): MyLeaveRequest[] {
  const cached = getPersistentLeavesCache<MyLeaveRequest[]>("my_leave_requests");
  return Array.isArray(cached) ? cached : [];
}

export function invalidateLeavesCache() {
  leavesMemoryCache.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("sms_leaves_remaining_leaves");
      sessionStorage.removeItem("sms_leaves_my_leave_requests");
    } catch {}
  }
}

export async function getRemainingLeaves(forceFresh = false): Promise<RemainingLeave[]> {
  const cacheKey = "remaining_leaves";
  if (!forceFresh) {
    const entry = leavesMemoryCache.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < LEAVES_CACHE_TTL) {
      return entry.data;
    }
    const persisted = getPersistentLeavesCache<RemainingLeave[]>(cacheKey);
    if (persisted) {
      leavesMemoryCache.set(cacheKey, { data: persisted, timestamp: Date.now() });
      return persisted;
    }
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/get-remaining-leaves/`);
  if (!response.ok) {
    let message = "Failed to fetch remaining leave balance.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  const data = await response.json();
  leavesMemoryCache.set(cacheKey, { data, timestamp: Date.now() });
  setPersistentLeavesCache(cacheKey, data);
  return data;
}

export async function getMyLeaveRequests(forceFresh = false): Promise<MyLeaveRequest[]> {
  const cacheKey = "my_leave_requests";
  if (!forceFresh) {
    const entry = leavesMemoryCache.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < LEAVES_CACHE_TTL) {
      return entry.data;
    }
    const persisted = getPersistentLeavesCache<MyLeaveRequest[]>(cacheKey);
    if (persisted) {
      leavesMemoryCache.set(cacheKey, { data: persisted, timestamp: Date.now() });
      return persisted;
    }
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/get-leave-requests-staff/`);
  if (!response.ok) {
    let message = "Failed to fetch personal leave requests.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  const data = await response.json();
  leavesMemoryCache.set(cacheKey, { data, timestamp: Date.now() });
  setPersistentLeavesCache(cacheKey, data);
  return data;
}

export interface DayBreakdownItem {
  date: string;
  day_name: string;
  weight: number;
  is_effective: boolean;
  reason: string;
  category: "WORKING_DAY" | "WEEKEND" | "HOLIDAY" | "HALF_DAY" | string;
}

export interface LeaveCalculationPreview {
  start_date: string;
  end_date: string;
  total_effective_days: number;
  calendar_days: number;
  excluded_weekends: number;
  excluded_holidays: number;
  is_half_day: boolean;
  half_day_session: string;
  day_breakdown: DayBreakdownItem[];
  balance: {
    allocated: number;
    carry_forward: number;
    total_entitlement: number;
    used: number;
    pending: number;
    available: number;
  };
  is_valid: boolean;
  has_sufficient_balance: boolean;
  overlapping: boolean;
  overlapping_error?: string | null;
  summary_message: string;
  is_paid: boolean;
}

export async function calculateLeaveDays(payload: {
  start_date: string;
  end_date: string;
  leave_type: number | string;
  is_half_day?: boolean;
  half_day_session?: string;
}): Promise<LeaveCalculationPreview> {
  const response = await fetchWithAuth(`${API_BASE_URL}/calculate-leave-days/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = "Failed to calculate effective leave days.";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function createLeaveRequest(payload: LeaveRequestPayload): Promise<MyLeaveRequest> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = "Failed to submit leave request.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  invalidateLeavesCache();
  return response.json();
}

export async function updateLeaveRequest(
  id: number,
  payload: Partial<LeaveRequestPayload>
): Promise<MyLeaveRequest> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = "Failed to update leave request.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  invalidateLeavesCache();
  return response.json();
}

export async function deleteLeaveRequest(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let message = "Failed to delete leave request.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  invalidateLeavesCache();
}

export async function withdrawLeaveRequest(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/withdraw/`, {
    method: "POST",
  });
  if (!response.ok) {
    let message = "Failed to withdraw leave request.";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  invalidateLeavesCache();
}

export async function requestCancellation(id: number, reason: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/request_cancellation/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    let message = "Failed to request leave cancellation.";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  invalidateLeavesCache();
}

