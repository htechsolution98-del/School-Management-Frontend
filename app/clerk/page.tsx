"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import "./clerk-workspace.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  UserCheck,
  FileCheck2,
  CalendarCheck2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  School,
  FileText,
  Eye,
  ExternalLink,
  ShieldCheck,
  Layers,
  Hash,
  MapPin,
  RefreshCw,
  Loader2,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  GraduationCap,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Printer,
  Sparkles,
  Award,
  BookOpen,
  Rocket,
  PhoneCall,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { formatDDMMYYYY } from "@/lib/table-utils";
import type { Admission } from "@/types/clerk";
import { fetchAdmissions, assignGrNumber } from "@/lib/clerk/admissions";
import { groupStudentDocuments, type PendingDocItem } from "@/lib/clerk/pending-documents";
import { StudentDocumentRows } from "@/components/clerk/student-document-rows";
import { StaffAttendanceCard } from "@/components/attendance/StaffAttendanceCard";

interface StudentItem {
  id: number;
  name: string;
  surname?: string | null;
  gr_no?: string | null;
  roll_no?: string | number | null;
  class_name?: string | null;
  division_name?: string | null;
  school_class?: number | null;
  is_rte?: boolean;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
  status?: string | null;
  photo?: string | null;
}

interface CertRequestItem {
  id: number;
  student_name: string;
  certificate_type_name: string;
  status: string;
  created_at: string;
  reason?: string;
}

