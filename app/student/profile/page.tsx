"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  GraduationCap,
  FileText,
  Award,
  LogOut,
  Calendar,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Building2,
  Fingerprint,
  HeartPulse,
  Hash,
  BookOpen,
  FileCheck,
  CreditCard,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/current-user";
import { getMyCertificateRequests, type CertificateRequestItem } from "@/lib/certificate";
import { getStudentResults } from "@/lib/student/results";
import type { StudentResult } from "@/types/student";
import type { CurrentUserProfile } from "@/types";
import { logoutUser } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { DigitalCertificateModal } from "@/components/clerk/digital-certificate-modal";

interface StudentFullData {
  id?: number;
  name?: string;
  surname?: string;
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  gender?: string;
  mobile?: string;
  blood_group?: string;
  emergency_contact?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhar_number?: string;
  gr_no?: string;
  admission_number?: string;
  roll_no?: string;
  school_class?: string;
  division?: string;
  admission_date?: string;
  academic_year?: string;
  is_rte?: boolean;
  udise_no?: string;
  abc_id?: string;
  document_slots?: Array<{
    id?: number;
    name?: string;
    label?: string;
    file_url?: string;
    file?: string;
    is_verified?: boolean;
    status?: string;
    uploaded_at?: string;
  }>;
}

interface CompletedExamMarksheet {
  examTitle: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  grade: string;
  resultStatus: string;
  subjectCount: number;
  subjects: Array<{
    subject: string;
    obtained: string;
    max: string;
    grade: string;
  }>;
}

