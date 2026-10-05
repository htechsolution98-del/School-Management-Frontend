import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";

// ==========================================
// INTERFACES
// ==========================================

export interface InventoryCategory {
  id: number;
  school?: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  item_count?: number;
  subcategories?: InventorySubCategory[];
  created_at?: string;
}

export interface InventorySubCategory {
  id: number;
  school?: number;
  category: number;
  category_name?: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface InventoryUnit {
  id: number;
  school?: number;
  name: string;
  symbol: string;
  is_active: boolean;
}

export interface InventoryItemVariant {
  id: number;
  item: number;
  item_name?: string;
  item_code?: string;
  variant_code: string;
  size?: string;
  color?: string;
  gender: "BOYS" | "GIRLS" | "UNISEX" | string;
  applicable_class?: number;
  class_name?: string;
  barcode?: string;
  purchase_price: number | string;
  issue_price: number | string;
  minimum_stock: number;
  total_stock?: number;
  is_active: boolean;
}

export interface InventoryItem {
  id: number;
  school?: number;
  item_code: string;
  item_name: string;
  category?: number;
  category_name?: string;
  sub_category?: number;
  sub_category_name?: string;
  item_type:
    | "CONSUMABLE"
    | "STUDENT_ITEM"
    | "ASSET"
    | "LIBRARY"
    | "LABORATORY"
    | "SPORTS"
    | "MAINTENANCE"
    | "CLEANING"
    | "STATIONERY"
    | "OTHER"
    | string;
  description?: string;
  brand?: string;
  model_number?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  track_individual: boolean;
  track_size: boolean;
  track_color: boolean;
  minimum_stock: number;
  reorder_level: number;
  maximum_stock: number;
  purchase_price: number | string;
  selling_price: number | string;
  issue_price: number | string;
  gst_percentage: number | string;
  total_stock?: number;
  variants?: InventoryItemVariant[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryWarehouse {
  id: number;
  school?: number;
  warehouse_code: string;
  warehouse_name: string;
  location?: string;
  incharge_user?: number;
  incharge_username?: string;
  is_active: boolean;
  created_at?: string;
}

export interface InventorySupplier {
  id: number;
  school?: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  is_active: boolean;
  created_at?: string;
}

export interface InventoryStockBalance {
  id: number;
  school?: number;
  item: number;
  item_name?: string;
  item_code?: string;
  item_type?: string;
  category_name?: string;
  unit?: string;
  minimum_stock?: number;
  purchase_price?: number | string;
  variant?: number;
  variant_code?: string;
  variant_size?: string;
  variant_color?: string;
  warehouse: number;
  warehouse_name?: string;
  opening_quantity: number;
  quantity_in: number;
  quantity_out: number;
  damaged_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  is_low_stock?: boolean;
  stock_value?: number;
  updated_at?: string;
}

export interface InventoryTransaction {
  id: number;
  school?: number;
  transaction_number: string;
  transaction_type: string;
  item: number;
  item_name?: string;
  item_code?: string;
  variant?: number;
  variant_code?: string;
  variant_size?: string;
  variant_color?: string;
  warehouse: number;
  warehouse_name?: string;
  to_warehouse?: number;
  to_warehouse_name?: string;
  quantity: number;
  unit_cost: number | string;
  direction: "IN" | "OUT";
  balance_after: number;
  reference_type?: string;
  reference_id?: number;
  transaction_date: string;
  remarks?: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
}

export interface InventoryOpeningStock {
  id: number;
  item: number;
  item_name?: string;
  variant?: number;
  variant_code?: string;
  warehouse: number;
  warehouse_name?: string;
  quantity: number;
  unit_cost: number | string;
  total_cost: number | string;
  opening_date: string;
  remarks?: string;
  created_at?: string;
}

export interface InventoryPurchaseItem {
  id?: number;
  item: number;
  item_name?: string;
  item_code?: string;
  variant?: number;
  variant_size?: string;
  quantity: number;
  received_quantity?: number;
  unit_price: number | string;
  total_price?: number | string;
  batch_number?: string;
  expiry_date?: string;
}

export interface InventoryPurchase {
  id: number;
  purchase_number: string;
  supplier?: number;
  supplier_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  purchase_date: string;
  warehouse: number;
  warehouse_name?: string;
  subtotal: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  payment_status: "PENDING" | "PARTIAL" | "PAID" | string;
  status: "ORDERED" | "RECEIVED" | "CANCELLED" | string;
  items?: InventoryPurchaseItem[];
  remarks?: string;
  created_at?: string;
}

export interface PurchaseRequestItem {
  id?: number;
  item: number;
  item_name?: string;
  variant?: number;
  variant_size?: string;
  requested_quantity: number;
  approved_quantity?: number;
  estimated_cost?: number | string;
  remarks?: string;
}

export interface PurchaseRequest {
  id: number;
  request_number: string;
  requested_by?: number;
  requested_by_name?: string;
  department?: string;
  request_date: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED" | string;
  items?: PurchaseRequestItem[];
  remarks?: string;
  created_at?: string;
}

export interface StudentInventoryIssueItem {
  id?: number;
  item: number;
  item_name?: string;
  item_code?: string;
  variant?: number;
  variant_size?: string;
  variant_color?: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  is_returnable: boolean;
  condition_at_issue?: string;
  returned_quantity?: number;
}

export interface StudentInventoryIssue {
  id: number;
  issue_number: string;
  student: number;
  student_name?: string;
  student_roll?: string;
  student_class?: string;
  academic_year?: number;
  warehouse: number;
  warehouse_name?: string;
  issue_date: string;
  issued_by?: number;
  issued_by_name?: string;
  total_amount: number | string;
  paid_amount: number | string;
  payment_status: "PAID" | "PENDING" | "FREE" | string;
  items?: StudentInventoryIssueItem[];
  remarks?: string;
  created_at?: string;
}

export interface StudentIDCard {
  id: number;
  student: number;
  student_name?: string;
  student_roll?: string;
  student_class?: string;
  card_number: string;
  card_serial_number?: string;
  issue_date: string;
  expiry_date?: string;
  issue_status: "ACTIVE" | "LOST" | "DAMAGED" | "REPLACED" | string;
  previous_card?: number;
  previous_card_number?: string;
  remarks?: string;
  created_at?: string;
}

export interface InventoryBundleItem {
  id?: number;
  item: number;
  item_name?: string;
  item_code?: string;
  variant?: number;
  variant_size?: string;
  quantity: number;
}

export interface InventoryBundle {
  id: number;
  bundle_code: string;
  bundle_name: string;
  description?: string;
  applicable_class?: number;
  class_name?: string;
  applicable_gender: "BOYS" | "GIRLS" | "UNISEX" | string;
  total_price: number | string;
  items?: InventoryBundleItem[];
  is_active: boolean;
  created_at?: string;
}

export interface InventoryReturnItem {
  id?: number;
  item: number;
  item_name?: string;
  variant?: number;
  variant_size?: string;
  quantity: number;
  condition: string;
  is_restocked: boolean;
  remarks?: string;
}

export interface InventoryReturn {
  id: number;
  return_number: string;
  student?: number;
  student_name?: string;
  staff?: number;
  staff_name?: string;
  return_type: "STUDENT" | "STAFF" | "SUPPLIER" | string;
  warehouse: number;
  warehouse_name?: string;
  return_date: string;
  condition: string;
  is_restocked: boolean;
  items?: InventoryReturnItem[];
  remarks?: string;
  created_at?: string;
}

export interface InventoryStockAdjustmentItem {
  id?: number;
  item: number;
  item_name?: string;
  variant?: number;
  variant_size?: string;
  system_quantity: number;
  physical_quantity: number;
  difference_quantity: number;
  remarks?: string;
}

export interface InventoryStockAdjustment {
  id: number;
  adjustment_number: string;
  warehouse: number;
  warehouse_name?: string;
  adjustment_date: string;
  reason: string;
  items?: InventoryStockAdjustmentItem[];
  remarks?: string;
  created_by_name?: string;
  created_at?: string;
}

export interface InventoryDashboardSummary {
  overview: {
    total_items: number;
    total_stock_units: number;
    total_valuation: number;
    low_stock_count: number;
    out_of_stock_count: number;
    damaged_units: number;
    today_issues_count: number;
    uniforms_distributed: number;
    active_id_cards: number;
    replaced_id_cards: number;
    pending_purchase_requests: number;
    pending_purchase_orders: number;
  };
  category_breakdown: { name: string; count: number }[];
  recent_transactions: InventoryTransaction[];
}

// Legacy interfaces
export interface Asset {
  id: number;
  name: string;
  category: string;
  serial_number?: string;
  location?: string;
  quantity: number;
  unit_price: number | string;
  status: string;
}

export interface AssetMaintenance {
  id: number;
  asset: number;
  asset_name?: string;
  issue_description: string;
  repair_cost: number | string;
  maintenance_date: string;
  status: string;
  vendor?: string;
}

export interface StockItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit?: string;
  unit_price?: number | string;
}

export interface StockRequest {
  id: number;
  teacher_name?: string;
  stock_item_name?: string;
  quantity: number;
  status: string;
}

export interface Budget {
  id: number;
  name: string;
  allocated_amount: number | string;
  financial_year: number;
  spent_amount?: number | string;
  amount_left?: number | string;
}

export interface BudgetExpense {
  id: number;
  budget: number;
  expense_type: string;
  amount: number;
  description: string;
}

export interface PostTracking {
  id: number;
  post_type: "INWARD" | "OUTWARD";
  post_name: string;
  for_post: string;
  to_post: string;
  tracking_number?: string;
  remarks?: string;
  post_date: string;
}

// ==========================================
// API HELPER FUNCTIONS
// ==========================================

// Dashboard Summary
export async function getInventoryDashboardSummary(): Promise<InventoryDashboardSummary> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_DASHBOARD_SUMMARY}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard summary.");
  return res.json();
}

