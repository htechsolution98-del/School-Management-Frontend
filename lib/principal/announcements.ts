import { API_ENDPOINTS } from "@/lib/config";
import { apiFetch } from "./helpers";

export interface AnnouncementPayload {
  title: string;
  description: string;
  announcement_for?: "ALL" | "TEACHER" | "STUDENT" | "PARENT" | "CLERK" | "LIBRARIAN" | "FEE-MANAGER" | "TRANSPORT" | string;
  is_everyone?: boolean | string;
  priority?: "NORMAL" | "IMPORTANT" | "URGENT" | string;
  expires_at?: string | null;
  target_class?: number | string | null;
  target_division?: string | null;
  target_student?: number | string | null;
  target_user?: number | string | null;
}

export interface AnnouncementRecipient {
  id: number;
  student_id?: number;
  user_id?: number;
  name: string;
  role: string;
  father_name?: string;
  mother_name?: string;
  mobile?: string;
  student_name?: string;
  student_roll?: string | number;
  roll_no?: string | number;
  class_name?: string;
  division?: string;
  details?: string;
}

export interface AnnouncementResponse {
  id: number;
  school?: number;
  title: string;
  description: string;
  announcement_for?: string;
  is_everyone?: boolean | string;
  priority?: "NORMAL" | "IMPORTANT" | "URGENT" | string;
  expires_at?: string;
  created_at: string;
  created_by?: number | string;
  created_by_name?: string;
  created_by_role?: string;
  is_created_by_me?: boolean;
  can_manage?: boolean;
  target_class?: number | string | null;
  target_class_name?: string | null;
  target_division?: string | null;
  target_student?: number | string | null;
  target_student_name?: string | null;
  target_user?: number | string | null;
  target_user_name?: string | null;
}

const ANNOUNCEMENTS_CACHE_KEY = "sms_cached_announcements";

export function getStoredAnnouncements(): AnnouncementResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < 10 * 60 * 1000 && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {}
  return [];
}

export function setStoredAnnouncements(data: AnnouncementResponse[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function invalidateAnnouncementsCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANNOUNCEMENTS_CACHE_KEY);
  } catch {}
}

export async function getAnnouncements(): Promise<AnnouncementResponse[]> {
  const data = await apiFetch<unknown>(
    API_ENDPOINTS.ANNOUNCEMENT,
    { method: "GET" },
    "Failed to fetch announcements."
  );
  let list: AnnouncementResponse[] = [];
  if (Array.isArray(data)) list = data as AnnouncementResponse[];
  else if (data && typeof data === "object") {
    const val = data as { results?: AnnouncementResponse[]; data?: AnnouncementResponse[] };
    list = val.results ?? val.data ?? [];
  }
  if (list.length > 0) {
    setStoredAnnouncements(list);
  }
  return list;
}

export async function createAnnouncement(
  payload: AnnouncementPayload
): Promise<AnnouncementResponse> {
  invalidateAnnouncementsCache();
  return apiFetch<AnnouncementResponse>(
    API_ENDPOINTS.ANNOUNCEMENT,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to create announcement."
  );
}

export async function updateAnnouncement(
  id: number,
  payload: AnnouncementPayload
): Promise<AnnouncementResponse> {
  invalidateAnnouncementsCache();
  return apiFetch<AnnouncementResponse>(
    `${API_ENDPOINTS.ANNOUNCEMENT}${id}/`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "Failed to update announcement."
  );
}

export async function deleteAnnouncement(id: number): Promise<void> {
  invalidateAnnouncementsCache();
  return apiFetch<void>(
    `${API_ENDPOINTS.ANNOUNCEMENT}${id}/`,
    {
      method: "DELETE",
    },
    "Failed to delete announcement."
  );
}

export async function getAnnouncementRecipients(
  role: string,
  query?: string,
  extra?: { class_id?: number | string | null; division?: string | null; student_id?: number | string | null }
): Promise<AnnouncementRecipient[]> {
  const base = API_ENDPOINTS.ANNOUNCEMENT.replace(/\/$/, "");
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (query) params.set("q", query);
  if (extra?.class_id) params.set("class_id", String(extra.class_id));
  if (extra?.division && extra.division !== "ALL") params.set("division", extra.division);
  if (extra?.student_id) params.set("student_id", String(extra.student_id));

  const url = `${base}-recipients/?${params.toString()}`;
  return apiFetch<AnnouncementRecipient[]>(url, { method: "GET" }, "Failed to fetch announcement recipients.");
}

