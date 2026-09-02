import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";

export interface TrusteeFinancials {
  total_fee_billed: number;
  total_fee_collected: number;
  pending_collections: number;
  total_payroll_expenditure: number;
  total_assets_valuation: number;
}

export interface TrusteeRTEStats {
  total_students: number;
  rte_students: number;
  rte_percentage: number;
  statutory_target_percentage: number;
  is_compliant: boolean;
}

export interface TrusteeStaffStats {
  total_staff: number;
  active_staff: number;
  category_breakdown: Record<string, number>;
}

export interface TrusteeAssetStats {
  total_items: number;
  valuation: number;
}

export interface BoardMeeting {
  id: number;
  school?: number;
  title: string;
  agenda: string;
  meeting_date: string;
  meeting_time?: string;
  location?: string;
  attendees?: string;
  minutes?: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | string;
  created_at?: string;
}

export interface TrusteeAnalyticsResponse {
  school_name: string;
  financials: TrusteeFinancials;
  rte_stats: TrusteeRTEStats;
  staff_stats: TrusteeStaffStats;
  asset_stats: TrusteeAssetStats;
  meetings: BoardMeeting[];
}

export async function getTrusteeAnalytics(): Promise<TrusteeAnalyticsResponse | null> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.TRUSTEE_ANALYTICS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function getBoardMeetings(): Promise<BoardMeeting[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOARD_MEETINGS}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createBoardMeeting(payload: Partial<BoardMeeting>): Promise<BoardMeeting> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOARD_MEETINGS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let err = "Failed to schedule board meeting.";
    try {
      const j = await res.json();
      err = j?.detail || j?.message || err;
    } catch {}
    throw new Error(String(err));
  }

  return res.json();
}

export async function updateBoardMeeting(id: number, payload: Partial<BoardMeeting>): Promise<BoardMeeting> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOARD_MEETINGS}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to update meeting.");
  }

  return res.json();
}

export async function deleteBoardMeeting(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.BOARD_MEETINGS}${id}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete meeting.");
  }
}
