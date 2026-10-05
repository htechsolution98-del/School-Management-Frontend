import axios, { AxiosError } from "axios";
import { toast } from "sonner";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Check cookies
  const cookieToken =
    getCookie("access_token") ||
    getCookie("token") ||
    getCookie("jwt");
  if (cookieToken) return cookieToken;

  // 2. Check localStorage
  const localToken =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("jwt");

  return localToken || null;
}

export const inventoryApi = axios.create({
  baseURL: `${API_BASE_URL}/api/inventory`,
  withCredentials: true,
});

// Request interceptor to attach JWT Token
inventoryApi.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to extract human-readable error messages from DRF
export function extractErrorMessage(err: any, fallback = "An unexpected error occurred."): string {
  if (!err) return fallback;

  if (err.response?.data) {
    const data = err.response.data;

    if (typeof data === "string") return data;
    if (data.detail) return String(data.detail);
    if (data.error) return String(data.error);
    if (data.message) return String(data.message);

    // If it's a field-level error object e.g. { "item_name": ["This field is required."] }
    if (typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const val = data[firstKey];
        const fieldName = firstKey.replace(/_/g, " ").toUpperCase();
        if (Array.isArray(val) && val.length > 0) {
          return `${fieldName}: ${val[0]}`;
        }
        if (typeof val === "string") {
          return `${fieldName}: ${val}`;
        }
      }
    }
  }

  if (err.message) return err.message;
  return fallback;
}

export function showApiError(err: any, fallback = "Action failed") {
  const msg = extractErrorMessage(err, fallback);
  toast.error("Error", {
    description: msg,
    duration: 4500,
  });
}

export function showSuccess(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 3500,
  });
}

export function showWarning(title: string, description?: string) {
  toast.warning(title, {
    description,
    duration: 4000,
  });
}
