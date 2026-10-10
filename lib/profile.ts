import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";

export interface UserSchoolInfo {
  id: number;
  name: string;
  slug?: string;
}

export interface StaffProfileInfo {
  id: number;
  name?: string;
  category?: string;
  address?: string;
  date_of_birth?: string;
  joining_date?: string;
  department?: string;
}

export interface StudentProfileInfo {
  id: number;
  name?: string;
  surname?: string;
  gr_no?: string;
  division?: string;
  date_of_birth?: string;
  school_class?: string;
}

export interface UserProfileResponse {
  id: number;
  username: string;
  name: string;
  email?: string;
  mobile?: string;
  role?: string;
  roles?: string[];
  initials?: string;
  avatar?: string | null;
  is_superuser?: boolean;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string;
  school?: UserSchoolInfo | null;
  modules?: string[];
  staff_profile?: StaffProfileInfo | null;
  student_profile?: StudentProfileInfo | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  message: string;
  success: boolean;
}

export async function getCurrentUserProfile(): Promise<UserProfileResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.CURRENT_USER}`);
  if (!response.ok) {
    let message = "Failed to fetch user profile.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || err?.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function changeUserPassword(payload: ChangePasswordPayload): Promise<ChangePasswordResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.CHANGE_PASSWORD}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to change password.";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}
