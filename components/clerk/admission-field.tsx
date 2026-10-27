"use client";

import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Check,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  fieldOptions,
  isBirthField,
  isAadhaarAdmissionField,
  isUdiseAdmissionField,
  isAbcAdmissionField,
  isClassField,
  isEmailField,
  isPhoneField,
  isPinField,
  type AdmissionField,
} from "@/lib/admission-validation";
import { toInputDate } from "@/lib/table-utils";

export type MobileVerificationStatus =
  | "unchecked"
  | "verified_new"
  | "duplicate_found"
  | "sibling_linked";

export function AdmissionFieldInput({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  prefix = "field-input",
  classes = [],
  mobileStatus,
  isVerifyingMobile,
  onVerifyMobile,
}: {
  field: AdmissionField;
  value: unknown;
  onChange: (value: string | boolean) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  prefix?: string;
  classes?: { id: number; school_class: string; name?: string }[];
  mobileStatus?: MobileVerificationStatus;
  isVerifyingMobile?: boolean;
  onVerifyMobile?: () => void;
}) {
  const id = `${prefix}-${field.id}`;
  const [latestBirthDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return toInputDate(yesterday);
  });
  const common = {
    id,
    disabled,
    onBlur,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
    className: `w-full rounded-lg border bg-white px-3 py-2 text-sm ${error ? "border-red-400" : "border-slate-200"}`,
  };
  const options =
    isClassField(field) && !fieldOptions(field).length
      ? classes.map((cls) => ({
          value: String(cls.id),
          label: cls.school_class || cls.name || String(cls.id),
        }))
      : fieldOptions(field);
  const stringValue = typeof value === "boolean" ? String(value) : String(value ?? "");

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (isAadhaarAdmissionField(field)) {
      val = val.replace(/\D/g, "").slice(0, 12);
    } else if (isUdiseAdmissionField(field)) {
      val = val.replace(/\D/g, "").slice(0, 11);
    } else if (isAbcAdmissionField(field)) {
      val = val.replace(/\D/g, "").slice(0, 12);
    } else if (isPhoneField(field)) {
      val = val.replace(/\D/g, "").slice(0, 10);
    } else if (isPinField(field)) {
      val = val.replace(/\D/g, "").slice(0, 6);
    }
    onChange(val);
  };

  const placeholderText = isAadhaarAdmissionField(field)
    ? "12-digit Aadhaar number"
    : isUdiseAdmissionField(field)
    ? "11-digit UDISE number"
    : isAbcAdmissionField(field)
    ? "12-digit ABC / APAAR ID"
    : isPhoneField(field)
    ? "10-digit mobile number"
    : isPinField(field)
    ? "6-digit PIN code"
    : undefined;

  const maxLen = isAadhaarAdmissionField(field)
    ? 12
    : isUdiseAdmissionField(field)
    ? 11
    : isAbcAdmissionField(field)
    ? 12
    : isPhoneField(field)
    ? 10
    : isPinField(field)
    ? 6
    : 255;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
        {field.label}
        {(field.is_required ?? field.required) && <span className="ml-1 text-red-500">*</span>}
      </label>
      {field.field_type === "select" ? (
        <select {...common} value={stringValue} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select {field.label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.field_type === "radio" ? (
        <fieldset
          disabled={disabled}
          id={id}
          aria-label={field.label}
          aria-describedby={common["aria-describedby"]}
          className="flex flex-wrap gap-3"
        >
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={stringValue === option.value}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : field.field_type === "checkbox" ? (
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={value === true || value === "true"}
            onChange={(event) => onChange(event.target.checked)}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={common["aria-describedby"]}
          />
          {field.label}
        </label>
      ) : field.field_type === "date" || isBirthField(field) ? (
        <DatePicker
          {...common}
          value={stringValue}
          max={isBirthField(field) ? latestBirthDate : undefined}
          onChange={onChange}
        />
      ) : field.field_type === "textarea" ? (
        <textarea
          {...common}
          value={stringValue}
          maxLength={2000}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : isPhoneField(field) ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                {...common}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm pr-9 transition-colors ${
                  mobileStatus === "duplicate_found"
                    ? "border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500"
                    : mobileStatus === "verified_new" || mobileStatus === "sibling_linked"
                    ? "border-emerald-500 ring-1 ring-emerald-500 focus-visible:ring-emerald-500"
                    : error
                    ? "border-red-400"
                    : "border-slate-200"
                }`}
                type="tel"
                inputMode="numeric"
                placeholder={placeholderText}
                value={stringValue}
                maxLength={maxLen}
                onChange={handleTextChange}
                onBlur={onBlur}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                {mobileStatus === "duplicate_found" && (
                  <span title="Existing record found with this mobile" className="text-red-500 flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 fill-red-50" />
                  </span>
                )}
                {(mobileStatus === "verified_new" || mobileStatus === "sibling_linked") && (
                  <span title={mobileStatus === "sibling_linked" ? "Sibling Linked" : "Verified New"} className="text-emerald-600 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-50" />
                  </span>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant={
                mobileStatus === "verified_new" || mobileStatus === "sibling_linked"
                  ? "outline"
                  : mobileStatus === "duplicate_found"
                  ? "destructive"
                  : "default"
              }
              size="sm"
              disabled={disabled || isVerifyingMobile || stringValue.replace(/\D/g, "").length !== 10}
              onClick={onVerifyMobile}
              className={`h-9 px-3 text-xs font-semibold rounded-lg shrink-0 gap-1.5 transition-all ${
                mobileStatus === "verified_new" || mobileStatus === "sibling_linked"
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : mobileStatus === "duplicate_found"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "office-primary text-white"
              }`}
            >
              {isVerifyingMobile ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : mobileStatus === "verified_new" || mobileStatus === "sibling_linked" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Verified</span>
                </>
              ) : mobileStatus === "duplicate_found" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Re-verify</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verify</span>
                </>
              )}
            </Button>
          </div>

          {mobileStatus === "duplicate_found" && (
            <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              Existing family found with this mobile. Auto-fill as sibling or change number.
            </p>
          )}
          {mobileStatus === "verified_new" && (
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Verified as new mobile number.
            </p>
          )}
          {mobileStatus === "sibling_linked" && (
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Linked to existing family / sibling.
            </p>
          )}
        </div>
      ) : (
        <Input
          {...common}
          type={isEmailField(field) ? "email" : "text"}
          inputMode={
            isAadhaarAdmissionField(field) ||
            isUdiseAdmissionField(field) ||
            isAbcAdmissionField(field) ||
            isPinField(field)
              ? "numeric"
              : field.field_type === "number"
              ? "decimal"
              : undefined
          }
          placeholder={placeholderText}
          value={stringValue}
          maxLength={maxLen}
          onChange={handleTextChange}
        />
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
