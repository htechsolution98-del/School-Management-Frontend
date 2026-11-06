import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth, parseApiError } from "@/lib/auth";
import type {
  HomeworkItem,
  HomeworkSubmission,
} from "@/types/teacher";

// ─── GET /homework/ — list all homework for this teacher ─────────────────────

export async function getTeacherHomework(): Promise<HomeworkItem[]> {
  const url = `${API_BASE_URL}/homework/`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch homework."));
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.results ?? data.data ?? []);
}

// ─── GET /homework-submission/?homework=<id> — submissions for one homework ──

export async function getHomeworkSubmissions(
  homeworkId: number
): Promise<HomeworkSubmission[]> {
  const url = `${API_BASE_URL}/homework-submission/?homework=${homeworkId}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch submissions."));
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.results ?? data.data ?? []);
}

// ─── POST /homework/ — create homework (multipart for optional file) ──────────

export async function createHomework(
  payload: FormData
): Promise<HomeworkItem> {
  const url = `${API_BASE_URL}/homework/`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    body: payload,
    // ⚠️ Do NOT set Content-Type — browser sets it with the correct boundary
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create homework."));
  }

  return response.json();
}

// ─── PATCH /homework/<id>/ — update homework ──────────────────────────────────

export async function updateHomework(
  id: number,
  payload: FormData
): Promise<HomeworkItem> {
  const url = `${API_BASE_URL}/homework/${id}/`;
  const response = await fetchWithAuth(url, {
    method: "PATCH",
    body: payload,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update homework."));
  }

  return response.json();
}

// ─── DELETE /homework/<id>/ ───────────────────────────────────────────────────

export async function deleteHomework(id: number): Promise<void> {
  const url = `${API_BASE_URL}/homework/${id}/`;
  const response = await fetchWithAuth(url, { method: "DELETE" });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to delete homework."));
  }
}

// ─── PATCH /homework-submission/<id>/ — grade a submission ───────────────────

export async function gradeSubmission(
  submissionId: number,
  marks: number,
  teacherRemark: string
): Promise<HomeworkSubmission> {
  const url = `${API_BASE_URL}/homework-submission/${submissionId}/`;
  const response = await fetchWithAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "checked",
      marks,
      teacher_remark: teacherRemark,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to grade submission."));
  }

  return response.json();
}
