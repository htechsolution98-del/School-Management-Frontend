import { fetchWithAuth, parseApiError } from "@/lib/auth";
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
  approval_remarks?: string;
  rejection_reason?: string;
  cancellation_status?: "NONE" | "REQUESTED" | "APPROVED" | "REJECTED" | string;
  cancellation_reason?: string;
  cancellation_requested_at?: string;
  cancellation_rejection_reason?: string;
  days: LeaveDay[];
  leave_days?: LeaveDay[];
  remaining_leaves?: any[];
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/get-leave-requests/`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch leave requests."));
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
    throw new Error(await parseApiError(response, "Failed to update leave day status."));
  }
}

export async function approveAllLeaveDays(
  requestId: number,
  status: "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected" | string,
  reasonOrRemarks?: string
): Promise<void> {
  const payload: any = { status };
  if (reasonOrRemarks) {
    payload.reason = reasonOrRemarks;
    payload.remarks = reasonOrRemarks;
  }
  const response = await fetchWithAuth(`${API_BASE_URL}/approve-all-leave/${requestId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update entire leave request status."));
  }
}

export interface CycleBlock {
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

// Leave Templates API Helpers
export interface LeaveTemplate {
  id: number;
  name?: string | null;
  time_line?: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | string;
  is_active?: boolean;
  academic_year?: number | null;
  academic_year_name?: string | null;
  academic_year_range?: string | null;
  current_cycle?: CycleBlock | null;
  cycle_blocks?: CycleBlock[];
  created_at?: string;
}

export async function getLeaveTemplates(): Promise<LeaveTemplate[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch leave templates."));
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
    throw new Error(await parseApiError(response, "Failed to create leave template."));
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
    throw new Error(await parseApiError(response, "Failed to update leave template."));
  }
  return response.json();
}

export async function deleteLeaveTemplate(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-templates/${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to delete leave template."));
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
}

export interface LeaveTypeRecord extends LeaveTypePayload {
  id: number;
  academic_year?: number | null;
  academic_year_name?: string | null;
  session_dates?: {
    start?: string;
    end?: string;
    range?: string;
  } | null;
}

export async function getLeaveTypes(): Promise<LeaveTypeRecord[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-types/`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch leave types."));
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
    throw new Error(await parseApiError(response, "Failed to create leave type."));
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
    throw new Error(await parseApiError(response, "Failed to update leave type."));
  }
  return response.json();
}

export async function deleteLeaveType(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-types/${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to delete leave type."));
  }
}

export interface BulkManageLeaveTypesPayload {
  leave_template?: number;
  academic_year?: number | null;
  category_ids: number[];
  name: string;
  leave_type?: string;
  code?: string;
  leave_num: number;
  allocation_count?: number;
  allocation_period?: string;
  is_paid?: boolean;
  is_carry_forward?: boolean;
  carry_forward?: boolean;
  max_carry_forward?: number;
  existing_type_ids?: number[];
}

export async function bulkManageLeaveTypes(
  payload: BulkManageLeaveTypesPayload
): Promise<LeaveTypeRecord[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-types/bulk-manage/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to save leave types."));
  }
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("sms_leaves_remaining_leaves");
      sessionStorage.removeItem("sms_leaves_my_leave_requests");
    } catch {}
  }
  return response.json();
}


// ==========================================
// Approval & Cancellation API Helpers
// ==========================================

export async function approveLeaveRequest(id: number, remarks?: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/leave-request/${id}/approve/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remarks: remarks || "" }),
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



