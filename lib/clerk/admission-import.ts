import { admissionFields, isAadhaarAdmissionField, isBirthField, normalizeAdmissionValue, validateAdmissionValues, type AdmissionConfig, type AdmissionValues } from "@/lib/admission-validation";

export interface AdmissionImportRow { rowNumber: number; values: AdmissionValues; errors: string[]; status: "ready" | "invalid" | "saved" | "failed" | "uncertain"; admissionNumber?: string; message?: string; documents: Record<number, File> }
const headerKey = (value: string) => value.toLowerCase().replace(/[\s*_]+/g, " ").trim();
export const importHeader = (field: { label: string; id: number }) => `${field.label} [${field.id}]`;
export function admissionIdentityKeys(form: AdmissionConfig, values: AdmissionValues): string[] {
  const fields = admissionFields(form);
  const aadhaar = fields.find(isAadhaarAdmissionField);
  const name = fields.find(field => field.map_to_student_field === "name" || /^(student (full )?|full )?name$/i.test(field.label));
  const dob = fields.find(isBirthField);
  const keys: string[] = [];
  if (aadhaar && values[aadhaar.id]) keys.push(`aadhaar:${normalizeAdmissionValue(aadhaar, values[aadhaar.id])}`);
  if (name && dob && values[name.id] && values[dob.id]) keys.push(`identity:${String(values[name.id]).trim().toLowerCase().replace(/\s+/g, " ")}:${normalizeAdmissionValue(dob, values[dob.id])}`);
  keys.push(`row:${fields.map(field => String(normalizeAdmissionValue(field, values[field.id])).toLowerCase()).join("\u001f")}`);
  return keys;
}
export async function readAdmissionWorkbook(file: File, form: AdmissionConfig): Promise<AdmissionImportRow[]> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an Excel .xlsx file. Save older .xls files as .xlsx first.");
  if (file.size > 5 * 1024 * 1024 || !file.size) throw new Error("Choose a non-empty Excel file up to 5 MB.");
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet("Admissions") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no worksheet.");
  if (sheet.rowCount > 501 || sheet.columnCount > 200) throw new Error("Import up to 500 student rows and 200 columns at a time.");
  const fields = admissionFields(form);
  const columns = new Map<number, number>();
  sheet.getRow(1).eachCell((cell: any, column: any) => {
    const header = cell.text.trim();
    if (!header) return;
    const match = /\[(\d+)\]$/.exec(header);
    const candidates = match ? fields.filter(field => field.id === Number(match[1])) : fields.filter(field => headerKey(field.label) === headerKey(header));
    if (candidates.length !== 1) throw new Error(`Column "${header}" does not match this form uniquely. Download the current template.`);
    if (columns.has(candidates[0].id)) throw new Error(`Duplicate column for ${candidates[0].label}.`);
    columns.set(candidates[0].id, column);
  });
  const missing = fields.filter(field => (field.is_required ?? field.required) && !columns.has(field.id));
  if (missing.length) throw new Error(`Missing required columns: ${missing.map(field => field.label).join(", ")}`);
  const seen = new Map<string, number>();
  const rows: AdmissionImportRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (![...columns.values()].some(column => row.getCell(column).text.trim())) continue;
    const values: AdmissionValues = {};
    const errors: string[] = [];
    for (const field of fields) {
      const column = columns.get(field.id);
      const cell = column ? row.getCell(column) : undefined;
      let value: unknown = cell?.value ?? "";
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("formula" in value || "sharedFormula" in value || "error" in value) { errors.push(`${field.label}: replace formulas/errors with a plain value`); value = ""; }
        else value = cell?.text ?? "";
      }
      if ((field.field_type === "date" || isBirthField(field)) && typeof value === "number") value = new Date(Date.UTC(1899, 11, 30) + (value + (workbook.properties.date1904 ? 1462 : 0)) * 86400000);
      if (value instanceof Date) value = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
      if (field.field_type === "checkbox" && value !== "" && !/^(true|false|yes|no|1|0)$/i.test(String(value))) errors.push(`${field.label}: use Yes or No`);
      values[field.id] = normalizeAdmissionValue(field, value);
    }
    errors.push(...Object.values(validateAdmissionValues(fields, values)));
    for (const key of admissionIdentityKeys(form, values)) {
      const previous = seen.get(key);
      if (previous && !errors.some(error => error.startsWith("Duplicate"))) errors.push(`Duplicate student in row ${previous}`);
      if (!previous) seen.set(key, rowNumber);
    }
    rows.push({ rowNumber, values, errors, status: errors.length ? "invalid" : "ready", documents: {} });
  }
  if (!rows.length) throw new Error("No student rows found. Keep headers in row 1 and enter students from row 2.");
  return rows;
}
export async function downloadAdmissionTemplate(form: AdmissionConfig, classes: { id: number; school_class: string }[]) {
  const ExcelJS = await import("exceljs");
  const { fieldOptions, isClassField } = await import("@/lib/admission-validation");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Admissions", { views: [{ state: "frozen", ySplit: 1 }] });
  const fields = admissionFields(form);
  sheet.columns = fields.map(field => ({ header: importHeader(field), key: String(field.id), width: 26, style: { numFmt: "@" } }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173044" } };
  sheet.getRow(1).height = 28;
  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ header: "Field", width: 35 }, { header: "Required", width: 12 }, { header: "Format / allowed values", width: 90 }];
  for (const field of fields) {
    const options = isClassField(field) && !fieldOptions(field).length ? classes.map(cls => ({ value: String(cls.id), label: cls.school_class })) : fieldOptions(field);
    const format = field.field_type === "date" || isBirthField(field) ? "DD/MM/YYYY" : field.field_type === "checkbox" ? "Yes / No" : options.length ? options.map(option => `${option.label} (${option.value})`).join(", ") : "Plain text; keep mobile numbers and IDs as text";
    instructions.addRow([importHeader(field), field.is_required ?? field.required ? "Yes" : "No", format]);
    sheet.getRow(1).getCell(String(field.id)).note = `${field.is_required ?? field.required ? "Required. " : "Optional. "}${format}`;
  }
  instructions.addRow(["Import limits", "", "500 students / 5 MB. Do not rename column headers. Do not enter formulas."]);
  instructions.addRow(["Documents", "", "Attach documents per student after preview, or choose to defer them. Applications are created as pending."]);
  const buffer = await workbook.xlsx.writeBuffer();
  downloadExcelBytes(new Uint8Array(buffer), `admission-template-${form.id}.xlsx`);
}
export function downloadExcelBytes(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
