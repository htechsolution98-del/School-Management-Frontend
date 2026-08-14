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
    email: string;
    roles: string[];
  };
  roles?: string[]; 
  school_id?: number;
  school_name?: string;
  school_slug?: string;
  modules?: string[];

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

