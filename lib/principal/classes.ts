import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { getErrorMessage, normalizeList } from "./helpers";
import type { SchoolClass, ClassCategory } from "@/types/principal";

export async function getClassCategories(): Promise<ClassCategory[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.CLASS_CATEGORY}`);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch categories."));
  }
  return normalizeList<ClassCategory>(await response.json());
}

export async function createClassCategory(name: string): Promise<ClassCategory> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.CLASS_CATEGORY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create category."));
  }
  return response.json();
}

export async function deleteClassCategory(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.CLASS_CATEGORY}${id}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to delete category."));
  }
}

export async function getSchoolClasses(): Promise<SchoolClass[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SCHOOL_CLASS}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch classes."));
  }

  return normalizeList<SchoolClass>(await response.json());
}

export async function getClasses(): Promise<SchoolClass[]> {
  return getSchoolClasses();
}

export async function saveSchoolClasses(classes: { school_class: string; category: number }[]): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SCHOOL_CLASS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(classes),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to save classes."));
  }
}

export async function assignClassCategory(classId: number, categoryId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SCHOOL_CLASS}${classId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: categoryId }),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to assign category."));
  }
}

export async function deleteSchoolClass(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.SCHOOL_CLASS}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to delete class."));
  }
}
