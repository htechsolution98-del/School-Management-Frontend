"use client";

import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import type { CreateStaffPayload, Department, AttendanceSetting, SalaryStructure } from "@/types";
import type { LeaveTemplate } from "@/lib/clerk/leaves";
import type { StaffErrors } from "@/lib/clerk/hr-validation";

export interface StaffRole { id: string; label: string }

export function StaffRecordForm({
  value,
  onChange,
  errors,
  departments,
  roles,
  attendanceSettings = [],
  leaveTemplates = [],
  salaryStructures = [],
  editing,
  saving,
  onSubmit,
  onClose,
}: {
  value: CreateStaffPayload;
  onChange: (field: keyof CreateStaffPayload, value: string | number | boolean | undefined) => void;
  errors: StaffErrors;
  departments: Department[];
  roles: StaffRole[];
  attendanceSettings?: AttendanceSetting[];
  leaveTemplates?: LeaveTemplate[];
  salaryStructures?: SalaryStructure[];
  editing: boolean;
  saving: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}) {
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 18);
  const maxDob = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  const attrs = (field: keyof CreateStaffPayload) => ({ id: `staff-${field}`, "aria-invalid": !!errors[field], "aria-describedby": errors[field] ? `staff-${field}-error` : undefined });
  const error = (field: keyof CreateStaffPayload) => errors[field] && <p id={`staff-${field}-error`} className="hr-field-error">{errors[field]}</p>;
  return <section className="hr-panel hr-staff-form">
    <div className="hr-panel-heading"><div><h2>{editing ? "Edit staff record" : "Add a staff member"}</h2><p>Personal details, employment information, and policy assignments. All marked fields are required.</p></div><Button type="button" variant="ghost" size="icon" aria-label="Close staff form" disabled={saving} onClick={onClose}><X size={17} /></Button></div>
    <form onSubmit={onSubmit} noValidate>
      <fieldset disabled={saving} className="space-y-6">
        {Object.keys(errors).length > 0 && <p role="alert" className="hr-error">Please correct the highlighted fields before saving.</p>}
        <div className="hr-form-section"><div><span>01</span><h3>Personal information</h3><p>Basic identity and contact details.</p></div><div className="hr-form-fields">
          <div><label htmlFor="staff-name">Full name</label><Input {...attrs("name")} value={value.name} minLength={2} maxLength={100} autoComplete="name" placeholder="e.g. Neha Patel (min. 2 characters)" onChange={e => onChange("name", e.target.value)} required />{error("name")}</div>
          <div><label htmlFor="staff-date_of_birth">Date of birth</label><DatePicker {...attrs("date_of_birth")} value={value.date_of_birth} max={maxDob} onChange={date => onChange("date_of_birth", date)} required />{error("date_of_birth")}<p className="hr-field-help">Must be at least 18 years old.</p></div>
          <div><label htmlFor="staff-email">Email address</label><Input {...attrs("email")} type="email" maxLength={254} autoComplete="email" value={value.email} placeholder="name@school.edu" onChange={e => onChange("email", e.target.value)} required />{error("email")}</div>
          <div><label htmlFor="staff-mobile">Mobile number</label><Input {...attrs("mobile")} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={value.mobile} placeholder="10-digit mobile number" onChange={e => { const clean = e.target.value.replace(/\D/g, "").slice(0, 10); onChange("mobile", clean); }} required />{error("mobile")}<p className="hr-field-help">10 numeric digits only.</p></div>
          <div className="hr-field-wide"><label htmlFor="staff-address">Address</label><textarea {...attrs("address")} rows={2} autoComplete="street-address" value={value.address} placeholder="Street, area and city" onChange={e => onChange("address", e.target.value)} className="hr-textarea" required />{error("address")}</div>
        </div></div>
        <div className="hr-form-section"><div><span>02</span><h3>Employment details</h3><p>Department, role, compensation, and policy assignments.</p></div><div className="hr-form-fields">
          <div><label htmlFor="staff-department">Department</label><select {...attrs("department")} value={value.department ?? ""} onChange={e => onChange("department", e.target.value ? Number(e.target.value) : undefined)} required><option value="">Select department</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{error("department")}</div>
          <div><label htmlFor="staff-category">Role</label><select {...attrs("category")} value={value.category} onChange={e => onChange("category", e.target.value)} required><option value="">Select role</option>{roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select>{error("category")}</div>
          <div><label htmlFor="staff-joining_date">Joining date</label><DatePicker {...attrs("joining_date")} value={value.joining_date ?? ""} onChange={date => onChange("joining_date", date)} className="w-full" />{error("joining_date")}</div>
          <div><label htmlFor="staff-salary">Monthly salary (INR)</label><Input {...attrs("salary")} type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal" value={value.salary} placeholder="0.00" onChange={e => onChange("salary", e.target.value)} required />{error("salary")}</div>
          <div><label htmlFor="staff-is_active">Employment status</label><select {...attrs("is_active")} value={String(value.is_active)} onChange={e => onChange("is_active", e.target.value === "true")}><option value="true">Active</option><option value="false">Inactive</option></select>{error("is_active")}</div>
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
        <div className="hr-form-footer"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="office-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saving ? "Saving..." : editing ? "Save changes" : "Create staff member"}</Button></div>
      </fieldset>
    </form>
  </section>;
}
