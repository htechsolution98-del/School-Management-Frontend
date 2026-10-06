import { apiFetch, normalizeList } from "@/lib/principal/helpers";
import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import type { StudentProfileData, StudentDocumentItem } from "@/types/student-profile";

export async function getStudentProfiles(signal?: AbortSignal): Promise<StudentProfileData[]> {
  const students: StudentProfileData[] = [];
  let path: string | null = "/students/";
  const visited = new Set<string>();
  while (path) {
    const target: URL = new URL(path.startsWith("http") ? path : `${API_BASE_URL.replace(/\/$/, "")}${path}`);
    if (target.origin !== new URL(API_BASE_URL).origin || visited.has(target.href)) throw new Error("Invalid student pagination response.");
    visited.add(target.href);
    const data: StudentProfileData[] | { results: StudentProfileData[]; next?: string | null } = await apiFetch(target.href, { signal }, "Unable to load student profiles.");
    students.push(...normalizeList<StudentProfileData>(data));
    path = Array.isArray(data) ? null : data.next || null;
  }
  return students;
}
export const getStudentProfile = (id: number, signal?: AbortSignal) => apiFetch<StudentProfileData>(`/students/${id}/`, { signal }, "Student profile could not be loaded.");
export const updateStudentProfile = (id: number, data: Partial<Pick<StudentProfileData, "aadhar_number" | "abc_id" | "udise_no" | "is_verified" | "custom_id_values">>) => apiFetch<StudentProfileData>(`/students/${id}/`, { method: "PATCH", body: JSON.stringify(data) }, "Unable to update this student.");

export class DocumentRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function mutateStudentDocument(studentId: number, method: "POST" | "PATCH" | "DELETE", document: StudentDocumentItem | null, body?: FormData | Record<string, unknown>): Promise<StudentProfileData> {
  const endpoint = `${API_BASE_URL}/students/${studentId}/documents/${document ? `${document.id}/` : ""}`;
  const payload = body instanceof FormData ? body : JSON.stringify(body || (document ? { expected_file: document.file_name } : {}));
  const response = await fetchWithAuth(endpoint, { method, body: payload, headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.detail || Object.entries(data).map(([field, error]) => `${field}: ${Array.isArray(error) ? error.join(" ") : error}`).join(" ") || "Document action failed. Please retry.";
    throw new DocumentRequestError(message, response.status);
  }
  return data;
}

export const createSchoolProfileField = (kind: "ID" | "DOCUMENT", label: string) => apiFetch<{ id: number; label: string; kind: string }>("/students/profile-fields/", { method: "POST", body: JSON.stringify({ kind, label }) }, "Unable to add this school field.");
