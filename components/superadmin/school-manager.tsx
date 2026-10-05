"use client";

import { SchoolDetails } from "@/components/superadmin/school-details";
import { Building2 } from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { Check, Edit2, Loader2, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/providers/confirm-provider";
import { AdminButton } from "./admin-button";
import { SchoolLogo } from "./school-logo";
import { StatusBadge } from "./status-badge";
import { ApiValidationError } from "@/lib/api-errors";
import { schoolFormSchema, validationErrors, type FieldErrors } from "@/lib/school-validation";
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";
import { camelCaseText } from "@/lib/table-utils";
import { createSchool, updateSchool, deleteSchool, getSchools, getFeatures, updateFeatureStatus, createSchoolFeature } from "@/lib/superadmin";
import type { School, CreateSchoolPayload, FeatureType } from "@/types/superadmin";

const emptyForm: CreateSchoolPayload = { name: "", email: "", phone: "", address: "", city: "", state: "", country: "India", pincode: "", index_no: "", logo: null, feature_ids: [], is_active: true };
const fields = [
  { key: "name", label: "School name", placeholder: "Enter school name", max: 255, span: true },
  { key: "index_no", label: "Index number", placeholder: "e.g. IND-123", max: 100, optional: true },
  { key: "email", label: "Email", placeholder: "school@example.com", max: 254, type: "email" },
  { key: "phone", label: "Phone number", placeholder: "e.g. 9876543210", max: 25, type: "tel" },
  { key: "address", label: "Address", placeholder: "Street address", span: true },
  { key: "city", label: "City", placeholder: "Enter city", max: 100 },
  { key: "state", label: "State / Province", placeholder: "Enter state", max: 100 },
  { key: "country", label: "Country", placeholder: "Enter country", max: 100 },
  { key: "pincode", label: "PIN / Postal code", placeholder: "e.g. 380001", max: 10 },
] as const;

type TextField = (typeof fields)[number]["key"];

export default function SchoolManager() {
  const confirm = useConfirm();
  const [schools, setSchools] = useState<School[]>([]);
  const [features, setFeatures] = useState<FeatureType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<CreateSchoolPayload>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [accessSchool, setAccessSchool] = useState<School | null>(null);
  const [detailsSchool, setDetailsSchool] = useState<School | null>(null);
  const [busyFeature, setBusyFeature] = useState<number | null>(null);
  const [accessError, setAccessError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [schoolData, featureData] = await Promise.all([getSchools(), getFeatures()]);
      setSchools(schoolData);
      setFeatures(featureData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load schools.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      // Retain links created by older bookmarks.
      if (new URLSearchParams(window.location.search).get("create") === "1") setOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const url = form.logo ? URL.createObjectURL(form.logo) : null;
    const timer = window.setTimeout(() => setPreview(url), 0);
    return () => { window.clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [form.logo]);

  const startForm = (school?: School) => {
    setEditing(school ?? null);
    setForm(school ? {
      name: school.name ?? "", email: school.email ?? "", phone: school.phone ?? "", address: school.address ?? "",
      city: school.city ?? "", state: school.state ?? "", country: school.country ?? "India", pincode: school.pincode ?? "",
      index_no: school.index_no ?? "", logo: null, is_active: school.is_active ?? true,
      feature_ids: school.school_features?.filter(feature => feature.is_enabled).map(feature => feature.feature) ?? [],
    } : { ...emptyForm, feature_ids: [] });
    setErrors({}); setFormError(""); setSuccess(""); setOpen(true);
  };
  const clearError = (field: string) => {
    setErrors(current => { const next = { ...current }; delete next[field]; return next; });
    setFormError("");
  };
  const validateField = (field: string) => {
    const result = schoolFormSchema.safeParse(form);
    const issue = result.success ? undefined : result.error.issues.find(issue => issue.path[0] === field);
    setErrors(current => { const next = { ...current }; if (issue) next[field] = issue.message; else delete next[field]; return next; });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = schoolFormSchema.safeParse(form);
    if (!result.success) {
      const next = validationErrors(result.error.issues);
      setErrors(next);
      setFormError("Please correct the highlighted fields.");
      document.getElementById(`school-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    if (schools.some(school => school.id !== editing?.id && school.email?.toLowerCase() === result.data.email)) {
      setErrors({ email: "This email is already used by another school." });
      document.getElementById("school-email")?.focus();
      return;
    }
    setSaving(true); setErrors({}); setFormError("");
    try {
      if (editing?.id) await updateSchool(editing.id, result.data);
      else await createSchool(result.data);
      setOpen(false);
      setSuccess(editing ? "School updated successfully." : "School created successfully.");
      await load();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setErrors(err.fieldErrors);
        document.getElementById(`school-${Object.keys(err.fieldErrors)[0]}`)?.focus();
      }
      setFormError(err instanceof Error ? err.message : "Unable to save school. Please try again.");
    } finally { setSaving(false); }
  };
  const changeStatus = async (school: School) => {
    if (!school.id || !(await confirm(`Are you sure you want to ${(school.is_active ?? true) ? "deactivate" : "activate"} ${camelCaseText(school.name)}?`))) return;
    setActionId(school.id); setError("");
    try { await updateSchool(school.id, { is_active: !(school.is_active ?? true) }); setSuccess("School status updated."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to update school status."); }
    finally { setActionId(null); }
  };
  const remove = async (school: School) => {
    if (!school.id || !(await confirm(`Delete ${camelCaseText(school.name)}? This removes the school and its related records.`))) return;
    setActionId(school.id); setError("");
    try { await deleteSchool(school.id); setSuccess("School deleted successfully."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete school."); }
    finally { setActionId(null); }
  };
  const toggleAccess = async (feature: FeatureType) => {
    if (!accessSchool?.id) return;
    const assignment = accessSchool.school_features?.find(item => item.feature === feature.id);
    const enabled = assignment?.is_enabled ?? false;
    if (!(await confirm(`${enabled ? "Disable" : "Enable"} ${camelCaseText(feature.name)} for ${camelCaseText(accessSchool.name)}?`))) return;
    setBusyFeature(feature.id); setAccessError("");
    try {
      if (assignment) await updateFeatureStatus(assignment.id, !enabled);
      else await createSchoolFeature(accessSchool.id, feature.id);
      const freshSchools = await getSchools();
      setSchools(freshSchools);
      setAccessSchool(freshSchools.find(school => school.id === accessSchool.id) ?? null);
    } catch (err) { setAccessError(err instanceof Error ? err.message : "Unable to change feature access."); }
    finally { setBusyFeature(null); }
  };
  const columns: DataTableColumn<School>[] = [
    {
      key: "school",
      header: "School",
      sticky: true,
      search: school => [school.name, school.code, school.index_no],
      render: school => <div className="flex items-center gap-3"><SchoolLogo src={school.logo} name={camelCaseText(school.name)} /><div className="min-w-0"><p className="max-w-64 font-semibold text-slate-800">{camelCaseText(school.name) || "Unnamed school"}</p><p className="mt-1 text-xs text-slate-500">{school.code || "No code"}{school.index_no ? ` · ${school.index_no}` : ""}</p></div></div>,
    },
    {
      key: "contact",
      header: "Contact",
      camelCase: false,
      search: school => [school.email, school.phone],
      render: school => <div><p className="break-all text-slate-600">{school.email || "Not provided"}</p><p className="mt-1 text-xs text-slate-500">{school.phone || "No phone number"}</p></div>,
    },
    {
      key: "location",
      header: "Location",
      search: school => [school.city, school.state, school.country, school.pincode, school.address],
      render: school => <div className="text-slate-600"><p>{[school.city, school.state].filter(Boolean).map(camelCaseText).join(", ") || "Not provided"}</p><p className="mt-1 text-xs text-slate-500">{[school.country, school.pincode].filter(Boolean).map(camelCaseText).join(" · ")}</p></div>,
    },
    {
      key: "features",
      header: "Features",
      search: school => [school.school_features?.filter(feature => feature.is_enabled).length ?? 0],
      render: school => <button type="button" onClick={() => { setAccessSchool(school); setAccessError(""); }} className="whitespace-nowrap text-sm font-medium text-[#1D496C] underline-offset-4 hover:underline">{school.school_features?.filter(feature => feature.is_enabled).length ?? 0} enabled</button>,
    },
    { key: "status", header: "Status", search: school => [(school.is_active ?? true) ? "active" : "inactive"], render: school => <StatusBadge active={school.is_active ?? true} /> },
  ];

  return <div className="mx-auto max-w-7xl space-y-6 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Manage Schools</h1><p className="mt-1 text-sm text-slate-500">Manage school registrations, contact details and feature access.</p></div><div className="flex gap-2"><AdminButton onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</AdminButton><AdminButton onClick={() => startForm()} disabled={loading}><Plus className="h-4 w-4" /> Add School</AdminButton></div></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {success && <p role="status" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700"><Check className="h-4 w-4" />{success}</p>}
    <DataTable
      data={schools}
      columns={columns}
      getRowId={school => school.id ?? school.name ?? ""}
      createdDate
      createdDateRange
      search
      searchPlaceholder="Search schools, code or email"
      searchAriaLabel="Search schools"
      loading={loading}
      error={error ? "Schools could not be loaded. Please retry." : ""}
      loadingLabel="Loading schools…"
      emptyTitle="No schools yet. Add a school to get started."
      emptyDescription="Schools you register will appear in this list."
      noResultsTitle="No schools match your search."
      noResultsDescription="Try a different keyword or clear the filters."
      caption="Schools"
      minWidth={1000}
      pageSize={10}
      filters={[{
        key: "status",
        label: "Status",
        options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
        match: (school, value) => (value === "active") === (school.is_active ?? true),
      }, {
        key: "city",
        label: "City",
        optionsFrom: rows => dynamicOptions(rows, school => school.city),
        match: (school, value) => school.city === value,
      }]}
      renderActions={school => [
        { label: "View school details", icon: Building2, action: () => setDetailsSchool(school), color: "text-slate-600 hover:bg-slate-100" },
        { label: "Edit school", icon: Edit2, action: () => startForm(school), color: "text-blue-600 hover:bg-blue-50 hover:text-blue-700" },
        { label: (school.is_active ?? true) ? "Deactivate school" : "Activate school", icon: Power, action: () => changeStatus(school), color: (school.is_active ?? true) ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700" : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" },
        { label: "Delete school", icon: Trash2, action: () => remove(school), color: "text-red-600 hover:bg-red-50 hover:text-red-700" },
      ].map(action => <button key={action.label} type="button" title={action.label} aria-label={`${action.label}: ${camelCaseText(school.name)}`} disabled={actionId !== null || loading} onClick={action.action} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${action.color}`}><action.icon className="h-4 w-4" /></button>)}
    />

    <SchoolDetails school={detailsSchool} onClose={() => setDetailsSchool(null)} />
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="admin-scroll-area flex h-[min(760px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 p-6 pr-14"><DialogTitle className="text-lg font-semibold">{editing ? "Edit school" : "Add school"}</DialogTitle><DialogDescription>Enter school details and select feature access. Required fields are marked *.</DialogDescription></DialogHeader>
        <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="admin-scroll-area min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <fieldset disabled={saving} className="grid min-w-0 grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            {fields.map(field => <div key={field.key} className={`space-y-1.5 ${"span" in field && field.span ? "sm:col-span-2" : ""}`}><Label htmlFor={`school-${field.key}`} className="text-sm font-medium text-slate-700">{field.label}{!("optional" in field) && <span className="ml-1 text-slate-400">*</span>}</Label><Input id={`school-${field.key}`} type={"type" in field ? field.type : "text"} maxLength={"max" in field ? field.max : undefined} value={form[field.key]} placeholder={field.placeholder} required={!("optional" in field)} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined} onChange={event => { setForm(current => ({ ...current, [field.key as TextField]: event.target.value })); clearError(field.key); }} onBlur={() => validateField(field.key)} className="h-10 rounded-lg border-slate-200 focus-visible:border-[#1D496C] focus-visible:ring-[#1D496C]/15" />{errors[field.key] && <p id={`error-${field.key}`} className="text-xs text-red-600">{errors[field.key]}</p>}</div>)}
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="school-logo" className="text-sm font-medium text-slate-700">School logo <span className="font-normal text-slate-400">(optional)</span></Label><div className="flex items-center gap-3">{preview ? <img src={preview} alt="New school logo preview" className="h-12 w-12 rounded-lg border border-slate-200 object-contain p-1" /> : <SchoolLogo src={editing?.logo} name={camelCaseText(editing?.name)} className="h-12 w-12" />}<Input id="school-logo" type="file" accept="image/png,image/jpeg,image/webp" aria-invalid={!!errors.logo} aria-describedby="logo-help error-logo" className="h-10 rounded-lg border-slate-200" onChange={event => {
              const file = event.target.files?.[0] ?? null;
              setForm(current => ({ ...current, logo: file }));
              const result = schoolFormSchema.safeParse({ ...form, logo: file });
              const issue = result.success ? undefined : result.error.issues.find(issue => issue.path[0] === "logo");
              setErrors(current => { const next = { ...current }; if (issue) next.logo = issue.message; else delete next.logo; return next; });
            }} /></div><p id="logo-help" className="text-xs text-slate-500">PNG, JPEG or WebP. Maximum 2 MB. Existing logo stays when no new file is selected.</p>{errors.logo && <p id="error-logo" className="text-xs text-red-600">{errors.logo}</p>}</div>
            <div className="space-y-2 sm:col-span-2"><p id="feature-label" className="text-sm font-medium text-slate-700">Feature access <span className="text-slate-400">*</span></p><div id="school-feature_ids" tabIndex={-1} aria-labelledby="feature-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">{features.map(feature => <label key={feature.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><input type="checkbox" checked={form.feature_ids.includes(feature.id)} onChange={event => { setForm(current => ({ ...current, feature_ids: event.target.checked ? [...current.feature_ids, feature.id] : current.feature_ids.filter(id => id !== feature.id) })); clearError("feature_ids"); }} className="h-4 w-4 accent-[#1D496C]" />{camelCaseText(feature.name)}</label>)}</div>{!features.length && <p className="text-xs text-slate-500">No features available. Configure features before adding a school.</p>}{errors.feature_ids && <p className="text-xs text-red-600">{errors.feature_ids}</p>}</div>
          </fieldset>
          </div>
          <div className="shrink-0 border-t border-slate-200 p-4 sm:px-6">{formError && <p role="alert" className="mb-3 text-sm text-red-600">{formError}</p>}<div className="flex justify-end gap-2"><AdminButton type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</AdminButton><AdminButton type="submit" disabled={saving || !features.length}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : editing ? "Save Changes" : "Create School"}</AdminButton></div></div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!accessSchool} onOpenChange={value => { if (!value && busyFeature === null) setAccessSchool(null); }}><DialogContent className="admin-scroll-area flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-lg"><DialogHeader className="border-b border-slate-200 p-6 pr-14"><DialogTitle className="text-lg font-semibold">Feature access</DialogTitle><DialogDescription>{camelCaseText(accessSchool?.name)}</DialogDescription></DialogHeader><div className="admin-scroll-area min-h-0 space-y-1 overflow-y-auto p-4">{features.map(feature => {
      const enabled = accessSchool?.school_features?.some(assignment => assignment.feature === feature.id && assignment.is_enabled) ?? false;
      return <div key={feature.id} className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-slate-50"><span className="text-sm font-medium text-slate-700">{camelCaseText(feature.name)}</span><button type="button" role="switch" aria-checked={enabled} aria-label={`${camelCaseText(feature.name)} access`} disabled={busyFeature !== null} onClick={() => toggleAccess(feature)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-[#1D496C]" : "bg-slate-200"}`}><span className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}>{busyFeature === feature.id && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}</span></button></div>;
    })}{accessError && <p role="alert" className="p-2 text-sm text-red-600">{accessError}</p>}</div><div className="flex shrink-0 justify-end border-t border-slate-200 p-4"><AdminButton onClick={() => setAccessSchool(null)} disabled={busyFeature !== null}>Done</AdminButton></div></DialogContent></Dialog>
  </div>;
}
