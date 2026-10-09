import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { normalizeList } from "./helpers";
import type { ComponentType, SalaryComponent } from "@/types/fees";

export async function getSalaryComponents(): Promise<SalaryComponent[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/dynamic-salary-components/`);
  if (!response.ok) {
    // Fallback to legacy endpoint if needed
    const legacy = await fetchWithAuth(`${API_BASE_URL}/salary-component/`);
    if (!legacy.ok) throw new Error("Failed to fetch salary components.");
    return normalizeList<SalaryComponent>(await legacy.json());
  }
  return normalizeList<SalaryComponent>(await response.json());
}

export async function createSalaryComponent(payload: {
  name: string;
  component_type?: ComponentType;
  type?: "Earning" | "Deduction";
  calc_type?: "Fixed" | "Percentage" | "Formula" | string;
  calc_base?: string;
  value?: number | string;
}): Promise<SalaryComponent> {
  const typeValue = payload.type || (payload.component_type === "deduction" ? "Deduction" : "Earning");
  const componentTypeValue = payload.component_type || (typeValue === "Deduction" ? "deduction" : "earning");

  const body = {
    name: payload.name,
    type: typeValue,
    component_type: componentTypeValue,
    calc_type: payload.calc_type || "Fixed",
    calc_base: payload.calc_base || null,
    value: payload.value ?? 0,
  };

  const response = await fetchWithAuth(`${API_BASE_URL}/dynamic-salary-components/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.message || "Failed to create salary component");
  return data;
}

export async function updateSalaryComponent(
  id: number,
  payload: {
    name?: string;
    component_type?: ComponentType;
    type?: "Earning" | "Deduction";
    calc_type?: "Fixed" | "Percentage" | "Formula" | string;
    calc_base?: string;
    value?: number | string;
  }
): Promise<SalaryComponent> {
  const typeValue = payload.type || (payload.component_type ? (payload.component_type === "deduction" ? "Deduction" : "Earning") : undefined);
  const componentTypeValue = payload.component_type || (typeValue ? (typeValue === "Deduction" ? "deduction" : "earning") : undefined);

  const body: Record<string, any> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (typeValue !== undefined) body.type = typeValue;
  if (componentTypeValue !== undefined) body.component_type = componentTypeValue;
  if (payload.calc_type !== undefined) body.calc_type = payload.calc_type;
  if (payload.calc_base !== undefined) body.calc_base = payload.calc_base || null;
  if (payload.value !== undefined) body.value = payload.value;

  const response = await fetchWithAuth(`${API_BASE_URL}/dynamic-salary-components/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.message || "Failed to update salary component");
  return data;
}

export async function deleteSalaryComponent(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/dynamic-salary-components/${id}/`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    let msg = "Failed to delete salary component";
    try {
      const data = await response.json();
      msg = data?.detail || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }
}

