import { fetchWithAuth } from "./auth";
import { API_BASE_URL, API_ENDPOINTS } from "./config";
import type {
  AttendanceSetting,
  AttendanceRegularization,
  LeaveCycle,
  DynamicLeaveTemplate,
  DynamicLeaveType,
  LeaveBalance,
  DynamicSalaryComponent,
  SalaryStructure,
  PayrollRun,
  PayrollPayslip,
} from "@/types/hr-config";

export type {
  AttendanceSetting,
  AttendanceRegularization,
  LeaveCycle,
  DynamicLeaveTemplate,
  DynamicLeaveType,
  LeaveBalance,
  DynamicSalaryComponent,
  SalaryStructure,
  PayrollRun,
  PayrollPayslip,
};

function normalizeList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let msg = fallbackError;
    try {
      const err = await res.json();
      if (typeof err === "string") msg = err;
      else if (err.detail) msg = err.detail;
      else if (err.message) msg = err.message;
      else {
        const keys = Object.keys(err);
        if (keys.length > 0) {
          const val = err[keys[0]];
          msg = Array.isArray(val) ? `${keys[0]}: ${val[0]}` : `${keys[0]}: ${val}`;
        }
      }
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// ATTENDANCE SETTINGS API
// ─────────────────────────────────────────────────────────────

export async function getAttendanceSettings(): Promise<AttendanceSetting[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ATTENDANCE_SETTINGS}`);
  const data = await handleResponse<any>(res, "Failed to fetch attendance settings.");
  return normalizeList<AttendanceSetting>(data);
}

export async function createAttendanceSetting(
  payload: Partial<AttendanceSetting>
): Promise<AttendanceSetting> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ATTENDANCE_SETTINGS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<AttendanceSetting>(res, "Failed to create attendance setting.");
}

export async function updateAttendanceSetting(
  id: number,
  payload: Partial<AttendanceSetting>
): Promise<AttendanceSetting> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ATTENDANCE_SETTINGS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<AttendanceSetting>(res, "Failed to update attendance setting.");
}

export async function deleteAttendanceSetting(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ATTENDANCE_SETTINGS}${id}/`, {
    method: "DELETE",
  });
  return handleResponse<void>(res, "Failed to delete attendance setting.");
}

// ─────────────────────────────────────────────────────────────
// LEAVE CYCLES & BALANCES API
// ─────────────────────────────────────────────────────────────

export async function getLeaveCycles(): Promise<LeaveCycle[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_CYCLES}`);
  const data = await handleResponse<any>(res, "Failed to fetch leave cycles.");
  return normalizeList<LeaveCycle>(data);
}

export async function createLeaveCycle(payload: Partial<LeaveCycle>): Promise<LeaveCycle> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_CYCLES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<LeaveCycle>(res, "Failed to create leave cycle.");
}

export async function updateLeaveCycle(id: number, payload: Partial<LeaveCycle>): Promise<LeaveCycle> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_CYCLES}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<LeaveCycle>(res, "Failed to update leave cycle.");
}

export async function deleteLeaveCycle(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_CYCLES}${id}/`, {
    method: "DELETE",
  });
  return handleResponse<void>(res, "Failed to delete leave cycle.");
}

export async function getLeaveBalances(params?: {
  staff_id?: number;
  leave_cycle_id?: number;
  leave_type_id?: number;
}): Promise<LeaveBalance[]> {
  const query = new URLSearchParams();
  if (params?.staff_id) query.set("staff_id", String(params.staff_id));
  if (params?.leave_cycle_id) query.set("leave_cycle_id", String(params.leave_cycle_id));
  if (params?.leave_type_id) query.set("leave_type_id", String(params.leave_type_id));

  const url = `${API_BASE_URL}${API_ENDPOINTS.LEAVE_BALANCES}${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetchWithAuth(url);
  const data = await handleResponse<any>(res, "Failed to fetch leave balances.");
  return normalizeList<LeaveBalance>(data);
}

// ─────────────────────────────────────────────────────────────
// DYNAMIC SALARY COMPONENTS API
// ─────────────────────────────────────────────────────────────

export async function getDynamicSalaryComponents(): Promise<DynamicSalaryComponent[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DYNAMIC_SALARY_COMPONENTS}`);
  const data = await handleResponse<any>(res, "Failed to fetch salary components.");
  return normalizeList<DynamicSalaryComponent>(data);
}

export async function createDynamicSalaryComponent(
  payload: Partial<DynamicSalaryComponent>
): Promise<DynamicSalaryComponent> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DYNAMIC_SALARY_COMPONENTS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<DynamicSalaryComponent>(res, "Failed to create salary component.");
}

export async function updateDynamicSalaryComponent(
  id: number,
  payload: Partial<DynamicSalaryComponent>
): Promise<DynamicSalaryComponent> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DYNAMIC_SALARY_COMPONENTS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<DynamicSalaryComponent>(res, "Failed to update salary component.");
}

export async function deleteDynamicSalaryComponent(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DYNAMIC_SALARY_COMPONENTS}${id}/`, {
    method: "DELETE",
  });
  return handleResponse<void>(res, "Failed to delete salary component.");
}

// ─────────────────────────────────────────────────────────────
// SALARY STRUCTURES API
// ─────────────────────────────────────────────────────────────

export async function getSalaryStructures(): Promise<SalaryStructure[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SALARY_STRUCTURES}`);
  const data = await handleResponse<any>(res, "Failed to fetch salary structures.");
  return normalizeList<SalaryStructure>(data);
}

export async function createSalaryStructure(
  payload: Partial<SalaryStructure>
): Promise<SalaryStructure> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SALARY_STRUCTURES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<SalaryStructure>(res, "Failed to create salary structure.");
}

export async function updateSalaryStructure(
  id: number,
  payload: Partial<SalaryStructure>
): Promise<SalaryStructure> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SALARY_STRUCTURES}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<SalaryStructure>(res, "Failed to update salary structure.");
}

export async function deleteSalaryStructure(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SALARY_STRUCTURES}${id}/`, {
    method: "DELETE",
  });
  return handleResponse<void>(res, "Failed to delete salary structure.");
}

export async function assignSalaryStructureToStaff(
  staffId: number,
  salaryStructureId: number | null
): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.STAFF}${staffId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ salary_structure: salaryStructureId }),
  });
  return handleResponse<any>(res, "Failed to assign salary structure to staff.");
}

// ─────────────────────────────────────────────────────────────
// LEAVE TEMPLATES & TYPES EXTENDED
// ─────────────────────────────────────────────────────────────

export async function getDynamicLeaveTemplates(): Promise<DynamicLeaveTemplate[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_TEMPLATES}`);
  const data = await handleResponse<any>(res, "Failed to fetch leave templates.");
  return normalizeList<DynamicLeaveTemplate>(data);
}

export async function createDynamicLeaveTemplate(
  payload: { name?: string; time_line?: string; is_active?: boolean }
): Promise<DynamicLeaveTemplate> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_TEMPLATES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<DynamicLeaveTemplate>(res, "Failed to create leave template.");
}

export async function getDynamicLeaveTypes(): Promise<DynamicLeaveType[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_TYPES}`);
  const data = await handleResponse<any>(res, "Failed to fetch leave types.");
  return normalizeList<DynamicLeaveType>(data);
}

export async function createDynamicLeaveType(
  payload: Partial<DynamicLeaveType>
): Promise<DynamicLeaveType> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_TYPES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<DynamicLeaveType>(res, "Failed to create leave type.");
}
