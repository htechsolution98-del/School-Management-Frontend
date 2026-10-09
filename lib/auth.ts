import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { LoginRequest, LoginResponse } from "../types";
import { toast } from "sonner";

// ─── Token Management ─────────────────────────────────────────────────────────

const COOKIE_FETCH_OPTIONS: Pick<RequestInit, "credentials"> = {
  credentials: "include",
};

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const COOKIE_PATH = "path=/";
const COOKIE_SAME_SITE = "SameSite=Lax";

/**
 * Shared toast id for transport-level failures.
 *
 * Every failed request funnels through `apiFetch`, so reusing one id means a
 * burst of parallel failures (e.g. `Promise.all` on a dashboard) collapses into
 * a single toast that is updated in place, instead of one identical toast per
 * request.
 */
export const API_ERROR_TOAST_ID = "api-error";

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { headers, body, ...rest } = init;
  const isFormData = body instanceof FormData;
  const requestHeaders = new Headers(headers);
  if (isFormData) {
    requestHeaders.delete("Content-Type");
  } else if (body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...COOKIE_FETCH_OPTIONS,
    ...rest,
    body,
    headers: requestHeaders,
  });

  const isRefreshRequest = String(input).includes("/refresh");
  if (!response.ok && response.status !== 401 && !isRefreshRequest) {
    try {
      if (response.status >= 500) {
        toast.error(`Server Error (${response.status})`, {
          id: API_ERROR_TOAST_ID,
          description: "An unexpected error occurred on the server.",
        });
      } else {
        const errData = await response.clone().json();
        let errorDesc = "Request failed";
        
        if (errData.message) {
          errorDesc = String(errData.message);
        } else if (errData.detail) {
          errorDesc = String(errData.detail);
        } else if (errData.error) {
          errorDesc = String(errData.error);
        } else if (typeof errData === "object" && errData !== null) {
           // It might be a DRF field-level error object e.g. {"email": ["already exists"]}
           const firstKey = Object.keys(errData)[0];
           if (firstKey) {
             const firstVal = errData[firstKey];
             errorDesc = Array.isArray(firstVal) ? String(firstVal[0]) : String(firstVal);
           }
        }
        
        if (!errorDesc.includes("Refresh token is required")) {
          toast.error("Error", { id: API_ERROR_TOAST_ID, description: errorDesc });
        }
      }
    } catch (e) {
      toast.error(`Request Failed (${response.status})`, { id: API_ERROR_TOAST_ID });
    }
  }

  return response;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

function getSecureCookieFlag(): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "; Secure";
  }

  return "";
}

