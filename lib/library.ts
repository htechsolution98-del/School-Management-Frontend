import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";

export interface LibrarySetting {
  id?: number;
  school?: number;
  max_books_per_student: number;
  issue_duration_days: number;
  max_renewal_count: number;
  fine_per_day: number | string;
  grace_period_days: number;
  lost_penalty: number | string;
  damage_penalty: number | string;
  allow_renewal_with_fine?: boolean;
  allow_issue_with_fine?: boolean;
}

export interface BookCategory {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface Author {
  id: number;
  name: string;
  code?: string;
  biography?: string;
  is_active?: boolean;
}

export interface Publisher {
  id: number;
  name: string;
  code?: string;
  contact_person?: string;
  contact_no?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
}

export interface Rack {
  id: number;
  rack_code: string;
  rack_name: string;
  description?: string;
  is_active?: boolean;
}

export interface Shelf {
  id: number;
  rack: number;
  rack_code?: string;
  rack_name?: string;
  shelf_code: string;
  shelf_name: string;
  description?: string;
  is_active?: boolean;
}

export interface BookCopy {
  id: number;
  book: number;
  book_title?: string;
  accession_no: string;
  barcode?: string;
  rack?: number | null;
  shelf?: number | null;
  rack_code?: string;
  shelf_code?: string;
  status: "AVAILABLE" | "ISSUED" | "RESERVED" | "LOST" | "DAMAGED" | "UNDER_REPAIR" | "DISPOSED";
  condition: "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";
  purchase_price: number | string;
  purchase_date?: string;
  is_active?: boolean;
}

export interface Book {
  id: number;
  school?: number;
  title: string;
  subtitle?: string;
  isbn?: string;
  author: string;
  category: string;
  category_ref?: number | null;
  author_ref?: number | null;
  publisher_ref?: number | null;
  rack?: number | null;
  shelf?: number | null;
  category_name?: string;
  author_name?: string;
  publisher_name?: string;
  rack_code?: string;
  shelf_code?: string;
  edition?: string;
  publication_year?: number;
  language?: string;
  pages?: number;
  price?: number | string;
  description?: string;
  total_copies: number;
  available_copies: number;
  status: boolean; // true = Available, false = Not Available
  created_at?: string;
  updated_at?: string;
}

export interface BookIssued {
  id: number;
  school?: number;
  book: number;
  book_copy?: number | null;
  accession_no?: string;
  barcode?: string;
  student: number | null;
  staff?: number | null;
  staff_name?: string | null;
  staff_role?: string | null;
  borrower_type?: "student" | "staff";
  book_title?: string;
  book_author?: string;
  book_category?: string;
  rack_code?: string;
  shelf_code?: string;
  student_name?: string;
  student_gr_no?: string;
  student_roll_no?: string;
  student_class?: string;
  student_division?: string;
  book_issued_date: string;
  due_date: string;
  actual_return_date?: string | null;
  renewal_count: number;
  late_fees: number | string;
  damage_fees?: number | string;
  lost_fees?: number | string;
  total_fine?: number | string;
  is_fine_paid?: boolean;
  fine_paid_amount?: number | string;
  fine_remaining?: number | string;
  payment_method?: string | null;
  payment_date?: string | null;
  payment_receipt_no?: string | null;
  is_late: boolean;
  condition_on_return?: string;
  remarks?: string;
  status: "ISSUED" | "RETURNED" | "LOST" | "DAMAGED";
  school_id?: number;
  school_code?: string;
  school_name?: string;
  school_logo?: string | null;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  school_info?: {
    id: number;
    name: string;
    code?: string;
    logo?: string | null;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    index_no?: string;
  };
}

export interface BookReservation {
  id: number;
  book: number;
  book_title?: string;
  student: number;
  student_name?: string;
  student_gr_no?: string;
  reservation_date: string;
  queue_number: number;
  available_date?: string | null;
  expiry_date?: string | null;
  status: "WAITING" | "AVAILABLE" | "ISSUED" | "EXPIRED" | "CANCELLED";
  notified?: boolean;
  remarks?: string;
}

export interface LateBookFee {
  id?: number;
  school?: number;
  fees: number;
  grace_period_days: number;
}

export interface CreateBookPayload {
  title: string;
  subtitle?: string;
  isbn?: string;
  author: string;
  category: string;
  category_ref?: number | null;
  author_ref?: number | null;
  publisher_ref?: number | null;
  rack?: number | null;
  shelf?: number | null;
  edition?: string;
  publication_year?: number;
  language?: string;
  pages?: number;
  price?: number;
  description?: string;
  total_copies: number;
}

export interface IssueBookPayload {
  book: number;
  book_copy?: number;
  book_copy_id?: number;
  student?: number;
  staff?: number;
  due_date?: string;
}

export interface BulkIssueBookPayload {
  book: number;
  students?: number[];
  staff?: number[];
  due_date?: string;
}

export interface BulkIssueResponse {
  message: string;
  issued_count: number;
  remaining_copies: number;
  results: BookIssued[];
}

export interface LibraryStudent {
  id: number;
  name: string;
  surname?: string;
  gr_no?: string;
  roll_no?: string;
  class_name?: string;
  school_class_name?: string;
  school_class?: number | string;
  division?: string;
}

export interface LibraryStaff { id: number; name: string; category: string }

// ─── High-Performance Client Library Memory Cache ──────────────────────────────
interface LibraryCacheRecord<T> {
  data: T;
  timestamp: number;
}

const clientLibraryCache = new Map<string, LibraryCacheRecord<any>>();
const LIBRARY_CLIENT_CACHE_TTL = 60 * 1000; // 60 seconds

function getPersistentCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`sms_lib_${key}`) || sessionStorage.getItem(`sms_lib_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
      if (Array.isArray(parsed.data) && parsed.data.length === 0) {
        return null;
      }
      return parsed.data;
    }
  } catch {}
  return null;
}

function setPersistentCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ data, timestamp: Date.now() });
    localStorage.setItem(`sms_lib_${key}`, payload);
    sessionStorage.setItem(`sms_lib_${key}`, payload);
  } catch {}
}

export function getStoredLibraryList<T>(key: string): T[] {
  const cached = getPersistentCache<T[]>(key);
  return Array.isArray(cached) ? cached : [];
}

export function invalidateLibraryClientCache(prefix?: string) {
  clientLibraryCache.clear();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(DASHBOARD_SUMMARY_STORAGE_KEY);
      const cleanKeys = (storage: Storage) => {
        for (let i = storage.length - 1; i >= 0; i--) {
          const k = storage.key(i);
          if (k && k.startsWith("sms_lib_")) {
            storage.removeItem(k);
          }
        }
      };
      cleanKeys(localStorage);
      cleanKeys(sessionStorage);
    } catch {}
  }
}

export interface LibraryDashboardSummary {
  titles: number;
  total_physical_copies: number;
  available_copies: number;
  active_loans_count: number;
  overdue_count: number;
  overdue_loans_sample?: {
    id: number;
    book_title: string;
    student_name?: string | null;
    staff_name?: string | null;
    student_gr_no?: string;
    due_date: string;
  }[];
  waiting_reservations_count: number;
  available_holds_count: number;
  available_holds_sample?: {
    id: number;
    book_title: string;
    student_name: string;
  }[];
  lost_damaged_count: number;
  total_fines_due: string;
  total_fines_settled: string;
  pending_clearance_count: number;
  recent_transactions?: {
    id: number;
    book_title: string;
    borrower_name: string;
    student_name?: string | null;
    staff_name?: string | null;
    student_gr_no?: string;
    borrower_type: string;
    status: string;
    book_issued_date: string;
    due_date: string;
    actual_return_date?: string | null;
    fine_paid_amount: string;
    total_fine: string;
    is_fine_paid?: boolean;
  }[];
  most_borrowed_sample?: {
    book_id: number;
    title: string;
    author: string;
    times_issued: number;
  }[];
  category_trends_sample?: {
    category: string;
    total_books: number;
  }[];
  inventory_audit_overview?: {
    total_copies: number;
    available: number;
    under_repair: number;
    lost: number;
    damaged: number;
    total_value: string;
  };
}

export const DASHBOARD_SUMMARY_STORAGE_KEY = "sms_librarian_dashboard_summary";

export function getStoredDashboardSummary(): LibraryDashboardSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_SUMMARY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredDashboardSummary(summary: LibraryDashboardSummary): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DASHBOARD_SUMMARY_STORAGE_KEY, JSON.stringify(summary));
  } catch {}
}

async function getOrFetchLibrary<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = LIBRARY_CLIENT_CACHE_TTL,
  forceFresh = false
): Promise<T> {
  if (!forceFresh) {
    const entry = clientLibraryCache.get(key);
    if (entry && Date.now() - entry.timestamp < ttl) {
      return entry.data;
    }
  }
  const result = await fetcher();
  clientLibraryCache.set(key, { data: result, timestamp: Date.now() });
  if (!Array.isArray(result) || result.length > 0) {
    setPersistentCache(key, result);
  }
  return result;
}

export async function getLibraryStaff(forceFresh = false): Promise<LibraryStaff[]> {
  return getOrFetchLibrary("library_staff", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}staff-borrowers/`);
    if (!response.ok) throw new Error("Unable to load staff borrowers.");
    return response.json();
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

