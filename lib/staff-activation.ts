import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";

export interface StaffStatusRecord {
  id: number;
  name: string | null;
  email: string | null;
  mobile: string | null;
  category: string | null;
  department_name: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const URL = `${API_BASE_URL.replace(/\/$/, "")}/staff-activation/`;

async function readResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail ?? body?.is_active;
    throw new Error(Array.isArray(detail) ? detail.join(" ") : typeof detail === "string" ? detail : `Staff request failed (HTTP ${response.status}).`);
  }
  return body;
}

export async function getStaffStatusRecords(): Promise<StaffStatusRecord[]> {
  const body = await readResponse(await fetchWithAuth(URL, { cache: "no-store" }));
  return Array.isArray(body) ? body : body?.results ?? [];
}

export async function setStaffActive(id: number, isActive: boolean): Promise<StaffStatusRecord> {
  return readResponse(await fetchWithAuth(`${URL}${id}/status/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  }));
}