// Categories & Units
export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_CATEGORIES}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createInventoryCategory(payload: Partial<InventoryCategory>): Promise<InventoryCategory> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_CATEGORIES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create category.");
  return res.json();
}

export async function getInventoryUnits(): Promise<InventoryUnit[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_UNITS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

// Warehouses
export async function getInventoryWarehouses(): Promise<InventoryWarehouse[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_WAREHOUSES}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createInventoryWarehouse(payload: Partial<InventoryWarehouse>): Promise<InventoryWarehouse> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_WAREHOUSES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create warehouse.");
  return res.json();
}

// Items & Variants
export async function getInventoryItems(params?: { category?: number; item_type?: string; search?: string }): Promise<InventoryItem[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", String(params.category));
  if (params?.item_type) query.append("item_type", params.item_type);
  if (params?.search) query.append("search", params.search);

  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ITEMS}?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createInventoryItem(payload: Partial<InventoryItem>): Promise<InventoryItem> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ITEMS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || JSON.stringify(err) || "Failed to create item.");
  }
  return res.json();
}

export async function updateInventoryItem(id: number, payload: Partial<InventoryItem>): Promise<InventoryItem> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ITEMS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update item.");
  return res.json();
}

export async function addInventoryVariant(itemId: number, payload: Partial<InventoryItemVariant>): Promise<InventoryItemVariant> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ITEMS}${itemId}/add-variant/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add variant.");
  return res.json();
}

