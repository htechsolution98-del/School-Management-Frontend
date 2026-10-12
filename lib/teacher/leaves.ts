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

export async function getRemainingLeaves(): Promise<RemainingLeave[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/get-remaining-leaves/`);
  if (!response.ok) {
    let message = "Failed to fetch remaining leave balance.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function getMyLeaveRequests(): Promise<MyLeaveRequest[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/get-leave-requests-staff/`);
  if (!response.ok) {
    let message = "Failed to fetch personal leave requests.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
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
}

export async function requestCancellation(id: number, reason: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/request_cancellation/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    let message = "Failed to submit cancellation request.";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