// ---------------- BOOK CATALOG ---------------- //

export async function getBooks(params?: { author?: string; category?: string; search?: string }, forceFresh = false): Promise<Book[]> {
  const sp = new URLSearchParams();
  if (params?.author) sp.append("author", params.author);
  if (params?.category) sp.append("category", params.category);
  if (params?.search) sp.append("search", params.search);
  const qs = sp.toString();
  const cacheKey = `books_${qs}`;

  return getOrFetchLibrary(cacheKey, async () => {
    let url = `${API_BASE_URL}${API_ENDPOINTS.BOOKS_MANAGE}`;
    if (qs) url += `?${qs}`;
    const response = await fetchWithAuth(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch library books catalog.");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getPublicBooks(forceFresh = false): Promise<Book[]> {
  return getOrFetchLibrary("public_books", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.STUDENT_BOOKS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch library books.");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

function extractApiErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err.detail) return String(err.detail);
  if (err.message) return String(err.message);
  if (Array.isArray(err)) return err.map(String).join(" ");
  if (typeof err === "object") {
    const messages: string[] = [];
    for (const [key, val] of Object.entries(err)) {
      const fieldName = key === "non_field_errors" ? "" : `${key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}: `;
      if (Array.isArray(val)) {
        messages.push(`${fieldName}${val.join(" ")}`);
      } else if (typeof val === "string") {
        messages.push(`${fieldName}${val}`);
      }
    }
    if (messages.length > 0) return messages.join(" | ");
  }
  return fallback;
}

export async function createBook(payload: CreateBookPayload): Promise<Book> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_MANAGE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to add book.";
    try {
      const err = await response.json();
      errorMsg = extractApiErrorMessage(err, errorMsg);
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function updateBook(id: number, payload: Partial<CreateBookPayload>): Promise<Book> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_MANAGE}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to update book.";
    try {
      const err = await response.json();
      errorMsg = extractApiErrorMessage(err, errorMsg);
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function deleteBook(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_MANAGE}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMsg = "Failed to delete book.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
}

// ---------------- CIRCULATION OPERATIONS ---------------- //

export async function getIssuedBooks(forceFresh = false): Promise<BookIssued[]> {
  return getOrFetchLibrary("issued_books", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch issued books records.");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getStudentMyBooks(forceFresh = false): Promise<BookIssued[]> {
  return getOrFetchLibrary("student_my_books", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.STUDENT_MY_BOOKS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch your issued books.");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function issueBook(payload: IssueBookPayload): Promise<BookIssued> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to issue book.";
    let errBody: any = null;
    try {
      errBody = await response.json();
      errorMsg = errBody?.detail || errBody?.message || (Array.isArray(errBody) ? errBody[0] : Object.values(errBody)[0]) || errorMsg;
    } catch {}
    const errObj = new Error(String(errorMsg)) as any;
    errObj.fieldErrors = errBody;
    throw errObj;
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function bulkIssueBooks(payload: BulkIssueBookPayload): Promise<BulkIssueResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}bulk-issue/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to issue books in bulk.";
    let errBody: any = null;
    try {
      errBody = await response.json();
      if (errBody?.non_field_errors && Array.isArray(errBody.non_field_errors)) {
        errorMsg = errBody.non_field_errors.join(" ");
      } else {
        errorMsg = errBody?.detail || errBody?.message || (Array.isArray(errBody) ? errBody[0] : Object.values(errBody)[0]) || errorMsg;
      }
    } catch {}
    const errObj = new Error(String(errorMsg)) as any;
    errObj.fieldErrors = errBody;
    throw errObj;
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function returnBook(issuedId: number): Promise<BookIssued> {
  return returnBookWithCondition(issuedId, { condition: "GOOD" });
}

export async function returnBookWithCondition(
  issuedId: number,
  payload: {
    condition: string;
    remarks?: string;
    damage_fee?: number;
    lost_fee?: number;
    pay_now?: boolean;
    payment_method?: string;
  }
): Promise<BookIssued> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}${issuedId}/return/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to finalize book return.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export interface FinePaymentResult {
  detail: string;
  receipt_no: string;
  amount_paid: string;
  remaining_due: string;
  is_fine_paid: boolean;
  record: BookIssued;
}

export async function payBookFine(
  issuedId: number,
  payload: { amount?: number; payment_method?: string }
): Promise<FinePaymentResult> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}${issuedId}/pay-fine/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to process fine payment.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function getFineReceipt(params: { receipt_no?: string; id?: number }): Promise<FinePaymentResult> {
  const query = new URLSearchParams();
  if (params.receipt_no) query.set("receipt_no", params.receipt_no);
  if (params.id) query.set("id", String(params.id));
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}receipt/?${query.toString()}`);
  if (!response.ok) {
    let errorMsg = "Failed to load receipt details.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  return response.json();
}

export async function renewBookLoan(issuedId: number): Promise<BookIssued> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}${issuedId}/renew/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    let errorMsg = "Failed to renew book loan.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function markBookLost(issuedId: number, remarks?: string): Promise<BookIssued> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}${issuedId}/mark-lost/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remarks }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to mark book as lost.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function studentRenewLoan(issuedId: number): Promise<BookIssued> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.STUDENT_MY_BOOKS}${issuedId}/renew/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    let errorMsg = "Failed to request book renewal.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

// ---------------- BOOK COPIES & BARCODES ---------------- //

export async function getBookCopies(bookId?: number, forceFresh = false): Promise<BookCopy[]> {
  const cacheKey = bookId ? `book_copies_${bookId}` : "book_copies_all";
  return getOrFetchLibrary(cacheKey, async () => {
    const url = bookId
      ? `${API_BASE_URL}${API_ENDPOINTS.BOOK_COPIES}?book=${bookId}`
      : `${API_BASE_URL}${API_ENDPOINTS.BOOK_COPIES}`;
    const response = await fetchWithAuth(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function generateBookCopies(payload: {
  book_id: number;
  count: number;
  rack_id?: number | null;
  shelf_id?: number | null;
}): Promise<BookCopy[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_COPIES}generate-copies/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to generate book copies.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function transferBookCopy(
  copyId: number,
  payload: { rack_id?: number | null; shelf_id?: number | null }
): Promise<BookCopy> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_COPIES}${copyId}/transfer/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to transfer copy.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function changeBookCopyStatus(
  copyId: number,
  payload: { status: string; remarks?: string }
): Promise<BookCopy> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_COPIES}${copyId}/change-status/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to update copy status.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function deleteBookCopy(copyId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_COPIES}${copyId}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMsg = "Failed to dispose copy.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
}

// ---------------- BOOK RESERVATIONS ---------------- //

export async function getReservations(forceFresh = false): Promise<BookReservation[]> {
  return getOrFetchLibrary("book_reservations", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_RESERVATIONS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function createReservation(bookId: number): Promise<BookReservation> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_RESERVATIONS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book: bookId }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to reserve book.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || (Array.isArray(err) ? err[0] : Object.values(err)[0]) || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

export async function cancelReservation(reservationId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_RESERVATIONS}${reservationId}/cancel/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to cancel reservation.");
  }

  invalidateLibraryClientCache();
}

export async function checkReservationExpiries(): Promise<{ detail: string; expired_count: number }> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_RESERVATIONS}check-expiries/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    let errorMsg = "Failed to sweep reservation hold expiries.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

// ---------------- MASTERS (CATEGORIES, AUTHORS, PUBLISHERS, RACKS, SHELVES) ---------------- //

export async function getCategories(forceFresh = false): Promise<BookCategory[]> {
  return getOrFetchLibrary("book_categories", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_CATEGORIES}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function createCategory(payload: Partial<BookCategory>): Promise<BookCategory> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_CATEGORIES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to create category";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function updateCategory(id: number, payload: Partial<BookCategory>): Promise<BookCategory> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_CATEGORIES}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to update category";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function deleteCategory(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_CATEGORIES}${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorMsg = "Failed to delete category";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
}

export async function toggleCategoryActive(id: number): Promise<{ id: number; is_active: boolean; message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_CATEGORIES}${id}/toggle-active/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    let errorMsg = "Failed to toggle category status";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function getAuthors(forceFresh = false): Promise<Author[]> {
  return getOrFetchLibrary("book_authors", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_AUTHORS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function createAuthor(payload: Partial<Author>): Promise<Author> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_AUTHORS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to create author";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function updateAuthor(id: number, payload: Partial<Author>): Promise<Author> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_AUTHORS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to update author";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function deleteAuthor(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_AUTHORS}${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorMsg = "Failed to delete author";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
}

export async function toggleAuthorActive(id: number): Promise<{ id: number; is_active: boolean; message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_AUTHORS}${id}/toggle-active/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    let errorMsg = "Failed to toggle author status";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function getPublishers(forceFresh = false): Promise<Publisher[]> {
  return getOrFetchLibrary("book_publishers", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_PUBLISHERS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function createPublisher(payload: Partial<Publisher>): Promise<Publisher> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_PUBLISHERS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to create publisher";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function updatePublisher(id: number, payload: Partial<Publisher>): Promise<Publisher> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_PUBLISHERS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to update publisher";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function deletePublisher(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_PUBLISHERS}${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorMsg = "Failed to delete publisher";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
}

export async function togglePublisherActive(id: number): Promise<{ id: number; is_active: boolean; message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_PUBLISHERS}${id}/toggle-active/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    let errorMsg = "Failed to toggle publisher status";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function getRacks(forceFresh = false): Promise<Rack[]> {
  return getOrFetchLibrary("book_racks", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_RACKS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function createRack(payload: Partial<Rack>): Promise<Rack> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_RACKS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to create rack";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.rack_code?.[0] || err?.rack_name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function updateRack(id: number, payload: Partial<Rack>): Promise<Rack> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_RACKS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to update rack";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.rack_code?.[0] || err?.rack_name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function deleteRack(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_RACKS}${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorMsg = "Failed to delete rack";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
}

export async function toggleRackActive(id: number): Promise<{ id: number; is_active: boolean; message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_RACKS}${id}/toggle-active/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    let errorMsg = "Failed to toggle rack status";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function getShelves(rackId?: number, forceFresh = false): Promise<Shelf[]> {
  const cacheKey = rackId ? `book_shelves_${rackId}` : "book_shelves_all";
  return getOrFetchLibrary(cacheKey, async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SHELVES}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    const list = Array.isArray(data) ? data : data.results ?? [];
    return rackId ? list.filter((s: Shelf) => s.rack === rackId) : list;
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function createShelf(payload: Partial<Shelf>): Promise<Shelf> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SHELVES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to create shelf";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.shelf_code?.[0] || err?.shelf_name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function updateShelf(id: number, payload: Partial<Shelf>): Promise<Shelf> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SHELVES}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMsg = "Failed to update shelf";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.shelf_code?.[0] || err?.shelf_name?.[0] || err?.message || JSON.stringify(err);
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

export async function deleteShelf(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SHELVES}${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorMsg = "Failed to delete shelf";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
}

export async function toggleShelfActive(id: number): Promise<{ id: number; is_active: boolean; message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SHELVES}${id}/toggle-active/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    let errorMsg = "Failed to toggle shelf status";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }
  invalidateLibraryClientCache();
  return response.json();
}

// ---------------- LIBRARY SETTINGS & RULES ---------------- //

export async function getLibrarySettings(forceFresh = false): Promise<LibrarySetting | null> {
  return getOrFetchLibrary("library_settings", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SETTINGS}my-setting/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function updateLibrarySettings(payload: Partial<LibrarySetting>): Promise<LibrarySetting> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SETTINGS}my-setting/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to update library settings.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  invalidateLibraryClientCache();
  return response.json();
}

// Legacy fallback
export async function getLateFeePolicy(): Promise<LateBookFee | null> {
  const s = await getLibrarySettings();
  if (s) {
    return {
      fees: Number(s.fine_per_day),
      grace_period_days: s.grace_period_days,
    };
  }
  return null;
}

export async function saveLateFeePolicy(policy: { id?: number; fees: number; grace_period_days: number }): Promise<LateBookFee> {
  const updated = await updateLibrarySettings({
    fine_per_day: policy.fees,
    grace_period_days: policy.grace_period_days,
  });
  return {
    fees: Number(updated.fine_per_day),
    grace_period_days: updated.grace_period_days,
  };
}

// ---------------- STUDENTS LOOKUP ---------------- //

export async function getLibraryStudents(forceFresh = false): Promise<LibraryStudent[]> {
  return getOrFetchLibrary("library_students", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.STUDENTS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

// ---------------- LIBRARY CLEARANCE (SECTION 22) ---------------- //

export interface StudentClearanceData {
  student_id: number;
  student_name: string;
  gr_no: string;
  roll_no: string;
  class_name: string;
  status: "APPROVED" | "PENDING";
  is_cleared: boolean;
  pending_reasons: string[];
  active_issued_count: number;
  pending_fine_amount: string;
  issued_books: {
    id: number;
    title: string;
    accession_no: string;
    due_date: string;
  }[];
  unpaid_fine_records: {
    id: number;
    title: string;
    total_fine: string;
    paid_amount: string;
    due_amount: string;
    reason: string;
  }[];
}

export interface PendingClearanceStudentSummary {
  student_id: number;
  student_name: string;
  gr_no: string;
  roll_no: string;
  class_name: string;
  active_books_count: number;
  pending_fine_total: string;
  status: "PENDING";
}

export async function getStudentClearance(studentId?: number, forceFresh = false): Promise<StudentClearanceData> {
  const cacheKey = studentId ? `library_clearance_${studentId}` : "library_clearance_all";
  return getOrFetchLibrary(cacheKey, async () => {
    const url = studentId
      ? `${API_BASE_URL}${API_ENDPOINTS.LIBRARY_CLEARANCE}?student_id=${studentId}`
      : `${API_BASE_URL}${API_ENDPOINTS.LIBRARY_CLEARANCE}`;
    const response = await fetchWithAuth(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      let errorMsg = "Failed to fetch student library clearance.";
      try {
        const err = await response.json();
        errorMsg = err?.detail || err?.message || errorMsg;
      } catch {}
      throw new Error(String(errorMsg));
    }

    return response.json();
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getPendingClearanceStudents(forceFresh = false): Promise<{
  pending_clearance_students_count: number;
  results: PendingClearanceStudentSummary[];
}> {
  return getOrFetchLibrary("pending_clearance_students", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_CLEARANCE}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { pending_clearance_students_count: 0, results: [] };
    }

    return response.json();
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

// ---------------- LIBRARY REPORTS & AUDIT (SECTION 20, 21, 23) ---------------- //

export interface InventoryAuditData {
  total_titles: number;
  total_physical_copies: number;
  available_copies: number;
  issued_copies: number;
  reserved_copies: number;
  damaged_copies: number;
  lost_copies: number;
  under_repair_copies: number;
  disposed_copies: number;
  total_overdue_loans: number;
  total_pending_fines: string;
  total_collected_fines: string;
  borrowers_with_pending_fines_count: number;
}

export async function getInventoryAudit(forceFresh = false): Promise<InventoryAuditData> {
  return getOrFetchLibrary("inventory_audit", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_REPORTS}inventory-audit/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load inventory audit data.");
    }

    return response.json();
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getMostBorrowedReport(limit: number = 10, forceFresh = false): Promise<any[]> {
  return getOrFetchLibrary(`report_most_borrowed_${limit}`, async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_REPORTS}most_borrowed/?limit=${limit}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getCategoryTrendsReport(forceFresh = false): Promise<any[]> {
  return getOrFetchLibrary("report_category_trends", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_REPORTS}category_trends/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getOverdueAndLateReport(forceFresh = false): Promise<any> {
  return getOrFetchLibrary("report_overdue_and_late", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_REPORTS}overdue_and_late/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return { currently_overdue: [], historical_late_rate: 0 };
    return response.json();
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getFeeCollectionReport(forceFresh = false): Promise<any> {
  return getOrFetchLibrary("report_fee_collection", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_REPORTS}fee_collection/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return { total_fees_collected: "0", monthly_breakdown: [] };
    return response.json();
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getStudentActivityReport(limit: number = 20, forceFresh = false): Promise<any[]> {
  return getOrFetchLibrary(`report_student_activity_${limit}`, async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_REPORTS}student_activity/?limit=${limit}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
  }, LIBRARY_CLIENT_CACHE_TTL, forceFresh);
}

export async function getLibraryDashboardSummary(forceFresh = false): Promise<LibraryDashboardSummary> {
  return getOrFetchLibrary("library_dashboard_summary", async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_REPORTS}dashboard-summary/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load library dashboard summary.");
    }

    const data: LibraryDashboardSummary = await response.json();
    setStoredDashboardSummary(data);
    return data;
  }, 30 * 1000, forceFresh);
}

