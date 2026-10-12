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

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let msg = "Failed to submit homework.";
    if (data) {
      if (typeof data === "string") {
        msg = data;
      } else if (data.detail) {
        msg = data.detail;
      } else if (data.message) {
        msg = data.message;
      } else if (data.error) {
        msg = data.error;
      } else if (data.file && Array.isArray(data.file)) {
        msg = data.file.join(" ");
      } else if (data.attachment && Array.isArray(data.attachment)) {
        msg = data.attachment.join(" ");
      } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        msg = data.non_field_errors.join(" ");
      } else {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          msg = `${firstKey}: ${data[firstKey].join(" ")}`;
        }
      }
    }
    throw new Error(msg);
  }

  return data;
}

export async function submitHomeworkAsStudent(
  homeworkId: number,
  attachment?: File
): Promise<HomeworkSubmission> {
  return submitHomework(homeworkId, attachment);
}
