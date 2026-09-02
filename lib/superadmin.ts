import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";
import {
  School,
  CreateSchoolPayload,
  CreateSchoolResponse,
  FeatureType,
  CreateFeaturePayload,
  RazorpaySchool,
  RazorpayRecord,
} from "../types/superadmin";

// ================= URLS =================

const SCHOOL_URL = `${API_BASE_URL}${API_ENDPOINTS.SCHOOL}`;
const FEATURE_URL = `${API_BASE_URL}${API_ENDPOINTS.FEATURE}`;
const SCHOOL_FEATURE_URL = `${API_BASE_URL}/schoolfeature/`;
const CHANGE_FEATURE_STATUS_URL = `${API_BASE_URL}/changefeaturestatus`;
const RAZORPAY_URL = `${API_BASE_URL}/razardata/`;
const SCHOOL_LIST_URL = `${API_BASE_URL}/schoollist/`;

// ================= SCHOOL APIS =================

export interface SuperAdminAnalyticsSummary {
  total_schools: number;
  active_schools: number;
  inactive_schools: number;
  total_students: number;
  total_boys: number;
  total_girls: number;
  other_gender: number;
  total_staff: number;
  active_staff: number;
  teachers_count: number;
  non_teaching_count: number;
  total_features: number;
}

export interface SuperAdminSchoolRow {
  id: number;
  name: string;
  code: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_active: boolean;
  created_at?: string;
  total_students: number;
  total_boys: number;
  total_girls: number;
  total_staff: number;
  active_staff: number;
  enabled_features: number;
}

export interface SuperAdminAnalyticsResponse {
  summary: SuperAdminAnalyticsSummary;
  schools: SuperAdminSchoolRow[];
}

/**
 * GET /SchoolView/analytics/ — fetch global superadmin analytics
 */
