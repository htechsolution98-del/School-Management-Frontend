import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface LeaveDay {
  id: number;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected";
}

export interface LeaveRequest {
  id: number;
  staff_name: string;
  submission_date: string;
  start_date: string;
  end_date: string;
  total_requested_days: number;
  leave_type: string; // e.g., "CASUAL", "SICK", etc.
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected";
  days: LeaveDay[];
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
  time_line: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | string;
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
  timeline: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | string
): Promise<LeaveTemplate> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ time_line: timeline }),
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
  timeline: string
): Promise<LeaveTemplate> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ time_line: timeline }),
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
  leave_template: number;
  leave_num: number;
  category: number;
  is_carry_forward: boolean;
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

