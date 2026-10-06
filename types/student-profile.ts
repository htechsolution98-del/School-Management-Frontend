export interface StudentDocumentItem {
  profile_field?: number | null; id: string; raw_id: number; title: string; label: string; file_url: string | null; url: string | null;
  type: string; uploaded_at: string | null; source: "adm" | "std" | "rte"; file_name: string;
  document_type: string | null; description: string | null; updated_at: string | null;
  document_field: number | null; is_required: boolean; expiry_date: string | null;
  is_verified: boolean; verification_scope: "student" | "document";
  verified_by_name: string | null; verified_at: string | null; can_edit_metadata: boolean;
}
export interface StudentProfileData {
  custom_ids: { id: number; label: string; value: string }[];
  shared_document_fields: { id: number; label: string }[];
  custom_id_values?: Record<string, string>;
  id: number; gr_no: string | null; roll_no: string | null; division: string | null;
  name: string; surname: string | null; father_name: string | null; mother_name: string | null; full_name: string;
  date_of_birth: string | null; mobile: string | null; email: string | null;
  school_class: number | null; class_name: string | null; academic_year: number | null; academic_year_name: string | null;
  admission_date: string | null; aadhar_number: string | null; abc_id: string | null; udise_no: string | null;
  is_rte: boolean; is_verified: boolean; verified_by: number | null; verified_by_name: string | null;
  verified_at: string | null; photo_url: string | null; documents: StudentDocumentItem[];
  is_active: boolean; created_at: string; admission_number: string | null;
  completion: { document_count: number; required_document_count: number; missing_documents: { id: number; label: string }[]; missing_ids: string[]; document_requirements_known: boolean };
  sections: { title: string; fields: { id: number; label: string; value: unknown; sensitive: boolean; mapping: string | null }[] }[];
  extra_details: Record<string, unknown>[];
  guardians: { id: number; name: string; email: string | null }[];
  document_slots: { id: number; label: string; is_required: boolean }[];
}
