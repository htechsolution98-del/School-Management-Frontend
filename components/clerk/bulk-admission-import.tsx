"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, ChevronDown, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AdmissionFieldInput } from "./admission-field";
import { admissionFields, isClassField, normalizeAdmissionValue, validateAdmissionFile, validateAdmissionValues, type AdmissionConfig, type AdmissionValues } from "@/lib/admission-validation";
import { admissionIdentityKeys, downloadAdmissionTemplate, downloadExcelBytes, readAdmissionWorkbook, type AdmissionImportRow } from "@/lib/clerk/admission-import";
import { submitAdmission, AdmissionSubmissionError } from "@/lib/clerk/admission-submit";
import { fetchAdmissions } from "@/lib/clerk/admissions";

export function BulkAdmissionImport({ form, academicYear, classes, onBusyChange }: { form: AdmissionConfig; academicYear: string; classes: { id: number; school_class: string }[]; onBusyChange?: (busy: boolean) => void }) {
  const [rows, setRows] = useState<AdmissionImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deferDocuments, setDeferDocuments] = useState(false);
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [fileName, setFileName] = useState("");
  const [page, setPage] = useState(1);
  const lock = useRef(false);
  const cancel = useRef(false);
  const fields = admissionFields(form);

  useEffect(() => () => { cancel.current = true; }, []);

  const rowErrors = (row: AdmissionImportRow, seen?: Map<string, number>) => {
    if (row.status === "saved") return [];
    const errors = [...row.errors.filter(error => !error.startsWith("Duplicate")), ...Object.values(validateAdmissionValues(fields, row.values))];
    const classField = fields.find(isClassField);
    if (classField && row.values[classField.id] && !classes.some(cls => String(cls.id) === String(row.values[classField.id]) || cls.school_class === row.values[classField.id])) errors.push("Select a class belonging to this school");
    for (const key of admissionIdentityKeys(form, row.values)) {
      if (existingKeys.has(key)) errors.push("Student already has an admission. Review Student records.");
      const previous = seen?.get(key);
      if (previous && previous !== row.rowNumber) errors.push(`Duplicate student in row ${previous}`);
      seen?.set(key, previous ?? row.rowNumber);
    }
    if (!deferDocuments) for (const document of form.document_fields) if (document.is_required && !row.documents[document.id]) errors.push(`Attach ${document.label}, or choose to add documents later`);
    return [...new Set(errors)];
  };
  const seen = new Map<string, number>();
  const reviewed = rows.map(row => ({ row, errors: rowErrors(row, seen) }));
  const ready = reviewed.filter(({ row, errors }) => !errors.length && ["ready", "invalid", "failed"].includes(row.status));
  const saved = rows.filter(row => row.status === "saved").length;
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pageCount);

  const setWorking = (value: boolean) => { lock.current = value; setBusy(value); onBusyChange?.(value); };
  const updateRow = (rowNumber: number, change: Partial<AdmissionImportRow>) => setRows(current => current.map(row => row.rowNumber === rowNumber ? { ...row, ...change } : row));

  async function loadFile(file: File) {
    if (lock.current) return;
    setWorking(true); setError("");
    try {
      const [imported, admissions] = await Promise.all([readAdmissionWorkbook(file, form), fetchAdmissions()]);
      const keys = new Set<string>();
      for (const admission of admissions) {
        const values: AdmissionValues = {};
        for (const field of fields) {
          const record = admission.field_values?.find(value => value.field === field.id || value.field_label?.toLowerCase().trim() === field.label.toLowerCase().trim());
          if (record) values[field.id] = normalizeAdmissionValue(field, record.value);
        }
        if (Object.keys(values).length) admissionIdentityKeys(form, values).forEach(key => keys.add(key));
      }
      for (const row of imported) for (const field of fields.filter(isClassField)) {
        const match = classes.find(cls => cls.school_class.toLowerCase() === String(row.values[field.id]).toLowerCase());
        if (match) row.values[field.id] = String(match.id);
      }
      setExistingKeys(keys); setRows(imported); setExpanded(null); setPage(1); setCompleted(0); setFileName(file.name);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not read the Excel file. Download and use the current template."); }
    finally { setWorking(false); }
  }

  async function importRows() {
    if (lock.current || !ready.length) return;
    setWorking(true); setError(""); setCompleted(0); setProcessingTotal(ready.length); cancel.current = false;
    let imported = 0;
    try {
      for (const { row } of ready) {
        if (cancel.current) break;
        try {
          const result = await submitAdmission({ form, values: row.values, academicYear, documents: row.documents });
          updateRow(row.rowNumber, { status: "saved", admissionNumber: result.admissionNumber, message: result.warnings.join("; "), errors: [] });
          admissionIdentityKeys(form, row.values).forEach(key => existingKeys.add(key));
          imported++;
        } catch (error) {
          // A dropped connection may follow a successful server write; do not retry it automatically.
          const message = error instanceof Error ? error.message : "Request failed";
          const uncertain = !(error instanceof AdmissionSubmissionError) || error.uncertain;
          updateRow(row.rowNumber, { status: uncertain ? "uncertain" : "failed", message: uncertain ? `${message}. Check Student records before re-importing this row.` : message });
        }
        setCompleted(value => value + 1);
      }
      (imported ? toast.success : toast.error)(`${imported} admission${imported === 1 ? "" : "s"} saved. Review row results below.`);
    } finally { setWorking(false); }
  }

  async function exportResults() {
    try {
      const ExcelJS = await import("exceljs");
      const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet("Import results");
      sheet.columns = [{ header: "Excel row", key: "row", width: 12 }, { header: "Result", key: "status", width: 18 }, { header: "Admission number", key: "reference", width: 32 }, { header: "Details", key: "details", width: 90 }];
      for (const { row, errors } of reviewed) sheet.addRow({ row: row.rowNumber, status: row.status === "saved" ? "Saved" : errors.length ? "Needs correction" : row.status, reference: row.admissionNumber || "", details: [row.message, ...errors].filter(Boolean).join("; ") });
      downloadExcelBytes(new Uint8Array(await book.xlsx.writeBuffer()), "admission-import-results.xlsx");
    } catch { toast.error("Could not download the results. Please try again."); }
  }

  return <section className="office-section space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="rounded-xl bg-teal-50 p-3 text-teal-700"><FileSpreadsheet size={23} /></span><div><h2 className="font-bold text-slate-900">Import admissions from Excel</h2><p className="mt-1 text-xs text-slate-500">Download this form’s template, fill one student per row, then review before importing.</p></div></div><button type="button" disabled={busy} onClick={() => downloadAdmissionTemplate(form, classes).catch(() => toast.error("Could not download the template"))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold disabled:opacity-50"><Download size={15} />Download template</button></div>
    <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/30 p-7 text-center ${busy ? "pointer-events-none opacity-50" : "hover:bg-teal-50"}`}><Upload className="text-teal-600" size={25} /><span className="text-sm font-semibold text-slate-800">{fileName || "Choose an Excel workbook"}</span><span className="text-xs text-slate-500">.xlsx / up to 5 MB / 500 students</span><input type="file" accept=".xlsx" disabled={busy} className="mt-2 max-w-full text-xs" onChange={event => { const file = event.target.files?.[0]; if (file) void loadFile(file); event.target.value = ""; }} /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {rows.length > 0 && <>
      <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Students in workbook", value: rows.length }, { label: "Ready to import", value: ready.length }, { label: "Saved admissions", value: saved }].map(stat => <div key={stat.label} className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{stat.label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p></div>)}</div>
      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm"><input type="checkbox" disabled={busy} checked={deferDocuments} onChange={event => setDeferDocuments(event.target.checked)} className="mt-1" /><span><strong>Add required documents later</strong><span className="mt-1 block text-xs text-slate-500">Applications will remain pending. Otherwise attach required documents per student using Review row.</span></span></label>
      <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Excel row</th><th className="p-3">Student</th><th className="p-3">Result</th><th className="p-3">Details</th><th className="p-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{reviewed.slice((currentPage - 1) * 10, currentPage * 10).map(({ row, errors }) => {
        const name = fields.find(field => field.map_to_student_field === "name" || /^(student (full )?|full )?name$/i.test(field.label));
        return <tr key={row.rowNumber}><td className="p-3">{row.rowNumber}</td><td className="p-3 font-semibold text-slate-800">{name ? String(row.values[name.id] || "Unnamed student") : `Student ${row.rowNumber - 1}`}</td><td className="p-3"><span className={`rounded-full px-2 py-1 font-semibold ${row.status === "saved" ? "bg-emerald-50 text-emerald-700" : errors.length || row.status === "uncertain" ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-700"}`}>{row.status === "saved" ? "Saved" : row.status === "uncertain" ? "Check records" : errors.length ? "Needs correction" : "Ready"}</span></td><td className="p-3"><div className="max-w-80 truncate" title={row.message || errors.join("; ")}>{row.admissionNumber || row.message || errors[0] || "Validated"}</div></td><td className="p-3 text-right"><button type="button" disabled={busy} onClick={() => setExpanded(expanded === row.rowNumber ? null : row.rowNumber)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold"><ChevronDown size={13} />Review row</button></td></tr>;
      })}</tbody></table></div>
      <div className="flex items-center justify-between text-xs text-slate-500"><span>Page {currentPage} of {pageCount}</span><div className="flex gap-2"><button type="button" disabled={busy || currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={busy || currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div></div>
      {expanded !== null && (() => { const row = rows.find(row => row.rowNumber === expanded); if (!row) return null; const errors = rowErrors(row); return <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/20 p-4"><h3 className="text-sm font-bold">Review Excel row {row.rowNumber}</h3>{(errors.length > 0 || row.message) && <div role="alert" className="space-y-1 text-xs text-amber-800">{[...errors, row.message].filter(Boolean).map((error, index) => <p key={index}>{error}</p>)}</div>}<fieldset disabled={busy || row.status === "saved" || row.status === "uncertain"} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(field => <AdmissionFieldInput key={field.id} prefix={`bulk-${row.rowNumber}`} field={field} value={row.values[field.id]} classes={classes} onChange={value => updateRow(row.rowNumber, { values: { ...row.values, [field.id]: value }, errors: [], status: "ready" })} />)}{form.document_fields.map(document => <label key={document.id} className="space-y-2 text-xs font-semibold text-slate-700">{document.label}{document.is_required ? " *" : ""}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="block w-full text-xs" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const error = validateAdmissionFile(file); if (error) { toast.error(error); event.target.value = ""; return; } updateRow(row.rowNumber, { documents: { ...row.documents, [document.id]: file } }); }} />{row.documents[document.id]?.name}</label>)}</fieldset></div>; })()}
      {busy && <div role="status" className="space-y-2 text-xs text-teal-700"><div className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Processing: {completed} rows completed</div><progress value={completed} max={Math.max(1, processingTotal)} className="h-2 w-full accent-teal-600" /></div>}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={exportResults} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold"><Download size={14} />Download results</button>{busy ? <button type="button" onClick={() => { cancel.current = true; }} className="rounded-lg border px-4 py-2 text-xs">Stop after current row</button> : <button type="button" disabled={!ready.length} onClick={importRows} className="office-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"><CheckCircle2 size={15} />Import {ready.length} ready students</button>}</div>
    </>}
  </section>;
}
