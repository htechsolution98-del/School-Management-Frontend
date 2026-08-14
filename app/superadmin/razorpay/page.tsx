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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          className={`transition-colors ${show ? "text-[#4F46E5]" : "text-slate-400 hover:text-slate-600"}`}
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
          ${open ? "border-[#4F46E5] bg-white ring-2 ring-[#4F46E5]/10" : "border-gray-200 bg-white hover:border-[#4F46E5]/50"}
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
          <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
            {selected ? selected.name : "Select a school…"}
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
            className="absolute z-30 mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/60 overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1.5">
              {schools.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(s.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                    ${value === s.id ? "bg-[#4F46E5]/5 text-[#4F46E5] font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  {s.name}
                  {value === s.id && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-[#4F46E5]" />}
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

  const isEdit = !!existing?.id;
  const alreadyHasRecord = !isEdit && existingRecords.some((r) => r.school === schoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) { setErr("Please select a school"); return; }
    if (!keyId.trim()) { setErr("Razorpay Key ID is required"); return; }
    if (!secret.trim()) { setErr("Razorpay Secret Key is required"); return; }
    if (alreadyHasRecord) { setErr("This school already has Razorpay credentials. Edit the existing record instead."); return; }

    setSaving(true);
    setErr("");
    try {
      const payload = { school: schoolId as number, razorpay_key_id: keyId.trim(), razorpay_secret_key: secret.trim() };
      if (isEdit && existing?.id) {
        await updateRazorpayData(existing.id, payload);
      } else {
        await saveRazorpayData(payload);
      }
      onSuccess();
    } catch (e: any) {
      setErr(e.message);
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
        className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 md:p-8 w-full max-w-2xl overflow-hidden flex flex-col relative max-h-[90vh]"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
          {isEdit ? "Edit Razorpay Credentials" : "Add Razorpay Credentials"}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {isEdit ? `Updating for ${existing?.school_name}` : "Link a school to its payment gateway"}
        </p>

        <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
          <form onSubmit={handleSubmit} className="space-y-5 pb-4">
        {/* School selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">School</Label>
          <SchoolSelect
            schools={schools}
            value={schoolId}
            onChange={setSchoolId}
            disabled={isEdit}
          />
          {alreadyHasRecord && (
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              This school already has credentials — edit the existing row instead.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Key ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Razorpay Key ID
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="rzp_live_xxxxxxxxxx"
                className="pl-9 h-11 rounded-xl border-gray-200 font-mono text-sm focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
            </div>
          </div>

          {/* Secret */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Razorpay Secret Key
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="pl-9 pr-10 h-11 rounded-xl border-gray-200 font-mono text-sm focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            className="h-10 px-5 rounded-xl text-sm font-semibold border-gray-200">
            Cancel
          </Button>
          <Button type="submit" disabled={saving}
            className="h-10 px-6 rounded-xl text-sm font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white">
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Delete Credentials</h3>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          You are about to delete Razorpay credentials for{" "}
          <span className="font-bold text-gray-900">{record.school_name || `School #${record.school}`}</span>.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}
            className="flex-1 h-10 rounded-xl border-gray-200 text-sm font-semibold">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}
            className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
            <div className="h-7 w-7 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5 text-[#4F46E5]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Razorpay Credentials
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Manage payment gateway credentials for each school.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchAll} disabled={isFetching} title="Refresh"
            className="h-9 w-9 rounded-lg border-gray-200">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => { setIsAdding(!isAdding); setEditingRecord(null); setError(""); }}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-all ${isAdding ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200" : "bg-[#4F46E5] hover:bg-[#4338CA] text-white"}`}
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
          { label: "Configured", value: records.length, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
          { label: "Pending Setup", value: schoolsWithoutRecord.length, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`flex items-center gap-3 p-4 rounded-2xl border ${stat.bg} ${stat.border}`}
          >
            <div className={`h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
              <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 leading-none">{isFetching ? "—" : stat.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto -mx-0">
          <table className="w-full text-sm text-left min-w-[600px]">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">School</th>
                <th className="px-6 py-4">Key ID</th>
                <th className="px-6 py-4">Secret Key</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isFetching ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5] mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">Loading credentials…</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-500">No credentials yet</p>
                        <p className="text-xs text-gray-400 mt-0.5">Click "Add Credentials" to get started</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => (
                  <motion.tr
                    key={record.id ?? idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-gray-50/60 transition-colors group"
                  >
                    {/* School */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-[#4F46E5]/8 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-[#4F46E5]" />
                        </div>
                        <span className="font-semibold text-gray-800 text-sm">
                          {record.school_name || `School #${record.school}`}
                        </span>
                      </div>
                    </td>

                    {/* Key ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <MaskedField value={record.razorpay_key_id} label="Key ID" />
                      </div>
                    </td>

                    {/* Secret */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <MaskedField value={record.razorpay_secret_key} label="Secret" />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRecord(record);
                            setIsAdding(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all border-[#4F46E5] text-[#4F46E5] sm:border-gray-200 sm:text-gray-600 hover:bg-[#4F46E5] hover:text-white hover:border-[#4F46E5] active:bg-[#4F46E5] active:text-white active:border-[#4F46E5]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingRecord(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all border-red-400 text-red-500 sm:border-gray-200 sm:text-gray-600 hover:bg-red-500 hover:text-white hover:border-red-500 active:bg-red-500 active:text-white active:border-red-500"

                        >
                          <X className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pending schools footer */}
        {!isFetching && schoolsWithoutRecord.length > 0 && (
          <div className="border-t border-gray-50 px-6 py-4 bg-amber-50/50">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700">
                  {schoolsWithoutRecord.length} school{schoolsWithoutRecord.length > 1 ? "s" : ""} without Razorpay setup:
                </p>
                <p className="text-xs text-amber-600 mt-0.5 font-medium">
                  {schoolsWithoutRecord.map((s) => s.name).join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

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