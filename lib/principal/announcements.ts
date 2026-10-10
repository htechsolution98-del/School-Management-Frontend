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
}

export async function getAnnouncements(): Promise<AnnouncementResponse[]> {
  const data = await apiFetch<unknown>(
    API_ENDPOINTS.ANNOUNCEMENT,
    { method: "GET" },
    "Failed to fetch announcements."
  );
  if (Array.isArray(data)) return data as AnnouncementResponse[];
  if (data && typeof data === "object") {
    const val = data as { results?: AnnouncementResponse[]; data?: AnnouncementResponse[] };
    return val.results ?? val.data ?? [];
  }
  return [];
}

export async function createAnnouncement(
  payload: AnnouncementPayload
): Promise<AnnouncementResponse> {
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
  return apiFetch<void>(
    `${API_ENDPOINTS.ANNOUNCEMENT}${id}/`,
    {
      method: "DELETE",
    },
    "Failed to delete announcement."
  );
}

