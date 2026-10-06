import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { Subject } from "@/types/clerk";

export async function getSubjects(): Promise<Subject[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SET_SUBJECT}`);

    if (!response.ok) {
      let message = "Failed to fetch subjects.";
      try {
        const err = await response.json();
        message = err?.detail || err?.message || message;
      } catch {}
      console.warn("Failed to fetch subjects:", response.status, message);
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  } catch (err) {
    console.error("Error in getSubjects:", err);
    return [];
  }
}

export async function saveSubject(payload: Subject): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SET_SUBJECT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to save subject.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

export async function deleteSubject(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SET_SUBJECT}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let message = "Failed to delete subject.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

export async function getSubjectsByClass(classId: number): Promise<Subject[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/classes/${classId}/subjects/`);

  if (!response.ok) {
    let message = "Failed to fetch subjects for the selected class.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? data.results ?? [];
}
