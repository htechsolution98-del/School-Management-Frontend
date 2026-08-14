import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";
import { CreateStaffPayload, Staff } from "../types";

const STAFF_URL = `${API_BASE_URL}${API_ENDPOINTS.STAFF}`;

export async function getStaffList(): Promise<Staff[]> {
  const response = await fetchWithAuth(STAFF_URL, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch staff.");
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
    throw new Error("Failed to fetch staff details.");
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
    let message = "Failed to create staff.";
    try {
      const err = await response.json();
      const fieldErrors = Object.values(err || {})
        .flat()
        .filter((value): value is string => typeof value === "string");
      message = err?.detail || err?.message || fieldErrors[0] || message;
    } catch {
      // Ignore malformed error bodies.
    }
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
    let message = "Failed to update staff.";
    try {
      const err = await response.json();
      const fieldErrors = Object.values(err || {})
        .flat()
        .filter((value): value is string => typeof value === "string");
      message = err?.detail || err?.message || fieldErrors[0] || message;
    } catch {
      // Ignore
    }
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
    throw new Error("Failed to create department.");
  }

  return response.json();
}
