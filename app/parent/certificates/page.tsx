"use client";

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
  User,
  ShieldCheck,
  Eye,
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

export default function ParentCertificatesPage() {
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [requests, setRequests] = useState<CertificateRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      toast.error("A certificate request for this certificate type has already been submitted or issued for your child.");
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
      const studentName = r.student_name || "";
      const matchesSearch =
        typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-6 lg:p-8 font-sans w-full min-w-0 overflow-x-hidden">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Child Certificate Desk
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                View submitted certificate requests, status synchronized with your child, and download approved certificates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          >
            <Plus className="w-4 h-4" />
            Request Certificate
          </button>
        </div>
      </div>

      {/* Synchronized Notification Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-indigo-900 leading-relaxed">
          <span className="font-bold">Real-time Synchronization:</span> All certificate requests made either by you
          or by your child are reflected here immediately. Once an application is submitted or approved, further duplicate
          requests for the same certificate are blocked to prevent duplicate clerk issuances.
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applications</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.total}</div>
          <p className="text-xs text-slate-400 mt-1">Submitted certificates</p>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{stats.pending}</div>
          <p className="text-xs text-amber-600/80 mt-1">Under verification</p>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Approved & Issued</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{stats.approved}</div>
          <p className="text-xs text-emerald-600/80 mt-1">Available to download</p>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Declined</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700">{stats.rejected}</div>
          <p className="text-xs text-rose-600/80 mt-1">Declined requests</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, certificate, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0 pb-1 sm:pb-0">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  statusFilter === st
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table / List */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
            <p className="text-sm font-medium">Loading child certificate applications...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No Certificates Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
              Neither you nor your child has requested any certificates yet. Click below to request one.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Request Certificate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Student / Child</th>
                  <th className="py-3.5 px-5">Certificate Type</th>
                  <th className="py-3.5 px-5">Certificate No.</th>
                  <th className="py-3.5 px-5">Date Requested</th>
                  <th className="py-3.5 px-5">Verification Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
                {filteredRequests.map((req) => {
                  const isApproved = req.status === "APPROVED";
                  const isPending = req.status === "PENDING";
                  const isRejected = req.status === "REJECTED";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {req.student_name}
                            </span>
                            {req.student_gr_no && (
                              <span className="text-[11px] text-slate-400">GR: {req.student_gr_no}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-semibold text-slate-800 block">
                          {req.certificate_type_name || "Official Certificate"}
                        </span>
                        <span className="text-[11px] text-slate-400">Req #{req.id}</span>
                      </td>
                      <td className="py-4 px-5">
                        {req.certificate_number ? (
                          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                            {req.certificate_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Assigned on Issue</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-slate-600 font-medium">
                        {formatDDMMYYYY(req.created_at)}
                      </td>
                      <td className="py-4 px-5">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved / Issued
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Pending Clerk Approval
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> Request Declined
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {isApproved ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewingDigitalCopy(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors shadow-2xs"
                              title="View Digital Copy"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Digital Copy
                            </button>
                            {req.certificate_file && (
                              <a
                                href={req.certificate_file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : isPending ? (
                          <span className="text-xs text-amber-600 italic">Processing...</span>
                        ) : (
                          <span className="text-xs text-rose-500">Not Issued</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Certificate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Request Certificate</h3>
                  <p className="text-xs text-slate-500">Apply on behalf of your child</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRequestSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Certificate Type *
                </label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
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
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  The request will be transmitted directly to the school clerk.
                  Once approved, your child and you will both be notified and can download the certificate.
                  Duplicate requests are prevented.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-2 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
      {/* Digital Certificate Modal */}
      <DigitalCertificateModal
        isOpen={!!viewingDigitalCopy}
        onClose={() => setViewingDigitalCopy(null)}
        request={viewingDigitalCopy}
      />
    </div>
  );
}