export async function getSuperAdminAnalytics(): Promise<SuperAdminAnalyticsResponse> {
  const normalizedSchoolUrl = SCHOOL_URL.endsWith("/") ? SCHOOL_URL : `${SCHOOL_URL}/`;
  try {
    const response = await fetchWithAuth(`${normalizedSchoolUrl}analytics/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn("Analytics endpoint failed, falling back to school directory:", e);
  }

  // Graceful fallback if analytics endpoint unavailable
  const schoolsList = await getSchools();
  const activeCount = schoolsList.filter((s) => s.is_active ?? true).length;
  const inactiveCount = schoolsList.length - activeCount;

  return {
    summary: {
      total_schools: schoolsList.length,
      active_schools: activeCount,
      inactive_schools: inactiveCount,
      total_students: 0,
      total_boys: 0,
      total_girls: 0,
      other_gender: 0,
      total_staff: 0,
      active_staff: 0,
      teachers_count: 0,
      non_teaching_count: 0,
      total_features: 10,
    },
    schools: schoolsList.map((s) => ({
      id: s.id || 0,
      name: s.name || "School",
      code: s.code || "—",
      email: s.email || "—",
      phone: s.phone || "—",
      city: s.city || "—",
      state: s.state || "—",
      country: s.country || "India",
      pincode: s.pincode || "—",
      is_active: s.is_active ?? true,
      total_students: 0,
      total_boys: 0,
      total_girls: 0,
      total_staff: 0,
      active_staff: 0,
      enabled_features: s.school_features?.filter((f) => f.is_enabled)?.length || 0,
    })),
  };
}

export interface SchoolDetailedStats {
  school: {
    id: number;
    name: string;
    code: string;
    index_no?: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    logo?: string | null;
    is_active: boolean;
    created_at?: string;
  };
  metrics: {
    total_students: number;
    total_boys: number;
    total_girls: number;
    other_gender: number;
    rte_students: number;
    total_staff: number;
    active_staff: number;
    teachers_count: number;
    non_teaching_count: number;
    total_classes: number;
  };
  classes: {
    id: number;
    name: string;
    total_students: number;
    boys: number;
    girls: number;
  }[];
  staff: {
    id: number;
    name: string;
    email: string;
    mobile: string;
    category: string;
    is_active: boolean;
  }[];
  features: {
    id: number;
    feature_id: number;
    name: string;
    is_enabled: boolean;
  }[];
}

/**
 * GET /SchoolView/{id}/details/ — fetch detailed statistics for a specific school
 */
export async function getSchoolDetails(id: number): Promise<SchoolDetailedStats> {
  const normalizedSchoolUrl = SCHOOL_URL.endsWith("/") ? SCHOOL_URL : `${SCHOOL_URL}/`;
  const response = await fetchWithAuth(`${normalizedSchoolUrl}${id}/details/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch school details.");
  }

  return response.json();
}

/**
 * GET /SchoolView/ — fetch all schools from the backend.
 */
export async function getSchools(): Promise<School[]> {
  const response = await fetchWithAuth(SCHOOL_URL, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch schools.");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * POST /SchoolView/ — create a new school entry.
 */
export async function createSchool(
  payload: CreateSchoolPayload
): Promise<CreateSchoolResponse> {
  const formData = new FormData();
  for (const key in payload) {
    const value = payload[key as keyof CreateSchoolPayload];
    if (key === "feature_ids") {
      (value as number[]).forEach(id => formData.append("feature_ids", id.toString()));
    } else if (value !== null && value !== undefined) {
      formData.append(key, value as string | Blob);
    }
  }

  const response = await fetchWithAuth(SCHOOL_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to create school.";
    try {
      const err = await response.json();
      const fieldErrors = Object.values(err || {})
        .flat()
        .filter((value): value is string => typeof value === "string");
      message = err?.detail || err?.message || fieldErrors[0] || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return response.json();
}

/**
 * PATCH /SchoolView/{id}/ — update an existing school entry.
 */
export async function updateSchool(
  id: number,
  payload: Partial<CreateSchoolPayload>
): Promise<School> {
  const formData = new FormData();
  for (const key in payload) {
    const value = payload[key as keyof CreateSchoolPayload];
    if (key === "feature_ids") {
      (value as number[]).forEach(id => formData.append("feature_ids", id.toString()));
    } else if (value !== null && value !== undefined) {
      if (!(typeof value === 'string' && value.startsWith('http'))) {
        formData.append(key, value as string | Blob);
      }
    }
  }

  const response = await fetchWithAuth(`${SCHOOL_URL}${id}/`, {
    method: "PATCH",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to update school.";
    try {
      const err = await response.json();
      const fieldErrors = Object.values(err || {})
        .flat()
        .filter((value): value is string => typeof value === "string");
      message = err?.detail || err?.message || fieldErrors[0] || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return response.json();
}

/**
 * DELETE /SchoolView/{id}/ — delete a school entry.
 */
export async function deleteSchool(id: number): Promise<void> {
  const response = await fetchWithAuth(`${SCHOOL_URL}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete school.");
  }
}

// ================= FEATURE APIS =================

/**
 * GET /feature/ — fetch features.
 */
export async function getFeatures(): Promise<FeatureType[]> {
  const response = await fetchWithAuth(FEATURE_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch features");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * DELETE /feature/{id}/ — delete a feature.
 */
export async function deleteFeature(id: number): Promise<void> {
  const response = await fetchWithAuth(`${FEATURE_URL}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete feature.");
  }
}

/**
 * POST /feature/ — create a new feature.
 */
export async function createFeature(payload: CreateFeaturePayload): Promise<FeatureType> {
  const response = await fetchWithAuth(FEATURE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to create feature";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return response.json();
}

/**
 * PATCH /changefeaturestatus/{id}/ — update the enabled status of a school's feature.
 */
export async function updateFeatureStatus(featureId: number, isEnabled: boolean) {
  const response = await fetchWithAuth(`${CHANGE_FEATURE_STATUS_URL}/${featureId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      is_enabled: isEnabled,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || "Failed to update feature status"
    );
  }

  return data;
}

/**
 * POST /schoolfeature/ — assign a feature to a school.
 */
export async function createSchoolFeature(schoolId: number, featureId: number) {
  const response = await fetchWithAuth(SCHOOL_FEATURE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      school: schoolId,
      feature: featureId,
      is_enabled: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || "Failed to create school feature"
    );
  }

  return data;
}

/**
 * GET /feature/ — fetch raw feature list.
 */
export async function fetchFeaturesList() {
  const response = await fetchWithAuth(FEATURE_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || "Failed to fetch features");
  }

  return data;
}

// ================= RAZORPAY APIS =================

/**
 * GET /schoollist/ — fetch all schools for Razorpay dropdown list.
 */
export async function getSchoolList(): Promise<RazorpaySchool[]> {
  const res = await fetchWithAuth(SCHOOL_LIST_URL);
  if (!res.ok) throw new Error("Failed to fetch schools");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * POST /razardata/ — save Razorpay credentials for a school.
 */
export async function saveRazorpayData(
  payload: Omit<RazorpayRecord, "id" | "school_name">
): Promise<RazorpayRecord> {
  const res = await fetchWithAuth(RAZORPAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = "Failed to save credentials";
    try {
      const err = await res.json();
      msg = err?.detail || err?.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res.json();
}

/**
 * PATCH /razardata/{id}/ — update existing Razorpay credentials.
 */
export async function updateRazorpayData(
  id: number,
  payload: Omit<RazorpayRecord, "id" | "school_name">
): Promise<RazorpayRecord> {
  const res = await fetchWithAuth(`${RAZORPAY_URL}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = "Failed to update credentials";
    try {
      const err = await res.json();
      msg = err?.detail || err?.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res.json();
}

/**
 * DELETE /razardata/{id}/ — remove Razorpay credentials.
 */
export async function deleteRazorpayData(id: number): Promise<void> {
  const res = await fetchWithAuth(`${RAZORPAY_URL}${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete credentials");
}

/**
 * GET /razardata/ — fetch all Razorpay credentials records.
 */
export async function getRazorpayList(): Promise<RazorpayRecord[]> {
  const res = await fetchWithAuth(RAZORPAY_URL);
  if (!res.ok) throw new Error("Failed to fetch Razorpay records");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}
