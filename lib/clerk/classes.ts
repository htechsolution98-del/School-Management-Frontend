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

  try {
    const [resClasses, resSchoolClass] = await Promise.all([
      fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.CLASSES}`).catch(() => null),
      fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SCHOOL_CLASS}`).catch(() => null),
    ]);

    const data1 = resClasses && resClasses.ok ? await resClasses.json().catch(() => []) : [];
    const data2 = resSchoolClass && resSchoolClass.ok ? await resSchoolClass.json().catch(() => []) : [];

    const raw1 = Array.isArray(data1) ? data1 : data1?.data ?? data1?.results ?? [];
    const raw2 = Array.isArray(data2) ? data2 : data2?.data ?? data2?.results ?? [];

    const classMap = new Map<string, SchoolClass>();
    for (const item of [...raw1, ...raw2]) {
      if (item && item.id != null) {
        classMap.set(String(item.id), item);
      }
    }
    const merged = Array.from(classMap.values());
    classesCache = { data: merged, timestamp: Date.now() };
    return merged;
  } catch (err) {
    if (classesCache) return classesCache.data;
    throw err;
  }
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
