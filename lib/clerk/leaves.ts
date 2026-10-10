import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface LeaveDay {
  id: number;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected";
}

export interface LeaveRequest {
  id: number;
  staff?: number;
  staff_name: string;
  submission_date?: string;
  start_date: string;
  end_date: string;
  total_days?: number;
  total_requested_days?: number;
  leave_type: string | number; // e.g., "CASUAL", "SICK", etc.
  leave_type_name?: string;
  dynamic_leave_type?: number | null;
  dynamic_leave_type_name?: string;
  is_paid?: boolean;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected";
  days: LeaveDay[];
  leave_days?: LeaveDay[];
  remaining_leaves?: any[];
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/get-leave-requests/`);
  if (!response.ok) {
    let message = "Failed to fetch leave requests.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function changeLeaveDayStatus(
  dayId: number,
  status: "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected" | string
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/change-leave-status/${dayId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    let message = "Failed to update leave day status.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

export async function approveAllLeaveDays(
  requestId: number,
  status: "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected" | string
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/approve-all-leave/${requestId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    let message = "Failed to update entire leave request status.";
    try {
      const err = await response.json();
      if (err) {
        if (typeof err === "string") {
          message = err;
        } else if (err.detail) {
          message = err.detail;
        } else if (err.message) {
          message = err.message;
        } else if (err.error) {
          message = err.error;
        } else {
          const keys = Object.keys(err);
          if (keys.length > 0) {
            const firstVal = err[keys[0]];
            if (Array.isArray(firstVal) && firstVal.length > 0) {
              message = `${keys[0]}: ${firstVal[0]}`;
            } else if (typeof firstVal === "string") {
              message = `${keys[0]}: ${firstVal}`;
            } else {
              message = JSON.stringify(err);
            }
          }
        }
      }
    } catch {}
    throw new Error(message);
  }
}

// Leave Templates API Helpers
export interface LeaveTemplate {
  id: number;
  name?: string | null;
  time_line?: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | string;
  is_active?: boolean;
  created_at?: string;
}

export async function getLeaveTemplates(): Promise<LeaveTemplate[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/`);
  if (!response.ok) {
    let message = "Failed to fetch leave templates.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function createLeaveTemplate(
  data: string | { name?: string; time_line?: string; is_active?: boolean }
): Promise<LeaveTemplate> {
  const payload = typeof data === "string" ? { time_line: data, name: data } : data;
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = "Failed to create leave template.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function updateLeaveTemplate(
  id: number,
  data: string | { name?: string; time_line?: string; is_active?: boolean }
): Promise<LeaveTemplate> {
  const payload = typeof data === "string" ? { time_line: data } : data;
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = "Failed to update leave template.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function deleteLeaveTemplate(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let message = "Failed to delete leave template.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

// Leave Types API Helpers
export interface LeaveTypePayload {
  leave_type: string;
  name?: string;
  code?: string;
  leave_template: number;
  leave_num: number;
  allocation_count?: number;
  allocation_period?: "Monthly" | "Quarterly" | "Yearly" | string;
  is_paid?: boolean;
  category: number;
  is_carry_forward?: boolean;
  carry_forward?: boolean;
  max_carry_forward?: number;
  allow_encashment?: boolean;
}

export interface LeaveTypeRecord extends LeaveTypePayload {
  id: number;
}

export async function getLeaveTypes(): Promise<LeaveTypeRecord[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-types/`);
  if (!response.ok) {
    let message = "Failed to fetch leave types.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function createLeaveType(payload: LeaveTypePayload): Promise<LeaveTypeRecord> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-types/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = "Failed to create leave type.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function updateLeaveType(
  id: number,
  payload: Partial<LeaveTypePayload>
): Promise<LeaveTypeRecord> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-types/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = "Failed to update leave type.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function deleteLeaveType(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-types/${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let message = "Failed to delete leave type.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

// ==========================================
// Approval & Cancellation API Helpers
// ==========================================

export async function approveLeaveRequest(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/approve/`, {
    method: "POST",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || "Failed to approve leave request.");
  }
}

export async function rejectLeaveRequest(id: number, reason: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/reject/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || "Failed to reject leave request.");
  }
}

export async function approveLeaveCancellation(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/approve_cancellation/`, {
    method: "POST",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || "Failed to approve leave cancellation.");
  }
}

export async function rejectLeaveCancellation(id: number, reason: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/reject_cancellation/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || "Failed to reject leave cancellation.");
  }
}



