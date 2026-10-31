import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { getErrorMessage, normalizeList } from "./helpers";
import type {
  AcademicYear,
  AcademicYearPayload,
  MainAcademicYear,
} from "@/types/principal";

export async function createAcademicYearForPrincipal(
  payload: AcademicYearPayload
): Promise<AcademicYear> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ACADEMIC_YEAR}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message ? data?.detail || data?.message : JSON.stringify(data)
    );
  }

  return data;
}

export async function getAcademicYearsForPrincipal(): Promise<AcademicYear[]> {
  let response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ACADEMIC_YEAR}`);

  // The read-only endpoint is a safe fallback if the legacy principal route is unavailable.
  if (!response.ok) {
    response = await fetchWithAuth(`${API_BASE_URL}/academic-year/`);
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch academic years."));
  }

  return normalizeList<AcademicYear>(await response.json());
}

export async function updateAcademicYearForPrincipal(
  id: number,
  payload: AcademicYearPayload
): Promise<AcademicYear> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.ACADEMIC_YEAR}${id}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Failed to update academic year.");
  }

  return data;
}

export async function deleteAcademicYearForPrincipal(id: number): Promise<void> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.ACADEMIC_YEAR}${id}/`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to delete academic year."));
  }
}

export async function getMainAcademicYear(): Promise<MainAcademicYear[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/main-academic-year/`);

  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data) ? data : data ? [data] : [];
}
