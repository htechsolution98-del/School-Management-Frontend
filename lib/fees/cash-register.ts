import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { ApiResponse } from "@/types/fees";

export interface DenominationItem {
  denomination: number;
  label: string;
  type: "note" | "coin";
  count: number;
  total_value: number;
}

export interface CashRegisterSummary {
  opening_balance?: number;
  gross_cash_collected: number;
  total_change_returned: number;
  net_fee_cash_collected: number;
  total_misc_income: number;
  total_expenses: number;
  total_bank_deposits: number;
  net_cash_in_drawer: number;
  total_transactions: number;
  total_outflows_count: number;
  total_adjustments_count?: number;
}

export interface CashRegisterTransaction {
  id: number;
  receipt_number: string;
  payment_date: string | null;
  student_id: number | null;
  student_name: string;
  student_admission_number: string;
  class_name: string;
  feetype_name: string;
  net_amount: number;
  total_received: number;
  return_change: number;
  collected_by_name: string;
  breakdown_text: string;
  note: string;
  payment_details: any;
}

export interface CashOutflowItem {
  id: number;
  type: "EXPENSE" | "BANK_DEPOSIT" | "MISC_INCOME";
  type_label: string;
  amount: number;
  category: string;
  bank_name: string;
  reference_number: string;
  date: string;
  notes: string;
  recorded_by_name: string;
  created_at: string | null;
}

export interface DailyCashAuditData {
  date: string;
  school_name: string;
  summary: CashRegisterSummary;
  denominations: {
    notes: DenominationItem[];
    coins: DenominationItem[];
    notes_total_value: number;
    coins_total_value: number;
    total_denomination_value: number;
  };
  transactions: CashRegisterTransaction[];
  outflows: CashOutflowItem[];
}

export async function fetchDailyCashAudit(dateStr?: string): Promise<ApiResponse<DailyCashAuditData>> {
  try {
    const qs = dateStr ? `?date=${encodeURIComponent(dateStr)}` : "";
    const response = await fetchWithAuth(`${API_BASE_URL}/fees/daily-cash-audit/${qs}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch cash audit report (HTTP ${response.status})`);
    }
    const data = await response.json();
    return { data, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || "Failed to fetch daily cash audit report",
      success: false,
    };
  }
}

export interface RecordExpensePayload {
  amount: number;
  category: string;
  notes?: string;
  date?: string;
}

export async function recordDailyExpense(payload: RecordExpensePayload): Promise<ApiResponse<any>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/finance/add-expense/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Failed to record expense");
    }
    return { data, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || "Failed to record expense",
      success: false,
    };
  }
}

export interface RecordBankDepositPayload {
  amount: number;
  bank_name: string;
  reference_number?: string;
  notes?: string;
  date?: string;
}

export async function recordBankDeposit(payload: RecordBankDepositPayload): Promise<ApiResponse<any>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/finance/bank-deposit/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Failed to record bank deposit");
    }
    return { data, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || "Failed to record bank deposit",
      success: false,
    };
  }
}

export interface RecordMiscIncomePayload {
  amount: number;
  category: string;
  notes?: string;
  date?: string;
}

export async function recordMiscIncome(payload: RecordMiscIncomePayload): Promise<ApiResponse<any>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/finance/add-income/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Failed to record misc income");
    }
    return { data, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || "Failed to record misc income",
      success: false,
    };
  }
}
