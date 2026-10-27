import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { ApiResponse } from "@/types/fees";

export type LedgerTransactionType =
  | "FEE_RECEIPT"
  | "EXPENSE"
  | "BANK_DEPOSIT"
  | "MISC_INCOME";

export interface LedgerTransactionItem {
  id: string;
  raw_id: number;
  date: string; // YYYY-MM-DD
  time: string; // 02:45 PM
  timestamp: string | null;
  transaction_type: LedgerTransactionType;
  type_label: string;
  reference_no: string;
  particulars: string;
  student_name?: string;
  class_name?: string;
  category: string;
  source: string;
  inflow: number;
  outflow: number;
  running_balance: number;
  payment_mode: string;
  recorded_by_name: string;
  notes: string;
}

export interface LedgerSummary {
  opening_balance: number;
  total_inflow: number;
  total_outflow: number;
  net_change: number;
  closing_balance: number;
  total_transactions: number;
  fee_receipts_count: number;
  expenses_count: number;
  bank_deposits_count: number;
  misc_income_count: number;
}

export interface AccountLedgerData {
  start_date: string;
  end_date: string;
  school_name: string;
  summary: LedgerSummary;
  transactions: LedgerTransactionItem[];
}

export interface FetchAccountLedgerParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  order?: "asc" | "desc";
}

export async function fetchAccountLedger(
  params?: FetchAccountLedgerParams
): Promise<ApiResponse<AccountLedgerData>> {
  try {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.set("start_date", params.startDate);
    if (params?.endDate) sp.set("end_date", params.endDate);
    if (params?.type && params.type !== "all") sp.set("type", params.type);
    if (params?.order) sp.set("order", params.order);

    const qs = sp.toString() ? `?${sp.toString()}` : "";
    const response = await fetchWithAuth(`${API_BASE_URL}/finance/account-ledger/${qs}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch account ledger (HTTP ${response.status})`);
    }
    const data = await response.json();
    return { data, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || "Failed to fetch account ledger",
      success: false,
    };
  }
}
