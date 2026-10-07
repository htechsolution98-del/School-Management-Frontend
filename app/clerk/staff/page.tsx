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
import { formatDDMMYYYY } from "@/lib/table-utils";
import { normalizePhone, validateStaffRecord, type StaffErrors } from "@/lib/clerk/hr-validation";
import type { CreateStaffPayload, Staff, Department } from "@/types";
import "../clerk-workspace.css";

interface StaffFeature { id?: number; feature_id?: number; feature_name?: string }
const EMPTY_FORM: CreateStaffPayload = { name: "", email: "", mobile: "", category: "", department: undefined, address: "", date_of_birth: "", salary: "", is_active: true };
const ALLOWED_ROLES = ["TEACHER", "CLERK", "ASSISTANT CLERK", "LIBRARIAN", "FEES MANAGEMENT", "PRINCIPAL", "VICE PRINCIPAL", "TRANSPORTATION", "INVENTORY"];
const message = (err: unknown, fallback: string) => err instanceof Error ? err.message : fallback;
const title = (value: string) => value.toLowerCase().replace(/\b\w/g, character => character.toUpperCase());

export default function ClerkStaffDashboard() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [features, setFeatures] = useState<StaffFeature[]>([]);
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
    const results = await Promise.allSettled([getStaffList(), getDepartments(), getStaffCategories()]);
    const failures: string[] = [];
    if (results[0].status === "fulfilled") setStaff(results[0].value); else failures.push(message(results[0].reason, "Could not load staff."));
    if (results[1].status === "fulfilled") setDepartments(results[1].value); else failures.push(message(results[1].reason, "Could not load departments."));
    if (results[2].status === "fulfilled") {
      const data = results[2].value;
      const raw: StaffFeature[] = Array.isArray(data) ? data : data?.results ?? [];
      const filtered = raw.filter(item => ALLOWED_ROLES.some(role => String(item.feature_name || "").toUpperCase().trim().includes(role)));
      setFeatures(filtered.length ? filtered : raw);
    } else failures.push(message(results[2].reason, "Could not load staff roles."));
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
    { key: "joining", header: "Joined", search: member => member.joining_date, render: member => formatDDMMYYYY(member.joining_date) },
    { key: "salary", header: "Salary (INR)", search: member => member.salary, numeric: true, render: member => member.salary == null ? "-" : Number(member.salary).toLocaleString("en-IN", { minimumFractionDigits: 2 }) },
    { key: "address", header: "Address", search: member => member.address, camelCase: false },
    { key: "status", header: "Status", search: member => member.is_active ? "Active" : "Inactive", render: member => <StatusBadge active={!!member.is_active} /> },
  ], [departments, roleLabel]);

  const closeForm = () => { if (busy.current) return; setFormOpen(false); setEditing(null); setErrors({}); };
  const openForm = (member?: Staff) => {
    setError(""); setSuccess(""); setErrors({}); setEditing(member || null);
    const feature = member && features.find(item => String(item.feature_id || item.id) === String(member.category) || String(item.feature_name || "").toUpperCase().trim() === String(member.category).toUpperCase().trim());
    setForm(member ? { name: member.name || "", email: member.email || "", mobile: member.mobile || "", category: feature ? String(feature.feature_id || feature.id) : String(member.category), department: member.department ?? undefined, address: member.address || "", date_of_birth: toHTMLDate(member.date_of_birth), salary: member.salary || "", is_active: !!member.is_active } : { ...EMPTY_FORM });
    setFormOpen(true);
    requestAnimationFrame(() => document.getElementById("staff-record-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    const fieldErrors = validateStaffRecord(form, staff, departments, roles.map(item => item.id), editing?.id);
    setErrors(fieldErrors); setError(""); setSuccess("");
    if (Object.keys(fieldErrors).length) { document.getElementById(`staff-${Object.keys(fieldErrors)[0]}`)?.focus(); return; }
    busy.current = true; setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), mobile: normalizePhone(form.mobile), address: form.address.trim(), salary: form.salary.trim(), date_of_birth: toApiDate(form.date_of_birth) };
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

  return <div className="clerk-page hr-page staff-page space-y-6">
    <section className="hr-stats">{[{ label: "Total staff", value: staff.length, icon: Users }, { label: "Active members", value: active, icon: UserCheck }, { label: "Inactive members", value: staff.length - active, icon: Power }, { label: "Departments", value: departments.length, icon: Building2 }].map(stat => <div className="register-stat" key={stat.label}><div className="stat-label">{stat.label}<stat.icon size={18} /></div><p className="stat-value">{loading ? <Loader2 size={22} className="animate-spin" /> : stat.value}</p></div>)}</section>
    {error && <p role="alert" className="hr-error">{error}</p>}
    {success && <p role="status" className="hr-success">{success}</p>}
    {!loading && (!roles.length || !departments.length) && <p className="hr-notice">{!departments.length ? <><Link href="/clerk/departments" className="underline">Create a department</Link> before adding staff. </> : null}{!roles.length ? "Staff roles are unavailable. Refresh or configure staff roles before saving." : ""}</p>}
    {formOpen && <div id="staff-record-editor"><StaffRecordForm value={form} errors={errors} departments={departments} roles={roles} editing={!!editing} saving={saving} onClose={closeForm} onSubmit={save} onChange={(field, value) => { setForm(previous => ({ ...previous, [field]: value })); setErrors(previous => ({ ...previous, [field]: undefined })); }} /></div>}
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">School Staff Directory</h2>
          <p className="text-xs text-slate-500">Search, filter and manage employment records.</p>
        </div>
        <div className="office-actions">
          <Button variant="outline" size="sm" disabled={loading || saving || actionId !== null} onClick={() => void load()}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</Button>
          <Button size="sm" className="office-primary" disabled={loading || saving || actionId !== null} onClick={() => openForm()}><UserPlus size={15} /> Add staff</Button>
        </div>
      </div>
      <DataTable data={staff} columns={columns} getRowId={member => member.id} createdDate createdDateRange search searchPlaceholder="Search name, email, mobile or department" loading={loading} emptyTitle="No staff records yet" emptyDescription="Add a staff member to start your directory." caption="Staff directory" minWidth={1050} filters={[
        { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }], match: (member, value) => (value === "active") === !!member.is_active },
        { key: "role", label: "Role", optionsFrom: rows => Array.from(new Set(rows.map(member => roleLabel(member.category)))).map(label => ({ value: label, label })), match: (member, value) => roleLabel(member.category) === value },
        { key: "department", label: "Department", optionsFrom: () => departments.map(item => ({ value: String(item.id), label: item.name })), match: (member, value) => String(member.department ?? "") === value },
      ]} renderActions={member => <div className="flex items-center gap-1">{[{ label: "Edit", icon: Edit2, onClick: () => openForm(member), color: "text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30" }, { label: member.is_active ? "Deactivate" : "Activate", icon: Power, onClick: () => void act(member), color: "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" }, { label: "Delete", icon: Trash2, onClick: () => void act(member, true), color: "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" }].map(action => <button type="button" key={action.label} title={action.label} aria-label={`${action.label} ${member.name || "staff member"}`} disabled={loading || saving || actionId !== null} onClick={action.onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${action.color}`}>{actionId === member.id ? <Loader2 size={14} className="animate-spin" /> : <action.icon size={14} />}</button>)}</div>} />
    </div>
  </div>;
}