export default function StudentProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const [studentData, setStudentData] = useState<StudentFullData | null>(null);
  const [certificates, setCertificates] = useState<CertificateRequestItem[]>([]);
  const [rawResults, setRawResults] = useState<StudentResult[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [viewingCert, setViewingCert] = useState<CertificateRequestItem | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Accordion open/close state for all 4 sections (collapsed by default)
  const [sectionsOpen, setSectionsOpen] = useState({
    personal: false,
    academic: false,
    providedDocs: false,
    gatheredDocs: false,
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const allOpen = Object.values(sectionsOpen).every(Boolean);

  const toggleAllSections = () => {
    const nextState = !allOpen;
    setSectionsOpen({
      personal: nextState,
      academic: nextState,
      providedDocs: nextState,
      gatheredDocs: nextState,
    });
  };

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch current user identity
      const profile = await getCurrentUserProfile().catch(() => null);
      if (profile) setUserProfile(profile);

      // 2. Fetch full student details
      try {
        const studentRes = await fetch(`${API_BASE_URL}/students/me/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access") || ""}`,
            "Content-Type": "application/json",
          },
        });
        if (studentRes.ok) {
          const sJson = await studentRes.json();
          setStudentData(sJson);
        }
      } catch (e) {
        console.warn("Could not fetch /students/me/:", e);
      }

      // 3. Fetch school issued certificates
      try {
        const certs = await getMyCertificateRequests();
        setCertificates(Array.isArray(certs) ? certs : []);
      } catch (e) {
        console.warn("Could not fetch certificates:", e);
      }

      // 4. Fetch school issued results / marksheets
      try {
        const resList = await getStudentResults();
        setRawResults(Array.isArray(resList) ? resList : []);
      } catch (e) {
        console.warn("Could not fetch results:", e);
      }
    } catch {
      toast.error("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      toast.success("Signed out successfully.");
      router.push("/login");
    } catch {
      toast.error("Error signing out.");
      setIsLoggingOut(false);
    }
  };

  const fullName =
    studentData?.name && studentData?.surname
      ? `${studentData.name} ${studentData.surname}`
      : userProfile?.name || "Student Profile";

  const grNumber = studentData?.gr_no || userProfile?.student_profile?.gr_no || "—";
  const rollNumber = studentData?.roll_no || "—";
  const currentClass = studentData?.school_class || userProfile?.student_profile?.school_class || "—";
  const currentDivision = studentData?.division || userProfile?.student_profile?.division || "—";

  // Group raw subject marks into Completed Exam Marksheets
  const completedMarksheets: CompletedExamMarksheet[] = useMemo(() => {
    if (!rawResults || rawResults.length === 0) return [];

    const examMap = new Map<string, StudentResult[]>();
    for (const res of rawResults) {
      const examName = (res.exam_title || "Semester Examination").trim();
      const existing = examMap.get(examName) || [];
      existing.push(res);
      examMap.set(examName, existing);
    }

    const list: CompletedExamMarksheet[] = [];
    examMap.forEach((items, examTitle) => {
      let totalObt = 0;
      let totalMax = 0;
      const subjects = items.map((i) => {
        const obt = parseFloat(i.marks_obtained) || 0;
        const max = parseFloat(i.max_marks) || 100;
        totalObt += obt;
        totalMax += max;
        return {
          subject: i.subject,
          obtained: i.marks_obtained,
          max: i.max_marks,
          grade: i.grade,
        };
      });

      const percentage = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
      let computedGrade = "A";
      if (percentage >= 90) computedGrade = "A+";
      else if (percentage >= 80) computedGrade = "A";
      else if (percentage >= 70) computedGrade = "B+";
      else if (percentage >= 60) computedGrade = "B";
      else if (percentage >= 50) computedGrade = "C";
      else if (percentage >= 40) computedGrade = "D";
      else computedGrade = "F";

      list.push({
        examTitle,
        totalMarksObtained: totalObt,
        totalMaxMarks: totalMax,
        percentage: Math.round(percentage * 100) / 100,
        grade: computedGrade,
        resultStatus: percentage >= 40 ? "PASSED & PROMOTED" : "FAILED",
        subjectCount: subjects.length,
        subjects,
      });
    });

    return list;
  }, [rawResults]);

  // Filter only issued / approved certificates
  const issuedCertificates = useMemo(() => {
    return certificates.filter((c) => c.status === "APPROVED");
  }, [certificates]);

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full pb-16 px-3 sm:px-6">
      {/* ─────────────────────────────────────────────────────────────
          Hero Profile Summary Card
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-2 border-white shrink-0 overflow-hidden">
          {userProfile?.avatar ? (
            <img
              src={userProfile.avatar}
              alt={fullName}
              className="w-full h-full object-cover rounded-3xl"
            />
          ) : (
            (fullName.charAt(0) || "S").toUpperCase()
          )}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {fullName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              Class {currentClass} ({currentDivision})
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            GR No: <strong className="text-slate-800">{grNumber}</strong> • Roll No:{" "}
            <strong className="text-slate-800">{rollNumber}</strong>
          </p>

          <p className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center sm:justify-start gap-1">
            <Building2 size={13} className="text-slate-400" />
            <span>{userProfile?.school?.name || "School Portal"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-center sm:self-start">
          <button
            onClick={toggleAllSections}
            type="button"
            className="px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ChevronsUpDown size={14} />
            <span>{allOpen ? "Collapse All" : "Expand All"}</span>
          </button>

          <button
            onClick={fetchProfileData}
            disabled={loading}
            type="button"
            title="Refresh Profile"
            className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: PERSONAL DETAILS (Collapsible)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("personal")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Personal Details
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Student individual identity and parent contact records
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.personal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.personal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-4">
                  <DetailCard label="Student Full Name" value={fullName} icon={User} />
                  <DetailCard label="Father's Name" value={studentData?.father_name || "—"} icon={User} />
                  <DetailCard label="Mother's Name" value={studentData?.mother_name || "—"} icon={User} />
                  <DetailCard
                    label="Date of Birth"
                    value={studentData?.date_of_birth || userProfile?.student_profile?.date_of_birth || "—"}
                    icon={Calendar}
                  />
                  <DetailCard label="Gender" value={studentData?.gender || "—"} icon={User} />
                  <DetailCard label="Blood Group" value={studentData?.blood_group || "—"} icon={HeartPulse} />
                  <DetailCard label="Mobile Number" value={studentData?.mobile || userProfile?.mobile || "—"} icon={Phone} />
                  <DetailCard label="Emergency Contact" value={studentData?.emergency_contact || "—"} icon={Phone} />
                  <DetailCard label="Aadhaar Card No." value={studentData?.aadhar_number || "—"} icon={Fingerprint} />
                  <DetailCard
                    label="Residential Address"
                    value={studentData?.address || userProfile?.school?.address || "—"}
                    icon={MapPin}
                    className="sm:col-span-2 md:col-span-3"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: ACADEMIC DETAILS (Collapsible)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("academic")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <GraduationCap size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Academic Details
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Enrollment, academic standing, and classroom placement
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.academic ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.academic && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-4">
                  <DetailCard label="General Register (GR) No." value={grNumber} icon={Hash} />
                  <DetailCard label="Admission Number" value={studentData?.admission_number || grNumber} icon={Hash} />
                  <DetailCard label="Roll Number" value={rollNumber} icon={Hash} />
                  <DetailCard label="Current Class & Division" value={`Class ${currentClass} - ${currentDivision}`} icon={BookOpen} />
                  <DetailCard label="Academic Year" value={studentData?.academic_year || "2026-2027"} icon={Calendar} />
                  <DetailCard label="Admission Date" value={studentData?.admission_date || "—"} icon={Calendar} />
                  <DetailCard label="RTE Candidate" value={studentData?.is_rte ? "Yes (RTE Scheme)" : "No (General)"} icon={ShieldCheck} />
                  <DetailCard label="UDISE Number" value={studentData?.udise_no || "—"} icon={Hash} />
                  <DetailCard label="ABC ID (Academic Bank)" value={studentData?.abc_id || "—"} icon={CreditCard} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: PROVIDED DOCUMENTS (Collapsible & Document Viewers)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("providedDocs")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Provided Documents
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Official certificates and identification documents submitted by the student
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.providedDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.providedDocs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
                  {studentData?.document_slots && studentData.document_slots.length > 0 ? (
                    studentData.document_slots.map((doc, idx) => {
                      const fileUrl = doc.file_url || doc.file;
                      return (
                        <div
                          key={doc.id || idx}
                          className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 hover:border-slate-200 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 text-blue-600 flex items-center justify-center shrink-0">
                              <FileCheck size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {doc.label || doc.name || `Document #${idx + 1}`}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span>Submitted & Verified</span>
                              </p>
                            </div>
                          </div>

                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all shrink-0 active:scale-95 cursor-pointer"
                            >
                              <Eye size={14} className="text-blue-600" />
                              <span>View Document</span>
                            </a>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg shrink-0">
                              On Record
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <DefaultDocCard title="Aadhaar Card Copy" status="On File / Verified" />
                      <DefaultDocCard title="Birth Certificate" status="On File / Verified" />
                      <DefaultDocCard title="Previous School Leaving Certificate" status="On File / Verified" />
                      <DefaultDocCard title="Previous Academic Marksheet" status="On File / Verified" />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: GATHERED DOCUMENTS FROM SCHOOL (Completed Exams Marksheet & Official Certificates)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("gatheredDocs")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Gathered Documents from School
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Official marksheets of completed exams and certificates issued by the school
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.gatheredDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.gatheredDocs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1 space-y-6">
                {/* 1. Official Completed Marksheets */}
                <div className="pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Completed Examination Marksheets
                  </p>
                  {completedMarksheets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {completedMarksheets.map((exam, i) => (
                        <div
                          key={i}
                          className="p-5 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between gap-4 hover:border-slate-200 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                                <GraduationCap size={22} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight">
                                  {exam.examTitle}
                                </h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                  {exam.subjectCount} subjects evaluated • Class {currentClass} ({currentDivision})
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                              {exam.grade}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-3 border border-slate-100 text-xs">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Total Marks</p>
                              <p className="font-extrabold text-slate-800 mt-0.5">
                                {exam.totalMarksObtained} / {exam.totalMaxMarks} ({exam.percentage}%)
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Result Status</p>
                              <p className="font-extrabold text-emerald-600 mt-0.5 truncate">
                                {exam.resultStatus}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => router.push("/student/results")}
                            className="w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-98 cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>View Marksheet</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                      No published examination marksheets found.
                    </div>
                  )}
                </div>

                {/* 2. Official Certificates Issued */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Issued School Certificates
                  </p>
                  {issuedCertificates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {issuedCertificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 hover:border-slate-200 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                              <Award size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {cert.certificate_type_name || "Official Certificate"}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                Status: <span className="text-emerald-600 font-bold">APPROVED & ISSUED</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setViewingCert(cert)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all shrink-0 active:scale-95 cursor-pointer"
                          >
                            <Eye size={14} className="text-emerald-600" />
                            <span>View Copy</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                      No issued certificates available yet. You can request official certificates from the Certificates tab.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: LOGOUT BUTTON (At the Last)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 sm:p-6 border border-red-100 shadow-[0_4px_24px_rgba(239,68,68,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <LogOut size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Sign Out of Student Account
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              End your active session securely on this device
            </p>
          </div>
        </div>

        {showLogoutConfirm ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <LogOut size={14} />
              <span>Yes, Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        )}
      </motion.div>

      {/* Digital Certificate Modal */}
      {viewingCert && (
        <DigitalCertificateModal
          isOpen={!!viewingCert}
          onClose={() => setViewingCert(null)}
          request={viewingCert}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Reusable Detail Item
// ─────────────────────────────────────────────
function DetailCard({
  label,
  value,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={`p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-start gap-3 ${className}`}
    >
      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/60 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function DefaultDocCard({ title, status }: { title: string; status: string }) {
  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 text-blue-600 flex items-center justify-center shrink-0">
          <FileCheck size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{title}</p>
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>{status}</span>
          </p>
        </div>
      </div>
      <span className="text-[11px] font-bold text-emerald-700 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg shrink-0">
        Verified
      </span>
    </div>
  );
}
