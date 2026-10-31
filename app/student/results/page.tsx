"use client";

import { StudentEmptyState } from "@/components/student/student-empty-state";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  BookOpen,
  FileText,
  BookmarkCheck,
  Download,
  Award,
  Users,
  X,
  ChevronLeft,
  Star,
  BarChart3,
  CheckCircle,
  Printer,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getStudentResults, getExamRankings, getStudentExams, getStudentAttendance } from "@/lib/student";
import type { StudentResult, StudentExam, RankingEntry } from "@/types/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ResultCardPreview } from "@/components/results/result-card-preview";
import { writePrintableResultCards } from "@/lib/result-report-print";
import { getSavedResultTemplate } from "@/lib/result-template";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  A: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  "B+": { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  B: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  "C+": { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
  C: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
  D: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  E: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  F: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
};
const DEFAULT_GRADE_STYLE = { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };

function getGradeStyle(grade: string) {
  return GRADE_STYLES[grade?.toUpperCase?.()] || GRADE_STYLES[grade] || DEFAULT_GRADE_STYLE;
}

// ─── QR Code SVG (simple static placeholder) ──────────────────────────────────
function QRCodeSVG({ value, size = 80 }: { value: string; size?: number }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 1, width: size })
      .then((url) => { if (active) setSource(url); })
      .catch(() => { if (active) setSource(""); });
    return () => { active = false; };
  }, [size, value]);
  return source ? <img src={source} width={size} height={size} alt="Student ID QR code" className="block shrink-0 object-contain" /> : <div aria-hidden="true" style={{ width: size, height: size }} />;
}
interface ReportCardProps {
  results: StudentResult[];
  examTitle: string;
  studentProfile: any;
  schoolProfile: any;
}

