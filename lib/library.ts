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
  student: number;
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
  is_late: boolean;
  condition_on_return?: string;
  remarks?: string;
  status: "ISSUED" | "RETURNED" | "LOST" | "DAMAGED";
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
  student: number;
  due_date?: string;
}

export interface LibraryStudent {
  id: number;
  name: string;
  surname?: string;
  gr_no?: string;
  roll_no?: string;
  school_class_name?: string;
  division?: string;
}

// ---------------- BOOK CATALOG ---------------- //

export async function getBooks(): Promise<Book[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_MANAGE}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch library books catalog.");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getPublicBooks(): Promise<Book[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.STUDENT_BOOKS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch library books.");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
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
      errorMsg = err?.detail || err?.message || (Array.isArray(err) ? err[0] : Object.values(err)[0]) || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

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
      errorMsg = err?.detail || err?.message || (Array.isArray(err) ? err[0] : Object.values(err)[0]) || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

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
}

// ---------------- CIRCULATION OPERATIONS ---------------- //

export async function getIssuedBooks(): Promise<BookIssued[]> {
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
}

export async function getStudentMyBooks(): Promise<BookIssued[]> {
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
}

export async function issueBook(payload: IssueBookPayload): Promise<BookIssued> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOKS_ISSUED}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = "Failed to issue book.";
    try {
      const err = await response.json();
      errorMsg = err?.detail || err?.message || (Array.isArray(err) ? err[0] : Object.values(err)[0]) || errorMsg;
    } catch {}
    throw new Error(String(errorMsg));
  }

  return response.json();
}

export async function returnBook(issuedId: number): Promise<BookIssued> {
  return returnBookWithCondition(issuedId, { condition: "GOOD" });
}

export async function returnBookWithCondition(
  issuedId: number,
  payload: { condition: string; remarks?: string; damage_fee?: number; lost_fee?: number }
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

  return response.json();
}

// ---------------- BOOK COPIES & BARCODES ---------------- //

export async function getBookCopies(bookId?: number): Promise<BookCopy[]> {
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

  return response.json();
}

// ---------------- BOOK RESERVATIONS ---------------- //

export async function getReservations(): Promise<BookReservation[]> {
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
}

// ---------------- MASTERS (CATEGORIES, AUTHORS, PUBLISHERS, RACKS, SHELVES) ---------------- //

export async function getCategories(): Promise<BookCategory[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_CATEGORIES}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
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
  return response.json();
}

export async function getAuthors(): Promise<Author[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_AUTHORS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
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
  return response.json();
}

export async function getPublishers(): Promise<Publisher[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOOK_PUBLISHERS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
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
  return response.json();
}

export async function getRacks(): Promise<Rack[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_RACKS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
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
  return response.json();
}

export async function getShelves(rackId?: number): Promise<Shelf[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SHELVES}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = await response.json();
  const list = Array.isArray(data) ? data : data.results ?? [];
  return rackId ? list.filter((s: Shelf) => s.rack === rackId) : list;
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
  return response.json();
}

// ---------------- LIBRARY SETTINGS & RULES ---------------- //

export async function getLibrarySettings(): Promise<LibrarySetting | null> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.LIBRARY_SETTINGS}my-setting/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
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

export async function getLibraryStudents(): Promise<LibraryStudent[]> {
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
}
