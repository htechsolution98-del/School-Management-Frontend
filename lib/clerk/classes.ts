import { fetchWithAuth, parseApiError } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type { SchoolClass } from "@/types/clerk";

interface ClassesCacheRecord<T> {
  data: T;
  timestamp: number;
}
let classesCache: ClassesCacheRecord<SchoolClass[]> | null = null;
const CLASSES_CACHE_TTL = 60 * 1000;

export async function getSchoolClasses(forceFresh = false): Promise<SchoolClass[]> {
  if (!forceFresh && classesCache && Date.now() - classesCache.timestamp < CLASSES_CACHE_TTL) {
    return classesCache.data;
  }

  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.CLASSES}`);

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch classes"));
  }

  const data = await response.json();
  const list = Array.isArray(data) ? data : data.data ?? data.results ?? [];
  classesCache = { data: list, timestamp: Date.now() };
  return list;
}

export async function getClasses(forceFresh = false): Promise<SchoolClass[]> {
  return getSchoolClasses(forceFresh);
}

export async function getSchoolClassesForExam(): Promise<SchoolClass[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/classes/`);

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch classes for exam timetable"));
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? data.results ?? [];
}

export async function saveSchoolClasses(classes: string[]): Promise<void> {
  const payload = classes.map((school_class) => ({ school_class }));
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SCHOOL_CLASS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to save classes"));
  }
  classesCache = null;
}

export async function deleteSchoolClass(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SCHOOL_CLASS}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to delete class"));
  }
  classesCache = null;
}
