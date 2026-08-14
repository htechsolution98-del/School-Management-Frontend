export type BuilderFieldType =
  | "text"
  | "email"
  | "date"
  | "select"
  | "file"
  | "number"

export interface BuilderOption {
  label: string
  value: string
}

export interface FieldTemplate {
  key: string
  label: string
  type: BuilderFieldType
  required?: boolean
  placeholder?: string
  options?: BuilderOption[]
}

export interface ConfiguredField {
  id: string
  key: string
  label: string
  type: BuilderFieldType
  required: boolean
  placeholder: string
  options: BuilderOption[]
  selected: boolean
  custom?: boolean
  lockedType?: boolean;
  lockedRequired?: boolean;
}

export interface AdmissionFormFieldPayload {
  key?: string
  type?: string
  label: string
  field_type: BuilderFieldType
  required: boolean
  is_required: boolean        // ← ADD THIS
  options?: BuilderOption[]
  order: number
  map_to_student_field?: string | null  // ← ADD THIS
}

export interface AdmissionFormSectionPayload {
  id?: string
  title: string
  order: number
  fields: AdmissionFormFieldPayload[]
}

export interface AdmissionFormCreatePayload {
  fees_enable: boolean
  fees: number | null
  title: string
  description: string | null
  unique_link: string
  fee_type: string
  sections: AdmissionFormSectionPayload[]
  document_fields: string[]
  payment_mode: "online" | "offline" | null;
  fee_structures_input: { class_name: number; fee_amount: string }[]
}

export interface AdmissionFormResponse extends AdmissionFormCreatePayload {
  id: number
  unique_link: string
  is_active: boolean
}

export interface PublicField {
  id: number
  label: string
  field_type: BuilderFieldType
  is_required: boolean
  options: BuilderOption[] | null
  order: number
}

export interface PublicSection {
  id: number
  title: string
  order: number
  fields: PublicField[]
}

export interface PublicDocumentField {
  id: number
  label: string
}

export interface PublicAdmissionForm {
  id: number
  title: string
  description: string | null
  sections: PublicSection[]
  fees_enable: boolean
  fee_type: string
  fees: string | number | null
  fee_structures: { class_name: number | string; fee_amount: number | null }[]
  label: PublicDocumentField[]
}

export const FIELD_TYPE_OPTIONS: BuilderOption[] = [
  { label: "Text", value: "text" },
  { label: "Email", value: "email" },
  { label: "Date", value: "date" },
  { label: "Select", value: "select" },
  { label: "File", value: "file" },
  { label: "Number", value: "number" },
]

export const PERSONAL_FIELD_TEMPLATES: FieldTemplate[] = [
  {
    key: "applying_for_class",
    label: "Applying For Class",
    type: "select",
    required: true,
    options: [
      { label: "Nursery", value: "nursery" },
      { label: "LKG", value: "lkg" },
      { label: "UKG", value: "ukg" },

      { label: "Class 1", value: "class1" },
      { label: "Class 2", value: "class2" },
      { label: "Class 3", value: "class3" },
      { label: "Class 4", value: "class4" },
      { label: "Class 5", value: "class5" },
      { label: "Class 6", value: "class6" },
      { label: "Class 7", value: "class7" },
      { label: "Class 8", value: "class8" },

      { label: "Class 9 Basic Math", value: "class9_basic" },
      { label: "Class 9 Standard Math", value: "class9_standard" },
      { label: "Class 9 Advanced Math", value: "class9_advanced" },

      { label: "Class 10 Basic Math", value: "class10_basic" },
      { label: "Class 10 Standard Math", value: "class10_standard" },
      { label: "Class 10 Advanced Math", value: "class10_advanced" },

      { label: "Class 11 Science", value: "class11_science" },
      { label: "Class 11 Arts", value: "class11_arts" },
      { label: "Class 11 Commerce", value: "class11_commerce" },

      { label: "Class 12 Science", value: "class12_science" },
      { label: "Class 12 Arts", value: "class12_arts" },
      { label: "Class 12 Commerce", value: "class12_commerce" },
    ],
  },

  {
    key: "surname",
    label: "Surname",
    type: "text",
    required: true,
  },

  {
    key: "student_name",
    label: "Student Name",
    type: "text",
    required: true,
  },

  {
    key: "father_name",
    label: "Father Name",
    type: "text",
    required: true,
  },

  {
    key: "mother_name",
    label: "Mother Name",
    type: "text",
    required: true,
  },

  {
    key: "date_of_birth",
    label: "Date of Birth",
    type: "date",
    required: true,
  },

  {
    key: "gender",
    label: "Gender",
    type: "select",
    required: true,
    options: [
      { label: "Male", value: "male" },
      { label: "Female", value: "female" },
      { label: "Other", value: "other" },
    ],
  },

  {
    key: "category",
    label: "Category",
    type: "select",
    options: [
      { label: "General", value: "general" },
      { label: "OBC", value: "obc" },
      { label: "SC", value: "sc" },
      { label: "ST", value: "st" },
    ],
  },

  {
    key: "aadhaar_number",
    label: "Aadhaar Number",
    type: "number",
    required: true,
  },

  {
    key: "blood_group",
    label: "Blood Group",
    type: "text",
  },

  {
    key: "mobile_number",
    label: "Mobile Number",
    type: "text",
    required: true,
  },

  {
    key: "alternate_mobile_number",
    label: "Alternate Mobile Number",
    type: "text",
  },

  {
    key: "email_address",
    label: "Email Address",
    type: "email",
  },

  {
    key: "address_line",
    label: "Address Line",
    type: "text",
    required: true,
  },

  {
    key: "city_village",
    label: "City / Village",
    type: "text",
    required: true,
  },

  {
    key: "district",
    label: "District",
    type: "text",
    required: true,
  },

  {
    key: "state",
    label: "State",
    type: "text",
    required: true,
  },

  {
    key: "pincode",
    label: "Pincode",
    type: "text",
    required: true,
  },

  {
    key: "previous_school_name",
    label: "Previous School Name",
    type: "text",
  },

  {
    key: "previous_class",
    label: "Previous Class",
    type: "text",
  },
];

