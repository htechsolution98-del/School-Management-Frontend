"use client";

import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { fieldOptions, isBirthField, isAadhaarAdmissionField, isClassField, isEmailField, isPhoneField, isPinField, type AdmissionField } from "@/lib/admission-validation";
import { toInputDate } from "@/lib/table-utils";

export function AdmissionFieldInput({ field, value, onChange, error, disabled, prefix = "field-input", classes = [] }: {
  field: AdmissionField; value: unknown; onChange: (value: string | boolean) => void; error?: string; disabled?: boolean; prefix?: string; classes?: { id: number; school_class: string; name?: string }[];
}) {
  const id = `${prefix}-${field.id}`;
  const [latestBirthDate] = useState(() => { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); return toInputDate(yesterday); });
  const common = { id, disabled, "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined, className: `w-full rounded-lg border bg-white px-3 py-2 text-sm ${error ? "border-red-400" : "border-slate-200"}` };
  const options = isClassField(field) && !fieldOptions(field).length ? classes.map(cls => ({ value: String(cls.id), label: cls.school_class || cls.name || String(cls.id) })) : fieldOptions(field);
  const stringValue = typeof value === "boolean" ? String(value) : String(value ?? "");
  return <div className="space-y-1.5">
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700">{field.label}{(field.is_required ?? field.required) && <span className="ml-1 text-red-500">*</span>}</label>
    {field.field_type === "select" ? <select {...common} value={stringValue} onChange={event => onChange(event.target.value)}><option value="">Select {field.label}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : field.field_type === "radio" ? <fieldset disabled={disabled} id={id} aria-label={field.label} aria-describedby={common["aria-describedby"]} className="flex flex-wrap gap-3">{options.map(option => <label key={option.value} className="flex items-center gap-2 text-sm"><input type="radio" name={id} value={option.value} checked={stringValue === option.value} onChange={() => onChange(option.value)} />{option.label}</label>)}</fieldset>
      : field.field_type === "checkbox" ? <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"><input id={id} type="checkbox" checked={value === true || value === "true"} onChange={event => onChange(event.target.checked)} disabled={disabled} aria-invalid={!!error} aria-describedby={common["aria-describedby"]} />{field.label}</label>
      : field.field_type === "date" || isBirthField(field) ? <DatePicker {...common} value={stringValue} max={isBirthField(field) ? latestBirthDate : undefined} onChange={onChange} />
      : field.field_type === "textarea" ? <textarea {...common} value={stringValue} maxLength={2000} rows={3} onChange={event => onChange(event.target.value)} />
      : <Input {...common} type={isEmailField(field) ? "email" : isPhoneField(field) ? "tel" : "text"} inputMode={isPhoneField(field) || isAadhaarAdmissionField(field) || isPinField(field) ? "numeric" : field.field_type === "number" ? "decimal" : undefined} value={stringValue} maxLength={isAadhaarAdmissionField(field) ? 14 : isPhoneField(field) ? 16 : isPinField(field) ? 6 : 255} onChange={event => onChange(event.target.value)} />}
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
}
