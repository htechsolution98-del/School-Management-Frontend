"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
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
import { formatDisplayDate } from "@/lib/fees";
import type { Admission } from "@/types/clerk";
import { fetchAdmissions, assignGrNumber } from "@/lib/clerk/admissions";

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

interface PendingDocItem {
  id: string;
  studentId?: number;
  studentName: string;
  className: string;
  divisionName?: string;
  documentName: string;
  fileUrl: string;
  submittedAt?: string;
  isVerified: boolean;
  admissionNumber?: string;
  docFieldId?: number;
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
  const filteredDocuments = useMemo(() => {
    if (docFilter === "pending") return pendingDocsList.filter((d) => !d.isVerified).slice(0, 8);
    if (docFilter === "verified") return pendingDocsList.filter((d) => d.isVerified).slice(0, 8);
    return pendingDocsList.slice(0, 8);
  }, [pendingDocsList, docFilter]);

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
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-7 max-w-7xl mx-auto">
      {/* ─── Top Header & School Greeting Banner ─────────────────────────── */}
      <div className="relative overflow-hidden bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-xs font-semibold tracking-wide uppercase text-indigo-700">
              <School size={14} className="text-indigo-600" />
              <span>{schoolName} • Clerk Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
              Clerk Administration Hub
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium max-w-2xl">
              Track admissions, document verification, student records, and daily administrative duties in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-2xs">
              <Calendar size={14} className="text-indigo-600" />
              <span>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            </div>

            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-indigo-600 text-xs font-bold transition-all border border-slate-200 shadow-2xs hover:border-indigo-200"
              title="Refresh Dashboard Data"
            >
              <RefreshCw size={14} className={`text-indigo-600 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Updating..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Prominent Student Search Bar (Interactive Dropdown) ─────────── */}
      <div className="relative z-30">
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-md shadow-slate-200/60 border border-slate-200/80 flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 ml-1">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Quick Search: Search by Student Name, GR No., Roll No., or Class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-500 text-xs font-bold shrink-0 mr-1">
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
                  <span className="text-indigo-600">Showing top matches</span>
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                            {(s.name?.[0] || "S").toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {s.name} {s.surname || ""}
                              </span>
                              {s.is_rte && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
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
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
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

      {/* ─── 5 Key Metrics Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* 1. Total Students */}
        <Link
          href="/clerk/students"
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Students</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : totalStudentsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Active Enrolled
            </p>
          </div>
        </Link>

        {/* 2. New Admissions */}
        <Link
          href="/clerk/admission-form"
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">New Admissions</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserPlus size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : newAdmissionsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-medium text-blue-600 mt-1 flex items-center gap-1">
              <Sparkles size={12} /> Total Applications
            </p>
          </div>
        </Link>

        {/* 3. Pending Admissions */}
        <div
          onClick={() => {
            const el = document.getElementById("recent-admissions-section");
            el?.scrollIntoView({ behavior: "smooth" });
            setAdmissionFilter("pending");
          }}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-300 transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {loading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : pendingAdmissionsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-medium text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> Awaiting GR No.
            </p>
          </div>
        </div>

        {/* 4. Pending Documents */}
        <div
          onClick={() => {
            const el = document.getElementById("pending-docs-section");
            el?.scrollIntoView({ behavior: "smooth" });
            setDocFilter("pending");
          }}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-300 transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Docs</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck2 size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-700">
              {loading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : pendingDocumentsCount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Needs Verification
            </p>
          </div>
        </div>

        {/* 5. Today's Attendance */}
        <Link
          href="/clerk/location-settings"
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today&apos;s Attendance</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarCheck2 size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {loading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : `${attendanceRate}%`}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {attendanceStats.present} Present / {attendanceStats.total} Students
            </p>
          </div>
        </Link>
      </div>

      {/* ─── Quick Actions Shortcuts Bar ─────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            ⚡
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quick Operations</h3>
            <p className="text-xs text-slate-500">Instant shortcuts for frequent administrative tasks</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/clerk/manual-admission"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-sm shadow-indigo-600/30 transition-all"
          >
            <UserPlus size={15} />
            <span>+ New Admission</span>
          </Link>

          <Link
            href="/clerk/students"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <Users size={15} className="text-slate-600" />
            <span>Search Student</span>
          </Link>

          <button
            onClick={() => {
              const el = document.getElementById("pending-docs-section");
              el?.scrollIntoView({ behavior: "smooth" });
              setDocFilter("pending");
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <FileCheck2 size={15} className="text-amber-600" />
            <span>Verify Documents ({pendingDocumentsCount})</span>
          </button>

          <Link
            href="/clerk/certificates"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <Award size={15} className="text-blue-600" />
            <span>Certificates (LC/TC)</span>
          </Link>

          <Link
            href="/clerk/general-register"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <BookOpen size={15} className="text-amber-600" />
            <span>G.R. Register Book</span>
          </Link>

          <Link
            href="/clerk/student-promotion"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <Rocket size={15} className="text-purple-600" />
            <span>Student Promotion</span>
          </Link>

          <Link
            href="/clerk/absentee-desk"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <PhoneCall size={15} className="text-red-500" />
            <span>Absentee Calling Desk</span>
          </Link>

          <Link
            href="/clerk/location-settings"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <MapPin size={15} className="text-emerald-600" />
            <span>Attendance Zone</span>
          </Link>

          <Link
            href="/clerk/assign-division"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <Layers size={15} className="text-purple-600" />
            <span>Assign Division</span>
          </Link>

          <Link
            href="/clerk/assign-roll-no"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all"
          >
            <Hash size={15} className="text-blue-600" />
            <span>Assign Roll No</span>
          </Link>
        </div>
      </div>

      {/* ─── Grid: Today's Tasks & Today's Attendance Breakdown ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks (2 Columns on Large Screens) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Today&apos;s Administrative Tasks</h3>
                <p className="text-xs text-slate-500">Action items needing clerk attention</p>
              </div>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
              {pendingAdmissionsCount + pendingDocumentsCount + pendingCertCount} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Task 1: Pending Admissions */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/30 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Pending Admissions</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {pendingAdmissionsCount} student application(s) awaiting GR No. assignment
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {pendingAdmissionsCount}
                </span>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById("recent-admissions-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                  setAdmissionFilter("pending");
                }}
                className="flex items-center justify-between w-full px-3 py-1.5 bg-white hover:bg-amber-100/60 rounded-xl text-xs font-bold text-amber-800 border border-slate-200 transition-colors"
              >
                <span>Review Applications</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Task 2: Pending Documents Verification */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-rose-300 hover:bg-rose-50/30 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <FileCheck2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Document Verification</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {pendingDocumentsCount} document(s) uploaded by students needing approval
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                  {pendingDocumentsCount}
                </span>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById("pending-docs-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                  setDocFilter("pending");
                }}
                className="flex items-center justify-between w-full px-3 py-1.5 bg-white hover:bg-rose-100/60 rounded-xl text-xs font-bold text-rose-800 border border-slate-200 transition-colors"
              >
                <span>Verify Documents</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Task 3: TC / Leaving Certificate Requests */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">TC / Certificate Requests</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {pendingCertCount} certificate request(s) awaiting processing & signature
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                  {pendingCertCount}
                </span>
              </div>
              <Link
                href="/clerk/leave-requests"
                className="flex items-center justify-between w-full px-3 py-1.5 bg-white hover:bg-indigo-100/60 rounded-xl text-xs font-bold text-indigo-800 border border-slate-200 transition-colors"
              >
                <span>Process Certificates</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Task 4: Roll No & Division Allocation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Division & Roll Numbers</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Assign sections and roll numbers for new term batches
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/clerk/assign-division"
                  className="text-center px-2 py-1.5 bg-white hover:bg-purple-50 rounded-xl text-[11px] font-bold text-purple-700 border border-slate-200 transition-colors"
                >
                  Divisions
                </Link>
                <Link
                  href="/clerk/assign-roll-no"
                  className="text-center px-2 py-1.5 bg-white hover:bg-purple-50 rounded-xl text-[11px] font-bold text-purple-700 border border-slate-200 transition-colors"
                >
                  Roll Numbers
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Attendance Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CalendarCheck2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Today&apos;s Attendance</h3>
                  <p className="text-xs text-slate-500">Real-time attendance overview</p>
                </div>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {attendanceRate}% Present
              </span>
            </div>

            {/* Attendance Progress Bars */}
            <div className="space-y-4 mt-5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present Students
                  </span>
                  <span className="font-bold text-emerald-700">
                    {attendanceStats.present} ({attendanceRate}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent Students
                  </span>
                  <span className="font-bold text-rose-700">
                    {attendanceStats.absent} (
                    {totalStudentsCount > 0 ? Math.round((attendanceStats.absent / totalStudentsCount) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        totalStudentsCount > 0
                          ? Math.round((attendanceStats.absent / totalStudentsCount) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Not Marked Yet
                  </span>
                  <span className="font-bold text-amber-700">
                    {attendanceStats.notMarked} (
                    {totalStudentsCount > 0 ? Math.round((attendanceStats.notMarked / totalStudentsCount) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        totalStudentsCount > 0
                          ? Math.round((attendanceStats.notMarked / totalStudentsCount) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/clerk/location-settings"
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 text-center transition-colors flex items-center justify-center gap-1.5"
          >
            <MapPin size={14} className="text-emerald-600" />
            <span>Manage Location & Settings</span>
          </Link>
        </div>
      </div>

      {/* ─── Recent Admissions Section ───────────────────────────────────── */}
      <div id="recent-admissions-section" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
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
                  ? "bg-white text-indigo-700 shadow-xs"
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
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
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
                        {formatDisplayDate(adm.submitted_at || adm.created_at || "")}
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
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
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
      <div id="pending-docs-section" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <FileCheck2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pending Document Verification</h3>
              <p className="text-xs text-slate-500">Certificates, Aadhaar cards, and student proofs submitted for approval</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setDocFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                docFilter === "pending"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({pendingDocumentsCount})
            </button>
            <button
              onClick={() => setDocFilter("verified")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                docFilter === "verified"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => setDocFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                docFilter === "all"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Docs ({pendingDocsList.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileCheck2 size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No documents pending in this queue.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Student Name</th>
                  <th className="py-3.5 px-4">Class / Div</th>
                  <th className="py-3.5 px-4">Document Title</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-900 text-sm">
                      {doc.studentName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-semibold">
                      {doc.className} {doc.divisionName ? `• Div ${doc.divisionName}` : ""}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} className="text-indigo-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{doc.documentName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {doc.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <Clock size={12} /> Pending Verification
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.fileUrl && (
                          <button
                            onClick={() =>
                              setPreviewDoc({
                                name: `${doc.studentName} - ${doc.documentName}`,
                                url: doc.fileUrl,
                              })
                            }
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                          >
                            <Eye size={13} /> View File
                          </button>
                        )}
                        <Link
                          href="/clerk/students"
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                        >
                          Verify in Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Modal: Assign GR Number ────────────────────────────────────── */}
      {selectedStudentForGr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
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
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
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
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
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
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
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
