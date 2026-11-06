import { fetchWithAuth, extractErrorMessage, parseApiError } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { Admission } from "@/types/clerk";

export async function fetchAdmissions(): Promise<Admission[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/admissionview/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch admissions"));
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? data.results ?? [];
}

export async function patchStudentDetails(
  admissionNumber: string,
  payload: Record<string, any>
) {
  const response = await fetchWithAuth(`${API_BASE_URL}/updatesubmition/${admissionNumber}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to update student information (${response.status})`));
  }

  return response.json();
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
    throw new Error(await parseApiError(response, `Failed to update student information (${response.status})`));
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
    throw new Error(await parseApiError(response, "Failed to update student division"));
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
    throw new Error(await parseApiError(response, "Failed to update documents"));
  }

  return response.json();
}

export async function assignGrNumber(
  admissionNumber: string,
  grNo: string,
  placement?: { school_class_id: number; division: string }
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/clerk_verify/${admissionNumber}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(grNo.trim() ? { gr_no: grNo.trim() } : {}), ...placement }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to assign GR number"));
  }
}

export async function assignStudentPlacement(
  admissionNumber: string,
  placement: { school_class_id: number; division: string }
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/clerk_verify/${admissionNumber}/placement/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(placement),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to assign the student's class and division"));
  }
}

export async function assignStudentDivision(
  admissionNumber: string,
  division: string
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/clerk_verify/${admissionNumber}/division/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ division }),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update the student's division"));
  }
}
