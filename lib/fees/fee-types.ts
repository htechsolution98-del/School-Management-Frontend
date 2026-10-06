import { z } from "zod";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { normalizeList } from "./helpers";
import type { FeeType, FeeTypeFormData } from "@/types/fees";

export const billingCycleOptions = [
  { value: "single", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
] as const;

export function getBillingCycleLabel(cycle: string): string {
  return billingCycleOptions.find((o) => o.value === cycle)?.label ?? cycle;
}

export function getBillingCycleBadgeColor(cycle: string): string {
  const map: Record<string, string> = {
    single: "bg-blue-50    text-blue-700    border border-blue-200",
    monthly: "bg-purple-50  text-purple-700  border border-purple-200",
    quarterly: "bg-orange-50  text-orange-700  border border-orange-200",
    half_yearly: "bg-teal-50    text-teal-700    border border-teal-200",
    yearly: "bg-green-50   text-green-700   border border-green-200",
  };
  return map[cycle] ?? "bg-gray-50 text-gray-600 border border-gray-200";
}

export function getFeeTypeIconBg(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("tuition")) return "bg-purple-50";
  if (lower.includes("transport")) return "bg-orange-50";
  if (lower.includes("exam")) return "bg-blue-50";
  if (lower.includes("library")) return "bg-emerald-50";
  if (lower.includes("lab")) return "bg-violet-50";
  if (lower.includes("admission")) return "bg-rose-50";
  return "bg-indigo-50";
}

export const feeTypeSchema = z.object({
  name: z.string().min(1, "Fee type name is required").max(100, "Name must be 100 characters or less"),
  billing_cycle: z.enum(["single", "monthly", "quarterly", "half_yearly", "yearly"], {
    error: "Please select a billing cycle",
  }),
  is_rte_applicable: z.boolean().default(false),
});

export async function getFeeTypes(): Promise<FeeType[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.FEE_TYPE}`);
  if (!response.ok) throw new Error("Failed to fetch fee types.");
  return normalizeList<FeeType>(await response.json());
}

export async function createFeeType(payload: FeeTypeFormData): Promise<FeeType> {
  const response = await fetchWithAuth(`${API_BASE_URL}/feetype/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.message || "Failed to create fee type.");
  return data;
}

export async function updateFeeType(id: number, payload: FeeTypeFormData): Promise<FeeType> {
  const response = await fetchWithAuth(`${API_BASE_URL}/feetype/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.message || "Failed to update fee type.");
  return data;
}

export async function deleteFeeType(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/feetype/${id}/`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete fee type.");
}
