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

export async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  return parseApiError(response, fallback);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  fallback = "Request failed."
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.replace(/^\/api/, "")}`;
  const { body, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  const response = await fetchWithAuth(url, {
    ...rest,
    body,
    headers: isFormData
      ? { ...(headers as Record<string, string>) }
      : {
          "Content-Type": "application/json",
          ...(headers as Record<string, string>),
        },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallback));
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
