import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getErrorMessage, normalizeList } from "./helpers";

export interface StudentSyllabusItem {
  id: number;
  subject_name: string;
  divison_name: string;
  school_class: string;
  syllabus_file: string;
  school: number;
  division: number;
  subject: number;
}

export async function getStudentSyllabus(): Promise<StudentSyllabusItem[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/syllabus-student/`
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch syllabus.")
    );
  }

  return normalizeList<StudentSyllabusItem>(await response.json());
}
