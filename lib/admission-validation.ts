export interface AdmissionField {
  id: number;
  label: string;
  field_type: string;
  is_required?: boolean;
  required?: boolean;
  options?: unknown;
  map_to_student_field?: string | null;
  order?: number;
}
export interface AdmissionConfig {
  id: number;
  title?: string;
  form_title?: string;
  is_active: boolean;
  sections: { id: number; title: string; order: number; fields: AdmissionField[] }[];
  document_fields: { id: number; label: string; is_required: boolean }[];
}
export type AdmissionValues = Record<number, string | boolean>;
export const admissionFields = (form: AdmissionConfig) => [...form.sections].sort((a, b) => a.order - b.order).flatMap(section => [...section.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
export const isBirthField = (field: AdmissionField) => field.map_to_student_field === "date_of_birth" || /\bbirth\b|\bdob\b/i.test(field.label);
export const isClassField = (field: AdmissionField) => field.map_to_student_field === "school_class" || /^(applying for |admission |school )?(class|standard|grade)\b/i.test(field.label);
export const isPhoneField = (field: AdmissionField) => field.field_type === "tel" || /mobile|phone|contact.number|whatsapp/i.test(`${field.label} ${field.map_to_student_field || ""}`);
export const isEmailField = (field: AdmissionField) => field.field_type === "email" || /email|e-mail/i.test(`${field.label} ${field.map_to_student_field || ""}`);
export const isAadhaarAdmissionField = (field: AdmissionField) => /aadh?aar|aadhar/i.test(`${field.label} ${field.map_to_student_field || ""}`);
export const isUdiseAdmissionField = (field: AdmissionField) => /udise|udisecode|udise_code/i.test(`${field.label} ${field.map_to_student_field || ""}`);
export const isAbcAdmissionField = (field: AdmissionField) => /\b(abc|abc_id|apaar|apaar_id)\b/i.test(`${field.label} ${field.map_to_student_field || ""}`);
export const isPinField = (field: AdmissionField) => /pin\s*code|pincode|postal/i.test(field.label);

export function fieldOptions(field: AdmissionField): { value: string; label: string }[] {
  let options = field.options;
  if (typeof options === "string") { const serialized = options; try { options = JSON.parse(serialized); } catch { options = serialized.split(","); } }
  if (!Array.isArray(options)) return [];
  return options.map(option => typeof option === "object" && option !== null ? { value: String(option.value ?? option.label ?? ""), label: String(option.label ?? option.value ?? "") } : { value: String(option), label: String(option) }).filter(option => option.value.trim());
}

export function normalizeAdmissionDate(value: string): string | null {
  let year: number, month: number, day: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) [, year, month, day] = match.map(Number);
  else {
    match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(value.trim());
    if (!match) return null;
    [, day, month, year] = match.map(Number);
  }
  const date = new Date(year, month - 1, day);
  return year >= 1900 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
}
export function normalizeAdmissionValue(field: AdmissionField, value: unknown): string | boolean {
  if (field.field_type === "checkbox") return value === true || /^(true|yes|1)$/i.test(String(value ?? ""));
  let text = String(value ?? "").trim();
  if (isPhoneField(field)) { text = text.replace(/[\s()-]/g, ""); if (/^\+91\d{10}$/.test(text)) text = text.slice(3); }
  if (isAadhaarAdmissionField(field)) text = text.replace(/[\s-]/g, "");
  if (isUdiseAdmissionField(field)) text = text.replace(/[\s-]/g, "");
  if (isAbcAdmissionField(field)) text = text.replace(/[\s-]/g, "");
  if (isEmailField(field)) text = text.toLowerCase();
  if (field.field_type === "date" || isBirthField(field)) text = normalizeAdmissionDate(text) ?? text;
  const option = fieldOptions(field).find(option => option.value.toLowerCase() === text.toLowerCase() || option.label.toLowerCase() === text.toLowerCase());
  return option?.value ?? text;
}
export function validateAdmissionField(field: AdmissionField, value: unknown, today = new Date()): string {
  const text = String(value ?? "").trim();
  const required = field.is_required ?? field.required ?? false;
  if (field.field_type === "checkbox") return required && ![true, "true", "yes", "1"].includes(value as string | boolean) ? `${field.label} must be checked` : "";
  if (!text) return required ? `${field.label} is required` : "";
  if (text.length > (field.field_type === "textarea" ? 2000 : 255)) return `${field.label} is too long`;
  if (isAadhaarAdmissionField(field) && !/^\d{12}$/.test(text)) return "Aadhaar number must contain exactly 12 digits";
  if (isUdiseAdmissionField(field) && !/^\d{11}$/.test(text)) return "UDISE number must contain exactly 11 digits";
  if (isAbcAdmissionField(field) && !/^\d{12}$/.test(text)) return "ABC ID / APAAR ID must contain exactly 12 digits";
  if (isPhoneField(field) && !/^[6-9]\d{9}$/.test(text)) return "Enter a valid 10-digit mobile number starting with 6–9";
  if (isEmailField(field) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) return "Enter a valid email address";
  if (isPinField(field) && !/^[1-9]\d{5}$/.test(text)) return "Enter a valid 6-digit PIN code";
  if (field.field_type === "number" && !isPhoneField(field) && !isAadhaarAdmissionField(field) && !isUdiseAdmissionField(field) && !isAbcAdmissionField(field) && !isPinField(field) && (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text)))) return "Enter a valid non-negative number";
  if (field.field_type === "date" || isBirthField(field)) {
    const date = normalizeAdmissionDate(text);
    if (!date) return "Enter a real date in DD/MM/YYYY format";
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (isBirthField(field) && date >= todayISO) return "Date of birth must be before today";
  }
  if (/^(name|surname|father_name|mother_name)$/.test(field.map_to_student_field || "") || /^(student |full |father'?s? |mother'?s? |guardian'?s? )?name$/i.test(field.label)) {
    if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(text)) return "Use letters, spaces, apostrophes, dots or hyphens for names";
  }
  if (["select", "radio"].includes(field.field_type)) {
    const options = fieldOptions(field);
    if (options.length && !options.some(option => option.value === text)) return "Choose an available option";
    if (!options.length && !isClassField(field)) return "This field has no configured options. Update the admission form.";
  }
  return "";
}
export function validateAdmissionValues(fields: AdmissionField[], values: AdmissionValues) {
  const errors: Record<number, string> = {};
  for (const field of fields) { const error = validateAdmissionField(field, normalizeAdmissionValue(field, values[field.id])); if (error) errors[field.id] = error; }
  return errors;
}
export function validateAdmissionFile(file: { name: string; type: string; size: number }): string {
  const extension = /\.(pdf|png|jpe?g|webp)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (!extension || !["application/pdf", "image/png", "image/jpeg", "image/webp", ""].includes(file.type)) return "Upload PDF, JPG, PNG or WebP files only";
  if (!file.size) return "The selected file is empty";
  if (file.size > (extension === "pdf" ? 3 : 1) * 1024 * 1024) return extension === "pdf" ? "PDF must be 3 MB or smaller" : "Image must be 1 MB or smaller";
  return "";
}
