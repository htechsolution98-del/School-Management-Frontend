"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Edit2, Eye, Loader2, RefreshCw, UserPlus, Users, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/superadmin/status-badge";
import { StaffRecordForm, type StaffRole } from "@/components/clerk/staff-record-form";
import { createStaff, getStaffCategories, getStaffList, updateStaff, getDepartments } from "@/lib/staff";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";
import { formatDDMMYYYY, toInputDate } from "@/lib/table-utils";
import { normalizePhone, validateStaffRecord, type StaffErrors } from "@/lib/clerk/hr-validation";
import {
  getAttendanceSettings,
  getSalaryStructures,
} from "@/lib/hr-config";
import { getLeaveTemplates, type LeaveTemplate } from "@/lib/clerk/leaves";
import type { CreateStaffPayload, Staff, Department, AttendanceSetting, SalaryStructure } from "@/types";
import { getUserRoles, getUserRole } from "@/lib/auth";
import "../clerk-workspace.css";

interface StaffFeature { id?: number; feature_id?: number; feature_name?: string }
const EMPTY_FORM: CreateStaffPayload = { name: "", email: "", mobile: "", category: "", department: undefined, attendance_setting: undefined, leave_template: undefined, salary_structure: undefined, address: "", date_of_birth: "", joining_date: "", exit_date: "", salary: "", is_active: true };
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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [form, setForm] = useState<CreateStaffPayload>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<StaffErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busy = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);

    const roles = getUserRoles();
    const primaryRole = getUserRole();
    const canFetchAttendanceSettings =
      roles.some((r) => r === "principal" || r === "admin" || r === "superadmin") ||
      primaryRole === "principal" ||
      primaryRole === "admin" ||
      primaryRole === "superadmin";

    const results = await Promise.allSettled([
      getStaffList(),
      getDepartments(),
      getStaffCategories(),
      canFetchAttendanceSettings ? getAttendanceSettings() : Promise.resolve([] as AttendanceSetting[]),
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
    if (results[3].status === "fulfilled") setAttendanceSettings(results[3].value); else setAttendanceSettings([]);
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

  const activeStaff = useMemo(() => staff.filter(member => member.is_active), [staff]);
  const inactiveStaff = useMemo(() => staff.filter(member => !member.is_active), [staff]);

  const activeColumns = useMemo<DataTableColumn<Staff>[]>(() => [
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
    { key: "status", header: "Status", search: () => "Active", render: () => <StatusBadge active={true} /> },
  ], [departments, roleLabel, attendanceSettings, salaryStructures]);

  const inactiveColumns = useMemo<DataTableColumn<Staff>[]>(() => [
    { key: "name", header: "Staff member", sticky: true, search: member => [member.name, member.id], render: member => <div className="flex items-center gap-3"><span className="hr-avatar bg-slate-200 text-slate-700">{(member.name || "S").charAt(0).toUpperCase()}</span><span className="font-medium text-slate-800">{member.name || "-"} <span className="ml-2 text-xs font-normal text-slate-400">#{member.id}</span></span></div> },
    { key: "exit", header: "Exit Date", sticky: false, search: member => member.exit_date || "", render: member => member.exit_date ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">{formatDDMMYYYY(member.exit_date)}</span> : <span className="text-slate-400 italic">Not set</span> },
    { key: "department", header: "Department", search: member => departments.find(item => item.id === member.department)?.name || "-", camelCase: false },
    { key: "category", header: "Role", search: member => roleLabel(member.category), camelCase: false },
    { key: "joining", header: "Joined", search: member => member.joining_date || member.created_at || "", render: member => formatDDMMYYYY(member.joining_date || member.created_at) },
    { key: "email", header: "Email", search: member => member.email, camelCase: false },
    { key: "mobile", header: "Mobile", search: member => member.mobile, camelCase: false },
    { key: "dob", header: "Date of birth", search: member => member.date_of_birth, render: member => formatDDMMYYYY(member.date_of_birth) },
    { key: "salary", header: "Salary (INR)", search: member => member.salary, numeric: true, render: member => member.salary == null ? "-" : Number(member.salary).toLocaleString("en-IN", { minimumFractionDigits: 2 }) },
    { key: "address", header: "Address", search: member => member.address, camelCase: false },
    { key: "status", header: "Status", search: () => "Inactive", render: () => <StatusBadge active={false} /> },
  ], [departments, roleLabel]);

  const closeForm = () => { if (busy.current) return; setFormOpen(false); setEditing(null); setReadOnly(false); setErrors({}); };

  const openForm = (member?: Staff, isReadOnly = false) => {
    setError(""); setSuccess(""); setErrors({}); setEditing(member || null); setReadOnly(isReadOnly);
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
      exit_date: toHTMLDate(member.exit_date),
      salary: member.salary || "",
      is_active: !!member.is_active,
    } : { ...EMPTY_FORM });
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    const fieldErrors = validateStaffRecord(form, staff, departments, roles.map(item => item.id), editing?.id, undefined, roles);
    setErrors(fieldErrors); setError(""); setSuccess("");
    if (Object.keys(fieldErrors).length) { document.getElementById(`staff-${Object.keys(fieldErrors)[0]}`)?.focus(); return; }
    busy.current = true; setSaving(true);
    try {
      const formattedJoiningDate = form.joining_date?.trim() ? toInputDate(form.joining_date.trim()) : (editing ? null : undefined);
      const formattedExitDate = form.exit_date?.trim() ? toInputDate(form.exit_date.trim()) : null;

      // Auto-deactivate if exit date is on or before today; auto-activate if exit date is removed (null) or in future
      let isActive = form.is_active;
      if (formattedExitDate) {
        const exitD = new Date(formattedExitDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (exitD <= today) {
          isActive = false;
        }
      } else {
        // Exit date is removed or empty
        // If not explicitly set to false via dropdown, auto-activate
        if (form.is_active !== false) {
          isActive = true;
        }
      }

      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: normalizePhone(form.mobile),
        address: form.address.trim(),
        salary: form.salary.trim(),
        date_of_birth: toApiDate(form.date_of_birth),
        joining_date: formattedJoiningDate,
        exit_date: formattedExitDate,
        department: form.department ? Number(form.department) : null,
        attendance_setting: form.attendance_setting ? Number(form.attendance_setting) : null,
        leave_template: form.leave_template ? Number(form.leave_template) : null,
        salary_structure: form.salary_structure ? Number(form.salary_structure) : null,
        is_active: isActive,
      };
      if (editing) await updateStaff(editing.id, payload); else await createStaff(payload);
      setSuccess(editing ? "Staff record updated successfully." : "Staff member created successfully.");
      setFormOpen(false); setEditing(null); setReadOnly(false); setForm({ ...EMPTY_FORM });
      await load();
    } catch (err) { setError(message(err, "Could not save the staff record.")); }
    finally { busy.current = false; setSaving(false); }
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
      onClick: undefined,
    },
    {
      label: "Active members",
      value: activeStaff.length,
      icon: UserCheck,
      gradient: "from-[#e8faf4] via-[#f0fdf9] to-[#ffffff]",
      border: "border-emerald-200/80",
      badgeBg: "bg-emerald-500",
      textColor: "text-emerald-950",
      iconColor: "text-white",
      onClick: () => setTab("active"),
    },
    {
      label: "Inactive members",
      value: inactiveStaff.length,
      icon: UserX,
      gradient: "from-[#fff0f3] via-[#fff5f7] to-[#ffffff]",
      border: "border-rose-200/80",
      badgeBg: "bg-rose-500",
      textColor: "text-rose-950",
      iconColor: "text-white",
      onClick: () => setTab("inactive"),
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
      onClick: undefined,
    },
  ];

  const filterOptions = useMemo(() => [
    {
      key: "role",
      label: "Role",
      optionsFrom: (rows: Staff[]) => {
        const roleLabelsFromFeatures = roles.map(r => r.label);
        const roleLabelsFromAllowed = ALLOWED_ROLES.map(title);
        const roleLabelsFromRows = rows.map(member => roleLabel(member.category));
        const uniqueRoles = Array.from(
          new Set([...roleLabelsFromFeatures, ...roleLabelsFromAllowed, ...roleLabelsFromRows])
        ).filter(label => label && label !== "-");
        return uniqueRoles.map(label => ({ value: label, label }));
      },
      match: (member: Staff, value: string) => roleLabel(member.category) === value
    },
    {
      key: "department",
      label: "Department",
      optionsFrom: () => departments.map(item => ({ value: String(item.id), label: item.name })),
      match: (member: Staff, value: string) => String(member.department ?? "") === value
    },
  ], [departments, roleLabel, roles]);

  return <div className="clerk-page hr-page staff-page space-y-6">
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map(stat => (
        <div
          key={stat.label}
          onClick={stat.onClick}
          className={`relative overflow-hidden rounded-2xl p-5 border bg-gradient-to-br ${stat.gradient} ${stat.border} shadow-sm hover:shadow-md transition-all ${stat.onClick ? "cursor-pointer hover:scale-[1.01]" : ""}`}
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
    {formOpen && (
      <div id="staff-record-editor" className="animate-in fade-in slide-in-from-top-4 duration-300">
        <StaffRecordForm
          value={form}
          errors={errors}
          departments={departments}
          roles={roles}
          attendanceSettings={attendanceSettings}
          leaveTemplates={leaveTemplates}
          salaryStructures={salaryStructures}
          editing={!!editing}
          saving={saving}
          readOnly={readOnly}
          onEdit={() => setReadOnly(false)}
          onClose={closeForm}
          onSubmit={save}
          onChange={(field, value) => {
            setForm(previous => ({ ...previous, [field]: value }));
            setErrors(previous => ({ ...previous, [field]: undefined }));
          }}
        />
      </div>
    )}

    <div className="space-y-4">
      {/* Tab controls and top actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              tab === "active"
                ? "bg-[#5826df] text-white shadow-sm shadow-indigo-500/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <UserCheck size={16} />
            <span>Active Staff</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              tab === "active" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
            }`}>
              {activeStaff.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("inactive")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              tab === "inactive"
                ? "bg-slate-900 text-white shadow-sm shadow-slate-900/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <UserX size={16} />
            <span>Inactive / Past Staff</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              tab === "inactive" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
            }`}>
              {inactiveStaff.length}
            </span>
          </button>
        </div>

        <div className="office-actions flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:text-[#5826df] hover:border-indigo-200 font-semibold px-3.5 shadow-2xs"
            disabled={loading || saving}
            onClick={() => void load()}
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#5826df]" : "text-slate-500"} /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-[#5826df] hover:bg-[#4a1ec2] text-white rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 font-semibold px-4"
            disabled={loading || saving}
            onClick={() => openForm(undefined, false)}
          >
            <UserPlus size={15} /> Add staff
          </Button>
        </div>
      </div>

      {/* Tab 1: Active Staff */}
      {tab === "active" && (
        <DataTable
          data={activeStaff}
          columns={activeColumns}
          getRowId={member => member.id}
          createdDate
          createdDateRange
          search
          searchPlaceholder="Search active staff by name, email, mobile or department"
          loading={loading}
          emptyTitle="No active staff records"
          emptyDescription="Add a staff member or adjust filters to view active employees."
          caption="Active staff directory"
          minWidth={1050}
          filters={filterOptions}
          renderActions={member => (
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Edit staff record"
                aria-label={`Edit ${member.name || "staff member"}`}
                disabled={loading || saving}
                onClick={() => openForm(member, false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#5826df] hover:bg-indigo-50 hover:text-[#4a1ec2] transition-all active:scale-90 disabled:opacity-40"
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        />
      )}

      {/* Tab 2: Inactive / Past Staff */}
      {tab === "inactive" && (
        <DataTable
          data={inactiveStaff}
          columns={inactiveColumns}
          getRowId={member => member.id}
          createdDate
          createdDateRange
          search
          searchPlaceholder="Search past or inactive staff by name, email, mobile or department"
          loading={loading}
          emptyTitle="No inactive or past staff"
          emptyDescription="Staff members who exit or are marked inactive will appear here."
          caption="Inactive and past staff directory"
          minWidth={1050}
          filters={filterOptions}
          renderActions={member => (
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Edit staff record"
                aria-label={`Edit ${member.name || "staff member"}`}
                disabled={loading || saving}
                onClick={() => openForm(member, false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#5826df] hover:bg-indigo-50 hover:text-[#4a1ec2] transition-all active:scale-90 disabled:opacity-40"
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                title="View staff record"
                aria-label={`View ${member.name || "staff member"}`}
                disabled={loading || saving}
                onClick={() => openForm(member, true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-90 disabled:opacity-40"
              >
                <Eye size={15} />
              </button>
            </div>
          )}
        />
      )}
    </div>
  </div>;
}
