import { fetchWithAuth, parseApiError } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const value = data as { results?: T[]; data?: T[] };
    return value.results ?? value.data ?? [];
  }
  return [];
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.replace(/^\/api/, "")}`;

  const response = await fetchWithAuth(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Request failed: ${response.statusText || response.status}`));
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}
