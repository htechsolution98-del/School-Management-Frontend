import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { getErrorMessage, normalizeList } from "./helpers";
import type { HomeworkItem, HomeworkSubmission } from "@/types/student";

export async function getStudentHomework(): Promise<HomeworkItem[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/homework/`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch homework."));
  }

  return normalizeList<HomeworkItem>(await response.json());
}

export async function getMySubmissions(): Promise<HomeworkSubmission[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/homework-submission/`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch submissions."));
  }

  return normalizeList<HomeworkSubmission>(await response.json());
}

export async function submitHomework(
  homeworkId: number,
  attachment?: File
): Promise<HomeworkSubmission> {
  const formData = new FormData();
  formData.append("homework", String(homeworkId));
  if (attachment) {
    formData.append("file", attachment);
    formData.append("attachment", attachment);
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/homework-submission/`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Failed to submit homework.");
  }

  return data;
}

export async function submitHomeworkAsStudent(
  homeworkId: number,
  attachment?: File
): Promise<HomeworkSubmission> {
  return submitHomework(homeworkId, attachment);
}
