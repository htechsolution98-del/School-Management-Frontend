import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { Division } from "@/types/clerk";

export async function getDivisions(): Promise<Division[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DIVISION_SET}`);

  if (!response.ok) {
    let message = "Failed to fetch divisions.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? data.results ?? [];
}

export async function saveDivision(payload: Division): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DIVISION_SET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to save division.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

export async function updateDivision(id: number, payload: Partial<Division>): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DIVISION_SET}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to update division.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }
}

export async function deleteDivision(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DIVISION_SET}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let message = "Failed to delete division.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}
