import { fetchWithAuth, extractErrorMessage } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { Division } from "@/types/clerk";

export async function getDivisions(): Promise<Division[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DIVISION_SET}`);

  if (!response.ok) {
    let message = "Failed to fetch divisions.";
    try {
      const err = await response.json();
      message = extractErrorMessage(err, message);
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? data.results ?? [];
}

export async function saveDivision(payload: Division): Promise<void> {
  const parsedClass =
    payload.SchoolClass !== null && payload.SchoolClass !== undefined
      ? parseInt(String(payload.SchoolClass), 10)
      : payload.school_class !== null && payload.school_class !== undefined
      ? parseInt(String(payload.school_class), 10)
      : null;

  const parsedCapacity =
    payload.capacity !== null && payload.capacity !== undefined
      ? parseInt(String(payload.capacity), 10)
      : payload.student_capacity !== null && payload.student_capacity !== undefined
      ? parseInt(String(payload.student_capacity), 10)
      : null;

  const sanitizedPayload: Division = {
    ...payload,
    SchoolClass: parsedClass,
    school_class: parsedClass,
    class_id: parsedClass,
    capacity: parsedCapacity,
    student_capacity: parsedCapacity,
  };

  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DIVISION_SET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitizedPayload),
  });

  if (!response.ok) {
    let message = "Failed to save division.";
    try {
      const err = await response.json();
      message = extractErrorMessage(err, message);
    } catch {}
    throw new Error(message);
  }
}

export async function updateDivision(id: number, payload: Partial<Division>): Promise<void> {
  const parsedClass =
    payload.SchoolClass !== null && payload.SchoolClass !== undefined
      ? parseInt(String(payload.SchoolClass), 10)
      : payload.school_class !== null && payload.school_class !== undefined
      ? parseInt(String(payload.school_class), 10)
      : undefined;

  const parsedCapacity =
    payload.capacity !== null && payload.capacity !== undefined
      ? parseInt(String(payload.capacity), 10)
      : payload.student_capacity !== null && payload.student_capacity !== undefined
      ? parseInt(String(payload.student_capacity), 10)
      : undefined;

  const sanitizedPayload: Partial<Division> = {
    ...payload,
    ...(parsedClass !== undefined ? { SchoolClass: parsedClass, school_class: parsedClass, class_id: parsedClass } : {}),
    ...(parsedCapacity !== undefined ? { capacity: parsedCapacity, student_capacity: parsedCapacity } : {}),
  };

  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.DIVISION_SET}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitizedPayload),
  });

  if (!response.ok) {
    let message = "Failed to update division.";
    try {
      const err = await response.json();
      message = extractErrorMessage(err, message);
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
      message = extractErrorMessage(err, message);
    } catch {}
    throw new Error(message);
  }
}
