import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface StockReportRow {
  id: string; item_id: number; item_name: string; item_code: string; category: string;
  unit: string; size: string; color: string; is_active: boolean; minimum_stock: number;
  opening_balance: number; received: number; issued: number; returned: number;
  other_in: number; other_out: number; closing_balance: number; current_balance: number;
  current_stock_value: string; closing_stock_value: string;
  stock_status: "healthy" | "low" | "out" | "negative";
}
export interface StockMovement {
  id: number; date: string; type: string; item_name: string; item_code: string; size: string; color: string;
  unit: string; quantity: number; balance_after: number; unit_cost: string; recorded_value: string;
  reference: string; invoice: string | null; supplier: string | null; recipient: string | null;
  charging_type: string | null; charged_amount: string | null; condition: string | null;
  academic_year: string | null; recorded_by: string | null; remarks: string | null;
}
export interface DailyStockRow {
  date: string; opening_balance: number; received: number; issued: number; returned: number;
  other_in: number; other_out: number; net_change: number; closing_balance: number;
}
export interface InventoryStockReport {
  school: string; from_date: string | null; to_date: string; current_as_of: string; valuation_method: string;
  summary: Record<"opening_balance" | "received" | "issued" | "returned" | "other_in" | "other_out" | "closing_balance" | "current_balance" | "total_items" | "total_variants" | "low_stock_count" | "out_of_stock_count" | "negative_stock_count", number> & { current_stock_value: string; closing_stock_value: string };
  stocks: StockReportRow[]; alerts: StockReportRow[]; daily: DailyStockRow[];
  transactions: { count: number; page: number; page_size: number; results: StockMovement[] };
  options: { items: { id: number; name: string; code: string }[]; categories: { id: number; name: string }[]; transaction_types: { value: string; label: string }[] };
}
export async function getTrusteeInventoryReport(params: Record<string, string>, signal?: AbortSignal): Promise<InventoryStockReport> {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ""));
  const response = await fetchWithAuth(`${API_BASE_URL.replace(/\/$/, "")}/trustee/inventory-report/?${query}`, { cache: "no-store", signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail || data?.non_field_errors?.[0] || (data && Object.values(data).flat().find(value => typeof value === "string"));
    throw new Error(typeof message === "string" ? message : "Unable to load inventory stock report.");
  }
  return data;
}
