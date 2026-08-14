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

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { headers, body, ...rest } = init;
  const isFormData = body instanceof FormData;

  const response = await fetch(input, {
    ...COOKIE_FETCH_OPTIONS,
    ...rest,
    body,
    headers: isFormData
      ? { ...(headers as Record<string, string>) }        // ← no Content-Type for FormData
      : {
          "Content-Type": "application/json",             // ← default for JSON
          ...(headers as Record<string, string>),
        },
  });

  if (!response.ok && response.status !== 401) {
    try {
      if (response.status >= 500) {
        toast.error(`Server Error (${response.status})`, {
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
        
        toast.error("Error", { description: errorDesc });
      }
    } catch (e) {
      toast.error(`Request Failed (${response.status})`);
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

function clearLegacyLocalTokens() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
}

function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_COOKIE);
}

function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_COOKIE);
}

function setTokens(access: string, refresh?: string | null) {
  clearLegacyLocalTokens();

  setCookie(ACCESS_TOKEN_COOKIE, access, getTokenMaxAge(access));

  if (typeof refresh === "string" && refresh.length > 0) {
    setCookie(REFRESH_TOKEN_COOKIE, refresh, getTokenMaxAge(refresh));
  }
}

function clearTokens() {
  clearLegacyLocalTokens();
  removeCookie(ACCESS_TOKEN_COOKIE);
  removeCookie(REFRESH_TOKEN_COOKIE);
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
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
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access);
      if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
    }
  }

  if (typeof window !== "undefined") {
    if (data.school_id)   localStorage.setItem("school_id",   String(data.school_id));
    if (data.school_name) localStorage.setItem("school_name", data.school_name);
    if (data.school_slug) localStorage.setItem("school_slug", data.school_slug);
    if (data.roles)       localStorage.setItem("roles",       JSON.stringify(data.roles));
  }
  
  // Ensure roles is available at the top level for backward compatibility
  if (data.user?.roles && !data.roles) {
    data.roles = data.user.roles;
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

let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

function onRefreshDone(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

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
      // Server sets new cookies automatically — nothing to store manually
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
  const token = getAccessToken() || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  // COOKIE & HEADER BASED REQUEST
  let response = await apiFetch(url, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init.headers as Record<string, string>),
    },
    credentials: "include",
    cache: "no-store",
  });

  // SUCCESS
  if (response.status !== 401) {
    return response;
  }

  // SCHOOL DEACTIVATED / ACCOUNT DISABLED → force logout
  try {
    const errBody = await response.clone().json();
    const msg = errBody?.detail || errBody?.message || "";
    if (/deactivated|disabled/i.test(msg)) {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return response;
    }
  } catch { /* ignore */ }

  // WAIT IF TOKEN REFRESH RUNNING
  if (isRefreshing) {

    await new Promise<boolean>((resolve) =>
      refreshSubscribers.push(resolve)
    );

    return apiFetch(url, {
      ...init,
      credentials: "include",
    });
  }

  // REFRESH FLOW
  isRefreshing = true;

  const refreshed = await refreshToken();

  isRefreshing = false;

  onRefreshDone(refreshed);

  // REFRESH FAILED
  if (!refreshed) {
    clearTokens();
    return response;
  }

  // RETRY REQUEST
  return apiFetch(url, {
    ...init,
    credentials: "include",
  });
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/** Immediately clears tokens and redirects to login (no API call). */
export function forceLogout(): void {
  clearTokens();

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

  clearTokens();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// ─── Role → Route ─────────────────────────────────────────────────────────────

export function getDashboardRoute(roles: string[]): string {
  const normalizedRoles = (roles || []).map((r) => (r || "").toLowerCase());
  if (normalizedRoles.includes("super_admin")) return "/superadmin";
  if (normalizedRoles.includes("admin(trustee)") || normalizedRoles.includes("trustee")) return "/trustee";
  if (normalizedRoles.includes("principal")) return "/principal";
  if (normalizedRoles.includes("librarian")) return "/librarian";
  if (normalizedRoles.includes("clerk") || normalizedRoles.includes("fees_clerk")) return "/clerk";
  if (normalizedRoles.includes("temp_user")) return "/user";
  if (normalizedRoles.includes("fees management") || normalizedRoles.includes("fees")) return "/fees";
  if (normalizedRoles.includes("teacher")) return "/teacher";
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

