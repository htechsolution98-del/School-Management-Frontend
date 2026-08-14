import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import type { Exam, CreateExamPayload, ExamRosterResponse, BulkSavePayload, SchoolExam } from "@/types/teacher";

// ─── GET /school-exams/ — class teacher full exam list with student marks ────────────────────────────────

export async function getSchoolExams(month?: number, year?: number): Promise<SchoolExam[]> {
  let url = `${API_BASE_URL}/school-exams/`;
  const params = new URLSearchParams();
  if (month !== undefined) params.set("month", String(month));
  if (year !== undefined) params.set("year", String(year));
  if (params.toString()) url += `?${params.toString()}`;

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch school exams.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? data.data ?? data.exams ?? [];
}

// ─── GET /exams — list scheduled exams ────────────────────────────────────────

export async function getTeacherExams(): Promise<Exam[]> {
  const url = `${API_BASE_URL}/exams`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch exams list.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? data.data ?? [];
}

// ─── POST /examtimetable/ — schedule a new exam ───────────────────────────────

export async function createTeacherExam(
  payload: CreateExamPayload
): Promise<any> {
  const url = `${API_BASE_URL}/examtimetable/`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to schedule exam.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || JSON.stringify(err) || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}

// ─── GET /results/roster/{exam_id}/ — view student roster marks ───────────────

export async function getExamRoster(
  examId: number
): Promise<ExamRosterResponse> {
  const url = `${API_BASE_URL}/results/roster/${examId}/`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch exam roster.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  const data = await response.json();

  // Normalize response — API may return flat array or wrapped object
  if (Array.isArray(data)) {
    return { exam: examId, class_group: 0, roster: data };
  }

  // Some backends return { results: [...] } or { data: [...] } instead of { roster: [...] }
  const rosterList =
    data?.roster ??
    data?.results ??
    data?.data ??
    data?.students ??
    [];

  return {
    exam: data?.exam ?? examId,
    class_group: data?.class_group ?? 0,
    roster: Array.isArray(rosterList) ? rosterList : [],
  };
}

// ─── POST /results/bulk-save/ — bulk save student marks ───────────────────────

export async function bulkSaveMarks(
  payload: BulkSavePayload
): Promise<any> {
  const url = `${API_BASE_URL}/results/bulk-save/`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to bulk save exam marks.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || JSON.stringify(err) || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}

// ─── POST /results/publish/ — publish exam results ────────────────────────────

export async function publishResults(
  examId: number
): Promise<any> {
  const url = `${API_BASE_URL}/results/publish/`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exam: examId }),
  });

  if (!response.ok) {
    let message = "Failed to publish exam results.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || JSON.stringify(err) || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}

export async function getStudentsByClass(
  classId: number
): Promise<any> {
  const url = `${API_BASE_URL}/classes/${classId}/students/`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch class students.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}
