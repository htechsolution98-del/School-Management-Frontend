export interface DashboardCount {
  total_student: number;
  total_staff: number;
  admission_not_complete: number;
}

export interface AcademicYear {
  id: number;
  name?: string;
  start_year: number;
  end_year: number;
  start_month: number;
  end_month: number;
  billing_periods: string[];
  is_active?: boolean;
  status?: "Active" | "Completed" | "Upcoming" | "Deactivated";
}

export interface AcademicYearPayload {
  name?: string;
  start_year?: number;
  end_year?: number;
  start_month?: number;
  end_month?: number;
  billing_periods?: string[];
  is_active?: boolean;
}

export interface MainAcademicYear {
  id: number;
  name: string;
}

export interface SchoolClass {
  id: number;
  school_class: string;
  category?: number | null;
}

export interface ClassCategory {
  id: number;
  name: string;
}

export interface TempUser {
  id: number;
  username: string;
  email: string | null;
  mobile: string | null;
  status: "active" | "deactivated";
  is_active?: boolean;
}

// Re-export form-builder configuration types defined in lib/form-builder-config
export type {
  BuilderFieldType,
  BuilderOption,
  ConfiguredField,
  AdmissionFormFieldPayload,
  AdmissionFormSectionPayload,
  AdmissionFormCreatePayload,
  AdmissionFormResponse,
  PublicField,
  PublicSection,
  PublicDocumentField,
  PublicAdmissionForm,
} from "@/lib/form-builder-config";
