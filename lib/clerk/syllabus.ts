import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { Syllabus } from "@/types/clerk";

export async function getSyllabusList(): Promise<Syllabus[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SYLLABUS}`);

  if (!response.ok) {
    let message = "Failed to fetch syllabus.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? data.results ?? [];
}

export async function saveSyllabus(payload: Syllabus): Promise<void> {
  const formData = new FormData();
  if (payload.syllabus_file instanceof File) {
    formData.append("syllabus_file", payload.syllabus_file);
  }
  if (payload.class_group) formData.append("class_group", payload.class_group.toString());
  if (payload.division) formData.append("division", payload.division.toString());
  if (payload.subject) formData.append("subject", payload.subject.toString());

  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SYLLABUS}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to save syllabus.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}

export async function deleteSyllabus(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SYLLABUS}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let message = "Failed to delete syllabus.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}
