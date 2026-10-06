import axios from "axios";
import { toast } from "sonner";

// Safely normalize URLs without duplicate '/api'
const rawEnvUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
export const API_BASE_ROOT = rawEnvUrl.endsWith("/api") ? rawEnvUrl.slice(0, -4) : rawEnvUrl;
export const API_BASE_URL = `${API_BASE_ROOT}/api`;
export const INVENTORY_BASE_URL = `${API_BASE_URL}/inventory`;

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

// Client for Inventory endpoints (/api/inventory/*)
export const inventoryApi = axios.create({
  baseURL: INVENTORY_BASE_URL,
  withCredentials: true,
});

// Client for Core SMS endpoints (/api/*)
export const coreApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const attachAuthToken = (config: any) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== "undefined") {
    const schoolId = localStorage.getItem("school_id") || localStorage.getItem("school");
    if (schoolId) {
      config.headers["X-School-ID"] = schoolId;
    }
  }
  return config;
};

inventoryApi.interceptors.request.use(attachAuthToken);
coreApi.interceptors.request.use(attachAuthToken);

const attachRefreshInterceptor = (instance: any) => {
  instance.interceptors.response.use(
    (response: any) => response,
    async (error: any) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/login")) {
          return Promise.reject(error);
        }

        const refreshTokenVal =
          getCookie("refresh_token") ||
          (typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null);

        if (!refreshTokenVal) {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshRes = await axios.post(
            `${API_BASE_URL}/refresh/`,
            { refresh: refreshTokenVal },
            { withCredentials: true }
          );

          const newAccessToken = refreshRes.data?.access;
          if (newAccessToken && typeof window !== "undefined") {
            localStorage.setItem("token", newAccessToken);
            localStorage.setItem("access_token", newAccessToken);
            localStorage.setItem("accessToken", newAccessToken);
          }

          processQueue(null, newAccessToken || "refreshed");
          if (newAccessToken) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return instance(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(error);
    }
  );
};

attachRefreshInterceptor(inventoryApi);
attachRefreshInterceptor(coreApi);

// Helper to extract human-readable error messages without HTML/XML pollution
export function extractErrorMessage(err: any, fallback = "An unexpected error occurred."): string {
  if (!err) return fallback;

  if (err.response?.status === 404) {
    return "Requested resource or endpoint was not found (404).";
  }
  if (err.response?.status === 401) {
    return "Authentication credentials were not provided or session expired. Please log in.";
  }
  if (err.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (err.response?.status >= 500) {
    return "Server error occurred. Please try again later.";
  }

  if (err.response?.data) {
    const data = err.response.data;

    // Filter out raw HTML / XML error pages (Django 404/500 debug pages)
    if (typeof data === "string") {
      const trimmed = data.trim();
      if (trimmed.startsWith("<") || trimmed.includes("<!DOCTYPE") || trimmed.includes("<html") || trimmed.includes("<?xml")) {
        return fallback;
      }
      return data;
    }

    if (data.detail && typeof data.detail === "string") return data.detail;
    if (data.error && typeof data.error === "string") return data.error;
    if (data.message && typeof data.message === "string") return data.message;

    // DRF field error dictionary e.g. { "name": ["This field must be unique."] }
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

  if (err.message && typeof err.message === "string" && !err.message.startsWith("<")) {
    return err.message;
  }
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
