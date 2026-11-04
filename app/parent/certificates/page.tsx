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
  User,
  Eye,
  ChevronDown,
  Sparkles,
  Calendar,
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
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer";

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

function formatStudentDisplayName(rawName?: string | null): string {
  if (!rawName) return "Student";
  const words = rawName.trim().split(/\s+/);
  const uniqueWords: string[] = [];
  words.forEach((w) => {
    const lower = w.toLowerCase();
    if (!uniqueWords.some((u) => u.toLowerCase() === lower)) {
      uniqueWords.push(w);
    }
  });
  return uniqueWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export default function ParentCertificatesPage() {
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

  // Helper to match a request's certificate type to a CertificateType ID
  const getTypeIdForRequest = useCallback(
    (r: CertificateRequestItem): number | null => {
      if (typeof r.certificate_type === "number") return r.certificate_type;
      const targetName = (r.certificate_type_name || String(r.certificate_type || "")).trim().toLowerCase();
      const matched = types.find((t) => t.name.trim().toLowerCase() === targetName);
      return matched ? matched.id : null;
    },
    [types]
  );

  // Map of CertificateType ID -> Approved/Issued CertificateRequest
  const issuedRequestsMap = useMemo(() => {
    const map = new Map<number, CertificateRequestItem>();
    requests.forEach((r) => {
      if (r.status === "APPROVED") {
        const tid = getTypeIdForRequest(r);
        if (tid !== null) map.set(tid, r);
      }
    });
    return map;
  }, [requests, getTypeIdForRequest]);

  // Map of CertificateType ID -> Pending Review CertificateRequest
  const pendingRequestsMap = useMemo(() => {
    const map = new Map<number, CertificateRequestItem>();
    requests.forEach((r) => {
      if (r.status === "PENDING") {
        const tid = getTypeIdForRequest(r);
        if (tid !== null) map.set(tid, r);
      }
    });
    return map;
  }, [requests, getTypeIdForRequest]);

  // Combined set of IDs that are already pending or issued (cannot submit a duplicate request)
  const activeRequestedTypeIds = useMemo(() => {
    const s = new Set<number>();
    issuedRequestsMap.forEach((_, id) => s.add(id));
    pendingRequestsMap.forEach((_, id) => s.add(id));
    return s;
  }, [issuedRequestsMap, pendingRequestsMap]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [typeList, reqList] = await Promise.all([
        getCertificateTypes(),
        getMyCertificateRequests(),
      ]);
      setTypes(typeList);
      setRequests(reqList);

      // Identify unavailable IDs (issued or pending)
      const unavailable = new Set<number>();
      reqList.forEach((r) => {
        if (r.status === "PENDING" || r.status === "APPROVED") {
          if (typeof r.certificate_type === "number") unavailable.add(r.certificate_type);
          else {
            const m = typeList.find(
              (t) => t.name.trim().toLowerCase() === (r.certificate_type_name || String(r.certificate_type || "")).trim().toLowerCase()
            );
            if (m) unavailable.add(m.id);
          }
        }
      });

      // Automatically select the first available certificate type
      const firstAvail = typeList.find((t) => !unavailable.has(t.id));
      if (firstAvail) {
        setSelectedTypeId(firstAvail.id);
      } else if (typeList.length > 0) {
        setSelectedTypeId(typeList[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRequestModal = useCallback(() => {
    // Pick the first available certificate type that hasn't been requested or issued yet
    const firstAvailable = uniqueTypes.find((t) => !activeRequestedTypeIds.has(t.id));
    if (firstAvailable) {
      setSelectedTypeId(firstAvailable.id);
    } else if (uniqueTypes.length > 0) {
      setSelectedTypeId(uniqueTypes[0].id);
    }
    setIsModalOpen(true);
  }, [uniqueTypes, activeRequestedTypeIds]);

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
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto pb-8 lg:pb-12 w-full min-w-0 overflow-x-hidden font-sans">
      {/* ── 1. ROYAL BLUE EXECUTIVE HEADER BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white p-5 sm:p-6 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Sparkles className="h-3.5 w-3.5" /> Official Digital Certificates
              </span>
              <span className="text-xs font-bold text-slate-500">
                Verified Clerk Issuance Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Child Certificate Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
              View submitted certificate requests, track verification status synchronized with your child,
              and print or download approved digital copies.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="h-10 px-3.5 rounded-2xl border border-slate-200 bg-white/90 text-xs font-bold text-slate-700 shadow-xs hover:bg-white hover:text-blue-600 transition flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleOpenRequestModal}
              className="h-10 px-4 sm:px-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Request Certificate
            </button>
          </div>
        </div>
      </section>


      {/* ── 3. SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total */}
        <div className="rounded-3xl border border-blue-100/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Applications</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">{stats.total}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">Submitted certificates</p>
        </div>

        {/* Card 2: Pending */}
        <div className="rounded-3xl border border-amber-100/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/60 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">{stats.pending}</div>
          <p className="text-[11px] text-amber-600/80 font-medium mt-0.5 truncate">Under verification</p>
        </div>

        {/* Card 3: Approved */}
        <div className="rounded-3xl border border-emerald-100/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Approved & Issued</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">{stats.approved}</div>
          <p className="text-[11px] text-emerald-600/80 font-medium mt-0.5 truncate">Available to download</p>
        </div>

        {/* Card 4: Declined */}
        <div className="rounded-3xl border border-rose-100/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Declined</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100/60 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 font-mono tracking-tight">{stats.rejected}</div>
          <p className="text-[11px] text-rose-600/80 font-medium mt-0.5 truncate">Declined requests</p>
        </div>
      </div>

      {/* ── 4. MAIN CONTENT CARD ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, certificate, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 h-10 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/60 font-medium placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar shrink-0">
            <div className="bg-slate-100/80 p-1 rounded-2xl flex items-center gap-1">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => {
                const count =
                  st === "ALL"
                    ? stats.total
                    : st === "PENDING"
                    ? stats.pending
                    : st === "APPROVED"
                    ? stats.approved
                    : stats.rejected;
                const label =
                  st === "ALL" ? "All" : st === "REJECTED" ? "Declined" : st.charAt(0) + st.slice(1).toLowerCase();

                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                      statusFilter === st
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        statusFilter === st ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 5. REQUESTS LIST: DESKTOP TABLE & MOBILE CARD VIEW ── */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-semibold">Loading child certificate applications...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 sm:py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 mb-1">No Certificates Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {searchQuery || statusFilter !== "ALL"
                ? "No certificate applications match your filter criteria. Try resetting your search."
                : "Neither you nor your child has requested any certificates yet. Click below to apply."}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                if (requests.length === 0) handleOpenRequestModal();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              {requests.length === 0 ? <Plus className="w-3.5 h-3.5" /> : null}
              {requests.length === 0 ? "Request Certificate" : "Reset Filters"}
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                    const studentCleanName = formatStudentDisplayName(req.student_name);

                    return (
                      <tr key={req.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                              {studentCleanName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 block leading-tight">
                                {studentCleanName}
                              </span>
                              {req.student_gr_no && (
                                <span className="text-[11px] font-bold text-slate-400 font-mono">
                                  GR: {req.student_gr_no}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-extrabold text-slate-900 block">
                            {req.certificate_type_name || "Official Certificate"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">Req #{req.id}</span>
                        </td>
                        <td className="py-4 px-5">
                          {req.certificate_number ? (
                            <span className="whitespace-nowrap font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                              {req.certificate_number}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium italic">Assigned on Issue</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-slate-600 font-semibold text-xs whitespace-nowrap">
                          {formatDDMMYYYY(req.created_at)}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approved / Issued
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                              <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Clerk Approval
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                              <XCircle className="w-3.5 h-3.5" /> Request Declined
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          {isApproved ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setViewingDigitalCopy(req)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all"
                                title="View Digital Copy"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Digital Copy
                              </button>
                              {req.certificate_file && (
                                <a
                                  href={req.certificate_file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                                  title="Download Original PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/60">
                              <Clock className="w-3.5 h-3.5" /> Processing...
                            </span>
                          ) : (
                            <span className="text-xs text-rose-500 font-medium">Not Issued</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredRequests.map((req) => {
                const isApproved = req.status === "APPROVED";
                const isPending = req.status === "PENDING";
                const isRejected = req.status === "REJECTED";
                const studentCleanName = formatStudentDisplayName(req.student_name);

                return (
                  <div key={req.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                          {req.certificate_type_name || "Official Certificate"}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-400">Req #{req.id}</span>
                      </div>
                      <div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Declined
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {studentCleanName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 block truncate">
                          {studentCleanName}
                        </span>
                        {req.student_gr_no && (
                          <span className="text-[10px] text-slate-400 font-mono">GR: {req.student_gr_no}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Certificate No.</span>
                        <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                          {req.certificate_number || "Assigned on issue"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Date Requested</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {formatDDMMYYYY(req.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      {isApproved ? (
                        <button
                          onClick={() => setViewingDigitalCopy(req)}
                          className="w-full py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Digital Certificate
                        </button>
                      ) : isPending ? (
                        <div className="w-full py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/60 flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Under Clerk Review
                        </div>
                      ) : (
                        <div className="w-full py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium text-center">
                          Request Declined
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 6. REQUEST CERTIFICATE MODAL (FULL SCREEN ON MOBILE, CENTERED ON DESKTOP) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-white sm:rounded-3xl rounded-none shadow-2xl border-0 sm:border sm:border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Request Certificate</h3>
                  <p className="text-xs text-slate-500 font-medium">Apply on behalf of your enrolled child</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleRequestSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Certificate Type *
                  </label>

                  {/* Mobile Trigger: Opens Bottom Drawer on Mobile */}
                  <div className="block sm:hidden">
                    <button
                      type="button"
                      onClick={() => setIsTypeDrawerOpen(true)}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            selectedTypeId && issuedRequestsMap.has(Number(selectedTypeId))
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : selectedTypeId && pendingRequestsMap.has(Number(selectedTypeId))
                              ? "bg-amber-50 text-amber-600 border border-amber-200"
                              : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}
                        >
                          {selectedTypeId && issuedRequestsMap.has(Number(selectedTypeId)) ? (
                            <CheckCircle2 className="w-4.5 h-4.5" />
                          ) : selectedTypeId && pendingRequestsMap.has(Number(selectedTypeId)) ? (
                            <Clock className="w-4.5 h-4.5" />
                          ) : (
                            <Award className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-sm text-slate-900 truncate">
                            {types.find((t) => t.id === Number(selectedTypeId))?.name || "Choose Certificate Type"}
                          </span>
                          {selectedTypeId && issuedRequestsMap.has(Number(selectedTypeId)) ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              Already Issued (Available in dashboard)
                            </span>
                          ) : selectedTypeId && pendingRequestsMap.has(Number(selectedTypeId)) ? (
                            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                              Under Clerk Review
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">
                              Ready to request · Tap to change
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  </div>

                  {/* Desktop Dropdown: Clean Native Select for Tablets and Desktops */}
                  <div className="hidden sm:block">
                    <select
                      value={selectedTypeId}
                      onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium"
                    >
                      {uniqueTypes.map((t) => {
                        const isIssued = issuedRequestsMap.has(t.id);
                        const isPending = pendingRequestsMap.has(t.id);
                        const issuedReq = issuedRequestsMap.get(t.id);
                        return (
                          <option key={t.id} value={t.id} disabled={isIssued || isPending}>
                            {t.name}{" "}
                            {isIssued
                              ? `(Already Issued - ${issuedReq?.certificate_number || "Approved"})`
                              : isPending
                              ? "(Already Requested - Under Review)"
                              : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                    Select the official document needed from the school administration.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100/90 text-xs sm:text-sm text-blue-950 leading-relaxed font-medium">
                  The school clerk will verify academic and enrollment records before approving and issuing the digital certificate.
                </div>
              </div>

              {/* Action Buttons: Pinned to bottom with safe-area spacing */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedTypeId || activeRequestedTypeIds.has(Number(selectedTypeId))}
                  className="flex-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

      {/* ── MOBILE BOTTOM DRAWER FOR CERTIFICATE TYPE SELECTION ── */}
      <MobileBottomDrawer
        isOpen={isTypeDrawerOpen}
        onClose={() => setIsTypeDrawerOpen(false)}
        title="Select Certificate Type"
        subtitle="Choose the official document needed from the school"
      >
        <div className="space-y-2.5 py-1">
          {uniqueTypes.map((t) => {
            const isSelected = Number(selectedTypeId) === t.id;
            const issuedReq = issuedRequestsMap.get(t.id);
            const pendingReq = pendingRequestsMap.get(t.id);
            const isIssued = !!issuedReq;
            const isPending = !!pendingReq;

            if (isIssued) {
              return (
                <div
                  key={t.id}
                  className="w-full p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{t.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[11px] font-semibold text-emerald-700">
                          Already Issued
                        </span>
                        {issuedReq.certificate_number && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {issuedReq.certificate_number}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Official copy is available in your certificates list.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 flex items-center gap-1 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[2.5]" /> Issued
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTypeDrawerOpen(false);
                        setIsModalOpen(false);
                        setViewingDigitalCopy(issuedReq);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 flex items-center gap-1 cursor-pointer py-1"
                    >
                      <Eye className="w-3 h-3" /> View Copy
                    </button>
                  </div>
                </div>
              );
            }

            if (isPending) {
              return (
                <div
                  key={t.id}
                  className="w-full p-3.5 sm:p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{t.name}</p>
                      <span className="text-[11px] font-semibold text-amber-700 block mt-0.5">
                        Under Clerk Review
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Application #{pendingReq.id} submitted on {formatDDMMYYYY(pendingReq.created_at || "")}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0 flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3 h-3" /> Under Review
                  </span>
                </div>
              );
            }

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTypeId(t.id);
                  setIsTypeDrawerOpen(false);
                }}
                className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between border cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/90 border-2 border-blue-600 text-blue-900 shadow-xs"
                    : "bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800 active:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-blue-50 text-blue-600 border border-blue-100/80"
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{t.name}</p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Available to request · Tap to select
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                ) : (
                  <span className="text-xs font-bold text-blue-600 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-100/80">
                    Select
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </MobileBottomDrawer>

      {/* ── 7. DIGITAL CERTIFICATE PREVIEW & PRINT MODAL ── */}
      <DigitalCertificateModal
        isOpen={!!viewingDigitalCopy}
        onClose={() => setViewingDigitalCopy(null)}
        request={viewingDigitalCopy}
      />
    </div>
  );
}