function getTokenMaxAge(token?: string | null): number | null {
  if (!token || typeof window === "undefined") {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = window.atob(padded);
    const parsed = JSON.parse(decoded) as { exp?: unknown };

    if (typeof parsed.exp !== "number") {
      return null;
    }

    const ttl = parsed.exp - Math.floor(Date.now() / 1000);
    return ttl > 0 ? ttl : 0;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAge?: number | null) {
  if (typeof document === "undefined") {
    return;
  }

  const maxAgePart =
    typeof maxAge === "number" && Number.isFinite(maxAge)
      ? `; Max-Age=${Math.max(0, Math.floor(maxAge))}`
      : "";

  document.cookie = `${name}=${encodeURIComponent(value)}; ${COOKIE_PATH}; ${COOKIE_SAME_SITE}${maxAgePart}${getSecureCookieFlag()}`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; ${COOKIE_PATH}; ${COOKIE_SAME_SITE}; Max-Age=0${getSecureCookieFlag()}`;
}

export function setRoleCookies(roles: string[], maxAge?: number | null) {
  if (typeof document === "undefined") return;
  const normalized = (roles || []).map((r) => String(r).toLowerCase().trim()).filter(Boolean);
  const primaryRole = normalized[0] || "";
  setCookie("user_role", primaryRole, maxAge);
  setCookie("user_roles", JSON.stringify(normalized), maxAge);
}

export function clearAuthSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("roles");
    localStorage.removeItem("school_id");
    localStorage.removeItem("school_name");
    localStorage.removeItem("school_slug");
    localStorage.removeItem("username");
    localStorage.removeItem("current_user");
    localStorage.removeItem("announcement_notifications");
    localStorage.removeItem("read_announcement_ids");
    localStorage.removeItem("announcement_notifications_unread_count");
    sessionStorage.clear();
  }
  removeCookie(ACCESS_TOKEN_COOKIE);
  removeCookie(REFRESH_TOKEN_COOKIE);
  removeCookie("user_role");
  removeCookie("user_roles");
}

function clearLegacyLocalTokens() {
  clearAuthSession();
}

export function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_COOKIE) || (typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_COOKIE) : null);
}

export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_COOKIE) || (typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_COOKIE) : null);
}

function setTokens(access: string, refresh?: string | null) {
  const nextRefresh = refresh || getRefreshToken();
  const maxAge = getTokenMaxAge(access);

  setCookie(ACCESS_TOKEN_COOKIE, access, maxAge);

  if (nextRefresh) {
    setCookie(REFRESH_TOKEN_COOKIE, nextRefresh, getTokenMaxAge(nextRefresh));
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_COOKIE, access);
    if (nextRefresh) localStorage.setItem(REFRESH_TOKEN_COOKIE, nextRefresh);
  }
}

function clearTokens() {
  clearAuthSession();
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  // Purge any existing session completely first to ensure account switches don't bleed data
  clearAuthSession();

  const url = `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`;

  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    let message = "Invalid email/mobile or password.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  const data = await response.json() as LoginResponse;
  if (data.access) {
    setTokens(data.access, data.refresh);
  }

  // Ensure roles is available at top level
  if (data.user?.roles && !data.roles) {
    data.roles = data.user.roles;
  }

  const userRoles = (data.roles || []).map((r) => String(r).toLowerCase().trim()).filter(Boolean);
  const tokenMaxAge = getTokenMaxAge(data.access);
  setRoleCookies(userRoles, tokenMaxAge);

  if (typeof window !== "undefined") {
    if (data.school_id)   localStorage.setItem("school_id",   String(data.school_id));
    if (data.school_name) localStorage.setItem("school_name", data.school_name);
    if (data.school_slug) localStorage.setItem("school_slug", data.school_slug);
    localStorage.setItem("roles", JSON.stringify(userRoles));
  }

  return data;
}

// ─── OTP Registration ──────────────────────────────────────────────────────────

export async function sendOtp(payload: { email?: string; mobile?: string }): Promise<void> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.SEND_OTP}`;

  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to send OTP.";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || err?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
}

export async function verifyOtp(payload: {
  email?: string;
  mobile?: string;
  otp: string;
  password: string;
  school_id?: number;
  school_slug?: string;
}): Promise<any> {

  const url = `${API_BASE_URL}${API_ENDPOINTS.VERIFY_OTP}`;

  // GET SCHOOL DATA FROM LOCAL STORAGE
  const school_id = localStorage.getItem("school_id");
  const school_slug = localStorage.getItem("school_slug");

  // ADD TO PAYLOAD
  if (school_id) {
    payload.school_id = Number(school_id);
  }

  if (school_slug) {
    payload.school_slug = school_slug;
  }

  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "OTP verification failed.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return await response.json();
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

export async function refreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  const requestBody = refresh ? JSON.stringify({ refresh }) : undefined;

  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.REFRESH}`;
    const response = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    if (response.ok) {
      const data = await response.json() as { access?: string; refresh?: string };
      if (!data.access) return false;
      setTokens(data.access, data.refresh);
      if (typeof window !== "undefined") {
        try {
          const roles = JSON.parse(localStorage.getItem("roles") || "[]");
          if (Array.isArray(roles) && roles.length) {
            setRoleCookies(roles, getTokenMaxAge(data.access));
          }
        } catch {}
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Authenticated Fetch ──────────────────────────────────────────────────────

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {

  const url = String(input);
  const sendRequest = () => {
    const headers = new Headers(init.headers);
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return apiFetch(url, { ...init, headers, credentials: "include", cache: "no-store" });
  };
  const response = await sendRequest();

  // SUCCESS
  if (response.status !== 401) {
    return response;
  }

  // SCHOOL DEACTIVATED / ACCOUNT DISABLED → force logout
  try {
    const errBody = await response.clone().json();
    const msg = errBody?.detail || errBody?.message || "";
    if (/deactivated|disabled/i.test(msg)) {
      clearAuthSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return response;
    }
  } catch { /* ignore */ }

  // Parallel dashboard requests share one refresh, including token rotation.
  if (!refreshPromise) {
    refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
  }
  const refreshed = await refreshPromise;

  // REFRESH FAILED
  if (!refreshed) {
    clearAuthSession();
    return response;
  }

  // RETRY REQUEST
  return sendRequest();
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/** Immediately clears tokens and redirects to login (no API call). */
export function forceLogout(): void {
  clearAuthSession();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function logoutUser(): Promise<void> {

  try {

    await apiFetch(`${API_BASE_URL}/logout/`, {
      method: "POST",
      credentials: "include",
    });

  } catch {}

  clearAuthSession();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// ─── Role → Route ─────────────────────────────────────────────────────────────

export function getDashboardRoute(roles: string[]): string {
  const normalizedRoles = (roles || []).map((r) => (r || "").toLowerCase().trim());
  if (normalizedRoles.includes("super_admin") || normalizedRoles.includes("superadmin")) return "/superadmin";
  if (normalizedRoles.includes("admin(trustee)") || normalizedRoles.includes("trustee")) return "/trustee";
  if (normalizedRoles.includes("principal")) return "/principal";
  if (normalizedRoles.includes("librarian")) return "/librarian";
  if (normalizedRoles.includes("clerk") || normalizedRoles.includes("fees_clerk")) return "/clerk";
  if (normalizedRoles.includes("inventory")) return "/inventory";
  if (normalizedRoles.includes("temp_user")) return "/user";
  if (normalizedRoles.includes("fees management") || normalizedRoles.includes("fees")) return "/fees";
  if (normalizedRoles.includes("teacher") || normalizedRoles.includes("staff")) return "/teacher";
  if (normalizedRoles.includes("student")) return "/student";
  if (normalizedRoles.includes("parents") || normalizedRoles.includes("parent")) return "/parent";
  return "/user";
}

// ─── Face Verification / Enrollment ──────────────────────────────────────────

export class FaceApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = "FaceApiError";
  }
}

export async function enrollFace(imageBlob: Blob): Promise<any> {
  const url = `${API_BASE_URL}/face-enroll/`;
  const formData = new FormData();
  formData.append("face_image", imageBlob, "face.png");

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Face enrollment failed.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { /* ignore */ }
    throw new FaceApiError(message, response.status);
  }

  return response.json();
}

export async function verifyFace(imageBlob: Blob): Promise<any> {
  const url = `${API_BASE_URL}/face-verify/`;
  const formData = new FormData();
  formData.append("image", imageBlob, "face.png");

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Face verification failed.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { /* ignore */ }
    throw new FaceApiError(message, response.status);
  }

  return response.json();
}

