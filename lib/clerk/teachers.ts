import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { Teacher } from "@/types/clerk";

export async function getTeachers(): Promise<Teacher[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.GET_TEACHER}`);
    if (response.ok) {
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.data ?? data.results ?? [];
      if (list.length > 0) {
        return list;
      }
    }
  } catch {}

  // Fallback to general staff list if specialized teacher endpoint returned empty
  try {
    const fallbackRes = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.STAFF}`);
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      const fbList = Array.isArray(fbData) ? fbData : fbData.data ?? fbData.results ?? [];
      return fbList;
    }
  } catch {}

  return [];
}
