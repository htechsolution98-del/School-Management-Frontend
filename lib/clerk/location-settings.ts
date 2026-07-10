import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { LocationSettings, LocationSettingsRecord } from "@/types/clerk";

const LOCATION_URL = `${API_BASE_URL}${API_ENDPOINTS.GET_LOCATION}`;

export async function getLocationSettings(): Promise<LocationSettingsRecord | null> {
  const response = await fetchWithAuth(LOCATION_URL);

  if (!response.ok) {
    if (response.status === 404) return null;
    let message = "Failed to fetch location settings.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
  return data;
}

export async function saveLocationSettings(payload: LocationSettings): Promise<void> {
  const response = await fetchWithAuth(LOCATION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to save location settings.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

const DELETE_LOCATION_URL = `${API_BASE_URL}${API_ENDPOINTS.DELETE_LOCATION}`;

export async function deleteLocationSettings(id: number | string): Promise<void> {
  const url = `${DELETE_LOCATION_URL}${id}/`;
  const response = await fetchWithAuth(url, { method: "DELETE" });

  if (!response.ok && response.status !== 204) {
    let message = "Failed to delete location settings.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}
