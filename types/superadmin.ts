export interface SchoolFeature {
  id: number;
  is_enabled: boolean;
  school: number;
  feature: number;
  feature_name?: string;
}

export interface SchoolSubscriptionDetails {
  id: number;
  status: string;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  days_left: number;
  plan_name?: string;
  pricing_model: "PER_STUDENT" | "FLAT";
  monthly_price: number | string;
  quarterly_price: number | string;
  half_yearly_price: number | string;
  yearly_price: number | string;
  gst_included?: boolean;
  gst_percentage?: number | string;
}

export interface School {
  id?: number;
  name: string | null;
  code?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  logo?: string | null;
  index_no?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  login_id?: number | null;
  school_features?: SchoolFeature[];
  feature_ids?: number[];
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  pricing_model?: "PER_STUDENT" | "FLAT";
  monthly_price?: number | string;
  quarterly_price?: number | string;
  half_yearly_price?: number | string;
  yearly_price?: number | string;
  gst_included?: boolean;
  gst_percentage?: number | string;
  subscription_details?: SchoolSubscriptionDetails | null;
}

export interface CreateSchoolPayload {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  logo?: File | null;
  index_no?: string;
  feature_ids: number[];
  is_active?: boolean;
  trial_start_date?: string;
  trial_end_date?: string;
  pricing_model?: "PER_STUDENT" | "FLAT";
  monthly_price?: number | string;
  quarterly_price?: number | string;
  half_yearly_price?: number | string;
  yearly_price?: number | string;
  gst_included?: boolean;
  gst_percentage?: number | string;
}

export interface CreateSchoolResponse {
  id?: number;
  code?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  login_id?: number | null;
  meassage?: string;
  message?: string;
}

export interface FeatureType {
  id: number;
  name: string;
  is_active: boolean;
}

export interface CreateFeaturePayload {
  name: string;
}

export interface RazorpaySchool {
  id: number;
  name: string;
}

export interface RazorpayRecord {
  id?: number;
  school: number;
  razorpay_key_id: string;
  razorpay_secret_key: string;
  school_name?: string;
}
