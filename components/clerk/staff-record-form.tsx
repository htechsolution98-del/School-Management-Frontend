"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Loader2, Save, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import type { CreateStaffPayload, Department, Staff, AttendanceSetting, SalaryStructure } from "@/types";
import type { LeaveTemplate } from "@/lib/clerk/leaves";
import type { StaffErrors } from "@/lib/clerk/hr-validation";

export interface StaffRole { id: string; label: string }

export function StaffRecordForm({
  value,
  onChange,
  errors,
  departments,
  roles,
  staff = [],
  attendanceSettings = [],
  leaveTemplates = [],
  salaryStructures = [],
  editing,
  saving,
  readOnly = false,
  onEdit,
  onApplyExisting,
  onSubmit,
  onClose,
  onDepartmentCreated,
}: {
  value: CreateStaffPayload;
  onChange: (field: keyof CreateStaffPayload, value: string | number | boolean | undefined) => void;
  errors: StaffErrors;
  departments: Department[];
  roles: StaffRole[];
  staff?: Staff[];
  attendanceSettings?: AttendanceSetting[];
  leaveTemplates?: LeaveTemplate[];
  salaryStructures?: SalaryStructure[];
  editing: boolean;
  saving: boolean;
  readOnly?: boolean;
  onEdit?: () => void;
  onApplyExisting?: (matched: Staff) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  onDepartmentCreated?: (department: Department) => void;
}) {
  const existingMember = useMemo(() => {
    if (editing || !staff || staff.length === 0) return null;
    const em = (value.email || "").trim().toLowerCase();
    const mob = (value.mobile || "").replace(/\D/g, "");
    if (!em && !mob) return null;
    return staff.find(s => (em && s.email?.toLowerCase().trim() === em) || (mob && (s.mobile || "").replace(/\D/g, "") === mob));
  }, [editing, staff, value.email, value.mobile]);

  const lastAutoFilledId = useRef<number | null>(null);

  useEffect(() => {
    if (editing || readOnly || !existingMember) {
      if (!existingMember) lastAutoFilledId.current = null;
      return;
    }
    if (lastAutoFilledId.current !== existingMember.id) {
      lastAutoFilledId.current = existingMember.id;
      if (onApplyExisting) {
        onApplyExisting(existingMember);
      }
    }
  }, [editing, readOnly, existingMember, onApplyExisting]);

  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 18);
  const maxDob = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  const isDepartmentRequired = true;
  const attrs = (field: keyof CreateStaffPayload) => ({ id: `staff-${field}`, "aria-invalid": !!errors[field], "aria-describedby": errors[field] ? `staff-${field}-error` : undefined });
  const error = (field: keyof CreateStaffPayload) => errors[field] && <p id={`staff-${field}-error`} className="hr-field-error">{errors[field]}</p>;

  const selectedDepartmentIds: number[] = Array.isArray(value.departments) && value.departments.length > 0
    ? (value.departments as number[])
    : (value.department ? [Number(value.department)] : []);

  const handleAddDepartment = (deptId: number) => {
    if (!selectedDepartmentIds.includes(deptId)) {
      const updated = [...selectedDepartmentIds, deptId];
      onChange("departments", updated as any);
      onChange("department", updated[0]);
    }
  };

  const handleRemoveDepartment = (deptId: number) => {
    const updated = selectedDepartmentIds.filter((id: number) => id !== deptId);
    onChange("departments", updated as any);
    onChange("department", updated[0] ?? undefined);
  };

  const handleExitDateChange = (date: string) => {
    onChange("exit_date", date);
    if (!date || !date.trim()) {
      onChange("is_active", true);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parts = date.split("-");
      if (parts.length === 3) {
        const exitD = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (exitD <= today) {
          onChange("is_active", false);
        } else {
          onChange("is_active", true);
        }
      }
    }
  };

  return <section className="hr-panel hr-staff-form">
    <div className="hr-panel-heading">
      <div>
        <h2>{readOnly ? "View staff record" : editing ? "Edit staff record" : (existingMember ? "Assign / Update staff member" : "Add a staff member")}</h2>
        <p>{readOnly ? "Viewing details of inactive / past staff member. This record is read-only." : "Personal details, employment information, and policy assignments. All marked fields are required."}</p>
      </div>
      <div className="flex items-center gap-2">
        {readOnly && onEdit && (
          <Button type="button" variant="outline" size="sm" onClick={onEdit} className="text-xs">
            Edit record
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" aria-label="Close staff form" disabled={saving} onClick={onClose}><X size={17} /></Button>
      </div>
    </div>
    <form onSubmit={onSubmit} noValidate>
      <fieldset disabled={saving || readOnly} className="space-y-6">
        {Object.keys(errors).length > 0 && <p role="alert" className="hr-error">Please correct the highlighted fields before saving.</p>}
        <div className="hr-form-section"><div><span>01</span><h3>Personal information</h3><p>Basic identity and contact details.</p></div><div className="hr-form-fields">
          <div><label htmlFor="staff-name">Full name</label><Input {...attrs("name")} value={value.name} minLength={2} maxLength={100} autoComplete="name" placeholder="e.g. Neha Patel (min. 2 characters)" onChange={e => onChange("name", e.target.value)} required />{error("name")}</div>
          <div><label htmlFor="staff-date_of_birth">Date of birth</label><DatePicker {...attrs("date_of_birth")} value={value.date_of_birth} max={maxDob} onChange={date => onChange("date_of_birth", date)} required />{error("date_of_birth")}<p className="hr-field-help">Must be at least 18 years old.</p></div>
          <div><label htmlFor="staff-email">Email address</label><Input {...attrs("email")} type="email" maxLength={254} autoComplete="email" value={value.email} placeholder="name@school.edu" onChange={e => onChange("email", e.target.value)} required />{error("email")}</div>
          <div><label htmlFor="staff-mobile">Mobile number</label><Input {...attrs("mobile")} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={value.mobile} placeholder="10-digit mobile number" onChange={e => { const clean = e.target.value.replace(/\D/g, "").slice(0, 10); onChange("mobile", clean); }} required />{error("mobile")}<p className="hr-field-help">10 numeric digits only.</p></div>
          <div className="hr-field-wide"><label htmlFor="staff-address">Address</label><textarea {...attrs("address")} rows={2} autoComplete="street-address" value={value.address} placeholder="Street, area and city" onChange={e => onChange("address", e.target.value)} className="hr-textarea" required />{error("address")}</div>
        </div></div>
        <div className="hr-form-section"><div><span>02</span><h3>Employment details</h3><p>Department, role, compensation, and policy assignments.</p></div><div className="hr-form-fields">
          <div className="hr-field-wide">
            <label htmlFor="staff-department" className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-700">
                Department(s) {isDepartmentRequired && <span className="text-red-500">*</span>}
              </span>
              {selectedDepartmentIds.length > 1 && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {selectedDepartmentIds.length} Departments Selected
                </span>
              )}
            </label>

            {selectedDepartmentIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50/70 rounded-xl border border-slate-200/80">
                {selectedDepartmentIds.map(id => {
                  const dept = departments.find(d => d.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                    >
                      <span>{dept?.name || `Department #${id}`}</span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(id)}
                          className="text-indigo-400 hover:text-rose-600 transition-colors ml-0.5 font-bold"
                          title={`Remove ${dept?.name || "department"}`}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {!readOnly && (
              <select
                id="staff-department"
                aria-invalid={!!errors.department}
                aria-describedby={errors.department ? "staff-department-error" : undefined}
                value=""
                onChange={e => {
                  if (e.target.value) {
                    handleAddDepartment(Number(e.target.value));
                  }
                }}
                className="w-full"
              >
                <option value="">
                  {selectedDepartmentIds.length === 0
                    ? "Select department(s)..."
                    : "+ Add another department..."}
                </option>
                {departments
                  .filter(d => !selectedDepartmentIds.includes(d.id))
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            )}
            {error("department")}
            <p className="hr-field-help text-[11px] text-slate-400 mt-1">
              One person can work in multiple departments. Select all departments that apply.
            </p>
          </div>
          <div><label htmlFor="staff-category">Role</label><select {...attrs("category")} value={value.category} onChange={e => onChange("category", e.target.value)} required><option value="">Select role</option>{roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select>{error("category")}</div>
          <div><label htmlFor="staff-joining_date">Joining date</label><DatePicker {...attrs("joining_date")} value={value.joining_date ?? ""} onChange={date => onChange("joining_date", date)} className="w-full" />{error("joining_date")}</div>
          <div><label htmlFor="staff-exit_date">Exit date (Last working date)</label><DatePicker {...attrs("exit_date")} value={value.exit_date ?? ""} onChange={handleExitDateChange} className="w-full" />{error("exit_date")}</div>
          <div><label htmlFor="staff-salary">Monthly salary (INR)</label><Input {...attrs("salary")} type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal" value={value.salary} placeholder="0.00" onChange={e => onChange("salary", e.target.value)} required />{error("salary")}</div>
          <div className="flex flex-col justify-center">
            <label htmlFor="staff-is_active" className="text-xs font-bold text-slate-700 block mb-1">
              Employment status
            </label>
            <div className="flex items-center gap-3 h-10 px-3 rounded-xl border border-slate-200 bg-white">
              <Switch
                id="staff-is_active"
                checked={!!value.is_active}
                disabled={saving || readOnly}
                onCheckedChange={(checked) => onChange("is_active", checked)}
                className="data-checked:bg-emerald-600"
              />
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  value.is_active
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-slate-100 text-slate-500 border border-slate-200/60"
                }`}
              >
                {value.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {error("is_active")}
          </div>
          <div>
            <label htmlFor="staff-attendance_setting">Attendance Shift</label>
            <select
              {...attrs("attendance_setting")}
              value={value.attendance_setting ?? ""}
              onChange={e => onChange("attendance_setting", e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Default / None</option>
              {attendanceSettings.map(setting => (
                <option key={setting.id} value={setting.id}>
                  {setting.name || `Shift #${setting.id}`} ({setting.check_in_time?.slice(0, 5)} - {setting.check_out_time?.slice(0, 5)})
                </option>
              ))}
            </select>
            {error("attendance_setting")}
          </div>
          <div>
            <label htmlFor="staff-leave_template">Leave Policy</label>
            <select
              {...attrs("leave_template")}
              value={value.leave_template ?? ""}
              onChange={e => onChange("leave_template", e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Default / None</option>
              {leaveTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name || `Policy #${template.id}`} {template.time_line ? `(${template.time_line})` : ""}
                </option>
              ))}
            </select>
            {error("leave_template")}
          </div>
          <div>
            <label htmlFor="staff-salary_structure">Salary Structure</label>
            <select
              {...attrs("salary_structure")}
              value={value.salary_structure ?? ""}
              onChange={e => onChange("salary_structure", e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Default / None</option>
              {salaryStructures.map(structure => (
                <option key={structure.id} value={structure.id}>
                  {structure.name} (Base: ₹{structure.base_salary || 0})
                </option>
              ))}
            </select>
            {error("salary_structure")}
          </div>
        </div></div>
        <div className="hr-form-footer">
          {readOnly ? (
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="office-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saving ? "Saving..." : editing ? "Save changes" : (existingMember ? "Save staff member" : "Create staff member")}</Button>
            </>
          )}
        </div>
      </fieldset>
    </form>
  </section>;
}
