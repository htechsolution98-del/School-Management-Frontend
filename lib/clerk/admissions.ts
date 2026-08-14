import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { Admission } from "@/types/clerk";

export async function fetchAdmissions(): Promise<Admission[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/admissionview/`);

  if (!response.ok) {
    let message = "Failed to fetch admissions.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? data.results ?? [];
}

export async function patchFieldValues(
  admissionNumber: string,
  fieldValues: {
    field_id: number;
    value: string;
  }[]
) {
  const response = await fetchWithAuth(`${API_BASE_URL}/updatesubmition/${admissionNumber}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field_values: fieldValues }),
  });

  if (!response.ok) {
    let message = "Failed to update student information.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function patchStudentDivision(admissionNumber: string, division: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/updatesubmition/${admissionNumber}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ division: division }),
  });

  if (!response.ok) {
    let message = "Failed to update student division.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function patchDocuments(
  admissionNumber: string,
  documents: {
    document_field: number;
    file: File;
  }[]
) {
  const formData = new FormData();

  documents.forEach((doc, index) => {
    formData.append(`documents[${index}][document_field]`, String(doc.document_field));
    formData.append(`documents[${index}][file]`, doc.file);
  });

  const response = await fetchWithAuth(`${API_BASE_URL}/updateDocument/${admissionNumber}/`, {
    method: "PATCH",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to update documents.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function assignGrNumber(
  admissionNumber: string,
  grNo: string
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/clerk_verify/${admissionNumber}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gr_no: grNo }),
  });

  if (!response.ok) {
    let message = "Failed to assign GR number.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }
}
