import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getErrorMessage, normalizeList } from "./helpers";
import type { StudentResult, ExamRankResponse } from "@/types/student";

// ─── GET /results/my-results/ — view my published results ────────────────────

export async function getStudentResults(): Promise<StudentResult[]> {
  const url = `${API_BASE_URL}/results/my-results/`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch student results.")
    );
  }

  const data = await response.json();
  return normalizeList<StudentResult>(data);
}

// ─── GET /results/rank/{exam_id}/ — view exam rankings leaderboard ───────────

export async function getExamRankings(
  examId: number
): Promise<ExamRankResponse> {
  const url = `${API_BASE_URL}/results/rank/${examId}/`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch exam leaderboard.")
    );
  }

  return response.json();
}
