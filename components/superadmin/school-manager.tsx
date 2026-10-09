"use client";

import { SchoolDetails } from "@/components/superadmin/school-details";
import { Building2, Sparkles, Calendar, CreditCard, Clock, ShieldCheck, Check, Edit2, Loader2, Plus, Power, RefreshCw, Trash2 } from "lucide-react";

import { useCallback, useEffect, useState } from "react";
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

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultTrialEnd = (startStr?: string) => {
  const base = startStr ? new Date(startStr) : new Date();
  base.setDate(base.getDate() + 14);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyForm: CreateSchoolPayload = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  index_no: "",
  logo: null,
  feature_ids: [],
  is_active: true,
  trial_start_date: getTodayStr(),
  trial_end_date: getDefaultTrialEnd(getTodayStr()),
  pricing_model: "FLAT",
  monthly_price: 5000,
  quarterly_price: 13500,
  half_yearly_price: 25000,
  yearly_price: 48000,
  gst_included: false,
  gst_percentage: 18,
};

const fields = [
  { key: "name", label: "School name", placeholder: "Enter school name", max: 255, span: true },
  { key: "index_no", label: "Index number", placeholder: "e.g. IND-123", max: 100, optional: true },
  { key: "email", label: "Email", placeholder: "school@example.com", max: 254, type: "email" },
  { key: "phone", label: "Phone number", placeholder: "e.g. 9876543210", max: 10, type: "tel" },
  { key: "address", label: "Address", placeholder: "Street address", span: true },
  { key: "city", label: "City", placeholder: "Enter city", max: 100 },
  { key: "state", label: "State / Province", placeholder: "Enter state", max: 100 },
  { key: "country", label: "Country", placeholder: "Enter country", max: 100 },
  { key: "pincode", label: "PIN / Postal code", placeholder: "e.g. 380001", max: 6 },
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

  // Compute total trial duration dynamically
  const calculateTrialDays = () => {
    if (!form.trial_start_date || !form.trial_end_date) return 0;
    const start = new Date(form.trial_start_date);
    const end = new Date(form.trial_end_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

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
    if (school) {
      const sub = school.subscription_details;
      const start = sub?.trial_start_date || getTodayStr();
      setForm({
        name: school.name ?? "",
        email: school.email ?? "",
        phone: school.phone ?? "",
        address: school.address ?? "",
        city: school.city ?? "",
        state: school.state ?? "",
        country: school.country ?? "India",
        pincode: school.pincode ?? "",
        index_no: school.index_no ?? "",
        logo: null,
        is_active: school.is_active ?? true,
        feature_ids: school.school_features?.filter(feature => feature.is_enabled).map(feature => feature.feature) ?? [],
        trial_start_date: start,
        trial_end_date: sub?.trial_end_date || getDefaultTrialEnd(start),
        pricing_model: sub?.pricing_model || "FLAT",
        monthly_price: sub?.monthly_price ? Number(sub.monthly_price) : 5000,
        quarterly_price: sub?.quarterly_price ? Number(sub.quarterly_price) : 13500,
        half_yearly_price: sub?.half_yearly_price ? Number(sub.half_yearly_price) : 25000,
        yearly_price: sub?.yearly_price ? Number(sub.yearly_price) : 48000,
        gst_included: sub?.gst_included ?? false,
        gst_percentage: sub?.gst_percentage ? Number(sub.gst_percentage) : 18,
      });
    } else {
      const today = getTodayStr();
      setForm({
        ...emptyForm,
        trial_start_date: today,
        trial_end_date: getDefaultTrialEnd(today),
        feature_ids: features.map(f => f.id),
      });
    }
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
      render: school => (
        <div className="flex items-center gap-3">
          <SchoolLogo src={school.logo} name={camelCaseText(school.name)} />
          <div className="min-w-0">
            <p className="max-w-64 font-semibold text-slate-800">{camelCaseText(school.name) || "Unnamed school"}</p>
            <p className="mt-1 text-xs text-slate-500">{school.code || "No code"}{school.index_no ? ` · ${school.index_no}` : ""}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      camelCase: false,
      search: school => [school.email, school.phone],
      render: school => (
        <div>
          <p className="break-all text-slate-600">{school.email || "Not provided"}</p>
          <p className="mt-1 text-xs text-slate-500">{school.phone || "No phone number"}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      search: school => [school.city, school.state, school.country, school.pincode, school.address],
      render: school => (
        <div className="text-slate-600">
          <p>{[school.city, school.state].filter(Boolean).map(camelCaseText).join(", ") || "Not provided"}</p>
          <p className="mt-1 text-xs text-slate-500">{[school.country, school.pincode].filter(Boolean).map(camelCaseText).join(" · ")}</p>
        </div>
      ),
    },
    {
      key: "plan_trial",
      header: "Plan & Trial",
      search: school => [school.subscription_details?.plan_name, school.subscription_details?.status],
      render: school => {
        const sub = school.subscription_details;
        if (!sub) {
          return <span className="text-xs text-slate-400">14-day Default Trial</span>;
        }
        const isTrial = sub.status === "TRIAL";
        const days = sub.days_left ?? 0;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                sub.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-800"
                  : sub.status === "TRIAL"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {sub.status}
              </span>
              <span className="text-xs font-bold text-slate-700">₹{Number(sub.monthly_price).toLocaleString("en-IN")}/mo</span>
            </div>
            {isTrial && sub.trial_end_date && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>{days}d left ({sub.trial_end_date})</span>
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "features",
      header: "Features",
      search: school => [school.school_features?.filter(feature => feature.is_enabled).length ?? 0],
      render: school => (
        <button
          type="button"
          onClick={() => { setAccessSchool(school); setAccessError(""); }}
          className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          {school.school_features?.filter(feature => feature.is_enabled).length ?? 0} enabled
        </button>
      ),
    },
    { key: "status", header: "Status", search: school => [(school.is_active ?? true) ? "active" : "inactive"], render: school => <StatusBadge active={school.is_active ?? true} /> },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" /> School Management
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Manage Schools</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage school registrations, subscriptions, trial limits and feature access.</p>
        </div>
        <div className="flex gap-2">
          <AdminButton onClick={load} disabled={loading} variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </AdminButton>
          <AdminButton onClick={() => startForm()} disabled={loading} className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20">
            <Plus className="h-4 w-4" /> Add School
          </AdminButton>
        </div>
      </div>
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
      minWidth={1050}
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
      <DialogContent className="admin-scroll-area flex h-[min(820px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 p-6 pr-14 bg-slate-50/50">
          <div className="flex items-center gap-3">
            {(editing?.logo || preview) && (
              <SchoolLogo src={preview || editing?.logo} name={camelCaseText(editing?.name)} className="h-10 w-10 rounded-xl" />
            )}
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">{editing ? `Edit School: ${camelCaseText(editing.name)}` : "Register New School"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">Configure school information, free trial dates, and custom subscription tier plans.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="admin-scroll-area min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
          <fieldset disabled={saving} className="space-y-6">
            
            {/* 1. BASIC SCHOOL INFO */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">School Profile & Contact Details</h3>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map(field => (
                  <div key={field.key} className={`space-y-1.5 ${"span" in field && field.span ? "sm:col-span-2" : ""}`}>
                    <Label htmlFor={`school-${field.key}`} className="text-xs font-bold text-slate-700">
                      {field.label} {"optional" in field && field.optional && <span className="text-slate-400 font-normal">(Optional)</span>}
                    </Label>
                    <Input
                      id={`school-${field.key}`}
                      type={"type" in field ? field.type : "text"}
                      value={form[field.key as TextField] ?? ""}
                      onChange={event => {
                        let val = event.target.value;
                        if (field.key === "phone") {
                          val = val.replace(/\D/g, "").slice(0, 10);
                        } else if (field.key === "pincode") {
                          val = val.replace(/\D/g, "").slice(0, 6);
                        }
                        setForm(current => ({ ...current, [field.key]: val }));
                        clearError(field.key);
                      }}
                      onBlur={() => validateField(field.key)}
                      placeholder={field.placeholder}
                      maxLength={"max" in field ? field.max : undefined}
                      aria-invalid={!!errors[field.key]}
                      className={`rounded-xl ${errors[field.key] ? "border-red-400 focus:border-red-500" : "border-slate-200"}`}
                    />
                    {errors[field.key] && <p role="alert" className="text-xs text-red-600">{errors[field.key]}</p>}
                  </div>
                ))}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="school-logo" className="text-xs font-bold text-slate-700">School Logo <span className="text-slate-400 font-normal">(PNG, JPEG, WebP, max 2 MB)</span></Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="school-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={event => {
                        const file = event.target.files?.[0] ?? null;
                        setForm(current => ({ ...current, logo: file }));
                        clearError("logo");
                      }}
                      onBlur={() => validateField("logo")}
                      aria-invalid={!!errors.logo}
                      className="rounded-xl border-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {(preview || editing?.logo) && (
                      <div className="relative shrink-0">
                        <SchoolLogo src={preview || editing?.logo} name={camelCaseText(form.name) || "School"} className="h-12 w-12 rounded-xl border border-slate-200 shadow-xs" />
                      </div>
                    )}
                  </div>
                  {errors.logo && <p role="alert" className="text-xs text-red-600">{errors.logo}</p>}
                </div>
              </div>
            </div>

            {/* 2. FREE TRIAL PERIOD & DURATION CONFIGURATION */}
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">Free Trial Configuration</h3>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300/60 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{calculateTrialDays()} Days Total Free Trial</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="trial-start-date" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Trial Start Date (From)
                  </Label>
                  <Input
                    id="trial-start-date"
                    type="date"
                    min={editing ? undefined : getTodayStr()}
                    value={form.trial_start_date || getTodayStr()}
                    onChange={e => {
                      const newStart = e.target.value;
                      setForm(curr => {
                        let newEnd = curr.trial_end_date;
                        if (!newEnd || newEnd < newStart) {
                          newEnd = getDefaultTrialEnd(newStart);
                        }
                        return { ...curr, trial_start_date: newStart, trial_end_date: newEnd };
                      });
                      clearError("trial_start_date");
                      clearError("trial_end_date");
                    }}
                    className="rounded-xl border-slate-200 bg-white"
                  />
                  {errors.trial_start_date && (
                    <p className="text-[11px] text-rose-600 font-medium">{errors.trial_start_date}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="trial-end-date" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Trial Expiration Date (To)
                  </Label>
                  <Input
                    id="trial-end-date"
                    type="date"
                    min={form.trial_start_date || getTodayStr()}
                    value={form.trial_end_date || ""}
                    onChange={e => {
                      setForm(curr => ({ ...curr, trial_end_date: e.target.value }));
                      clearError("trial_end_date");
                    }}
                    className="rounded-xl border-slate-200 bg-white"
                  />
                  {errors.trial_end_date && (
                    <p className="text-[11px] text-rose-600 font-medium">{errors.trial_end_date}</p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-amber-800/80 font-medium">
                The school dashboard will display the free trial days remaining until this date. Upon expiry, the renewal banner will require plan selection.
              </p>
            </div>

            {/* 3. SUBSCRIPTION TIERS (1, 3, 6, 12 MONTHS) */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-600 shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                    Custom Subscription Plans (Defined for this school)
                  </h3>
                </div>

                {/* Model toggle */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setForm(curr => ({ ...curr, pricing_model: "FLAT" }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      form.pricing_model !== "PER_STUDENT"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Flat Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(curr => ({ ...curr, pricing_model: "PER_STUDENT" }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      form.pricing_model === "PER_STUDENT"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Per Student
                  </button>
                </div>
              </div>

              {/* GST Configuration Bar */}
              <div className="bg-white/95 rounded-xl p-3 border border-indigo-100 shadow-2xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-800">GST / Tax Billing:</span>
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setForm(curr => ({ ...curr, gst_included: false }))}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          !form.gst_included
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Exclude GST (0%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(curr => ({ ...curr, gst_included: true }))}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          form.gst_included
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Include GST (Apply Tax %)
                      </button>
                    </div>
                  </div>

                  {form.gst_included && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label className="text-xs font-bold text-slate-700">GST Rate:</Label>
                      <div className="flex items-center gap-1">
                        {[5, 12, 18, 28].map(rate => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setForm(curr => ({ ...curr, gst_percentage: rate }))}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
                              Number(form.gst_percentage) === rate
                                ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                        <div className="relative w-16 ml-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={form.gst_percentage ?? 18}
                            onChange={e => setForm(curr => ({ ...curr, gst_percentage: Number(e.target.value) }))}
                            className="h-7 text-xs font-bold px-1.5 text-center rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {form.gst_included && (
                  <p className="text-[11px] text-indigo-700 font-medium">
                    GST ({form.gst_percentage ?? 18}%) will be automatically calculated on top of base rates at checkout and added to final tax invoice.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1 Month */}
                <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 truncate">1 Month</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold shrink-0">Monthly</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.monthly_price ?? 0}
                      onChange={e => setForm(curr => ({ ...curr, monthly_price: Number(e.target.value) }))}
                      className="pl-7 h-9 rounded-lg text-sm font-bold text-slate-800"
                    />
                  </div>
                  {form.gst_included && (
                    <div className="pt-1 border-t border-slate-100 text-[10px] space-y-0.5 font-medium">
                      <div className="flex justify-between text-slate-400">
                        <span>GST ({form.gst_percentage}%):</span>
                        <span>+₹{Math.round(Number(form.monthly_price || 0) * (Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-extrabold text-[11px]">
                        <span>Final Total:</span>
                        <span>₹{Math.round(Number(form.monthly_price || 0) * (1 + Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3 Months Quarterly */}
                <div className="bg-white rounded-xl p-3 border border-blue-200/80 shadow-2xs space-y-2 hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-blue-900 truncate">3 Months</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-bold shrink-0">Quarterly</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-blue-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.quarterly_price ?? 0}
                      onChange={e => setForm(curr => ({ ...curr, quarterly_price: Number(e.target.value) }))}
                      className="pl-7 h-9 rounded-lg text-sm font-bold text-blue-950"
                    />
                  </div>
                  {form.gst_included && (
                    <div className="pt-1 border-t border-blue-100 text-[10px] space-y-0.5 font-medium">
                      <div className="flex justify-between text-blue-400">
                        <span>GST ({form.gst_percentage}%):</span>
                        <span>+₹{Math.round(Number(form.quarterly_price || 0) * (Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-blue-950 font-extrabold text-[11px]">
                        <span>Final Total:</span>
                        <span>₹{Math.round(Number(form.quarterly_price || 0) * (1 + Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6 Months Half-Yearly */}
                <div className="bg-white rounded-xl p-3 border border-purple-200/80 shadow-2xs space-y-2 hover:border-purple-300 transition-all">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-purple-900 truncate">6 Months</span>
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-bold shrink-0">Half-Yr</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-purple-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.half_yearly_price ?? 0}
                      onChange={e => setForm(curr => ({ ...curr, half_yearly_price: Number(e.target.value) }))}
                      className="pl-7 h-9 rounded-lg text-sm font-bold text-purple-950"
                    />
                  </div>
                  {form.gst_included && (
                    <div className="pt-1 border-t border-purple-100 text-[10px] space-y-0.5 font-medium">
                      <div className="flex justify-between text-purple-400">
                        <span>GST ({form.gst_percentage}%):</span>
                        <span>+₹{Math.round(Number(form.half_yearly_price || 0) * (Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-purple-950 font-extrabold text-[11px]">
                        <span>Final Total:</span>
                        <span>₹{Math.round(Number(form.half_yearly_price || 0) * (1 + Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 12 Months Yearly */}
                <div className="bg-white rounded-xl p-3 border border-emerald-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-900 truncate">12 Months</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold shrink-0">Annual</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.yearly_price ?? 0}
                      onChange={e => setForm(curr => ({ ...curr, yearly_price: Number(e.target.value) }))}
                      className="pl-7 h-9 rounded-lg text-sm font-bold text-emerald-950"
                    />
                  </div>
                  {form.gst_included && (
                    <div className="pt-1 border-t border-emerald-100 text-[10px] space-y-0.5 font-medium">
                      <div className="flex justify-between text-emerald-500">
                        <span>GST ({form.gst_percentage}%):</span>
                        <span>+₹{Math.round(Number(form.yearly_price || 0) * (Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-emerald-950 font-extrabold text-[11px]">
                        <span>Final Total:</span>
                        <span>₹{Math.round(Number(form.yearly_price || 0) * (1 + Number(form.gst_percentage || 18) / 100)).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. FEATURE SELECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Assign Feature Modules</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = form.feature_ids.length === features.length;
                    setForm(curr => ({ ...curr, feature_ids: allSelected ? [] : features.map(f => f.id) }));
                    clearError("feature_ids");
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {form.feature_ids.length === features.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                {features.map(feature => (
                  <label key={feature.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                    <input
                      type="checkbox"
                      checked={form.feature_ids.includes(feature.id)}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...form.feature_ids, feature.id]
                          : form.feature_ids.filter(id => id !== feature.id);
                        setForm(curr => ({ ...curr, feature_ids: next }));
                        clearError("feature_ids");
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>{camelCaseText(feature.name)}</span>
                  </label>
                ))}
              </div>
              {!features.length && <p className="text-xs text-slate-500">No features available.</p>}
              {errors.feature_ids && <p className="text-xs text-red-600">{errors.feature_ids}</p>}
            </div>
          </fieldset>
          </div>
          <div className="shrink-0 border-t border-slate-200 p-4 sm:px-6 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            {formError ? <p role="alert" className="text-xs font-bold text-red-600">{formError}</p> : <div />}
            <div className="flex justify-end gap-2 ml-auto">
              <AdminButton
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                variant="outline"
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs font-semibold"
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving || !features.length} className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving School…" : editing ? "Save Changes" : "Create School & Assign Plan"}
              </AdminButton>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!accessSchool} onOpenChange={value => { if (!value && busyFeature === null) setAccessSchool(null); }}>
      <DialogContent className="admin-scroll-area flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-slate-200 p-6 pr-14">
          <div className="flex items-center gap-3">
            <SchoolLogo src={accessSchool?.logo} name={camelCaseText(accessSchool?.name)} className="h-10 w-10 rounded-xl" />
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Feature Access</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">{camelCaseText(accessSchool?.name)}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="admin-scroll-area min-h-0 space-y-1 overflow-y-auto p-4">
          {features.map(feature => {
            const enabled = accessSchool?.school_features?.some(assignment => assignment.feature === feature.id && assignment.is_enabled) ?? false;
            return (
              <div key={feature.id} className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 hover:bg-slate-50">
                <span className="text-sm font-bold text-slate-700">{camelCaseText(feature.name)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${camelCaseText(feature.name)} access`}
                  disabled={busyFeature !== null}
                  onClick={() => toggleAccess(feature)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}>
                    {busyFeature === feature.id && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}
                  </span>
                </button>
              </div>
            );
          })}
          {accessError && <p role="alert" className="p-2 text-sm text-red-600">{accessError}</p>}
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-200 p-4">
          <AdminButton onClick={() => setAccessSchool(null)} disabled={busyFeature !== null}>Done</AdminButton>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
