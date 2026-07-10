export type AdmissionFieldType =
  | "text"
  | "email"
  | "date"
  | "textarea"
  | "select"

export interface FormOption {
  label: string
  value: string
}

export interface AdmissionFieldConfig {
  id: string
  label: string
  type: AdmissionFieldType
  required?: boolean
  placeholder?: string
  description?: string
  options?: FormOption[]
  gridColumn?: "full" | "half"
}

export interface DocumentExtraFieldConfig {
  id: string
  label: string
  type: "text" | "select"
  required?: boolean
  placeholder?: string
  options?: FormOption[]
}

export interface AdmissionDocumentConfig {
  id: string
  label: string
  required?: boolean
  description?: string
  extraFields?: DocumentExtraFieldConfig[]
}

export interface AdmissionStepConfig {
  id: string
  title: string
  description: string
  kind: "fields" | "documents" | "review"
  fields?: AdmissionFieldConfig[]
  documents?: AdmissionDocumentConfig[]
}

export interface AdmissionFormSchema {
  id: string
  title: string
  description: string
  submitLabel: string
  steps: AdmissionStepConfig[]
}

export const admissionFormSchema: AdmissionFormSchema = {
  id: "student-admission",
  title: "Student Admission Application",
  description:
    "A scalable, schema-driven admission form that can later be loaded from an API without changing the renderer.",
  submitLabel: "Submit Application",
  steps: [
    {
      id: "personal-information",
      title: "Personal Information",
      description:
        "Capture the student's identity, family details, contact information, and admission context.",
      kind: "fields",
      fields: [
        { id: "studentFullName", label: "Student Full Name", type: "text", required: true },
        { id: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
        {
          id: "gender",
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
          id: "category",
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
          id: "bloodGroup",
          label: "Blood Group",
          type: "select",
          options: [
            { label: "A+", value: "A+" },
            { label: "A-", value: "A-" },
            { label: "B+", value: "B+" },
            { label: "B-", value: "B-" },
            { label: "AB+", value: "AB+" },
            { label: "AB-", value: "AB-" },
            { label: "O+", value: "O+" },
            { label: "O-", value: "O-" },
          ],
        },
        { id: "fatherName", label: "Father's Name", type: "text", required: true },
        { id: "motherName", label: "Mother's Name", type: "text", required: true },
        { id: "mobileNumber", label: "Mobile Number", type: "text", required: true },
        { id: "alternateMobileNumber", label: "Alternate Mobile Number", type: "text" },
        { id: "emailAddress", label: "Email Address", type: "email" },
        {
          id: "addressLine",
          label: "Address Line",
          type: "textarea",
          required: true,
          gridColumn: "full",
        },        { id: "pincode", label: "Pincode", type: "text", required: true },

        { id: "cityVillage", label: "City/Village", type: "text", required: true },
        { id: "district", label: "District", type: "text", required: true },
        { id: "state", label: "State", type: "text", required: true },
        {
          id: "applyingForClass",
          label: "Applying For Class",
          type: "select",
          required: true,
          options: [
            { label: "Nursery", value: "nursery" },
            { label: "LKG", value: "lkg" },
            { label: "UKG", value: "ukg" },
            { label: "Class 1", value: "class_1" },
            { label: "Class 2", value: "class_2" },
            { label: "Class 3", value: "class_3" },
            { label: "Class 4", value: "class_4" },
            { label: "Class 5", value: "class_5" },
            { label: "Class 6", value: "class_6" },
            { label: "Class 7", value: "class_7" },
            { label: "Class 8", value: "class_8" },
            { label: "Class 9", value: "class_9" },
            { label: "Class 10", value: "class_10" },
            { label: "Class 11", value: "class_11" },
            { label: "Class 12", value: "class_12" },
          ],
        },
        { id: "previousSchoolName", label: "Previous School Name", type: "text" },
        { id: "previousClass", label: "Previous Class", type: "text" },
        { id: "aadhaarNumber", label: "Aadhaar Number", type: "text" },
      ],
    },
    {
      id: "documents",
      title: "Documents",
      description:
        "Collect supporting identity, eligibility, and proof documents with metadata for each upload.",
      kind: "documents",
      documents: [
        {
          id: "aadhaarCard",
          label: "Aadhaar Card",
          required: true,
          extraFields: [
            { id: "documentNumber", label: "Document Number", type: "text", required: true, placeholder: "Enter Aadhaar number" },
          ],
        },
        {
          id: "birthCertificate",
          label: "Birth Certificate",
          required: true,
          extraFields: [
            { id: "documentNumber", label: "Document Number", type: "text", required: true, placeholder: "Enter certificate number" },
          ],
        },
        {
          id: "schoolLeavingCertificate",
          label: "School Leaving Certificate",
          extraFields: [
            { id: "documentNumber", label: "Document Number", type: "text", placeholder: "Enter certificate number" },
          ],
        },
        {
          id: "studentPhoto",
          label: "Student Photo",
          required: true,
          description: "Upload a passport-size student photo.",
        },
        {
          id: "casteCertificate",
          label: "Caste Certificate",
          extraFields: [
            { id: "documentNumber", label: "Document Number", type: "text", placeholder: "Enter certificate number" },
          ],
        },
        {
          id: "incomeCertificate",
          label: "Income Certificate",
          extraFields: [
            { id: "documentNumber", label: "Document Number", type: "text", placeholder: "Enter certificate number" },
          ],
        },
        {
          id: "addressProof",
          label: "Address Proof",
          extraFields: [
            {
              id: "documentType",
              label: "Document Type",
              type: "select",
              placeholder: "Select address proof type",
              options: [
                { label: "Utility Bill", value: "utility_bill" },
                { label: "Ration Card", value: "ration_card" },
                { label: "Rental Agreement", value: "rental_agreement" },
                { label: "Voter ID", value: "voter_id" },
                { label: "Other", value: "other" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "review-submit",
      title: "Review & Submit",
      description:
        "Review the captured details before posting them to a mock FormData payload or a future API endpoint.",
      kind: "review",
    },
  ],
}