export const DOCUMENT_FIELD_TEMPLATES: FieldTemplate[] = [
  { key: "aadhaar_card_file", label: "Aadhaar Card File", type: "file", required: true },
  { key: "birth_certificate_file", label: "Birth Certificate File", type: "file", required: true },
  { key: "school_leaving_certificate_file", label: "School Leaving Certificate File", type: "file" },
  { key: "student_photo", label: "Student Photo", type: "file", required: true },
  { key: "caste_certificate_file", label: "Caste Certificate File", type: "file" },
  { key: "income_certificate_file", label: "Income Certificate File", type: "file" },
  {
    key: "address_proof_type",
    label: "Address Proof Type",
    type: "select",
    options: [
      { label: "Utility Bill", value: "utility_bill" },
      { label: "Ration Card", value: "ration_card" },
      { label: "Rental Agreement", value: "rental_agreement" },
      { label: "Voter ID", value: "voter_id" },
      { label: "Other", value: "other" },
    ],
  },
  { key: "address_proof_file", label: "Address Proof File", type: "file" },
];

export function createConfiguredField(
  template: FieldTemplate,
  suffix?: string
): ConfiguredField {
  return {
    id: `${template.key}-${suffix ?? "base"}`,
    key: template.key,
    label: template.label,
    type: template.type,
    required: Boolean(template.required),
    placeholder: template.placeholder ?? "",
    options: template.options ?? [],
    selected: Boolean(template.required),
  }
}

export const SCHOOL_CLASS_OPTIONS = [
  { label: "Nursery", value: "nursery" },
  { label: "LKG", value: "lkg" },
  { label: "UKG", value: "ukg" },

  { label: "Class 1", value: "class1" },
  { label: "Class 2", value: "class2" },
  { label: "Class 3", value: "class3" },
  { label: "Class 4", value: "class4" },
  { label: "Class 5", value: "class5" },
  { label: "Class 6", value: "class6" },
  { label: "Class 7", value: "class7" },
  { label: "Class 8", value: "class8" },

  { label: "Class 9 Basic Math", value: "class9_basic" },
  { label: "Class 9 Standard Math", value: "class9_standard" },
  { label: "Class 9 Advanced Math", value: "class9_advanced" },

  { label: "Class 10 Basic Math", value: "class10_basic" },
  { label: "Class 10 Standard Math", value: "class10_standard" },
  { label: "Class 10 Advanced Math", value: "class10_advanced" },

  { label: "Class 11 Science", value: "class11_science" },
  { label: "Class 11 Arts", value: "class11_arts" },
  { label: "Class 11 Commerce", value: "class11_commerce" },

  { label: "Class 12 Science", value: "class12_science" },
  { label: "Class 12 Arts", value: "class12_arts" },
  { label: "Class 12 Commerce", value: "class12_commerce" },
]
