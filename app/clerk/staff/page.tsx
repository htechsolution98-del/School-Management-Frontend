"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Edit2, Loader2, Power, RefreshCw, Trash2, UserPlus, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/superadmin/status-badge";
import { StaffRecordForm, type StaffRole } from "@/components/clerk/staff-record-form";
import { createStaff, getStaffCategories, getStaffList, updateStaff, deleteStaff, getDepartments } from "@/lib/staff";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";
import { formatDDMMYYYY, toInputDate } from "@/lib/table-utils";
import { normalizePhone, validateStaffRecord, type StaffErrors } from "@/lib/clerk/hr-validation";
import {
  getAttendanceSettings,
  getSalaryStructures,
} from "@/lib/hr-config";
import { getLeaveTemplates, type LeaveTemplate } from "@/lib/clerk/leaves";
import type { CreateStaffPayload, Staff, Department, AttendanceSetting, SalaryStructure } from "@/types";
import "../clerk-workspace.css";

interface StaffFeature { id?: number; feature_id?: number; feature_name?: string }
const EMPTY_FORM: CreateStaffPayload = { name: "", email: "", mobile: "", category: "", department: undefined, attendance_setting: undefined, leave_template: undefined, salary_structure: undefined, address: "", date_of_birth: "", joining_date: "", salary: "", is_active: true };
const ALLOWED_ROLES = ["TEACHER", "CLERK", "ASSISTANT CLERK", "LIBRARIAN", "FEES MANAGEMENT", "PRINCIPAL", "VICE PRINCIPAL", "TRANSPORTATION", "INVENTORY"];
const message = (err: unknown, fallback: string) => err instanceof Error ? err.message : fallback;
const title = (value: string) => value.toLowerCase().replace(/\b\w/g, character => character.toUpperCase());

