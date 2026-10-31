import { API_BASE_URL } from "./config";
import { fetchWithAuth, extractErrorMessage } from "./auth";

export interface SchoolProfileData {
  id?: number;
  school_id?: number;
  school_name?: string;
  school_code?: string;

  // Basic Info
  school_full_name: string;
  school_short_name: string;
  tagline: string;
  establishment_year: string;
  board_affiliation: string;
  udise_code: string;

  // Contact Info
  full_address: string;
  phone_numbers: string;
  official_emails: string;
  website_url: string;

  // Billing & Bank Info
  trust_name: string;
  pan_gst_number: string;
  bank_account_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  bank_name: string;

  // Media & Branding (Cloudinary URLs)
  main_logo_url: string;
  print_logo_url: string;
  favicon_url: string;
  login_banner_url: string;
  certificate_watermark_url: string;
  receipt_bg_url: string;
  principal_signature_url: string;
  class_teacher_signature_url: string;
  trustee_signature_url: string;
  official_seal_url: string;

  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfileData = {
  school_full_name: "",
  school_short_name: "",
  tagline: "",
  establishment_year: "",
  board_affiliation: "",
  udise_code: "",
  full_address: "",
  phone_numbers: "",
  official_emails: "",
  website_url: "",
  trust_name: "",
  pan_gst_number: "",
  bank_account_name: "",
  bank_account_no: "",
  bank_ifsc: "",
  bank_name: "",
  main_logo_url: "",
  print_logo_url: "",
  favicon_url: "",
  login_banner_url: "",
  certificate_watermark_url: "",
  receipt_bg_url: "",
  principal_signature_url: "",
  class_teacher_signature_url: "",
  trustee_signature_url: "",
  official_seal_url: "",
};

export async function getSchoolProfile(): Promise<SchoolProfileData> {
  const res = await fetchWithAuth(`${API_BASE_URL}/school-profile/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorBody, "Failed to load institutional school profile."));
  }

  const data = await res.json();
  return { ...DEFAULT_SCHOOL_PROFILE, ...data };
}

export async function updateSchoolProfile(
  payload: Partial<SchoolProfileData>
): Promise<SchoolProfileData> {
  const res = await fetchWithAuth(`${API_BASE_URL}/school-profile/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorBody, "Failed to update school profile."));
  }

  const json = await res.json();
  return json.data || json;
}

