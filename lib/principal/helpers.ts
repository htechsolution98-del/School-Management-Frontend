import { fetchWithAuth, extractErrorMessage } from "@/lib/auth";
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
    if (err && typeof err === "object") {
      if (err.title) {
        const titleMsg = Array.isArray(err.title) ? err.title.join(" ") : String(err.title);
        if (/already exists/i.test(titleMsg)) {
          return "A form with this title already exists.";
        }
        return titleMsg;
      }
      if (err.detail) {
        const detailMsg = Array.isArray(err.detail) ? err.detail.join(" ") : String(err.detail);
        if (/already exists/i.test(detailMsg)) {
          return "A form with this title already exists.";
        }
      }
    }
    return extractErrorMessage(err, fallback);
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
    let cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (cleanBase.endsWith("/api") && cleanPath.startsWith("/api/")) {
      cleanPath = cleanPath.substring(4);
    }
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
