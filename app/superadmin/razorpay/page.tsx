"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Key,
  Lock,
  Plus,
  Edit3,
  Save,
  X,
  ChevronDown,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { AdminButton as Button } from "@/components/superadmin/admin-button";
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";
import { camelCaseText } from "@/lib/table-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiValidationError } from "@/lib/api-errors";
import { paymentFormSchema, validationErrors, type FieldErrors } from "@/lib/school-validation";
import {
  getSchoolList,
  saveRazorpayData,
  updateRazorpayData,
  deleteRazorpayData,
  getRazorpayList,
} from "@/lib/superadmin";
import type { RazorpaySchool, RazorpayRecord } from "@/types";


// ─── Masked secret display ────────────────────────────────────────────────────

function MaskedField({ value, label }: { value: string; label: string }) {
  const [show, setShow] = useState(false);
  const masked = value ? "•".repeat(Math.min(value.length, 20)) : "—";
  return (
    <div className="flex items-center gap-2 group">
      <span className="font-mono text-xs text-slate-600 tracking-wider">
        {show ? value : masked}
      </span>
      {value && (
        <button
          onClick={() => setShow((v) => !v)}
          className={`transition-colors ${show ? "text-[#1D496C]" : "text-slate-400 hover:text-slate-600"}`}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

// ─── School Select Dropdown ───────────────────────────────────────────────────

function SchoolSelect({
  schools,
  value,
  onChange,
  disabled,
}: {
  schools: RazorpaySchool[];
  value: number | "";
  onChange: (id: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = schools.find((s) => s.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-11 flex items-center justify-between gap-3 px-4 rounded-xl border-2 text-sm font-medium transition-all
          ${open ? "border-[#1D496C] bg-white ring-2 ring-[#1D496C]/10" : "border-gray-200 bg-white hover:border-[#1D496C]/50"}
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
          <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
            {selected ? camelCaseText(selected.name) : "Select a school…"}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-100/60 overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1.5">
              {schools.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(s.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                    ${value === s.id ? "bg-[#1D496C]/5 text-[#1D496C] font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  {camelCaseText(s.name)}
                  {value === s.id && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-[#1D496C]" />}
                </button>
              ))}
              {schools.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">No schools found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Add / Edit Form ──────────────────────────────────────────────────────────

function CredentialForm({
  schools,
  existing,
  existingRecords,
  onSuccess,
  onCancel,
}: {
  schools: RazorpaySchool[];
  existing?: RazorpayRecord;
  existingRecords: RazorpayRecord[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [schoolId, setSchoolId] = useState<number | "">(existing?.school ?? "");
  const [keyId, setKeyId] = useState(existing?.razorpay_key_id ?? "");
  const [secret, setSecret] = useState(existing?.razorpay_secret_key ?? "");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isEdit = !!existing?.id;
  const alreadyHasRecord = !isEdit && existingRecords.some((r) => r.school === schoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = paymentFormSchema.safeParse({ school: schoolId, razorpay_key_id: keyId, razorpay_secret_key: secret });
    if (!result.success) { setFieldErrors(validationErrors(result.error.issues)); setErr("Please correct the highlighted fields."); return; }
    if (alreadyHasRecord) { setFieldErrors({ school: "This school already has Razorpay credentials. Edit the existing record instead." }); return; }

    setSaving(true);
    setErr("");
    setFieldErrors({});
    try {
      const payload = result.data;
      if (isEdit && existing?.id) {
        await updateRazorpayData(existing.id, payload);
      } else {
        await saveRazorpayData(payload);
      }
      onSuccess();
    } catch (e: unknown) {
      if (e instanceof ApiValidationError) setFieldErrors(e.fieldErrors);
      setErr(e instanceof Error ? e.message : "Unable to save credentials. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 md:p-8 w-full max-w-2xl overflow-hidden flex flex-col relative max-h-[calc(100dvh-2rem)]"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h3 className="text-2xl font-semibold text-slate-800 tracking-tight mb-2">
          {isEdit ? "Edit Razorpay Credentials" : "Add Razorpay Credentials"}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {isEdit ? `Updating for ${existing?.school_name}` : "Link a school to its payment gateway"}
        </p>

        <div className="min-h-0 overflow-y-auto custom-scrollbar pr-2">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* School selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">School</Label>
          <SchoolSelect
            schools={schools}
            value={schoolId}
            onChange={id => { setSchoolId(id); setFieldErrors(current => ({ ...current, school: "" })); }}
            disabled={isEdit}
          />
          {fieldErrors.school && <p role="alert" className="text-xs text-red-600">{fieldErrors.school}</p>}
          {alreadyHasRecord && (
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              This school already has credentials — edit the existing row instead.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Key ID */}
          <div className="space-y-1.5">
            <Label htmlFor="razorpay-key-id" className="text-sm font-medium text-slate-700">
              Razorpay Key ID
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="razorpay-key-id"
                required
                maxLength={255}
                aria-invalid={!!fieldErrors.razorpay_key_id}
                aria-describedby={fieldErrors.razorpay_key_id ? "key-id-error" : undefined}
                value={keyId}
                onChange={(e) => { setKeyId(e.target.value); setFieldErrors(current => ({ ...current, razorpay_key_id: "" })); }}
                placeholder="rzp_live_xxxxxxxxxx"
                className="pl-9 h-11 rounded-xl border-gray-200 font-mono text-sm focus:border-[#1D496C] focus:ring-2 focus:ring-[#1D496C]/20"
              />
            </div>
            {fieldErrors.razorpay_key_id && <p id="key-id-error" className="text-xs text-red-600">{fieldErrors.razorpay_key_id}</p>}
          </div>

          {/* Secret */}
          <div className="space-y-1.5">
            <Label htmlFor="razorpay-secret" className="text-sm font-medium text-slate-700">
              Razorpay Secret Key
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="razorpay-secret"
                required
                maxLength={255}
                aria-invalid={!!fieldErrors.razorpay_secret_key}
                aria-describedby={fieldErrors.razorpay_secret_key ? "secret-error" : undefined}
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => { setSecret(e.target.value); setFieldErrors(current => ({ ...current, razorpay_secret_key: "" })); }}
                placeholder="••••••••••••••••"
                className="pl-9 pr-10 h-11 rounded-xl border-gray-200 font-mono text-sm focus:border-[#1D496C] focus:ring-2 focus:ring-[#1D496C]/20"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.razorpay_secret_key && <p id="secret-error" className="text-xs text-red-600">{fieldErrors.razorpay_secret_key}</p>}
          </div>
        </div>

        {err && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onCancel}
           >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}
           >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : <><Save className="h-4 w-4 mr-2" />{isEdit ? "Update" : "Save Credentials"}</>}
          </Button>
        </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({
  record,
  onConfirm,
  onCancel,
  loading,
}: {
  record: RazorpayRecord;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 16 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Delete Credentials</h3>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          You are about to delete Razorpay credentials for{" "}
          <span className="font-semibold text-gray-900">{record.school_name || `School #${record.school}`}</span>.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}
           >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}
           >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const razorpayColumns: DataTableColumn<RazorpayRecord>[] = [
  {
    key: "school",
    header: "School",
    sticky: true,
    search: record => [record.school_name, record.school],
    render: record => (
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 shrink-0 rounded-xl bg-[#1D496C]/8 flex items-center justify-center">
          <Building2 className="h-3.5 w-3.5 text-[#1D496C]" />
        </div>
        <span className="text-sm font-semibold text-gray-800">
          {camelCaseText(record.school_name) || `School #${record.school}`}
        </span>
      </div>
    ),
  },
  {
    key: "key_id",
    header: "Key ID",
    search: record => [record.razorpay_key_id],
    render: record => (
      <div className="flex items-center gap-2">
        <Key className="h-3.5 w-3.5 shrink-0 text-gray-300" />
        <MaskedField value={record.razorpay_key_id} label="Key ID" />
      </div>
    ),
  },
  {
    key: "secret_key",
    header: "Secret Key",
    render: record => (
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 shrink-0 text-gray-300" />
        <MaskedField value={record.razorpay_secret_key} label="Secret" />
      </div>
    ),
  },
];

export default function RazorpayCredentialsPage() {
  const [schools, setSchools] = useState<RazorpaySchool[]>([]);
  const [records, setRecords] = useState<RazorpayRecord[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RazorpayRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<RazorpayRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    setError("");
    try {
      const [schoolData, razorData] = await Promise.all([getSchoolList(), getRazorpayList()]);
      setSchools(schoolData);
      // Attach school_name to each record
      const enriched = razorData.map((r) => ({
        ...r,
        school_name: schoolData.find((s) => s.id === r.school)?.name,
      }));
      setRecords(enriched);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSuccess = async (msg: string) => {
    setIsAdding(false);
    setEditingRecord(null);
    await fetchAll();
    showSuccess(msg);
  };

  const handleDelete = async () => {
    if (!deletingRecord?.id) return;
    setDeleteLoading(true);
    try {
      await deleteRazorpayData(deletingRecord.id);
      setDeletingRecord(null);
      await fetchAll();
      showSuccess("Credentials deleted successfully");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Schools that don't yet have a record
  const schoolsWithoutRecord = schools.filter(
    (s) => !records.some((r) => r.school === s.id),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-[#1D496C]/10 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5 text-[#1D496C]" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Razorpay Credentials
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Manage payment gateway credentials for each school.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchAll} disabled={isFetching} title="Refresh"
           >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => { setIsAdding(!isAdding); setEditingRecord(null); setError(""); }}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-all ${isAdding ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200" : "bg-[#1D496C] hover:bg-[#163b58] text-white"}`}
          >
            {isAdding ? (<><X className="h-4 w-4 mr-1.5" />Cancel</>) : (<><Plus className="h-4 w-4 mr-1.5" />Add Credentials</>)}
          </Button>
        </div>
      </div>

      {/* ── Toast messages ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />{successMsg}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add form ── */}
      <AnimatePresence>
        {isAdding && !editingRecord && (
          <CredentialForm
            key="add"
            schools={schools}
            existingRecords={records}
            onSuccess={() => handleSuccess("Credentials saved successfully")}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {editingRecord && (
          <CredentialForm
            key={`edit-${editingRecord.id}`}
            schools={schools}
            existing={editingRecord}
            existingRecords={records}
            onSuccess={() => handleSuccess("Credentials updated successfully")}
            onCancel={() => { setEditingRecord(null); setIsAdding(false); }}
          />
        )}
      </AnimatePresence>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Schools", value: schools.length, icon: Building2, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
          { label: "Configured", value: records.length, icon: ShieldCheck, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
          { label: "Pending Setup", value: schoolsWithoutRecord.length, icon: AlertCircle, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`flex items-center gap-3 p-4 rounded-xl border ${stat.bg} ${stat.border}`}
          >
            <div className={`h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
              <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{isFetching ? "—" : stat.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Table ── */}
      <DataTable
        data={records}
        columns={razorpayColumns}
        getRowId={(record, idx) => record.id ?? idx}
        createdDate
        createdDateRange
        search
        searchPlaceholder="Search school or key ID"
        searchAriaLabel="Search Razorpay credentials"
        loading={isFetching}
        loadingLabel="Loading credentials…"
        emptyTitle="No credentials yet"
        emptyDescription='Click "Add Credentials" to get started.'
        noResultsTitle="No credentials match your search."
        caption="Razorpay credentials"
        minWidth={720}
        filters={[{
          key: "school",
          label: "School",
          optionsFrom: rows => dynamicOptions(rows, record => record.school_name || null),
          match: (record, value) => (record.school_name || null) === value,
        }]}
        footerNote={!isFetching && schoolsWithoutRecord.length > 0 ? (
          <span className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            <span>
              <span className="block font-semibold text-slate-600">
                {schoolsWithoutRecord.length} school{schoolsWithoutRecord.length > 1 ? "s" : ""} without Razorpay setup:
              </span>
              <span className="mt-0.5 block font-medium text-slate-600">
                {schoolsWithoutRecord.map(s => camelCaseText(s.name)).join(", ")}
              </span>
            </span>
          </span>
        ) : undefined}
        renderActions={record => [
          {
            label: "Edit credentials",
            icon: Edit3,
            onClick: () => {
              setEditingRecord(record);
              setIsAdding(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            },
            color: "text-blue-600 hover:bg-blue-50 hover:text-blue-700",
          },
          { label: "Delete credentials", icon: X, onClick: () => setDeletingRecord(record), color: "text-red-600 hover:bg-red-50 hover:text-red-700" },
        ].map(action => <button key={action.label} type="button" title={action.label} aria-label={`${action.label}: ${record.school_name ?? record.school}`} disabled={isFetching} onClick={action.onClick} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:border-slate-200 sm:text-slate-600 ${action.color}`}><action.icon className="h-3.5 w-3.5" />{action.label.replace(" credentials", "")}</button>)}
      />

      {/* ── Delete modal ── */}
      <AnimatePresence>
        {deletingRecord && (
          <DeleteModal
            record={deletingRecord}
            onConfirm={handleDelete}
            onCancel={() => setDeletingRecord(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