function ReportCard({ results, examTitle, studentProfile, schoolProfile }: ReportCardProps) {
  const rawLogo = schoolProfile?.logo || (typeof window !== "undefined" ? localStorage.getItem("school_logo") : "");
  const logo =
    rawLogo && !String(rawLogo).startsWith("http")
      ? `${API_BASE_URL.replace(/\/api\/?$/, "")}${String(rawLogo).startsWith("/") ? rawLogo : `/${rawLogo}`}`
      : rawLogo;

  const schoolName =
    schoolProfile?.name || (typeof window !== "undefined" ? localStorage.getItem("school_name") : "") || "School";
  const address = [
    schoolProfile?.address,
    schoolProfile?.city,
    schoolProfile?.state,
    schoolProfile?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const studentName =
    [studentProfile?.name, studentProfile?.surname].filter(Boolean).join(" ") ||
    studentProfile?.student_name ||
    "Student";
  const rollNo = studentProfile?.roll_no || studentProfile?.roll_number || "—";
  const admissionNo = studentProfile?.gr_no || studentProfile?.gr_number || studentProfile?.admission_no || "—";
  const className =
    studentProfile?.school_class_name || studentProfile?.school_class?.school_class || "—";
  const divisionLabel =
    typeof studentProfile?.division === "object"
      ? studentProfile.division?.division || studentProfile.division?.name || ""
      : studentProfile?.division_name || studentProfile?.division || "";
  const dob = studentProfile?.dob || studentProfile?.date_of_birth || "—";
  const photoUrl = studentProfile?.profile_photo || studentProfile?.photo || null;
  const principalSignature = schoolProfile?.principal_signature || null;
  const clerkSignature = schoolProfile?.clerk_signature || null;
  const schoolStamp = schoolProfile?.school_stamp || null;

  // Compute totals
  const totalMax = results.reduce((s, r) => s + parseFloat(r.max_marks || "0"), 0);
  const totalObtained = results.reduce((s, r) => s + (r.is_absent ? 0 : parseFloat(r.marks_obtained || "0")), 0);
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0.00";
  const overallGrade = results.length > 0
    ? Number(percentage) >= 90 ? "A+" : Number(percentage) >= 75 ? "A" : Number(percentage) >= 60 ? "B" : Number(percentage) >= 40 ? "C" : "F"
    : "—";
  const teacherRemarks = results.find((result) => result.remarks?.trim())?.remarks;
  const academicYear = schoolProfile?.academic_year_name || studentProfile?.academic_year_name || schoolProfile?.academic_year?.name || "";

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      id="report-card-print"
      className="bg-white w-full min-w-0 max-w-2xl mx-auto overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── School Header ── */}
        <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          {logo ? (
            <img src={logo} alt={schoolName} className="h-14 w-14 object-contain rounded-lg shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <BookOpen size={28} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="break-words text-base sm:text-lg font-black text-slate-800 leading-tight">{schoolName}</h2>
            {address && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{address}</p>}
            {schoolProfile?.phone && (
              <p className="text-[11px] text-slate-500">Phone: {schoolProfile.phone}</p>
            )}
            {schoolProfile?.email && (
              <p className="text-[11px] text-slate-500">Email: {schoolProfile.email}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-500 block">Academic Year</span>
          {academicYear && <span className="text-sm font-black text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg block mt-1">{academicYear}</span>}
        </div>
      </div>

      {/* ── Exam Title Banner ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl py-3 px-4 text-center mb-4">
        <h3 className="text-base font-black text-blue-700 uppercase tracking-widest">{examTitle}</h3>
        <p className="text-[10px] font-bold text-blue-500 tracking-[0.2em] uppercase mt-0.5">
          Result Report Card
        </p>
      </div>

      {/* ── Student Info ── */}
      <div className="border border-slate-200 rounded-xl p-3 sm:p-4 mb-4 grid grid-cols-[56px_minmax(0,1fr)_56px] sm:grid-cols-[80px_minmax(0,1fr)_80px] items-start gap-2 sm:gap-4 min-w-0">
        {/* Photo */}
        <div className="shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={studentName}
              className="h-14 w-14 sm:h-20 sm:w-20 rounded-xl object-cover border-2 border-slate-200"
            />
          ) : (
            <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border-2 border-slate-200">
              <span className="text-xl sm:text-2xl font-black text-blue-500">{studentName.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
          {[
            { label: "Student Name", value: studentName },
            { label: "Roll Number", value: rollNo },
            { label: "Admission No.", value: admissionNo },
            { label: "Class & Division", value: `${className}${divisionLabel ? ` - ${divisionLabel}` : ""}` },
            { label: "Date of Birth", value: dob },
          ].map(({ label, value }) => (
            <div key={label} className="min-w-0 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-1.5">
              <span className="text-slate-500 text-[9px] sm:text-xs shrink-0">{label}</span>
              <span className="min-w-0 font-bold text-slate-800 text-[10px] sm:text-xs break-words">{value}</span>
            </div>
          ))}
        </div>

        {/* QR */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <QRCodeSVG value={admissionNo || String(studentProfile?.id || studentName)} size={56} />
          <span className="text-[9px] text-slate-400 font-semibold">Student ID</span>
          <span className="text-[9px] text-slate-600 font-black">{admissionNo}</span>
        </div>
      </div>

      {/* ── Subject Marks Table ── */}
      <div className="rounded-xl border border-slate-200 overflow-x-auto overscroll-x-contain mb-4">
        <table className="w-full min-w-[620px] text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="py-2.5 px-3 text-left font-bold text-xs">Sr. No.</th>
              <th className="py-2.5 px-3 text-left font-bold text-xs">Subject</th>
              <th className="py-2.5 px-3 text-center font-bold text-xs">Max Marks</th>
              <th className="py-2.5 px-3 text-center font-bold text-xs">Obtained Marks</th>
              <th className="py-2.5 px-3 text-center font-bold text-xs">Grade</th>
              <th className="py-2.5 px-3 text-center font-bold text-xs">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const gs = getGradeStyle(r.grade);
              return (
                <tr
                  key={i}
                  className={`border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                >
                  <td className="py-2.5 px-3 text-slate-600 text-xs font-semibold">{i + 1}</td>
                  <td className="py-2.5 px-3 text-slate-800 text-xs font-semibold capitalize">{r.subject}</td>
                  <td className="py-2.5 px-3 text-center text-slate-600 text-xs">{r.max_marks}</td>
                  <td className="py-2.5 px-3 text-center text-slate-800 text-xs font-bold">
                    {r.is_absent ? (
                      <span className="text-rose-500">Absent</span>
                    ) : (
                      r.marks_obtained
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-full text-xs font-black border ${gs.bg} ${gs.text} ${gs.border}`}
                    >
                      {r.grade || "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs text-slate-600">
                    {r.remarks || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {/* Total Marks */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
            <Trophy size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-[9px] text-purple-500 font-bold uppercase">Total Marks</p>
            <p className="text-base font-black text-purple-700">{totalMax}</p>
          </div>
        </div>

        {/* Obtained Marks */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[9px] text-blue-500 font-bold uppercase">Obtained</p>
            <p className="text-base font-black text-blue-700">{totalObtained}</p>
          </div>
        </div>

        {/* Percentage */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <BarChart3 size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[9px] text-emerald-500 font-bold uppercase">Percentage</p>
            <p className="text-base font-black text-emerald-700">{percentage}%</p>
          </div>
        </div>

        {/* Overall Grade */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Star size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[9px] text-amber-500 font-bold uppercase">Overall Grade</p>
            <p className="text-base font-black text-amber-700">{overallGrade}</p>
          </div>
        </div>
      </div>

      {/* ── Teacher Remarks ── */}
      {teacherRemarks && <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 mb-5 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle size={16} className="text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-black text-slate-800">Teacher's Remarks</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {teacherRemarks}
          </p>
        </div>
      </div>}

      {/* ── Signatures ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        {/* Class Teacher */}
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-16 sm:w-28 flex items-end justify-center mb-1">
            {clerkSignature ? (
              <img
                src={
                  clerkSignature.startsWith("http")
                    ? clerkSignature
                    : `${API_BASE_URL.replace(/\/api\/?$/, "")}${clerkSignature.startsWith("/") ? clerkSignature : `/${clerkSignature}`}`
                }
                alt="Class Teacher Signature"
                className="max-h-12 max-w-[60px] sm:max-w-[100px] object-contain"
              />
            ) : (
              <div className="h-10 w-16 sm:w-24 border-b-2 border-slate-300" />
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-700 mt-1">Class Teacher</p>
          {schoolProfile?.class_teacher_name && (
            <p className="text-[10px] text-slate-500">{schoolProfile.class_teacher_name}</p>
          )}
        </div>

        {/* School Stamp */}
        <div className="flex flex-col items-center text-center">
          {schoolStamp ? (
            <img
              src={
                schoolStamp.startsWith("http")
                  ? schoolStamp
                  : `${API_BASE_URL.replace(/\/api\/?$/, "")}${schoolStamp.startsWith("/") ? schoolStamp : `/${schoolStamp}`}`
              }
              alt="School Stamp"
              className="h-16 w-16 object-contain"
            />
          ) : <div className="h-16 w-16" />}
        </div>

        {/* Principal */}
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-16 sm:w-28 flex items-end justify-center mb-1">
            {principalSignature ? (
              <img
                src={
                  principalSignature.startsWith("http")
                    ? principalSignature
                    : `${API_BASE_URL.replace(/\/api\/?$/, "")}${principalSignature.startsWith("/") ? principalSignature : `/${principalSignature}`}`
                }
                alt="Principal Signature"
                className="max-h-12 max-w-[60px] sm:max-w-[100px] object-contain"
              />
            ) : (
              <div className="h-10 w-24 border-b-2 border-slate-300" />
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-700 mt-1">Principal</p>
          {schoolProfile?.principal_name && (
            <p className="text-[10px] text-slate-500">{schoolProfile.principal_name}</p>
          )}
        </div>
      </div>

      {/* ── Date of Issue ── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-500">
          Date of Issue: <span className="font-bold text-slate-700">{today}</span>
        </p>
        <p className="text-[9px] text-slate-400">
          Generated by {schoolName}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentResultsPage() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);

  // Report card modal state
  const [reportExamTitle, setReportExamTitle] = useState<string | null>(null);
  const [reportResults, setReportResults] = useState<StudentResult[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardTitle, setLeaderboardTitle] = useState("");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [resultsRes, examsRes, attendanceRes, profileRes, schoolRes] = await Promise.allSettled([
        getStudentResults(),
        getStudentExams(),
        getStudentAttendance(),
        fetchWithAuth(`${API_BASE_URL}/studentget/me/`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetchWithAuth(`${API_BASE_URL}/me/`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (resultsRes.status === "fulfilled") {
        setResults(resultsRes.value);
      } else {
        throw new Error(resultsRes.reason?.message || "Failed to load academic results.");
      }

      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value);
      }

      if (profileRes.status === "fulfilled" && profileRes.value?.id) {
        setStudentId(profileRes.value.id);
        setStudentProfile(profileRes.value);
      } else if (attendanceRes.status === "fulfilled" && attendanceRes.value.length > 0) {
        setStudentId(attendanceRes.value[0].student);
      }
      if (schoolRes.status === "fulfilled" && schoolRes.value)
        setSchoolProfile(schoolRes.value.school || schoolRes.value);
    } catch (err: any) {
      setError(err?.message || "Something went wrong loading academic performance card.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Group results by exam title
  const groupedResults = useMemo(() => {
    const map = new Map<string, StudentResult[]>();
    results.forEach((r) => {
      const key = r.exam_title;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [results]);

  // Unique exams list
  const examTitles = useMemo(() => {
    const titles = Array.from(groupedResults.keys());
    return titles.filter((t) => t.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === "");
  }, [groupedResults, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    if (results.length === 0) return { avgPercentage: 0, completed: 0 };

    let totalObtained = 0;
    let totalMax = 0;
    let completed = 0;

    results.forEach((r) => {
      if (!r.is_absent) {
        totalObtained += parseFloat(r.marks_obtained || "0");
        totalMax += parseFloat(r.max_marks || "0");
        completed++;
      }
    });

    const avgPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    return { avgPercentage, completed };
  }, [results]);

  const findExamIdByTitle = (title: string): number | null => {
    const matched = exams.find((e) => e.title.toLowerCase() === title.toLowerCase());
    return matched ? matched.id : null;
  };

  const handleOpenLeaderboard = async (title: string, examId: number) => {
    setLeaderboardTitle(title);
    setShowLeaderboard(true);
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setRankings([]);

    try {
      const res = await getExamRankings(examId);
      setRankings(res.ranking || []);
    } catch (err: any) {
      setLeaderboardError(err?.message || "Failed to load ranking details.");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Print report card
  const handlePrint = () => {
    if (!reportResults.length || !reportExamTitle) return;
    const win = window.open("", "_blank", "popup,width=1000,height=850");
    if (!win) { toast.error("Allow pop-ups to download your result."); return; }

    const totalMaximum = reportResults.reduce((sum, result) => sum + Number(result.max_marks || 0), 0);
    const totalObtained = reportResults.reduce((sum, result) => sum + (result.is_absent ? 0 : Number(result.marks_obtained || 0)), 0);
    const rawLogo = schoolProfile?.logo || localStorage.getItem("school_logo") || "";
    const logo = rawLogo && !String(rawLogo).startsWith("http") && !String(rawLogo).startsWith("data:")
      ? `${API_BASE_URL.replace(/\/api\/?$/, "")}${String(rawLogo).startsWith("/") ? rawLogo : `/${rawLogo}`}`
      : rawLogo;
    const studentName = [studentProfile?.name, studentProfile?.surname].filter(Boolean).join(" ") || studentProfile?.student_name || "Student";
    const admissionNumber = studentProfile?.gr_no || studentProfile?.gr_number || studentProfile?.admission_no || "";
    const schoolAddress = [schoolProfile?.address, schoolProfile?.city, schoolProfile?.state, schoolProfile?.pincode].filter(Boolean).join(", ");

    void writePrintableResultCards({
      printWindow: win,
      students: [{
        studentId: studentProfile?.id || studentId || admissionNumber || "student",
        name: studentName,
        rollNumber: studentProfile?.roll_no || studentProfile?.roll_number,
        admissionNumber,
        className: [studentProfile?.school_class_name || studentProfile?.school_class?.school_class, studentProfile?.division_name || (typeof studentProfile?.division === "object" ? studentProfile?.division?.division : studentProfile?.division)].filter(Boolean).join(" - "),
        dateOfBirth: studentProfile?.dob || studentProfile?.date_of_birth,
        photo: studentProfile?.profile_photo || studentProfile?.photo,
        subjects: reportResults.map((result) => ({ subject: result.subject || reportExamTitle, maximum: result.max_marks, obtained: result.is_absent ? "Absent" : result.marks_obtained, grade: result.grade, remarks: result.remarks, absent: result.is_absent })),
        totalMaximum,
        totalObtained,
        percentage: totalMaximum ? ((totalObtained / totalMaximum) * 100).toFixed(2) : "0.00",
        overallGrade: reportResults.find((result) => result.grade)?.grade,
        remarks: reportResults.find((result) => result.remarks?.trim())?.remarks || "",
      }],
      school: { name: schoolProfile?.name || localStorage.getItem("school_name") || "School", logo, address: schoolAddress, phone: schoolProfile?.phone, email: schoolProfile?.email },
      title: reportExamTitle,
      academicYear: schoolProfile?.academic_year_name || schoolProfile?.academic_year?.name || "",
      template: reportResults.find((result) => result.report_template)?.report_template || getSavedResultTemplate(),
    }).catch((error) => {
      win.close();
      toast.error(error?.message || "Could not prepare the result PDF.");
    });
  };

  const handleDownloadReportCard = async () => {
    if (!studentId) {
      try {
        setDownloadingReport(true);
        const attendance = await getStudentAttendance();
        if (attendance.length > 0) {
          const sId = attendance[0].student;
          setStudentId(sId);
          await downloadPDF(sId);
        } else {
          toast.error("Could not retrieve student ID for report card.");
        }
      } catch {
        toast.error("Failed to determine student ID.");
      } finally {
        setDownloadingReport(false);
      }
      return;
    }

    setDownloadingReport(true);
    try {
      await downloadPDF(studentId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF report card.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const downloadPDF = async (sId: number, examId?: number) => {
    const examQuery = examId ? `?exam_id=${examId}` : "";
    const url = `${API_BASE_URL}/results/report-card/${sId}/${examQuery}`;
    const response = await fetchWithAuth(url);

    if (!response.ok) {
      throw new Error("Report card file is not available yet.");
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `Report_Card_${sId}${examId ? `_Exam_${examId}` : ""}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
    toast.success("Report card downloaded successfully!");
  };

  return (
    <div
      className="relative flex min-h-full w-full flex-col gap-3 overflow-x-hidden px-3 py-3 pb-3 sm:gap-6 sm:px-4 sm:py-6 sm:pb-3 lg:px-6"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`@import url('${FONT_URL}');`}</style>

      {/* Background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-85 h-85 bg-violet-200/10 rounded-full blur-3xl pointer-events-none" />

      {/* Results hero */}
      <section className="relative z-10 overflow-hidden rounded-[2rem] border border-blue-100/70 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/80 p-5 shadow-sm sm:rounded-[2.5rem] sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-blue-600 sm:text-xs">Academic Records</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">My <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">Results</span></h1>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500 sm:text-base">Track your semester marks, view rankings, and download report cards.</p>
          </div>
          <div className="relative mr-1 hidden h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 sm:flex">
            <GraduationCap className="h-16 w-16" strokeWidth={1.7} />
            <span className="absolute -bottom-1 -right-1 rounded-2xl border-4 border-white bg-emerald-100 p-2 text-emerald-600"><FileText className="h-6 w-6" /></span>
          </div>
        </div>
        <div className="relative mt-5 flex gap-3 sm:mt-7 sm:gap-4">
          <Button
            variant="outline"
            onClick={loadPageData}
            disabled={isLoading}
            className="h-12 flex-1 rounded-[1.25rem] border-0 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm hover:bg-white sm:h-16 sm:flex-none sm:gap-3 sm:px-8 sm:text-lg"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin text-[#2563eb]" /> : <RefreshCw size={16} className="text-slate-500" />}
            Refresh
          </Button>

          <Button
            onClick={handleDownloadReportCard}
            disabled={downloadingReport || results.length === 0}
            className="h-12 flex-[1.4] rounded-[1.25rem] bg-gradient-to-r from-sky-500 to-blue-700 px-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-sky-600 hover:to-blue-800 sm:h-16 sm:flex-none sm:gap-3 sm:px-8 sm:text-lg"
          >
            {downloadingReport ? <Loader2 size={16} className="animate-spin text-white" /> : <Download size={16} className="text-white" />}
            Report Card PDF
          </Button>
        </div>
      </section>

      {/* Stats */}
      <div className="z-10 grid grid-cols-2 gap-3 sm:gap-5">
        <Card className="relative overflow-hidden rounded-[1.75rem] border-indigo-100/60 bg-gradient-to-br from-indigo-50/70 via-white to-white shadow-sm sm:rounded-[2rem]">
          <CardContent className="relative z-10 flex min-h-[182px] items-center gap-3 p-4 sm:min-h-[240px] sm:gap-5 sm:p-7">
            <div className="shrink-0 rounded-[1.25rem] bg-indigo-100/70 p-3 text-indigo-600 sm:p-5">
              <Award size={26} className="sm:h-10 sm:w-10" />
            </div>
            <div className="min-w-0">
              <p className="max-w-[9rem] text-[11px] font-extrabold uppercase leading-tight tracking-wide text-slate-500 sm:text-base">Average Performance</p>
              <h2 className="mt-2 text-3xl font-black leading-none text-slate-900 sm:mt-3 sm:text-5xl">{stats.avgPercentage}%</h2>
              <p className="mt-2 text-[10px] leading-tight text-slate-400 sm:text-sm">Keep up the great work!</p>
            </div>
          </CardContent>
          <svg aria-hidden="true" viewBox="0 0 320 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-violet-300/70 sm:h-16"><path d="M0 45 C45 67 55 12 100 22 S155 66 205 24 S270 53 320 18 V60 H0Z" fill="currentColor" opacity=".18"/><path d="M0 45 C45 67 55 12 100 22 S155 66 205 24 S270 53 320 18" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.75rem] border-emerald-100/60 bg-gradient-to-br from-emerald-50/70 via-white to-white shadow-sm sm:rounded-[2rem]">
          <CardContent className="relative z-10 flex min-h-[182px] items-center gap-3 p-4 sm:min-h-[240px] sm:gap-5 sm:p-7">
            <div className="shrink-0 rounded-[1.25rem] bg-emerald-100/70 p-3 text-emerald-600 sm:p-5">
              <BookmarkCheck size={26} className="sm:h-10 sm:w-10" />
            </div>
            <div className="min-w-0">
              <p className="max-w-[9rem] text-[11px] font-extrabold uppercase leading-tight tracking-wide text-slate-500 sm:text-base">Completed Evaluations</p>
              <h2 className="mt-2 text-3xl font-black leading-none text-slate-900 sm:mt-3 sm:text-5xl">{stats.completed}</h2>
              <p className="mt-2 text-[10px] leading-tight text-slate-400 sm:text-sm">Exams completed</p>
            </div>
          </CardContent>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 flex h-12 items-end gap-1 sm:h-16 sm:gap-2">{[30, 55, 82, 48, 70, 50, 100].map((height, i) => <span key={i} className="w-2 rounded-t bg-emerald-300/50 sm:w-4" style={{ height: `${height}%` }} />)}</div>
        </Card>
      </div>

      {/* Search */}
      <div className="z-10 flex items-center gap-2 rounded-[1.75rem] border border-slate-100 bg-white p-2.5 shadow-sm sm:gap-3 sm:p-3.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-3.5" />
          <Input
            placeholder="Search results by subject or exam title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-full border-slate-200/80 bg-slate-50/50 pl-10 text-xs focus-visible:ring-indigo-500/50 sm:h-12 sm:pl-11 sm:text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading && results.length === 0 ? (
        <div className="z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="border-slate-100 shadow-sm animate-pulse bg-white rounded-3xl h-[210px]" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl z-10 p-6 text-center max-w-md mx-auto">
          <AlertCircle className="text-rose-500 h-10 w-10 mx-auto mb-3 shrink-0" />
          <h2 className="text-rose-900 text-lg font-bold">Failed to sync results</h2>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
          <Button onClick={loadPageData} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5">
            Retry Sync
          </Button>
        </Card>
      ) : examTitles.length === 0 ? (
        <StudentEmptyState
          title="No examination results published"
          description="There are currently no published exam marks or scorecard entries available. Results will appear here once declared."
        />
      ) : (
        <div className="z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          <AnimatePresence>
            {examTitles.map((title, index) => {
              const examResults = groupedResults.get(title) || [];
              const examId = findExamIdByTitle(title);
              const totalObt = examResults.reduce((s, r) => s + (r.is_absent ? 0 : parseFloat(r.marks_obtained || "0")), 0);
              const totalMax = examResults.reduce((s, r) => s + parseFloat(r.max_marks || "0"), 0);
              const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
              const topGrade = examResults[0]?.grade || "—";
              const gs = getGradeStyle(topGrade);

              return (
                <motion.div
                  key={title + index}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="group flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-md sm:rounded-[2rem]">
                    <CardHeader className="p-5 pb-3 sm:p-8 sm:pb-4">
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          <div className="shrink-0 rounded-[1.25rem] bg-indigo-50 p-4 text-indigo-600 sm:rounded-[1.5rem] sm:p-5">
                            <BookOpen size={30} className="transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 sm:text-xs">
                              {examResults.length} Subject{examResults.length !== 1 ? "s" : ""}
                            </span>
                            <CardTitle className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl" title={title}>
                              {title}
                            </CardTitle>
                          </div>
                        </div>
                        <span className={`h-14 min-w-[3.5rem] px-3 flex items-center justify-center rounded-full border text-lg font-black shrink-0 sm:h-16 sm:min-w-[4rem] sm:text-2xl ${gs.bg} ${gs.text} ${gs.border}`}>
                          {topGrade.toUpperCase()}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col justify-between gap-5 px-5 pb-5 pt-0 sm:gap-7 sm:px-8 sm:pb-8">
                      <div className="mt-1 space-y-2.5 sm:space-y-3">
                        <div className="flex justify-between text-sm font-bold text-slate-600 sm:text-lg">
                          <span>Score</span>
                          <span>{totalObt} / {totalMax}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden sm:h-4">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-sm text-slate-400 font-semibold text-right sm:text-base">{pct}%</p>
                      </div>

                        <div className="mt-1 grid grid-cols-2 gap-2">
                        {examId !== null && (
                          <Button
                            onClick={() => handleOpenLeaderboard(title, examId)}
                            className="h-14 border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 text-slate-800 hover:text-slate-900 rounded-[1.25rem] text-sm font-bold shadow-sm flex items-center justify-center gap-2 sm:h-16 sm:text-base"
                          >
                            <Users size={14} className="text-indigo-500" /> View Class
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setReportExamTitle(title);
                            setReportResults(groupedResults.get(title) || []);
                            void getStudentResults().then((latestResults) => {
                              setResults(latestResults);
                              const latestCardRows = latestResults.filter((result) => result.exam_title === title);
                              if (latestCardRows.length) setReportResults(latestCardRows);
                              else {
                                setReportExamTitle(null);
                                setReportResults([]);
                                toast.error("This result is no longer published.");
                              }
                            }).catch(() => {
                              // Keep the already loaded result visible if a refresh fails.
                            });
                          }}
                          className={`h-14 rounded-[1.25rem] border-indigo-100 bg-indigo-50/40 text-sm font-bold gap-2 sm:h-16 sm:text-base ${examId === null ? "col-span-2" : ""}`}
                        >
                          <FileText size={14} /> View Report Card
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Report Card Modal ────────────────────────────────────────────────── */}
      <Dialog open={!!reportExamTitle} onOpenChange={(open) => { if (!open) { setReportExamTitle(null); setReportResults([]); } }}>
        <DialogContent className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-2xl sm:left-1/2 sm:top-1/2 sm:h-[92dvh] sm:w-[94vw] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          {/* Modal Top Bar */}
          <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-4 sm:px-5 sm:rounded-t-3xl">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => { setReportExamTitle(null); setReportResults([]); }}
                className="h-8 w-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-0">
                <h3 className="text-white font-black text-xs sm:text-sm">Result Details</h3>
                <p className="truncate text-blue-100 text-[10px]">{reportExamTitle}</p>
              </div>
            </div>
          </div>

          {/* Report Card Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-3 sm:p-6">
            {reportExamTitle && reportResults.length > 0 && (
              <ResultCardPreview title={reportExamTitle} template={reportResults.find((result) => result.report_template)?.report_template || "classic"} school={{ name: schoolProfile?.name || (typeof window !== "undefined" ? localStorage.getItem("school_name") || "School" : "School"), logo: schoolProfile?.logo || (typeof window !== "undefined" ? localStorage.getItem("school_logo") || "" : ""), address: [schoolProfile?.address, schoolProfile?.city, schoolProfile?.state, schoolProfile?.pincode].filter(Boolean).join(", "), phone: schoolProfile?.phone, email: schoolProfile?.email, academicYear: schoolProfile?.academic_year_name || schoolProfile?.academic_year?.name, principalName: schoolProfile?.principal_name, teacherName: schoolProfile?.class_teacher_name, principalSignature: schoolProfile?.principal_signature, teacherSignature: schoolProfile?.clerk_signature, stamp: schoolProfile?.school_stamp }} student={{ id: studentProfile?.id || studentId, name: [studentProfile?.name, studentProfile?.surname].filter(Boolean).join(" ") || studentProfile?.student_name, rollNumber: studentProfile?.roll_no || studentProfile?.roll_number, admissionNumber: studentProfile?.gr_no || studentProfile?.gr_number || studentProfile?.admission_no, className: [studentProfile?.school_class_name || studentProfile?.school_class?.school_class, typeof studentProfile?.division === "object" ? studentProfile?.division?.division : studentProfile?.division_name || studentProfile?.division].filter(Boolean).join(" - "), dateOfBirth: studentProfile?.dob || studentProfile?.date_of_birth, photo: studentProfile?.profile_photo || studentProfile?.photo }} subjects={reportResults.map((result) => ({ subject: result.subject || reportExamTitle, maximum: result.max_marks || 0, obtained: result.is_absent ? "Absent" : result.marks_obtained ?? "—", grade: result.grade, remarks: result.remarks, absent: result.is_absent }))} totals={{ maximum: reportResults.reduce((sum, result) => sum + Number(result.max_marks || 0), 0), obtained: reportResults.reduce((sum, result) => sum + (result.is_absent ? 0 : Number(result.marks_obtained || 0)), 0), percentage: (() => { const max = reportResults.reduce((sum, result) => sum + Number(result.max_marks || 0), 0); const got = reportResults.reduce((sum, result) => sum + (result.is_absent ? 0 : Number(result.marks_obtained || 0)), 0); return max ? ((got / max) * 100).toFixed(2) : "0.00"; })(), grade: reportResults.find((result) => result.grade)?.grade }} remarks={reportResults.find((result) => result.remarks?.trim())?.remarks} />
            )}
          </div>

          {/* Bottom Actions */}
          <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <Button variant="outline" onClick={() => { setReportExamTitle(null); setReportResults([]); }} className="rounded-xl px-5">Cancel</Button>
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-5"
            >
              <Download size={15} />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Leaderboard Modal ──────────────────────────────────────────────── */}
      {showLeaderboard && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden"
          onClick={() => { setShowLeaderboard(false); setRankings([]); }}
        >
          <div
            className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  {leaderboardTitle} Leaderboard
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Top performing students ranked by marks.</p>
              </div>
              <button
                onClick={() => { setShowLeaderboard(false); setRankings([]); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {leaderboardLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syncing Rankings...</span>
                </div>
              ) : leaderboardError ? (
                <div className="py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                  <p className="text-slate-800 text-xs font-bold">{leaderboardError}</p>
                </div>
              ) : rankings.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold">No ranking entries found.</p>
                </div>
              ) : (
                rankings.map((rank) => {
                  const isCurrentUser = studentId && rank.student === studentId;
                  const gs = getGradeStyle(rank.grade);
                  return (
                    <div
                      key={rank.student}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${isCurrentUser ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200/50 shadow-sm" : "bg-white border-slate-100/80 hover:bg-slate-50/50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${rank.rank === 1 ? "bg-amber-100 text-amber-800" : rank.rank === 2 ? "bg-slate-100 text-slate-800" : rank.rank === 3 ? "bg-orange-100 text-orange-800" : "bg-slate-50 text-slate-500"}`}>
                          #{rank.rank}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 capitalize flex items-center gap-1.5">
                            {rank.student_name}
                            {isCurrentUser && (
                              <span className="bg-indigo-600 text-white font-bold text-[8px] tracking-wide uppercase px-1.5 py-0.5 rounded-full">You</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">Score: {rank.marks_obtained} / {rank.max_marks}</p>
                        </div>
                      </div>
                      <span className={`h-7 min-w-[1.75rem] px-1.5 flex items-center justify-center rounded-full border font-black text-[10px] shrink-0 ${gs.bg} ${gs.text} ${gs.border}`}>
                        {rank.grade}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <button
                onClick={() => { setShowLeaderboard(false); setRankings([]); }}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-blue-500/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
