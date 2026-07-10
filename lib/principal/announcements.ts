import { API_ENDPOINTS } from "@/lib/config";
import { apiFetch } from "./helpers";

export interface AnnouncementPayload {
  title: string;
  description: string;
  announcement_for?: "TEACHER" | "STUDENT" | "PARENT" | "ALL" | string;
  is_everyone?: boolean | string;
  expires_at?: string | null;
}

export interface AnnouncementResponse {
  id: number;
  title: string;
  description: string;
  announcement_for?: string;
  is_everyone?: boolean | string;
  expires_at?: string;
  created_at: string;
  created_by?: string;
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

