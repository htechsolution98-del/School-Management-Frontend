import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getErrorMessage, normalizeList } from "./helpers";
import type { StudentExam } from "@/types/student";

// ─── GET /examtimetable-view/ — list all exams ───────────────────────────────

export async function getStudentExams(): Promise<StudentExam[]> {
  const url = `${API_BASE_URL}/examtimetable-view/`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch exam timetable.")
    );
  }

  const data = await response.json();
  return normalizeList<StudentExam>(data);
}
