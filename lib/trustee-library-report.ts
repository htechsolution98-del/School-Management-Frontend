import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface LibraryStockRow {
  id: number; title: string; isbn: string | null; author: string; category: string; publisher: string | null;
  rack: string | null; shelf: string | null; catalogue_copies: number; catalogue_available: number;
  registered_copies: number; untracked_copies: number; available: number; issued: number; overdue: number;
  lost: number; damaged: number; under_repair: number; reserved: number; disposed: number; damaged_condition: number;
  stock_value: string; catalogue_value: string; count_mismatch: boolean; times_issued_in_period: number;
}
export interface LibraryCopyRow {
  id: number; book_id: number; title: string; accession_no: string; barcode: string | null; status: string;
  condition: string; is_active: boolean; purchase_date: string | null; value: string; rack: string | null; shelf: string | null;
}
export interface LibraryLoanRow {
  id: number; book_id: number; title: string; accession_no: string | null; borrower_type: "student" | "staff";
  borrower_id: number; borrower_name: string; identifier: string | null; class_or_role: string | null;
  division_or_department: string | null; issued_date: string; due_date: string; returned_date: string | null;
  status: string; overdue: boolean; days_overdue: number; past_grace: boolean; estimated_late_fine: string;
  renewals: number; late_fees: string; damage_fees: string; lost_fees: string; total_fine: string;
  condition_on_return: string | null; remarks: string | null;
}
export interface LibraryBorrowerRow {
  id: string; borrower_type: "student" | "staff"; borrower_id: number; borrower_name: string; identifier: string | null;
  class_or_role: string | null; division_or_department: string | null; total_loans: number; active: number;
  overdue: number; returned: number; lost: number; damaged: number; assessed_fines: string;
}
export interface LibraryDailyRow { date: string; student_issues: number; staff_issues: number; total_issues: number }
export interface TrusteeLibraryReport {
  school: string; current_as_of: string; from_date: string | null; to_date: string; grace_period_days: number; valuation_note: string;
  current: Record<"total_titles" | "total_copies" | "catalogue_available" | "registered_copies" | "issued" | "overdue" | "past_grace" | "student_issued" | "staff_issued" | "lost_copies" | "damaged_copies" | "under_repair" | "count_mismatches" | "waiting_reservations" | "ready_reservations", number> & { stock_value: string; catalogue_value: string };
  period: { total_loans: number; students: number; staff: number; lost_loans: number; damaged_loans: number; assessed_fines: string; estimated_late_fines: string };
  stocks: LibraryStockRow[]; copies: LibraryCopyRow[]; borrowers: LibraryBorrowerRow[]; daily: LibraryDailyRow[];
  loans: { count: number; page: number; page_size: number; results: LibraryLoanRow[] };
  options: { books: { id: number; title: string }[]; categories: string[] };
}
export async function getTrusteeLibraryReport(params: Record<string, string>, signal?: AbortSignal): Promise<TrusteeLibraryReport> {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ""));
  const response = await fetchWithAuth(`${API_BASE_URL.replace(/\/$/, "")}/trustee/library-report/?${query}`, { cache: "no-store", signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail || data?.non_field_errors?.[0] || (data && Object.values(data).flat().find(value => typeof value === "string"));
    throw new Error(typeof message === "string" ? message : "Unable to load library report.");
  }
  return data;
}
