export interface SchoolFeature {
  id: number;
  is_enabled: boolean;
  school: number;
  feature: number;
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
