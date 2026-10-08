"use client";

import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import type { CreateStaffPayload, Department } from "@/types";
import type { StaffErrors } from "@/lib/clerk/hr-validation";

export interface StaffRole { id: string; label: string }

export function StaffRecordForm({ value, onChange, errors, departments, roles, editing, saving, onSubmit, onClose }: {
  value: CreateStaffPayload;
  onChange: (field: keyof CreateStaffPayload, value: string | number | boolean | undefined) => void;
  errors: StaffErrors;
  departments: Department[];
  roles: StaffRole[];
  editing: boolean;
  saving: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}) {
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 18);
  const maxDob = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  const attrs = (field: keyof CreateStaffPayload) => ({ id: `staff-${field}`, "aria-invalid": !!errors[field], "aria-describedby": errors[field] ? `staff-${field}-error` : undefined });
  const error = (field: keyof CreateStaffPayload) => errors[field] && <p id={`staff-${field}-error`} className="hr-field-error">{errors[field]}</p>;
  return (
    <section className="hr-panel hr-staff-form bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-md shadow-indigo-500/5">
      <div className="hr-panel-heading flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
            {editing ? "Edit Staff Record" : "Add a Staff Member"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personal details and employment information. All fields marked with valid data are required.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close staff form"
          disabled={saving}
          onClick={onClose}
          className="rounded-xl h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <X size={18} />
        </Button>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={saving} className="space-y-6">
          {Object.keys(errors).length > 0 && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              Please correct the highlighted fields before saving.
            </div>
          )}

          {/* ── Section 01: Personal Information ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 pb-6 border-b border-slate-100 dark:border-zinc-800">
            <div className="md:col-span-4 space-y-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-[#5826df] font-bold text-xs">
                01
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Personal Information</h3>
              <p className="text-xs text-slate-500">Basic identity and contact details.</p>
            </div>
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="staff-name" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  {...attrs("name")}
                  value={value.name}
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="e.g. Neha Patel"
                  onChange={e => onChange("name", e.target.value)}
                  className="rounded-xl"
                  required
                />
                {error("name")}
              </div>

              <div>
                <label htmlFor="staff-date_of_birth" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <DatePicker
                  {...attrs("date_of_birth")}
                  value={value.date_of_birth}
                  max={maxDob}
                  onChange={date => onChange("date_of_birth", date)}
                  required
                />
                {error("date_of_birth")}
                <p className="text-[11px] text-slate-400 mt-1">Must be at least 18 years old.</p>
              </div>

              <div>
                <label htmlFor="staff-email" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <Input
                  {...attrs("email")}
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={value.email}
                  placeholder="name@school.edu"
                  onChange={e => onChange("email", e.target.value)}
                  className="rounded-xl"
                  required
                />
                {error("email")}
              </div>

              <div>
                <label htmlFor="staff-mobile" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <Input
                  {...attrs("mobile")}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={value.mobile}
                  placeholder="10-digit mobile number"
                  onChange={e => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                    onChange("mobile", clean);
                  }}
                  className="rounded-xl"
                  required
                />
                {error("mobile")}
                <p className="text-[11px] text-slate-400 mt-1">10 numeric digits only.</p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="staff-address" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  {...attrs("address")}
                  rows={2}
                  autoComplete="street-address"
                  value={value.address}
                  placeholder="Street, area, city and pincode"
                  onChange={e => onChange("address", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#5826df] focus:ring-3 focus:ring-[#5826df]/20 transition-all"
                  required
                />
                {error("address")}
              </div>
            </div>
          </div>

          {/* ── Section 02: Employment Details ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 pb-6 border-b border-slate-100 dark:border-zinc-800">
            <div className="md:col-span-4 space-y-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-[#5826df] font-bold text-xs">
                02
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Employment Details</h3>
              <p className="text-xs text-slate-500">Department, role, compensation, and status.</p>
            </div>
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="staff-department" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  {...attrs("department")}
                  value={value.department ?? ""}
                  onChange={e => onChange("department", e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#5826df] focus:ring-3 focus:ring-[#5826df]/20 transition-all"
                  required
                >
                  <option value="">Select department</option>
                  {departments.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {error("department")}
              </div>

              <div>
                <label htmlFor="staff-category" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Role <span className="text-rose-500">*</span>
                </label>
                <select
                  {...attrs("category")}
                  value={value.category}
                  onChange={e => onChange("category", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#5826df] focus:ring-3 focus:ring-[#5826df]/20 transition-all"
                  required
                >
                  <option value="">Select role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {error("category")}
              </div>

              <div>
                <label htmlFor="staff-salary" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Monthly Salary (INR) <span className="text-rose-500">*</span>
                </label>
                <Input
                  {...attrs("salary")}
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  inputMode="decimal"
                  value={value.salary}
                  placeholder="0.00"
                  onChange={e => onChange("salary", e.target.value)}
                  className="rounded-xl"
                  required
                />
                {error("salary")}
              </div>

              <div>
                <label htmlFor="staff-is_active" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Employment Status
                </label>
                <select
                  {...attrs("is_active")}
                  value={String(value.is_active)}
                  onChange={e => onChange("is_active", e.target.value === "true")}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#5826df] focus:ring-3 focus:ring-[#5826df]/20 transition-all"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                {error("is_active")}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-[#5826df] font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#5826df] hover:bg-[#4a1ec2] text-white rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 font-semibold px-5"
            >
              {saving ? <Loader2 size={15} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
              {saving ? "Saving..." : editing ? "Save changes" : "Create staff member"}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
