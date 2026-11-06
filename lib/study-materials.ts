import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth, parseApiError } from "@/lib/auth";

export interface StudyMaterialBackendItem {
  id: number;
  subject: number | null;
  student_class: number | null;
  division: string | null;
  class_name: string | null;
  subject_name: string | null;
  display_subject: string;
  display_class: string;
  material_type: string;
  title: string;
  description: string;
  file: string;
  file_url: string;
  file_name: string | null;
  file_size: string | null;
  created_at: string;
}

export async function getTeacherStudyMaterials(): Promise<StudyMaterialBackendItem[]> {
  const url = `${API_BASE_URL}/studymaterial/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load study materials."));
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function uploadStudyMaterial(formData: FormData): Promise<StudyMaterialBackendItem[]> {
  const url = `${API_BASE_URL}/studymaterial/`;
  const res = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to upload study material."));
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

export async function deleteStudyMaterial(id: number | string): Promise<void> {
  const url = `${API_BASE_URL}/studymaterial/${id}/`;
  const res = await fetchWithAuth(url, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseApiError(res, "Failed to delete study material."));
  }
}

export async function getStudentStudyMaterials(): Promise<StudyMaterialBackendItem[]> {
  const url = `${API_BASE_URL}/studymaterial-student/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const fallbackRes = await fetchWithAuth(`${API_BASE_URL}/student-study-materials/`);
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      return Array.isArray(fbData) ? fbData : fbData.results ?? [];
    }
    throw new Error(await parseApiError(res, "Failed to load study materials for student."));
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