// Stock Balances & Transactions
export async function getInventoryStockBalances(params?: { warehouse?: number; low_stock?: boolean; search?: string }): Promise<InventoryStockBalance[]> {
  const query = new URLSearchParams();
  if (params?.warehouse) query.append("warehouse", String(params.warehouse));
  if (params?.low_stock) query.append("low_stock", "true");
  if (params?.search) query.append("search", params.search);

  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_BALANCES}?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function getInventoryTransactions(params?: { item?: number; warehouse?: number; search?: string }): Promise<InventoryTransaction[]> {
  const query = new URLSearchParams();
  if (params?.item) query.append("item", String(params.item));
  if (params?.warehouse) query.append("warehouse", String(params.warehouse));
  if (params?.search) query.append("search", params.search);

  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_TRANSACTIONS}?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createOpeningStock(payload: {
  item: number;
  variant?: number | null;
  warehouse: number;
  quantity: number;
  unit_cost: number | string;
  remarks?: string;
}): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_OPENING_STOCK}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || "Failed to record opening stock.");
  }
  return res.json();
}

export async function transferStock(payload: {
  from_warehouse: number;
  to_warehouse: number;
  item: number;
  variant?: number | null;
  quantity: number;
  remarks?: string;
}): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_TRANSFER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to transfer stock.");
  }
  return res.json();
}

// Student Issue & Uniform Kits
export async function getStudentInventoryIssues(params?: { student?: number; search?: string }): Promise<StudentInventoryIssue[]> {
  const query = new URLSearchParams();
  if (params?.student) query.append("student", String(params.student));
  if (params?.search) query.append("search", params.search);

  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_STUDENT_ISSUES}?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function issueItemsToStudent(payload: {
  student: number;
  warehouse: number;
  bundle_id?: number | null;
  items?: { item_id: number; variant_id?: number | null; quantity: number; unit_price?: number; is_returnable?: boolean }[];
  paid_amount?: number;
  payment_status?: string;
  remarks?: string;
}): Promise<StudentInventoryIssue> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_STUDENT_ISSUES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || "Failed to issue items to student.");
  }
  return res.json();
}

export async function getInventoryBundles(): Promise<InventoryBundle[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_BUNDLES}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createInventoryBundle(payload: Partial<InventoryBundle> & { items: any[] }): Promise<InventoryBundle> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_BUNDLES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create kit bundle.");
  return res.json();
}

