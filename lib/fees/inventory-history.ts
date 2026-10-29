import { inventoryApi, extractErrorMessage } from "@/lib/inventory-client";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface StudentInventoryIssueRecord {
  id: number;
  school?: number;
  academic_year: number;
  academic_year_name?: string;
  student: number;
  student_name?: string;
  student_roll?: string;
  student_class?: string;
  student_division?: string;
  item: number;
  item_name: string;
  item_code?: string;
  size?: number | null;
  size_name?: string | null;
  color?: number | null;
  color_name?: string | null;
  quantity: number;
  unit_purchase_cost?: string | number;
  unit_selling_price?: string | number;
  charging_type: "FREE" | "INCLUDED_IN_FEE" | "SEPARATE_CHARGE" | string;
  charged_amount?: string | number;
  profit?: string | number;
  status?: string;
  issue_date: string; // YYYY-MM-DD
  issue_reason?: string;
  remarks?: string;
  issued_by?: number | null;
  created_at?: string;
}

export interface FetchStudentInventoryIssuesResult {
  success: boolean;
  data: StudentInventoryIssueRecord[];
  error: string | null;
}

/**
 * Fetch all inventory issuance records for a specific student.
 * Optionally filter by academic year.
 */
export async function fetchStudentInventoryIssues(
  studentId: number,
  academicYearId?: number
): Promise<FetchStudentInventoryIssuesResult> {
  if (!studentId) {
    return { success: true, data: [], error: null };
  }

  try {
    const params: Record<string, any> = { student: studentId };
    if (academicYearId) {
      params.academic_year = academicYearId;
    }

    const res = await inventoryApi.get("/issues/", { params });
    const list: StudentInventoryIssueRecord[] = Array.isArray(res.data)
      ? res.data
      : (res.data?.results || []);

    return { success: true, data: list, error: null };
  } catch (axiosErr: any) {
    // Resilient fallback to fetchWithAuth
    try {
      const sp = new URLSearchParams();
      sp.set("student", String(studentId));
      if (academicYearId) {
        sp.set("academic_year", String(academicYearId));
      }
      const response = await fetchWithAuth(`${API_BASE_URL}/inventory/issues/?${sp.toString()}`);
      if (response.ok) {
        const raw = await response.json();
        const list: StudentInventoryIssueRecord[] = Array.isArray(raw)
          ? raw
          : (raw?.results || []);
        return { success: true, data: list, error: null };
      }
    } catch {
      // Fallback failed as well, return original error
    }

    return {
      success: false,
      data: [],
      error: extractErrorMessage(axiosErr, "Failed to load student inventory issue history"),
    };
  }
}

/**
 * Format variant description (e.g. "Size: M, Color: Blue")
 */
export function formatVariantLabel(issue: {
  size_name?: string | null;
  color_name?: string | null;
}): string {
  const parts: string[] = [];
  if (issue.size_name) parts.push(issue.size_name);
  if (issue.color_name) parts.push(issue.color_name);
  return parts.join(", ");
}

/**
 * Format item name with variant attached
 */
export function formatItemWithVariant(issue: {
  item_name: string;
  size_name?: string | null;
  color_name?: string | null;
}): string {
  const variant = formatVariantLabel(issue);
  return variant ? `${issue.item_name} (${variant})` : issue.item_name;
}

/**
 * Format charging policy for display and badge styling
 */
export function formatChargingPolicy(policy?: string): {
  label: "Free" | "Included in Fee" | "Separate Charge" | string;
  shortLabel: "Free" | "Included" | "Separate" | string;
  badgeClass: string;
  dotClass: string;
} {
  const p = (policy || "").toUpperCase();
  if (p === "FREE") {
    return {
      label: "Free",
      shortLabel: "Free",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
    };
  }
  if (p === "INCLUDED_IN_FEE" || p === "INCLUDED") {
    return {
      label: "Included in Fee",
      shortLabel: "Included",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotClass: "bg-blue-500",
    };
  }
  return {
    label: "Separate Charge",
    shortLabel: "Separate",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  };
}

/**
 * Formats a list of issued items into a quick comma-separated summary string:
 * e.g., "ID Card (Free), Water Bottle (Separate)"
 */
export function formatInventoryReceivedSummary(issues: StudentInventoryIssueRecord[]): string {
  if (!issues || issues.length === 0) {
    return "";
  }

  return issues
    .map((issue) => {
      const name = formatItemWithVariant(issue);
      const policy = formatChargingPolicy(issue.charging_type);
      const qtySuffix = issue.quantity > 1 ? ` x${issue.quantity}` : "";
      return `${name}${qtySuffix} (${policy.shortLabel})`;
    })
    .join(", ");
}

export interface ProcessReturnReplacePayload {
  action_type: "RETURN" | "REPLACEMENT";
  condition: "GOOD" | "DAMAGED";
  quantity?: number;
  remarks?: string;
  replacement_size?: number | string | null;
  replacement_color?: number | string | null;
}

export interface ProcessReturnReplaceResult {
  success: boolean;
  message: string;
  error?: string;
  issue_id?: number;
  action_type?: string;
  condition?: string;
  status?: string;
  reversed_fee_id?: number | null;
  replacement_issue_id?: number | null;
}

/**
 * Executes a return or replacement action against a specific issue record.
 * Condition routing:
 * - GOOD: increases main available stock
 * - DAMAGED: does not increase main stock, logs to scrap/damaged ledger & increments damaged_stock
 * Action routing:
 * - REPLACEMENT: deducts 1 unit from stock, does not modify fee ledger
 * - RETURN: restores stock (if good), cancels/reverses fee liability if SEPARATE_CHARGE
 */
export async function processReturnReplace(
  issueId: number,
  payload: ProcessReturnReplacePayload
): Promise<ProcessReturnReplaceResult> {
  try {
    const res = await inventoryApi.post(`/issues/${issueId}/return-replace/`, payload);
    return {
      success: true,
      message: res.data?.message || "Processed successfully.",
      ...res.data,
    };
  } catch (axiosErr: any) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/inventory/issues/${issueId}/return-replace/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        return {
          success: true,
          message: data?.message || "Processed successfully.",
          ...data,
        };
      }
      const err = data?.error || data?.detail || "Failed to process return/replacement.";
      return {
        success: false,
        message: err,
        error: err,
      };
    } catch {
      // ignore fallback error
    }

    const err = extractErrorMessage(axiosErr, "Failed to process return/replacement.");
    return {
      success: false,
      message: err,
      error: err,
    };
  }
}


