import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface StudentRollRecord {
  id: number;
  admission_number?: string;
  name?: string;
  surname?: string;
  father_name?: string;
  mother_name?: string;
  full_name?: string;
  gr_no?: string;
  school_class?: number;
  class_name?: string;
  division?: string;
  roll_no?: string | null;
  mobile?: string;
}

export async function fetchStudentsByClassAndDivision(
  classId?: string,
  division?: string
): Promise<StudentRollRecord[]> {
  let url = `${API_BASE_URL}/get-student/`;
  const params = new URLSearchParams();
  if (classId) params.append("school_class", classId);
  if (division && division !== "ALL") params.append("division", division);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch student records.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? data.data ?? [];
}

export async function bulkSaveRollNumbers(
  assignments: { student_id?: number; admission_number?: string; roll_no: string | null }[]
): Promise<{ message: string; updated_count: number }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/assign-roll-numbers/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignments }),
  });

  if (!response.ok) {
    let message = "Failed to save roll numbers.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}
