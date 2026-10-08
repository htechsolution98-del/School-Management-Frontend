import { API_BASE_URL } from "./config";

export function backendMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;
  try {
    const base = new URL(API_BASE_URL, typeof window === "undefined" ? "http://localhost:3000" : window.location.origin);
    const resolved = new URL(path, `${base.origin}/`);
    return ["http:", "https:"].includes(resolved.protocol) ? resolved.href : null;
  } catch {
    return null;
  }
}

