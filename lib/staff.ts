import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";
import { CreateStaffPayload, Staff } from "../types";

async function extractApiError(response: Response, defaultMessage: string): Promise<string> {
  try {
    const text = await response.text();
    if (!text || !text.trim()) {
      return response.statusText ? `Error ${response.status}: ${response.statusText}` : defaultMessage;
    }
    try {
      const json = JSON.parse(text);
      if (typeof json === "string") return json;
      if (Array.isArray(json)) return json.map(item => typeof item === "string" ? item : JSON.stringify(item)).join(", ");
      if (typeof json === "object" && json !== null) {
        if (json.detail) return String(json.detail);
        if (json.message) return String(json.message);
        if (json.error) return String(json.error);
        const parts: string[] = [];
        for (const [key, val] of Object.entries(json)) {
          if (Array.isArray(val)) {
            parts.push(`${key}: ${val.join(", ")}`);
          } else if (typeof val === "object" && val !== null) {
            parts.push(`${key}: ${JSON.stringify(val)}`);
          } else if (val) {
            parts.push(`${key}: ${val}`);
          }
        }
        if (parts.length > 0) return parts.join(" | ");
      }
    } catch {
      // Non-JSON response
      if (!text.includes("<!DOCTYPE") && text.length < 300) {
        return text.trim();
      }
      return `Server error (${response.status}): ${response.statusText || "Unable to complete request"}`;
    }
  } catch {
    // Stream error
  }
  return defaultMessage;
}

const STAFF_URL = `${API_BASE_URL}${API_ENDPOINTS.STAFF}`;

export async function getStaffList(): Promise<Staff[]> {
  const response = await fetchWithAuth(STAFF_URL, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await extractApiError(response, "Failed to fetch staff.");
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getStaffById(id: number): Promise<Staff> {
  const response = await fetchWithAuth(`${STAFF_URL}${id}/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await extractApiError(response, "Failed to fetch staff details.");
    throw new Error(message);
  }

  return response.json();
}

export async function createStaff(payload: CreateStaffPayload): Promise<Staff> {
  const response = await fetchWithAuth(STAFF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractApiError(response, "Failed to create staff.");
    throw new Error(message);
  }

  return response.json();
}

export async function updateStaff(id: number, payload: Partial<CreateStaffPayload>): Promise<Staff> {
  const response = await fetchWithAuth(`${STAFF_URL}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractApiError(response, "Failed to update staff.");
    throw new Error(message);
  }

  return response.json();
}

export async function deleteStaff(id: number): Promise<void> {
  const response = await fetchWithAuth(`${STAFF_URL}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete staff.");
  }
}

export async function getStaffCategories() {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.GET_FEATURE}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch categories.");
  }

  return response.json();
}

export async function getDepartments() {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.DEPARTMENTS}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch departments.");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createDepartment(name: string) {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.DEPARTMENTS}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );

  if (!response.ok) {
    let message = "Failed to create department.";
    try {
      const error = await response.json();
      const details = Object.values(error || {}).flat().filter((value): value is string => typeof value === "string");
      message = error?.detail || error?.message || details.join(" ") || message;
    } catch { /* Keep the fallback for non-JSON responses. */ }
    throw new Error(message);
  }

  return response.json();
}

export async function updateDepartment(id: number, name: string) {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.DEPARTMENTS}${id}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );

  if (!response.ok) {
    let message = "Failed to update department.";
    try {
      const error = await response.json();
      const details = Object.values(error || {}).flat().filter((value): value is string => typeof value === "string");
      message = error?.detail || error?.error || error?.name?.[0] || error?.message || details.join(" ") || message;
    } catch { /* Keep the fallback for non-JSON responses. */ }
    throw new Error(message);
  }

  return response.json();
}

export async function deleteDepartment(id: number) {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.DEPARTMENTS}${id}/`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    let message = "Failed to delete department.";
    try {
      const error = await response.json();
      message = error?.error || error?.detail || error?.message || message;
    } catch { /* Keep the fallback for non-JSON responses. */ }
    throw new Error(message);
  }
}