export default function ClerkDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolName, setSchoolName] = useState<string>("School Management");

  // Data states
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [certRequests, setCertRequests] = useState<CertRequestItem[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    notMarked: 0,
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [admissionFilter, setAdmissionFilter] = useState<"all" | "pending" | "approved">("all");
  const [docFilter, setDocFilter] = useState<"all" | "pending" | "verified">("pending");
  const [expandedDocumentStudent, setExpandedDocumentStudent] = useState<number | null>(null);
  const [documentPage, setDocumentPage] = useState(1);

  // Modal states
  const [selectedStudentForGr, setSelectedStudentForGr] = useState<Admission | null>(null);
  const [grInput, setGrInput] = useState("");
  const [assigningGr, setAssigningGr] = useState(false);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. School name from storage
      if (typeof window !== "undefined") {
        const storedSchool = localStorage.getItem("school_name");
        if (storedSchool) setSchoolName(storedSchool);
      }

      // 2. Fetch Students
      const studentsPromise = fetchWithAuth(`${API_BASE_URL}/studentget/`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);

      // 3. Fetch Admissions
      const admissionsPromise = fetchAdmissions().catch(() => []);

      // 4. Fetch Certificate Requests (TC / Leaving certificates)
      const certPromise = fetchWithAuth(`${API_BASE_URL}/certificate-requests/`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);

      // 5. Fetch Today's Attendance
      const todayStr = new Date().toISOString().split("T")[0];
      const attendancePromise = fetchWithAuth(`${API_BASE_URL}/student-attendance/?date=${todayStr}`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);

      const [studentsData, admissionsData, certData, attendanceData] = await Promise.all([
        studentsPromise,
        admissionsPromise,
        certPromise,
        attendancePromise,
      ]);

      // Process Students
      const studentList: StudentItem[] = Array.isArray(studentsData)
        ? (studentsData as StudentItem[])
        : (studentsData as any)?.results || (studentsData as any)?.data || [];
      setStudents(studentList);

      // Process Admissions
      const admissionList: Admission[] = Array.isArray(admissionsData)
        ? (admissionsData as Admission[])
        : (admissionsData as any)?.results || (admissionsData as any)?.data || [];
      setAdmissions(admissionList);

      // Process Certificates
      const certList: CertRequestItem[] = Array.isArray(certData)
        ? (certData as CertRequestItem[])
        : (certData as any)?.results || (certData as any)?.data || [];
      setCertRequests(certList);

      // Process Attendance
      const totalCount = studentList.length;
      const attList = Array.isArray(attendanceData) ? attendanceData : attendanceData?.results || [];
      const presentCount = attList.filter((a: any) => a.is_present || a.status === "present").length;
      const absentCount = attList.filter((a: any) => a.is_present === false || a.status === "absent").length;
      const notMarkedCount = Math.max(0, totalCount - (presentCount + absentCount));

      setAttendanceStats({
        total: totalCount,
        present: presentCount,
        absent: absentCount,
        notMarked: notMarkedCount,
      });
    } catch (err) {
      console.error("Failed to load clerk dashboard", err);
      toast.error("Failed to refresh dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Extract Pending Documents from Admissions
  const pendingDocsList = useMemo<PendingDocItem[]>(() => {
    const list: PendingDocItem[] = [];

    admissions.forEach((adm) => {
      const studentNameField =
        adm.field_values?.find((f) =>
          /name|student_name|first_name/i.test(f.field_label)
        )?.value || `Applicant #${adm.admission_number}`;
      const classField =
        adm.field_values?.find((f) =>
          /class|standard|grade/i.test(f.field_label)
        )?.value || "N/A";

      // General Documents
      adm.documents?.forEach((doc) => {
        if (doc.file) {
          list.push({
            id: `adm-${adm.id}-doc-${doc.id}`,
            admissionId: adm.id,
            studentName: studentNameField,
            className: classField,
            divisionName: adm.division || undefined,
            documentName: doc.document_label || "Admission Document",
            fileUrl: doc.file,
            isVerified: adm.status === "approved",
            admissionNumber: adm.admission_number,
            docFieldId: doc.document_field,
          });
        }
      });

      // RTE Documents if any
      adm.rte_documents?.forEach((doc) => {
        const fileUrl = (doc as any).file || doc.document_file;
        if (fileUrl) {
          list.push({
            id: `adm-${adm.id}-rte-${doc.id}`,
            admissionId: adm.id,
            studentName: studentNameField,
            className: classField,
            divisionName: adm.division || undefined,
            documentName: `${doc.document_name} (RTE)`,
            fileUrl: fileUrl,
            isVerified: doc.is_verified ?? false,
            admissionNumber: adm.admission_number,
          });
        }
      });
    });

    return list;
  }, [admissions]);

  // Calculations for Metrics Cards
  const totalStudentsCount = students.length;
  const newAdmissionsCount = admissions.length;
  const pendingAdmissionsCount = admissions.filter((a) => a.status === "pending" || !a.gr_no).length;
  const pendingDocumentsCount = pendingDocsList.filter((d) => !d.isVerified).length;
  const attendanceRate = totalStudentsCount > 0 ? Math.round((attendanceStats.present / totalStudentsCount) * 100) : 0;
  const pendingCertCount = certRequests.filter((c) => c.status === "pending" || c.status === "requested").length;

  // Student Instant Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return students
      .filter((s) => {
        const fullName = `${s.name || ""} ${s.surname || ""}`.toLowerCase();
        const gr = (s.gr_no || "").toLowerCase();
        const roll = String(s.roll_no || "").toLowerCase();
        const cls = (s.class_name || "").toLowerCase();
        return fullName.includes(q) || gr.includes(q) || roll.includes(q) || cls.includes(q);
      })
      .slice(0, 8);
  }, [students, searchQuery]);

  // Recent Admissions List
  const recentAdmissions = useMemo(() => {
    let list = [...admissions];
    if (admissionFilter === "pending") {
      list = list.filter((a) => a.status === "pending" || !a.gr_no);
    } else if (admissionFilter === "approved") {
      list = list.filter((a) => a.status === "approved" || Boolean(a.gr_no));
    }
    return list.slice(0, 8);
  }, [admissions, admissionFilter]);

  // Filtered Documents
  const documentStudents = useMemo(() => {
    return groupStudentDocuments(pendingDocsList, docFilter);
  }, [pendingDocsList, docFilter]);
  const documentPageCount = Math.max(1, Math.ceil(documentStudents.length / 8));
  const activeDocumentPage = Math.min(documentPage, documentPageCount);
  const visibleDocumentStudents = documentStudents.slice((activeDocumentPage - 1) * 8, activeDocumentPage * 8);

  // Handle Quick GR Number Assignment
  const handleAssignGrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForGr || !grInput.trim()) return;

    setAssigningGr(true);
    try {
      await assignGrNumber(selectedStudentForGr.admission_number, grInput.trim());
      toast.success(`GR No. "${grInput.trim()}" successfully assigned!`);
      setSelectedStudentForGr(null);
      setGrInput("");
      loadDashboardData(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign GR number");
    } finally {
      setAssigningGr(false);
    }
  };

  return (
    <div className="clerk-page clerk-dashboard w-full min-w-0 space-y-6">
      {/* ─── Top Sub-bar: Date & Action Buttons ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-2xs">
          <Calendar className="h-4 w-4 text-[#5826df]" />
          <span>{formatDDMMYYYY(new Date())}</span>
        </div>
        <div className="flex items-center gap-2.5 ml-auto">
          <Link
            href="/clerk/manual-admission"
            className="inline-flex items-center gap-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec6] text-white px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ New admission</span>
          </Link>
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs transition-all active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Updating" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ─── Staff Attendance Widget ────────────────────────────────────── */}
      <StaffAttendanceCard roleName="Clerk / Staff" className="mb-2" />

      {/* ─── Search Bar ─────────────────────────────────────────────────── */}
      <div className="relative z-30">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs px-4 py-3 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#5826df]/20 focus-within:border-[#5826df]/40 transition-all">
          <Search className="h-5 w-5 text-[#5826df] shrink-0" />
          <input
            type="text"
            placeholder="Find a student by name, GR number, roll number or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#eef2ff] border border-[#e0e7ff] rounded-xl text-[#4338ca] text-xs font-bold shrink-0">
            <Users className="h-3.5 w-3.5" />
            <span>{students.length} Students Active</span>
          </div>
        </div>

        {/* Live Instant Search Dropdown */}
        <AnimatePresence>
          {isSearchFocused && searchQuery.trim() && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsSearchFocused(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-30 max-h-96 overflow-y-auto"
              >
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Search Results ({searchResults.length})</span>
                  <span className="text-[#5826df]">Showing top matches</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <User size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No student found matching &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {searchResults.map((s) => (
                      <Link
                        key={s.id}
                        href={`/clerk/students?search=${encodeURIComponent(s.gr_no || s.name)}`}
                        onClick={() => setIsSearchFocused(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-indigo-50/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5826df] to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {(s.name?.[0] || "S").toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-[#5826df] transition-colors">
                                {s.name} {s.surname || ""}
                              </span>
                              {s.is_rte && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  RTE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Class: <strong className="text-slate-700">{s.class_name || "N/A"}</strong> {s.division_name ? `• Div ${s.division_name}` : ""} • Roll: {s.roll_no || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                            GR: {s.gr_no || "Pending"}
                          </span>
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-[#5826df] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ─── 5 Key Metrics Pastel Cards ──────────────────────────────────── */}
      <div className="dashboard-metrics grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* 1. Total Students (Sky Blue Pastel) */}
        <Link
          href="/clerk/students"
          className="bg-gradient-to-br from-[#eff6ff] to-[#f8fafc] p-5 rounded-2xl border border-blue-100/90 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all group flex flex-col justify-between relative overflow-hidden"
        >
          {/* Subtle Dot Matrix Pattern */}
          <div className="pointer-events-none absolute right-2 bottom-2 opacity-25 text-blue-400">
            <svg width="48" height="48" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="28" cy="4" r="1.5"/><circle cx="40" cy="4" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="28" cy="16" r="1.5"/><circle cx="40" cy="16" r="1.5"/><circle cx="4" cy="28" r="1.5"/><circle cx="16" cy="28" r="1.5"/><circle cx="28" cy="28" r="1.5"/><circle cx="40" cy="28" r="1.5"/><circle cx="4" cy="40" r="1.5"/><circle cx="16" cy="40" r="1.5"/><circle cx="28" cy="40" r="1.5"/><circle cx="40" cy="40" r="1.5"/></svg>
          </div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">TOTAL STUDENTS</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? <Loader2 size={24} className="animate-spin text-blue-400" /> : totalStudentsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active Enrolled
            </p>
          </div>
        </Link>

        {/* 2. New Admissions (Mint Green Pastel) */}
        <Link
          href="/clerk/admission-form"
          className="bg-gradient-to-br from-[#f0fdf4] to-[#f8fafc] p-5 rounded-2xl border border-emerald-100/90 shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="pointer-events-none absolute right-2 bottom-2 opacity-25 text-emerald-400">
            <svg width="48" height="48" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="28" cy="4" r="1.5"/><circle cx="40" cy="4" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="28" cy="16" r="1.5"/><circle cx="40" cy="16" r="1.5"/><circle cx="4" cy="28" r="1.5"/><circle cx="16" cy="28" r="1.5"/><circle cx="28" cy="28" r="1.5"/><circle cx="40" cy="28" r="1.5"/><circle cx="4" cy="40" r="1.5"/><circle cx="16" cy="40" r="1.5"/><circle cx="28" cy="40" r="1.5"/><circle cx="40" cy="40" r="1.5"/></svg>
          </div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserPlus size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">NEW ADMISSIONS</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? <Loader2 size={24} className="animate-spin text-emerald-400" /> : newAdmissionsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Total Applications
            </p>
          </div>
        </Link>

        {/* 3. Pending Review (Warm Amber Pastel) */}
        <div
          onClick={() => {
            const el = document.getElementById("recent-admissions-section");
            el?.scrollIntoView({ behavior: "smooth" });
            setAdmissionFilter("pending");
          }}
          className="bg-gradient-to-br from-[#fffbeb] to-[#f8fafc] p-5 rounded-2xl border border-amber-100/90 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all group flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="pointer-events-none absolute right-2 bottom-2 opacity-25 text-amber-400">
            <svg width="48" height="48" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="28" cy="4" r="1.5"/><circle cx="40" cy="4" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="28" cy="16" r="1.5"/><circle cx="40" cy="16" r="1.5"/><circle cx="4" cy="28" r="1.5"/><circle cx="16" cy="28" r="1.5"/><circle cx="28" cy="28" r="1.5"/><circle cx="40" cy="28" r="1.5"/><circle cx="4" cy="40" r="1.5"/><circle cx="16" cy="40" r="1.5"/><circle cx="28" cy="40" r="1.5"/><circle cx="40" cy="40" r="1.5"/></svg>
          </div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">PENDING REVIEW</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? <Loader2 size={24} className="animate-spin text-amber-400" /> : pendingAdmissionsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-semibold text-amber-600 mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Awaiting GR No.
            </p>
          </div>
        </div>

        {/* 4. Pending Docs (Soft Rose Pastel) */}
        <div
          onClick={() => {
            const el = document.getElementById("pending-docs-section");
            el?.scrollIntoView({ behavior: "smooth" });
            setDocFilter("pending");
          }}
          className="bg-gradient-to-br from-[#fff1f2] to-[#f8fafc] p-5 rounded-2xl border border-rose-100/90 shadow-2xs hover:shadow-md hover:border-rose-200 transition-all group flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="pointer-events-none absolute right-2 bottom-2 opacity-25 text-rose-400">
            <svg width="48" height="48" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="28" cy="4" r="1.5"/><circle cx="40" cy="4" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="28" cy="16" r="1.5"/><circle cx="40" cy="16" r="1.5"/><circle cx="4" cy="28" r="1.5"/><circle cx="16" cy="28" r="1.5"/><circle cx="28" cy="28" r="1.5"/><circle cx="40" cy="28" r="1.5"/><circle cx="4" cy="40" r="1.5"/><circle cx="16" cy="40" r="1.5"/><circle cx="28" cy="40" r="1.5"/><circle cx="40" cy="40" r="1.5"/></svg>
          </div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileCheck2 size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">PENDING DOCS</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? <Loader2 size={24} className="animate-spin text-rose-400" /> : pendingDocumentsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-semibold text-rose-600 mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Needs Verification
            </p>
          </div>
        </div>

        {/* 5. Today's Attendance (Soft Violet Pastel) */}
        <Link
          href="/clerk/location-settings"
          className="bg-gradient-to-br from-[#f5f3ff] to-[#f8fafc] p-5 rounded-2xl border border-indigo-100/90 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col justify-between relative overflow-hidden col-span-1 sm:col-span-2 xl:col-span-1"
        >
          <div className="pointer-events-none absolute right-2 bottom-2 opacity-25 text-indigo-400">
            <svg width="48" height="48" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="28" cy="4" r="1.5"/><circle cx="40" cy="4" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="28" cy="16" r="1.5"/><circle cx="40" cy="16" r="1.5"/><circle cx="4" cy="28" r="1.5"/><circle cx="16" cy="28" r="1.5"/><circle cx="28" cy="28" r="1.5"/><circle cx="40" cy="28" r="1.5"/><circle cx="4" cy="40" r="1.5"/><circle cx="16" cy="40" r="1.5"/><circle cx="28" cy="40" r="1.5"/><circle cx="40" cy="40" r="1.5"/></svg>
          </div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck2 size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">TODAY&apos;S ATTENDANCE</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : `${attendanceStats.present}`}
            </div>
            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present / {attendanceStats.total || totalStudentsCount} Students
            </p>
          </div>
        </Link>
      </div>

      {/* ─── Everyday Essentials Quick Actions Grid ──────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6">
        <div className="flex items-center">
          <h3 className="text-base sm:text-lg font-bold text-[#2a1768]">Everyday essentials</h3>
          <span className="text-xs text-slate-400 ml-3 hidden sm:inline">A little less searching. A lot more doing.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
          {/* 1. + New Admission */}
          <Link
            href="/clerk/manual-admission"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6366f1] text-white shadow-2xs">
                <UserPlus size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#5826df] transition-colors">+ New Admission</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#5826df] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 2. Search Student */}
          <Link
            href="/clerk/students"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0284c7] text-white shadow-2xs">
                <Search size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#0284c7] transition-colors">Search Student</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#0284c7] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 3. Verify Documents */}
          <button
            onClick={() => {
              const el = document.getElementById("pending-docs-section");
              el?.scrollIntoView({ behavior: "smooth" });
              setDocFilter("pending");
            }}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f59e0b] text-white shadow-2xs">
                <FileCheck2 size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#f59e0b] transition-colors">Verify Documents ({pendingDocumentsCount})</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#f59e0b] group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* 4. Certificates (LC/TC) */}
          <Link
            href="/clerk/certificates"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10b981] text-white shadow-2xs">
                <Award size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#10b981] transition-colors">Certificates (LC/TC)</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#10b981] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 5. G.R. Register Book */}
          <Link
            href="/clerk/general-register"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-2xs">
                <BookOpen size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#2563eb] transition-colors">G.R. Register Book</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 6. Student Promotion */}
          <Link
            href="/clerk/student-promotion"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f43f5e] text-white shadow-2xs">
                <Rocket size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#f43f5e] transition-colors">Student Promotion</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#f43f5e] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 7. Absentee Calling Desk */}
          <Link
            href="/clerk/absentee-desk"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d9488] text-white shadow-2xs">
                <PhoneCall size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#0d9488] transition-colors">Absentee Calling Desk</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#0d9488] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 8. Attendance Zone */}
          <Link
            href="/clerk/location-settings"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-2xs">
                <MapPin size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#7c3aed] transition-colors">Attendance Zone</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#7c3aed] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 9. Assign Division */}
          <Link
            href="/clerk/assign-division"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ea580c] text-white shadow-2xs">
                <Layers size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#ea580c] transition-colors">Assign Division</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 10. Assign Roll No */}
          <Link
            href="/clerk/assign-roll-no"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0891b2] text-white shadow-2xs">
                <Hash size={16} />
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#0891b2] transition-colors">Assign Roll No</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-[#0891b2] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>

      {/* ─── Grid: Today's Tasks & Today's Attendance Breakdown ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Administrative Tasks (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5826df] flex items-center justify-center font-bold">
                <FileCheck2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Today&apos;s Administrative Tasks</h3>
                <p className="text-xs text-slate-500">Action items needing clerk attention</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-[#5826df] border border-indigo-100">
              {pendingAdmissionsCount + pendingDocumentsCount + pendingCertCount} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Task 1: Pending Admissions */}
            <div
              onClick={() => {
                const el = document.getElementById("recent-admissions-section");
                el?.scrollIntoView({ behavior: "smooth" });
                setAdmissionFilter("pending");
              }}
              className="p-4 rounded-2xl bg-[#f0fdf4]/50 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pending Admissions</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Applications awaiting review and approval
                  </p>
                </div>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
                {pendingAdmissionsCount}
              </span>
            </div>

            {/* Task 2: Pending Documents Verification */}
            <div
              onClick={() => {
                const el = document.getElementById("pending-docs-section");
                el?.scrollIntoView({ behavior: "smooth" });
                setDocFilter("pending");
              }}
              className="p-4 rounded-2xl bg-[#fff1f2]/50 border border-rose-100 hover:border-rose-300 hover:bg-rose-50 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Document Verification</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Documents pending verification
                  </p>
                </div>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-800 font-bold text-xs shrink-0">
                {pendingDocumentsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Attendance Summary Card (1 Column) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CalendarCheck2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Today&apos;s Attendance</h3>
                  <p className="text-xs text-slate-500">Real-time attendance overview</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {attendanceRate}% Present
              </span>
            </div>

            {/* Attendance Details */}
            <div className="space-y-3.5 mt-5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present Students
                </span>
                <span className="font-bold text-slate-900">
                  {attendanceStats.present} ({attendanceRate}%)
                </span>
              </div>

              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Total Students
                </span>
                <span className="font-bold text-slate-900">
                  {totalStudentsCount}
                </span>
              </div>

              <div className="pt-2">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#5826df] h-full rounded-full transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
                <div className="flex justify-end text-[11px] font-bold text-slate-500 mt-1">
                  {attendanceRate}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Admissions Section ───────────────────────────────────── */}
      <div id="recent-admissions-section" className="office-section bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Admissions</h3>
              <p className="text-xs text-slate-500">Latest student enrollment applications and status</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setAdmissionFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                admissionFilter === "all"
                  ? "bg-white text-teal-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({admissions.length})
            </button>
            <button
              onClick={() => setAdmissionFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                admissionFilter === "pending"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({pendingAdmissionsCount})
            </button>
            <button
              onClick={() => setAdmissionFilter("approved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                admissionFilter === "approved"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Approved ({admissions.filter((a) => a.status === "approved" || Boolean(a.gr_no)).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {recentAdmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <UserPlus size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No admissions found in this category.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Student Name</th>
                  <th className="py-3.5 px-4">GR No.</th>
                  <th className="py-3.5 px-4">Class & Division</th>
                  <th className="py-3.5 px-4">Admission Date</th>
                  <th className="py-3.5 px-4 text-center">Admission Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAdmissions.map((adm) => {
                  const studentName =
                    adm.field_values?.find((f) =>
                      /name|student_name|first_name/i.test(f.field_label)
                    )?.value || `Applicant #${adm.admission_number}`;
                  const className =
                    adm.field_values?.find((f) =>
                      /class|standard|grade/i.test(f.field_label)
                    )?.value || "General";
                  const isApproved = adm.status === "approved" || Boolean(adm.gr_no);

                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs">
                            {(studentName[0] || "A").toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{studentName}</span>
                            <p className="text-[11px] text-slate-400 font-mono">App No: {adm.admission_number}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {adm.gr_no ? (
                          <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                            {adm.gr_no}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            Pending GR
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {className} {adm.division ? `(Div ${adm.division})` : ""}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatDDMMYYYY(adm.submitted_at || adm.created_at || "")}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} /> Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={12} /> Pending Review
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!adm.gr_no && (
                            <button
                              onClick={() => {
                                setSelectedStudentForGr(adm);
                                setGrInput("");
                              }}
                              className="px-3 py-1.5 bg-[#5826df] hover:bg-[#4a1ec2] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                            >
                              Assign GR
                            </button>
                          )}
                          <Link
                            href="/clerk/students"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                            title="View Full Profile in Students Directory"
                          >
                            <Eye size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Pending Document Verification Section ───────────────────────── */}
      <div id="pending-docs-section" className="office-section bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <FileCheck2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pending Document Verification</h3>
              <p className="text-xs text-slate-500">Select a student to view their documents and verification status</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => { setDocFilter("pending"); setDocumentPage(1); setExpandedDocumentStudent(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                docFilter === "pending"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({pendingDocumentsCount})
            </button>
            <button
              onClick={() => { setDocFilter("verified"); setDocumentPage(1); setExpandedDocumentStudent(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                docFilter === "verified"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => { setDocFilter("all"); setDocumentPage(1); setExpandedDocumentStudent(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                docFilter === "all"
                  ? "bg-white text-teal-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Docs ({pendingDocsList.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {documentStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileCheck2 size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No documents pending in this queue.</p>
            </div>
          ) : (
            <StudentDocumentRows students={visibleDocumentStudents} expanded={expandedDocumentStudent} onExpand={setExpandedDocumentStudent} onPreview={setPreviewDoc} />
          )}
        </div>
        {documentStudents.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>{documentStudents.length} students / Page {activeDocumentPage} of {documentPageCount}</span>
          <div className="flex gap-2">
            <button type="button" disabled={activeDocumentPage === 1} onClick={() => { setDocumentPage(activeDocumentPage - 1); setExpandedDocumentStudent(null); }} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Previous</button>
            <button type="button" disabled={activeDocumentPage === documentPageCount} onClick={() => { setDocumentPage(activeDocumentPage + 1); setExpandedDocumentStudent(null); }} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Next</button>
          </div>
        </div>}
      </div>

      {/* ─── Modal: Assign GR Number ────────────────────────────────────── */}
      {selectedStudentForGr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Hash size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assign GR Number</h3>
                  <p className="text-xs text-slate-500">General Register No. for permanent record</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForGr(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <p className="text-slate-500 font-medium">Student / Application:</p>
              <p className="text-sm font-bold text-slate-900">
                {selectedStudentForGr.field_values?.find((f) =>
                  /name|student_name|first_name/i.test(f.field_label)
                )?.value || `App #${selectedStudentForGr.admission_number}`}
              </p>
              <p className="text-slate-500 font-mono text-[11px]">App No: {selectedStudentForGr.admission_number}</p>
            </div>

            <form onSubmit={handleAssignGrSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Enter Official GR Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GR-2026-0042"
                  value={grInput}
                  onChange={(e) => setGrInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForGr(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningGr || !grInput.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#5826df] hover:bg-[#4a1ec2] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all"
                >
                  {assigningGr ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Assign & Approve</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Document Preview ────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 truncate pr-4">{previewDoc.name}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-slate-900/5 flex items-center justify-center min-h-[400px]">
              {previewDoc.url.endsWith(".pdf") ? (
                <iframe src={previewDoc.url} className="w-full h-[550px] rounded-xl border border-slate-200" />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[550px] object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
