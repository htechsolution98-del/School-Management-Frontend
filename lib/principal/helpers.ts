import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const value = data as { results?: T[]; data?: T[] };
    return value.results ?? value.data ?? [];
  }
  return [];
}

export async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const err = await response.json();
    const fieldErrors = Object.values(err || {})
      .flat()
      .filter((value): value is string => typeof value === "string");
    return err?.detail || err?.message || fieldErrors[0] || fallback;
  } catch {
    return fallback;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  fallback = "Request failed."
): Promise<T> {
  let url = path;
  if (!path.startsWith("http")) {
    const cleanBase = API_BASE_URL.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    url = `${cleanBase}${cleanPath}`;
  }
  const response = await fetchWithAuth(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallback));
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
