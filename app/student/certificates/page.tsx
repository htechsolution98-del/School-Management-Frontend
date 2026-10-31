"use client";

import { StudentEmptyState } from "@/components/student/student-empty-state";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Award,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Check,
  X,
  FileCheck2,
  Eye,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCertificateTypes,
  getMyCertificateRequests,
  createCertificateRequest,
  type CertificateType,
  type CertificateRequestItem,
} from "@/lib/certificate";
import { DigitalCertificateModal } from "@/components/clerk/digital-certificate-modal";
import { MobileSelectDrawer, MobileSelectTrigger } from "@/components/ui/mobile-select-drawer";

function formatDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("T")[0].split(/[-/]/);
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  } catch {}
  return dateStr;
}

export default function StudentCertificatesPage() {
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [requests, setRequests] = useState<CertificateRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTypeDrawerOpen, setIsTypeDrawerOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [viewingDigitalCopy, setViewingDigitalCopy] = useState<CertificateRequestItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [typeList, reqList] = await Promise.all([
        getCertificateTypes(),
        getMyCertificateRequests(),
      ]);
      setTypes(typeList);
      setRequests(reqList);
      if (typeList.length > 0 && selectedTypeId === "") {
        setSelectedTypeId(typeList[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, [selectedTypeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deduplicate certificate types by normalized name so options are never shown twice
  const uniqueTypes = useMemo(() => {
    const seen = new Set<string>();
    return types.filter((t) => {
      const key = (t.name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [types]);

  // Set of already requested type names or IDs that are PENDING or APPROVED
  const activeRequestedTypeIds = useMemo(() => {
    const s = new Set<number>();
    requests.forEach((r) => {
      if (r.status === "PENDING" || r.status === "APPROVED") {
        if (typeof r.certificate_type === "number") {
          s.add(r.certificate_type);
        } else {
          const matched = types.find((t) => t.name.toLowerCase() === String(r.certificate_type).toLowerCase());
          if (matched) s.add(matched.id);
        }
      }
    });
    return s;
  }, [requests, types]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) {
      toast.error("Please select a certificate type.");
      return;
    }
    if (activeRequestedTypeIds.has(Number(selectedTypeId))) {
      toast.error("A request for this certificate type has already been submitted or issued.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await createCertificateRequest(Number(selectedTypeId));
      toast.success("Certificate request submitted successfully to the clerk!");
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit certificate request.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const typeName = r.certificate_type_name || String(r.certificate_type);
      const matchesSearch =
        typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.certificate_number && r.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus =
        statusFilter === "ALL" || r.status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  return (
    <div className="w-full min-w-0 max-w-7xl space-y-4 overflow-x-hidden bg-slate-50/60 p-2 pb-3 font-sans sm:mx-auto sm:space-y-6 sm:p-4 lg:p-6 lg:pb-8">
      <section className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_12px_35px_-24px_rgba(37,99,235,.55)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 text-blue-600 ring-1 ring-blue-100">
              <Award className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Certificate Requests</h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">Request official school certificates and track verification by the clerk.</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button type="button" onClick={() => loadData()} disabled={loading} aria-label="Refresh certificates" title="Refresh certificates" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={() => setIsModalOpen(true)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:scale-[.99] sm:flex-none sm:px-5">
              <Plus className="h-4 w-4" /> Request Certificate
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Certificate request summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-3.5 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100/80 text-blue-600 sm:h-14 sm:w-14"><FileText className="h-5 w-5 sm:h-6 sm:w-6" /></div>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">Total Requests</p><p className="mt-1 text-2xl font-extrabold leading-none text-slate-950 sm:text-3xl">{stats.total}</p><p className="mt-1 line-clamp-2 text-[9px] leading-tight text-slate-500 sm:text-xs">Submitted applications</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/80 p-3.5 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100/80 text-amber-600 sm:h-14 sm:w-14"><Clock className="h-5 w-5 sm:h-6 sm:w-6" /></div>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 sm:text-xs">Pending Review</p><p className="mt-1 text-2xl font-extrabold leading-none text-amber-700 sm:text-3xl">{stats.pending}</p><p className="mt-1 line-clamp-2 text-[9px] leading-tight text-amber-700/70 sm:text-xs">With clerk office</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 p-3.5 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 sm:h-14 sm:w-14"><CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" /></div>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:text-xs">Issued &amp; Approved</p><p className="mt-1 text-2xl font-extrabold leading-none text-emerald-700 sm:text-3xl">{stats.approved}</p><p className="mt-1 line-clamp-2 text-[9px] leading-tight text-emerald-700/70 sm:text-xs">Ready for download</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/80 p-3.5 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100/80 text-rose-600 sm:h-14 sm:w-14"><XCircle className="h-5 w-5 sm:h-6 sm:w-6" /></div>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-rose-700 sm:text-xs">Declined</p><p className="mt-1 text-2xl font-extrabold leading-none text-rose-700 sm:text-3xl">{stats.rejected}</p><p className="mt-1 line-clamp-2 text-[9px] leading-tight text-rose-700/70 sm:text-xs">Review feedback</p></div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/80 bg-white/90 p-3.5 shadow-[0_12px_35px_-24px_rgba(37,99,235,.45)] sm:p-5">
        <label className="relative block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />
          <input type="search" placeholder="Search by certificate name or number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/40 pl-10 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:h-14 sm:pl-12 sm:text-sm" />
        </label>
        <div className="mt-3 flex max-w-full items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar sm:mt-4">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
            <button type="button" key={st} onClick={() => setStatusFilter(st)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition sm:px-6 sm:py-2.5 sm:text-sm ${statusFilter === st ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Certificate requests" className="space-y-3">
        {loading ? (
          <div className="rounded-3xl bg-white py-16 text-center text-slate-400 shadow-sm"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" /><p className="text-sm font-medium">Loading certificate requests...</p></div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-3xl border border-white bg-white shadow-sm"><StudentEmptyState title="No certificate requests found" description="You haven't requested any certificates yet. Submit a new request whenever you need Bonafide, Leaving, or Character certificates." actionLabel="Request Certificate" onAction={() => setIsModalOpen(true)} /></div>
        ) : filteredRequests.map((req) => {
          const isApproved = req.status === "APPROVED";
          const isPending = req.status === "PENDING";
          const statusStyle = isApproved ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : isPending ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-rose-50 text-rose-700 ring-rose-100";
          const statusText = isApproved ? "Approved" : isPending ? "Pending review" : "Declined";
          return (
            <article key={req.id} className="rounded-3xl border border-white bg-gradient-to-br from-white to-blue-50/30 p-4 shadow-[0_12px_35px_-28px_rgba(15,23,42,.4)] sm:p-5">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 ${isApproved ? "bg-emerald-100/70 text-emerald-600" : isPending ? "bg-amber-100/70 text-amber-600" : "bg-rose-100/70 text-rose-600"}`}><FileCheck2 className="h-6 w-6" /></div>
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-sm font-extrabold leading-snug text-slate-950 sm:text-lg">{req.certificate_type_name || "Official Certificate"}</h2>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">Request #{req.id}</p>
                  <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ring-1 ring-inset sm:text-xs ${statusStyle}`}>
                    {isApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : isPending ? <Clock className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{statusText}
                  </span>
                </div>
                <div className="hidden shrink-0 border-l border-slate-100 pl-4 sm:block sm:min-w-[190px]">
                  <p className="text-xs text-slate-500">Certificate No.</p>
                  <p className="mt-1 break-all text-sm font-bold text-slate-900">{req.certificate_number || "Assigned on issue"}</p>
                  <p className="mt-3 text-xs text-slate-500">Date Requested</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatDDMMYYYY(req.created_at)}</p>
                </div>
                {isApproved && <button type="button" onClick={() => setViewingDigitalCopy(req)} aria-label={`View ${req.certificate_type_name || "certificate"}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 sm:hidden"><ChevronRight className="h-6 w-6" /></button>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[11px] sm:hidden">
                <div className="min-w-0"><p className="text-slate-400">Certificate No.</p><p className="mt-0.5 truncate font-semibold text-slate-800">{req.certificate_number || "Assigned on issue"}</p></div>
                <div><p className="text-slate-400">Date Requested</p><p className="mt-0.5 font-semibold text-slate-800">{formatDDMMYYYY(req.created_at)}</p></div>
              </div>
              {isApproved && <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setViewingDigitalCopy(req)} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100 sm:flex-none"><Eye className="h-4 w-4" />View Certificate</button>
                {req.certificate_file && <a href={req.certificate_file} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 sm:flex-none"><Download className="h-4 w-4" />Download PDF</a>}
              </div>}
            </article>
          );
        })}
      </section>

      {/* Request Certificate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 sm:bg-slate-900/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Request Certificate</h3>
                  <p className="text-xs text-slate-500">Submit a request to the school clerk</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRequestSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Certificate Type *
                  </label>
                  <MobileSelectTrigger
                    valueLabel={uniqueTypes.find((type) => type.id === Number(selectedTypeId))?.name || "Select certificate type"}
                    onClick={() => setIsTypeDrawerOpen(true)}
                    className="w-full rounded-xl border-blue-200 py-3 text-sm"
                  />
                  <select
                    value={selectedTypeId}
                    onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                    required
                    className="hidden w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:block"
                  >
                    {uniqueTypes.map((t) => {
                      const alreadyRequested = activeRequestedTypeIds.has(t.id);
                      return (
                        <option key={t.id} value={t.id} disabled={alreadyRequested}>
                          {t.name} {alreadyRequested ? "(Already Submitted / Active)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Choose Bonafide, School Leaving / TC, Character, or No Dues.
                  </p>
                </div>

                {/* Informational Notice */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Once submitted, the clerk desk will generate and approve your official certificate.
                    Duplicate requests for an active or issued certificate are automatically prevented.
                  </p>
                </div>
              </div>

              {/* Fixed Bottom Single-Row Full-Width Buttons */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs active:scale-98 transition-all text-center flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <MobileSelectDrawer
        isOpen={isModalOpen && isTypeDrawerOpen}
        onClose={() => setIsTypeDrawerOpen(false)}
        title="Choose certificate type"
        subtitle="Select the certificate you want to request"
        options={uniqueTypes.map((type) => ({
          value: type.id,
          label: `${type.name}${activeRequestedTypeIds.has(type.id) ? " (Already Submitted / Active)" : ""}`,
          disabled: activeRequestedTypeIds.has(type.id),
        }))}
        selectedValue={selectedTypeId}
        onSelect={(value) => setSelectedTypeId(Number(value))}
      />
      {/* Digital Certificate Modal */}
      <DigitalCertificateModal
        isOpen={!!viewingDigitalCopy}
        onClose={() => setViewingDigitalCopy(null)}
        request={viewingDigitalCopy}
      />
    </div>
  );
}