// Student ID Cards
export async function getStudentIDCards(params?: { status?: string; search?: string }): Promise<StudentIDCard[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);

  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ID_CARDS}?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function issueStudentIDCard(payload: {
  student: number;
  card_number?: string;
  card_serial_number?: string;
  expiry_date?: string;
  deduct_stock_item?: number;
  warehouse?: number;
  remarks?: string;
}): Promise<StudentIDCard> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ID_CARDS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to issue ID card.");
  }
  return res.json();
}

export async function replaceStudentIDCard(cardId: number, payload: {
  new_card_number?: string;
  card_serial_number?: string;
  reason: "LOST" | "DAMAGED" | string;
  deduct_stock_item?: number;
  warehouse?: number;
}): Promise<StudentIDCard> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ID_CARDS}${cardId}/replace/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to process card replacement.");
  }
  return res.json();
}

// Suppliers & Purchases
export async function getInventorySuppliers(): Promise<InventorySupplier[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_SUPPLIERS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createInventorySupplier(payload: Partial<InventorySupplier>): Promise<InventorySupplier> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_SUPPLIERS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create supplier.");
  return res.json();
}

export async function getInventoryPurchases(): Promise<InventoryPurchase[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_PURCHASES}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createInventoryPurchase(payload: {
  supplier?: number;
  warehouse: number;
  invoice_number?: string;
  invoice_date?: string;
  purchase_date?: string;
  tax_amount?: number;
  discount_amount?: number;
  payment_status?: string;
  remarks?: string;
  items: { item_id: number; variant_id?: number | null; quantity: number; unit_price: number; batch_number?: string }[];
}): Promise<InventoryPurchase> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_PURCHASES}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to record purchase.");
  }
  return res.json();
}

// Purchase Requests
export async function getPurchaseRequests(): Promise<PurchaseRequest[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_PURCHASE_REQUESTS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createPurchaseRequest(payload: {
  department?: string;
  priority: string;
  remarks?: string;
  items: { item_id: number; variant_id?: number | null; requested_quantity: number; estimated_cost?: number; remarks?: string }[];
}): Promise<PurchaseRequest> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_PURCHASE_REQUESTS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit purchase request.");
  return res.json();
}

export async function reviewPurchaseRequest(id: number, status: "APPROVED" | "REJECTED", remarks?: string): Promise<PurchaseRequest> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_PURCHASE_REQUESTS}${id}/review/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, remarks }),
  });
  if (!res.ok) throw new Error("Failed to review request.");
  return res.json();
}

// Adjustments & Returns
export async function getInventoryStockAdjustments(): Promise<InventoryStockAdjustment[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ADJUSTMENTS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createStockAdjustment(payload: {
  warehouse: number;
  reason: string;
  remarks?: string;
  items: { item_id: number; variant_id?: number | null; system_quantity: number; physical_quantity: number; remarks?: string }[];
}): Promise<InventoryStockAdjustment> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_ADJUSTMENTS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to record adjustment.");
  }
  return res.json();
}

export async function getInventoryReturns(): Promise<InventoryReturn[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_RETURNS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createInventoryReturn(payload: {
  warehouse: number;
  return_type: "STUDENT" | "STAFF" | "SUPPLIER";
  student?: number | null;
  staff?: number | null;
  condition: "GOOD" | "DAMAGED" | "SCRAP";
  remarks?: string;
  items: { item_id: number; variant_id?: number | null; quantity: number; remarks?: string }[];
}): Promise<InventoryReturn> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.INV_RETURNS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to process return.");
  }
  return res.json();
}

// Legacy API helpers for compatibility
export async function getAssets(): Promise<Asset[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ASSETS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createAsset(payload: Partial<Asset>): Promise<Asset> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ASSETS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add asset.");
  return res.json();
}

export async function updateAsset(id: number, payload: Partial<Asset>): Promise<Asset> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ASSETS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update asset.");
  return res.json();
}

export async function deleteAsset(id: number): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ASSETS}${id}/`, { method: "DELETE" });
}

export async function getMaintenances(): Promise<AssetMaintenance[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ASSET_MAINTENANCE}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createMaintenance(payload: Partial<AssetMaintenance>): Promise<AssetMaintenance> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ASSET_MAINTENANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to record maintenance.");
  return res.json();
}

export async function getPostTrackings(): Promise<PostTracking[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.POST_TRACKING}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

export async function createPostTracking(payload: Partial<PostTracking>): Promise<PostTracking> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.POST_TRACKING}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to record postal delivery.");
  return res.json();
}

export async function deletePostTracking(id: number): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.POST_TRACKING}${id}/`, { method: "DELETE" });
}

export async function getStudentsList(): Promise<any[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/studentget/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d.results ?? [];
}