export default function ClerkStaffDashboard() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [features, setFeatures] = useState<StaffFeature[]>([]);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSetting[]>([]);
  const [leaveTemplates, setLeaveTemplates] = useState<LeaveTemplate[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<CreateStaffPayload>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<StaffErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busy = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      getStaffList(),
      getDepartments(),
      getStaffCategories(),
      getAttendanceSettings(),
      getLeaveTemplates(),
      getSalaryStructures(),
    ]);
    const failures: string[] = [];
    if (results[0].status === "fulfilled") setStaff(results[0].value); else failures.push(message(results[0].reason, "Could not load staff."));
    if (results[1].status === "fulfilled") setDepartments(results[1].value); else failures.push(message(results[1].reason, "Could not load departments."));
    if (results[2].status === "fulfilled") {
      const data = results[2].value;
      const raw: StaffFeature[] = Array.isArray(data) ? data : data?.results ?? [];
      const filtered = raw.filter(item => ALLOWED_ROLES.some(role => String(item.feature_name || "").toUpperCase().trim().includes(role)));
      setFeatures(filtered.length ? filtered : raw);
    } else failures.push(message(results[2].reason, "Could not load staff roles."));
    if (results[3].status === "fulfilled") setAttendanceSettings(results[3].value);
    if (results[4].status === "fulfilled") setLeaveTemplates(results[4].value);
    if (results[5].status === "fulfilled") setSalaryStructures(results[5].value);
    setError(failures.join(" "));
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { if (!busy.current) void load(); };
    window.addEventListener("feature_status_changed", refresh);
    window.addEventListener("staff_status_changed", refresh);
    return () => { window.removeEventListener("feature_status_changed", refresh); window.removeEventListener("staff_status_changed", refresh); };
  }, [load]);

  const roles: StaffRole[] = useMemo(() => Array.from(new Map(features.filter(item => item.feature_id || item.id).map(item => [String(item.feature_id || item.id), { id: String(item.feature_id || item.id), label: title(item.feature_name || "Staff") }])).values()), [features]);
  const roleLabel = useCallback((category: string) => {
    const match = features.find(item => String(item.feature_id || item.id) === String(category) || String(item.feature_name || "").toUpperCase().trim() === String(category).toUpperCase().trim());
    return title(match?.feature_name || String(category || "-"));
  }, [features]);
  const active = staff.filter(member => member.is_active).length;
  const columns = useMemo<DataTableColumn<Staff>[]>(() => [
    { key: "name", header: "Staff member", sticky: true, search: member => [member.name, member.id], render: member => <div className="flex items-center gap-3"><span className="hr-avatar">{(member.name || "S").charAt(0).toUpperCase()}</span><span className="font-medium">{member.name || "-"} <span className="ml-2 text-xs font-normal text-slate-400">#{member.id}</span></span></div> },
    { key: "department", header: "Department", search: member => departments.find(item => item.id === member.department)?.name || "-", camelCase: false },
    { key: "category", header: "Role", search: member => roleLabel(member.category), camelCase: false },
    { key: "email", header: "Email", search: member => member.email, camelCase: false },
    { key: "mobile", header: "Mobile", search: member => member.mobile, camelCase: false },
    { key: "dob", header: "Date of birth", search: member => member.date_of_birth, render: member => formatDDMMYYYY(member.date_of_birth) },
    { key: "joining", header: "Joined", search: member => member.joining_date || member.created_at || "", render: member => formatDDMMYYYY(member.joining_date || member.created_at) },
    { key: "salary", header: "Salary (INR)", search: member => member.salary, numeric: true, render: member => member.salary == null ? "-" : Number(member.salary).toLocaleString("en-IN", { minimumFractionDigits: 2 }) },
    { key: "shift", header: "Shift", search: member => attendanceSettings.find(s => s.id === member.attendance_setting)?.name || "-", camelCase: false },
    { key: "structure", header: "Structure", search: member => salaryStructures.find(s => s.id === member.salary_structure)?.name || "-", camelCase: false },
    { key: "address", header: "Address", search: member => member.address, camelCase: false },
    { key: "status", header: "Status", search: member => member.is_active ? "Active" : "Inactive", render: member => <StatusBadge active={!!member.is_active} /> },
  ], [departments, roleLabel, attendanceSettings, salaryStructures]);

  const closeForm = () => { if (busy.current) return; setFormOpen(false); setEditing(null); setErrors({}); };
  const openForm = (member?: Staff) => {
    setError(""); setSuccess(""); setErrors({}); setEditing(member || null);
    const feature = member && features.find(item => String(item.feature_id || item.id) === String(member.category) || String(item.feature_name || "").toUpperCase().trim() === String(member.category).toUpperCase().trim());
    setForm(member ? {
      name: member.name || "",
      email: member.email || "",
      mobile: member.mobile || "",
      category: feature ? String(feature.feature_id || feature.id) : String(member.category),
      department: member.department ?? undefined,
      attendance_setting: member.attendance_setting ?? undefined,
      leave_template: member.leave_template ?? undefined,
      salary_structure: member.salary_structure ?? undefined,
      address: member.address || "",
      date_of_birth: toHTMLDate(member.date_of_birth),
      joining_date: toHTMLDate(member.joining_date),
      salary: member.salary || "",
      is_active: !!member.is_active,
    } : { ...EMPTY_FORM });
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    const fieldErrors = validateStaffRecord(form, staff, departments, roles.map(item => item.id), editing?.id);
    setErrors(fieldErrors); setError(""); setSuccess("");
    if (Object.keys(fieldErrors).length) { document.getElementById(`staff-${Object.keys(fieldErrors)[0]}`)?.focus(); return; }
    busy.current = true; setSaving(true);
    try {
      const formattedJoiningDate = form.joining_date?.trim() ? toInputDate(form.joining_date.trim()) : (editing ? null : undefined);
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: normalizePhone(form.mobile),
        address: form.address.trim(),
        salary: form.salary.trim(),
        date_of_birth: toApiDate(form.date_of_birth),
        joining_date: formattedJoiningDate,
        attendance_setting: form.attendance_setting ? Number(form.attendance_setting) : null,
        leave_template: form.leave_template ? Number(form.leave_template) : null,
        salary_structure: form.salary_structure ? Number(form.salary_structure) : null,
      };
      if (editing) await updateStaff(editing.id, payload); else await createStaff(payload);
      setSuccess(editing ? "Staff record updated successfully." : "Staff member created successfully.");
      setFormOpen(false); setEditing(null); setForm({ ...EMPTY_FORM });
      await load();
    } catch (err) { setError(message(err, "Could not save the staff record.")); }
    finally { busy.current = false; setSaving(false); }
  };

  const act = async (member: Staff, remove = false) => {
    if (busy.current) return;
    if (remove && !window.confirm(`Delete the staff record for ${member.name || "this member"}? This cannot be undone.`)) return;
    busy.current = true; setActionId(member.id); setError(""); setSuccess("");
    try {
      if (remove) await deleteStaff(member.id); else await updateStaff(member.id, { is_active: !member.is_active });
      if (editing?.id === member.id) { setFormOpen(false); setEditing(null); }
      setSuccess(remove ? "Staff record deleted." : `Staff member ${member.is_active ? "deactivated" : "activated"}.`);
      await load();
    } catch (err) { setError(message(err, "Could not update the staff record.")); }
    finally { busy.current = false; setActionId(null); }
  };

  const statCards = [
    {
      label: "Total staff",
      value: staff.length,
      icon: Users,
      gradient: "from-[#f3eeff] via-[#f7f3ff] to-[#ffffff]",
      border: "border-purple-200/80",
      badgeBg: "bg-[#5826df]",
      textColor: "text-[#2e1065]",
      iconColor: "text-white",
    },
    {
      label: "Active members",
      value: active,
      icon: UserCheck,
      gradient: "from-[#e8faf4] via-[#f0fdf9] to-[#ffffff]",
      border: "border-emerald-200/80",
      badgeBg: "bg-emerald-500",
      textColor: "text-emerald-950",
      iconColor: "text-white",
    },
    {
      label: "Inactive members",
      value: staff.length - active,
      icon: Power,
      gradient: "from-[#fff0f3] via-[#fff5f7] to-[#ffffff]",
      border: "border-rose-200/80",
      badgeBg: "bg-rose-500",
      textColor: "text-rose-950",
      iconColor: "text-white",
    },
    {
      label: "Departments",
      value: departments.length,
      icon: Building2,
      gradient: "from-[#eff6ff] via-[#f5f9ff] to-[#ffffff]",
      border: "border-blue-200/80",
      badgeBg: "bg-blue-500",
      textColor: "text-blue-950",
      iconColor: "text-white",
    },
  ];

  return <div className="clerk-page hr-page staff-page space-y-6">
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map(stat => (
        <div
          key={stat.label}
          className={`relative overflow-hidden rounded-2xl p-5 border bg-gradient-to-br ${stat.gradient} ${stat.border} shadow-sm hover:shadow-md transition-all`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {stat.label}
            </span>
            <div className={`w-9 h-9 rounded-xl ${stat.badgeBg} flex items-center justify-center shadow-sm`}>
              <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
            </div>
          </div>
          <p className={`text-3xl font-black tracking-tight mt-3 ${stat.textColor}`}>
            {loading ? <Loader2 size={24} className="animate-spin text-[#5826df]" /> : stat.value}
          </p>
        </div>
      ))}
    </section>

    {error && <p role="alert" className="hr-error">{error}</p>}
    {success && <p role="status" className="hr-success">{success}</p>}
    {!loading && (!roles.length || !departments.length) && <p className="hr-notice">{!departments.length ? <><Link href="/clerk/departments" className="underline">Create a department</Link> before adding staff. </> : null}{!roles.length ? "Staff roles are unavailable. Refresh or configure staff roles before saving." : ""}</p>}
    {formOpen && <div id="staff-record-editor" className="animate-in fade-in slide-in-from-top-4 duration-300"><StaffRecordForm value={form} errors={errors} departments={departments} roles={roles} editing={!!editing} saving={saving} onClose={closeForm} onSubmit={save} onChange={(field, value) => { setForm(previous => ({ ...previous, [field]: value })); setErrors(previous => ({ ...previous, [field]: undefined })); }} /></div>}
    
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">School Staff Directory</h2>
          <p className="text-xs text-slate-500">Search, filter and manage employment records.</p>
        </div>
        <div className="office-actions">
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:text-[#5826df] hover:border-indigo-200 font-semibold px-3.5 shadow-2xs" disabled={loading || saving || actionId !== null} onClick={() => void load()}><RefreshCw size={14} className={loading ? "animate-spin text-[#5826df]" : "text-slate-500"} /> Refresh</Button>
          <Button size="sm" className="bg-[#5826df] hover:bg-[#4a1ec2] text-white rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 font-semibold px-4" disabled={loading || saving || actionId !== null} onClick={() => openForm()}><UserPlus size={15} /> Add staff</Button>
        </div>
      </div>
      <DataTable data={staff} columns={columns} getRowId={member => member.id} createdDate createdDateRange search searchPlaceholder="Search name, email, mobile or department" loading={loading} emptyTitle="No staff records yet" emptyDescription="Add a staff member to start your directory." caption="Staff directory" minWidth={1050} filters={[
        { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }], match: (member, value) => (value === "active") === !!member.is_active },
        { key: "role", label: "Role", optionsFrom: rows => Array.from(new Set(rows.map(member => roleLabel(member.category)))).map(label => ({ value: label, label })), match: (member, value) => roleLabel(member.category) === value },
        { key: "department", label: "Department", optionsFrom: () => departments.map(item => ({ value: String(item.id), label: item.name })), match: (member, value) => String(member.department ?? "") === value },
      ]} renderActions={member => <div className="flex items-center gap-1">{[{ label: "Edit", icon: Edit2, onClick: () => openForm(member), color: "text-[#5826df] hover:bg-indigo-50 hover:text-[#4a1ec2]" }, { label: member.is_active ? "Deactivate" : "Activate", icon: Power, onClick: () => void act(member), color: "text-amber-600 hover:bg-amber-50" }, { label: "Delete", icon: Trash2, onClick: () => void act(member, true), color: "text-rose-600 hover:bg-rose-50" }].map(action => <button type="button" key={action.label} title={action.label} aria-label={`${action.label} ${member.name || "staff member"}`} disabled={loading || saving || actionId !== null} onClick={action.onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-40 ${action.color}`}>{actionId === member.id ? <Loader2 size={14} className="animate-spin" /> : <action.icon size={14} />}</button>)}</div>} />
    </div>
  </div>;
}
