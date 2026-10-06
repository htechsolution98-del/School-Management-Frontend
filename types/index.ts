export interface LoginRequest {
  email?: string;
  mobile?: string;
  password: string;
}

export interface LoginResponse {
  access?: string;
  refresh?: string;
  user?: {
    id: number;
    username: string;
    name?: string;
    email: string;
    mobile?: string | null;
    roles: string[];
  };
  roles?: string[]; 
  school_id?: number;
  school_name?: string;
  school_slug?: string;
  modules?: string[];

}

/** Shape returned by GET /api/me/ for the authenticated user. */
export interface CurrentUserProfile {
  id: number;
  username: string;
  name: string;
  email: string | null;
  mobile: string | null;
  role: string | null;
  roles: string[];
  initials: string;
  avatar: string | null;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string | null;
  last_login: string | null;
  school: { id: number; name: string; slug: string | null } | null;
  modules: string[];
  staff_profile: {
    id: number;
    name: string | null;
    category: string | null;
    address: string | null;
    date_of_birth: string | null;
    joining_date: string | null;
    department: string | null;
  } | null;
  student_profile: {
    id: number;
    name: string | null;
    surname: string | null;
    gr_no: string | null;
    division: string | null;
    date_of_birth: string | null;
    school_class: string | null;
  } | null;
}

export * from "./superadmin";
export * from "./user";

export type StaffCategory =
  | "TEACHER"
  | "CLERK"
  | "LIBRARIAN"
  | "FEE MANAGEMENT"
  | "PRINCIPAL"
  | "TRANSOPORTATION"
  | "INVENTORY";

export interface Department {
  id: number;
  name: string;
  school: number;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: number;
  name: string | null;
  email: string | null;
  mobile: string | null;
  category: StaffCategory;
  department: number | null;
  address: string | null;
  date_of_birth: string | null;
  joining_date: string | null;
  salary: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  user: number | null;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  mobile: string;
  category: StaffCategory | string;
  department?: number;
  address: string;
  date_of_birth: string;
  salary: string;
  is_active: boolean;
}

