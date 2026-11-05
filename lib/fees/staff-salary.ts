import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { normalizeList } from "./helpers";
import type {
  CalcType,
  StaffMember,
  StaffSalaryAssignment,
  StaffSalaryComponent,
} from "@/types/fees";

export async function getStaffList(): Promise<StaffMember[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/staff-list/`);
  if (!response.ok) throw new Error("Failed to fetch staff list.");
  return normalizeList<StaffMember>(await response.json());
}

export async function getStaffSalaryComponents(staffId: number): Promise<StaffSalaryComponent[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/staff-salary-component/?staff=${staffId}`);
  if (!response.ok) throw new Error("Failed to fetch staff salary components.");
  return normalizeList<StaffSalaryComponent>(await response.json());
}

export async function createStaffSalaryComponent(payload: {
  staff: number;
  component: number;
  calculation_type: CalcType;
  calc_base?: string;
  value: string;
}): Promise<StaffSalaryComponent> {
  const response = await fetchWithAuth(`${API_BASE_URL}/staff-salary-component/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.message || "Failed to assign salary component");
  return data;
}

export async function getAllStaffSalaryComponents(): Promise<StaffSalaryAssignment[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/staff-salary-component/`);
  if (!response.ok) throw new Error("Failed to fetch assigned components.");
  const raw = normalizeList<Record<string, unknown>>(await response.json());
  return raw.map((item) => ({
    id: Number(item.id),
    staffId: Number(item.staff),
    staffName: String(item.staff_name ?? `Staff #${item.staff}`),
    component: Number(item.component),
    componentName: String(item.component_name ?? "Unknown"),
    componentType: (item.component_type ?? "earning") as StaffSalaryAssignment["componentType"],
    calculation_type: item.calculation_type as CalcType,
    calc_base: String(item.calc_base ?? "Basic Salary"),
    value: String(item.value ?? ""),
    isActive: Boolean(item.is_active ?? true),
  }));
}

export async function deleteStaffSalaryComponent(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/staff-salary-component/${id}/`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) throw new Error("Failed to delete component.");
}

export async function updateStaffSalaryComponent(
  id: number,
  payload: { calculation_type: CalcType; calc_base?: string; value: string }
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/staff-salary-component/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update component.");
}
