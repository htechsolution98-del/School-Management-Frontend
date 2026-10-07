import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { admissionFields, isClassField, normalizeAdmissionValue, type AdmissionConfig, type AdmissionValues } from "@/lib/admission-validation";

export class AdmissionSubmissionError extends Error {
  constructor(message: string, public uncertain = false) { super(message); this.name = "AdmissionSubmissionError"; }
}

async function responseData(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* Non-JSON errors get a safe message. */ }
  if (!response.ok) throw new AdmissionSubmissionError(String(data.detail || data.message || data.error || (Object.keys(data).length ? JSON.stringify(data) : `Request failed (${response.status})`)), response.status >= 500);
  return data;
}

export async function submitAdmission({ form, values, academicYear, documents = {}, isRte = false, rteDocument }: {
  form: AdmissionConfig; values: AdmissionValues; academicYear?: string; documents?: Record<number, File>; isRte?: boolean; rteDocument?: File | null;
}) {
  const fields = admissionFields(form);
  const fieldValues = fields.map(field => ({ field: field.id, value: String(normalizeAdmissionValue(field, values[field.id])) }));
  const classField = fields.find(isClassField);
  const classValue = classField ? String(normalizeAdmissionValue(classField, values[classField.id])) : "";
  const body = new FormData();
  body.append("form", String(form.id));
  body.append("field_values", JSON.stringify(fieldValues));
  body.append("is_rte", String(isRte));
  if (academicYear) body.append("academic_year", academicYear);
  if (/^\d+$/.test(classValue)) body.append("school_class", classValue);
  for (const [id, file] of Object.entries(documents)) body.append(`document_${id}`, file);
  const data = await responseData(await fetchWithAuth(`${API_BASE_URL}/submissions/`, { method: "POST", body }));
  const admissionNumber = data.admission_number || data.id;
  if (!admissionNumber) throw new AdmissionSubmissionError("The server did not return an admission reference. Check Student records before trying again.", true);
  const warnings = Array.isArray(data.upload_warnings) ? data.upload_warnings.map(String) : [];
  if (isRte && rteDocument && data.id) {
    const rte = new FormData();
    rte.append("admission", String(data.id)); rte.append("document_name", "RTE Verification Document"); rte.append("document_file", rteDocument);
    try { await responseData(await fetchWithAuth(`${API_BASE_URL}/rtedocument/`, { method: "POST", body: rte })); }
    catch (error) { warnings.push(`RTE document was not saved: ${error instanceof Error ? error.message : "Upload failed"}. Add it from Student records.`); }
  }
  return { admissionNumber: String(admissionNumber), warnings };
}
