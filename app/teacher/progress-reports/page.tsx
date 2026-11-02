"use client";

import ResponsiveSelect from "@/components/ui/responsive-select";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  FileCheck,
  Printer,
  Eye,
  EyeOff,
  Users,
  Award,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Send,
  Lock,
  Calendar,
  History,
  Loader2,
  Search,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
  TrendingUp,
  Trophy,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  School,
  RefreshCw,
  BookOpen,
  Sparkles,
  Check,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getExamsFull, apiFetch, type ExamFull } from "@/lib/exam-api";
import { ResultCardPreview } from "@/components/results/result-card-preview";
import { getSchoolProfile } from "@/lib/school-profile";
import { downloadResultPreviewPDF } from "@/lib/result-dom-pdf";
import { cn } from "@/lib/utils";

// ─── Visual Helpers ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DivisionOption {
  id: number;
  name: string;
  className: string;
  divisionName: string;
  schoolClassId?: number | string;
  isMyClass?: boolean;
}

interface StudentItem {
  id: number;
  student_name: string;
  gr_no: string;
  roll_no?: string;
  division_name?: string;
  school_class_name?: string;
  photo?: string;
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
}

interface SubjectItem {
  id: number;
  name: string;
  division?: any;
}

interface BehaviorEvaluations {
  cooperative: string;
  neatAndOrderly: string;
  responsible: string;
  attendance: string;
}

interface AcademicMark {
  subjectName: string;
  subjectId?: number;
  examId?: number;
  score: number | null; // null when not entered yet
  maxMarks: number;
  passingMarks: number;
  grade: string;
  isAbsent?: boolean;
  remarks?: string;
}

interface StudentReportData {
  studentId: number;
  studentName: string;
  grNo: string;
  rollNo?: string;
  className: string;
  divisionName: string;
  photo?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  reportMonth: string; // e.g. "Term 1 Examination"
  attendancePct: number | null;
  behavior: BehaviorEvaluations;
  academics: AcademicMark[];
  teacherRemarks: string;
  status: "Pending Marks" | "Evaluated & Ready";
  isPublished: boolean;
  publishedDate?: string;
  totalScore?: number;
  maxTotalScore?: number;
  overallPercentage?: number | null;
  overallGrade?: string;
  resultStatus?: "DISTINCTION" | "FIRST_CLASS" | "SECOND_CLASS" | "PASS" | "NEEDS_IMPROVEMENT" | "PENDING";
}

interface ExamTermOption {
  key: string;
  title: string;
  termName?: string;
  displayLabel: string;
  exams: ExamFull[];
}

// Helper to convert numeric percentage to letter grade & remarks
function computeGradeAndRemarks(score: number | null, maxVal: number = 100): { grade: string; remarks: string } {
  if (score === null || score === undefined || isNaN(score) || maxVal <= 0) {
    return { grade: "--", remarks: "Pending Entry" };
  }
  const pct = (score / maxVal) * 100;
  if (pct >= 90) return { grade: "A+", remarks: "Outstanding" };
  if (pct >= 80) return { grade: "A", remarks: "Excellent" };
  if (pct >= 70) return { grade: "B+", remarks: "Very Good" };
  if (pct >= 60) return { grade: "B", remarks: "Good" };
  if (pct >= 50) return { grade: "C", remarks: "Satisfactory" };
  if (pct >= 40) return { grade: "D", remarks: "Pass" };
  return { grade: "F", remarks: "Needs Improvement" };
}

function computeGrade(pct: number | null): string {
  if (pct === null || isNaN(pct)) return "--";
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

function formatMonthYear(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

// Helper to check if two exams belong to the same Examination Term
function examsBelongToSameTerm(baseExam: ExamFull, candidate: ExamFull): boolean {
  // If both have term_name or exam_term ID
  if (baseExam.term_name && candidate.term_name) {
    return baseExam.term_name.trim().toLowerCase() === candidate.term_name.trim().toLowerCase();
  }
  if (baseExam.exam_term && candidate.exam_term) {
    return String(baseExam.exam_term) === String(candidate.exam_term);
  }

  // Check matching title patterns (e.g., "Term 1", "Unit Test 1", "Mid Term", "Annual")
  const normalize = (s?: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[\-_:]/g, " ")
      .trim();

  const baseTitle = normalize(baseExam.title);
  const candTitle = normalize(candidate.title);

  const termMatch = baseTitle.match(/(term\s*\d+|unit\s*test\s*\d+|semester\s*\d+|mid\s*term|annual|half\s*yearly|quarterly)/i);
  if (termMatch) {
    const termSnippet = termMatch[0].toLowerCase();
    return candTitle.includes(termSnippet);
  }

  return baseTitle === candTitle;
}

// ─── Official Institutional Marksheet Modal (Exact Principal Result Card) ──────

function ClassicReportCardModal({
  report,
  schoolBrand,
  onClose,
  onUpdateBehavior,
  onTogglePublish,
}: {
  report: StudentReportData;
  schoolBrand: any;
  onClose: () => void;
  onUpdateBehavior: (updated: StudentReportData) => void;
  onTogglePublish: (studentId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [cooperative, setCooperative] = useState(report.behavior.cooperative || "--");
  const [neatAndOrderly, setNeatAndOrderly] = useState(report.behavior.neatAndOrderly || "--");
  const [responsible, setResponsible] = useState(report.behavior.responsible || "--");
  const [remarks, setRemarks] = useState(report.teacherRemarks || "");
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleSave = () => {
    const updated: StudentReportData = {
      ...report,
      behavior: {
        ...report.behavior,
        cooperative,
        neatAndOrderly,
        responsible,
      },
      teacherRemarks: remarks,
    };
    onUpdateBehavior(updated);
    setIsEditing(false);
    toast.success(`Progress evaluation for ${report.studentName} updated successfully!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const el = document.querySelector("[data-result-card-preview='true']") as HTMLElement;
      if (el) {
        await downloadResultPreviewPDF(el, `${report.studentName.replace(/\s+/g, "_")}_Marksheet.pdf`);
        toast.success(`Marksheet PDF downloaded for ${report.studentName}!`);
      } else {
        toast.error("Could not find marksheet preview element to download.");
      }
    } catch (err: any) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate PDF. You can use the Print button instead.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const subjects = report.academics.map((sub) => ({
    subject: sub.subjectName,
    maximum: Number(sub.maxMarks) || 50,
    obtained: sub.isAbsent ? "Absent" : sub.score !== null ? Number(sub.score) : "—",
    grade: sub.grade,
    remarks: sub.remarks,
    absent: sub.isAbsent,
  }));

  const totalMax =
    report.maxTotalScore && Number(report.maxTotalScore) > 0
      ? Number(report.maxTotalScore)
      : subjects.reduce((acc, s) => acc + (Number(s.maximum) || 50), 0);

  const totalObt =
    report.totalScore !== undefined && Number(report.totalScore) >= 0
      ? Number(report.totalScore)
      : subjects.reduce((acc, s) => acc + (s.absent || typeof s.obtained !== "number" ? 0 : Number(s.obtained)), 0);

  const pct =
    totalMax > 0
      ? Math.round((Number(totalObt) / Number(totalMax)) * 100 * 10) / 10
      : 0;

  const totals = {
    maximum: totalMax,
    obtained: totalObt,
    percentage: pct,
    grade: report.overallGrade || (pct >= 90 ? "A+" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "F"),
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 sm:left-1/2 sm:top-1/2 sm:h-[92dvh] sm:w-[94vw] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl shadow-2xl">
        {/* Scrollable Body: Matches exact Principal view layout */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-6">
          {/* Editable Qualitative Drawer if active */}
          {isEditing && (
            <div className="mb-4 bg-white p-3.5 rounded-2xl border border-blue-200 shadow-md max-w-[740px] mx-auto text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" /> Teacher Evaluation: {report.studentName}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cooperation</label>
                  <select
                    value={cooperative}
                    onChange={(e) => setCooperative(e.target.value)}
                    className="w-full text-xs font-medium p-1.5 rounded-lg border border-slate-300 bg-slate-50"
                  >
                    <option value="--">--</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Neatness & Order</label>
                  <select
                    value={neatAndOrderly}
                    onChange={(e) => setNeatAndOrderly(e.target.value)}
                    className="w-full text-xs font-medium p-1.5 rounded-lg border border-slate-300 bg-slate-50"
                  >
                    <option value="--">--</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Responsibility</label>
                  <select
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full text-xs font-medium p-1.5 rounded-lg border border-slate-300 bg-slate-50"
                  >
                    <option value="--">--</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
              </div>
              <div className="mb-2.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teacher Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 resize-none"
                  placeholder="Enter remarks for report card..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl h-8 text-xs font-bold">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-8 px-4">
                  Save Remarks
                </Button>
              </div>
            </div>
          )}

          {/* Exact ResultCardPreview without clipping */}
          <div className="w-full overflow-x-auto pb-4">
            <ResultCardPreview
              title={(report.reportMonth || "Term 1 Examination").toUpperCase()}
              template="classic"
              school={schoolBrand}
              student={{
                id: report.studentId,
                name: report.studentName,
                fatherName: report.fatherName,
                motherName: report.motherName,
                rollNumber: report.rollNo,
                admissionNumber: report.grNo || `GR-${report.studentId}`,
                className: `${report.className} - Section ${report.divisionName}`,
                dateOfBirth: report.dateOfBirth,
                photo: report.photo,
              }}
              subjects={subjects}
              totals={totals}
              remarks={report.teacherRemarks || remarks}
            />
          </div>
        </div>

                {/* Modal Bottom Footer Actions */}
        <div className="flex shrink-0 flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-t border-slate-200 bg-white px-3 sm:px-6 py-2.5 sm:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 w-full sm:w-auto rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="h-9 w-full sm:w-auto rounded-xl text-xs font-bold gap-1.5 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>{isEditing ? "Hide Form" : "Edit Assessment"}</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTogglePublish(report.studentId)}
              className={cn(
                "h-9 w-full sm:w-auto rounded-xl text-xs font-bold gap-1.5 px-3 border transition-colors cursor-pointer",
                report.isPublished
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              )}
            >
              {report.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              <span>{report.isPublished ? "Unpublish" : "Publish to Portal"}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="h-9 w-full sm:w-auto gap-1.5 rounded-xl bg-blue-600 font-bold text-xs text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {isDownloadingPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>{isDownloadingPDF ? "Downloading..." : "Download PDF"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressReportsPage() {
  const [divisionList, setDivisionList] = useState<DivisionOption[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number>(0);

  const [allExams, setAllExams] = useState<ExamFull[]>([]);
  const [availableExamOptions, setAvailableExamOptions] = useState<ExamTermOption[]>([]);
  const [selectedExamKey, setSelectedExamKey] = useState<string>("");

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [divisionSubjects, setDivisionSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentReportsMap, setStudentReportsMap] = useState<Record<number, StudentReportData>>({});
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "EVALUATED" | "PENDING" | "PUBLISHED">("ALL");
  const [mobileViewMode, setMobileViewMode] = useState<"cards" | "table">("cards");
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolBrand, setSchoolBrand] = useState({
    name: "VIDYASANCHALAN ACADEMY",
    shortName: "VIDYASANCHALAN",
    logo: "",
    tagline: "Inspiring Excellence & Integrity",
    address: "",
    phone: "",
    email: "",
    establishmentYear: "2010",
    boardAffiliation: "CBSE / State Board",
    schoolCode: "",
    udiseCode: "",
    principalName: "Principal",
    teacherName: "Class Teacher",
    principalSignature: "",
    teacherSignature: "",
    stamp: "",
    academicYear: "2026 - 2027",
  });

  // Load persistent published reports from localStorage for division + exam
  const loadPublishedStore = (divId: number, examKey: string): Record<number, Partial<StudentReportData>> => {
    try {
      const sanitized = examKey.replace(/[^a-zA-Z0-9]/g, "_");
      const stored = localStorage.getItem(`published_progress_reports_${divId}_${sanitized}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {};
  };

  const savePublishedStore = (divId: number, examKey: string, map: Record<number, StudentReportData>) => {
    try {
      const sanitized = examKey.replace(/[^a-zA-Z0-9]/g, "_");
      localStorage.setItem(`published_progress_reports_${divId}_${sanitized}`, JSON.stringify(map));
    } catch {}
  };

  // 1. Fetch Teacher's assigned class & division and all exams
  useEffect(() => {
    async function loadTeacherClassesAndData() {
      setLoading(true);
      try {
        const storedSchool = localStorage.getItem("school_name") || "";
        if (storedSchool) setSchoolName(storedSchool);

        const [divListRes, meRes, examsData, brandingData] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/divisionlist/`).catch(() => null),
          fetchWithAuth(`${API_BASE_URL}/me/`).catch(() => null),
          getExamsFull().catch(() => []),
          getSchoolProfile().catch(() => null),
        ]);

        const meData = meRes && meRes.ok ? await meRes.json() : null;
        if (meData?.school?.name) setSchoolName(meData.school.name);
        if (meData?.school_short_name && !schoolName) setSchoolName(meData.school_short_name);

        const school: any = meData?.school || meData || {};
        const branding: any = brandingData || {};
        setSchoolBrand({
          name: branding.school_full_name || school.name || storedSchool || "VIDYASANCHALAN ACADEMY",
          shortName: branding.school_short_name || school.short_name || "VIDYASANCHALAN",
          logo: branding.print_logo_url || branding.main_logo_url || school.logo || localStorage.getItem("school_logo") || "",
          tagline: branding.tagline || school.tagline || "Inspiring Excellence & Integrity",
          address:
            branding.full_address ||
            [school.address, school.city, school.state, school.pincode].filter(Boolean).join(", ") ||
            "",
          phone: branding.phone_numbers || school.phone || "",
          email: branding.official_emails || school.email || "",
          establishmentYear: branding.establishment_year || school.establishment_year || "2010",
          boardAffiliation:
            (Array.isArray(branding.board_affiliation)
              ? branding.board_affiliation.join(", ")
              : branding.board_affiliation) ||
            school.board_affiliation ||
            "CBSE / State Board",
          schoolCode: branding.school_code || school.index_no || school.school_code || "",
          udiseCode: branding.udise_code || school.udise_code || "",
          principalName: branding.principal_name || school.principal_name || "Principal",
          teacherName: meData?.first_name ? [meData.first_name, meData.last_name].filter(Boolean).join(" ") : "Class Teacher",
          principalSignature: branding.principal_signature_url || "",
          teacherSignature: branding.class_teacher_signature_url || "",
          stamp: branding.official_seal_url || "",
          academicYear: branding.current_academic_year || "2026 - 2027",
        });

        let mappedDivs: DivisionOption[] = [];
        if (divListRes && divListRes.ok) {
          const divData = await divListRes.json();
          const list = Array.isArray(divData) ? divData : (divData.data ?? divData.results ?? []);
          mappedDivs = list.map((item: any) => {
            const className =
              item.class_name ||
              item.school_class_name ||
              (typeof item.SchoolClass === "object" ? item.SchoolClass?.school_class : "") ||
              "";
            const divName = item.division || "";
            const fullName =
              className && divName
                ? `${className} (Div ${divName})`
                : divName
                ? `Div ${divName}`
                : className || `Division ${item.id}`;
            return {
              id: item.id,
              name: fullName,
              className: className || "Class 8",
              divisionName: divName || "A",
              schoolClassId: item.SchoolClass?.id || item.school_class || item.class_id,
              isMyClass: true,
            };
          });
        }

        // Deduplicate mappedDivs by unique division ID
        const finalDivMap = new Map<number, DivisionOption>();
        mappedDivs.forEach((d) => {
          if (d.id && !finalDivMap.has(d.id)) {
            finalDivMap.set(d.id, d);
          }
        });
        const uniqueTeacherDivs = Array.from(finalDivMap.values());

        setDivisionList(uniqueTeacherDivs);
        if (uniqueTeacherDivs.length > 0) {
          setSelectedDivisionId((prev) => (uniqueTeacherDivs.some((d) => d.id === prev) ? prev : uniqueTeacherDivs[0].id));
        }

        setAllExams(Array.isArray(examsData) ? examsData : []);
      } catch (err) {
        console.error("Error loading teacher class data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTeacherClassesAndData();
  }, []);

  // 2. Build available Examination Terms for the selected class
  useEffect(() => {
    if (!selectedDivisionId || divisionList.length === 0) return;

    const currentDiv = divisionList.find((d) => d.id === selectedDivisionId);
    const normalizedClass = (currentDiv?.className || "").toLowerCase().trim();
    const normalizedDiv = (currentDiv?.divisionName || "").toLowerCase().trim();

    // Match exams belonging to this class & division
    const classExams = allExams.filter((ex) => {
      const exClass = (ex.class_name || "").toLowerCase().trim();
      const isClassMatch =
        !normalizedClass ||
        exClass === normalizedClass ||
        exClass.includes(normalizedClass) ||
        normalizedClass.includes(exClass);

      const exDiv = (ex.division || "").toLowerCase().trim();
      const isDivMatch = !exDiv || !normalizedDiv || exDiv === normalizedDiv;

      return isClassMatch && isDivMatch;
    });

    // Group exams by Examination Term
    const termGroups: ExamTermOption[] = [];

    classExams.forEach((candidate) => {
      let matchedGroup = termGroups.find((g) => {
        const representative = g.exams[0];
        return representative && examsBelongToSameTerm(representative, candidate);
      });

      if (!matchedGroup) {
        const termName = candidate.term_name || candidate.title || "School Examination";
        const dateStr = formatMonthYear(candidate.exam_date);
        const displayLabel = dateStr ? `${termName} (${dateStr})` : termName;

        matchedGroup = {
          key: `term_${candidate.id}_${termName.toLowerCase().replace(/\s+/g, "_")}`,
          title: termName,
          termName: candidate.term_name,
          displayLabel,
          exams: [candidate],
        };
        termGroups.push(matchedGroup);
      } else {
        if (!matchedGroup.exams.some((e) => e.id === candidate.id)) {
          matchedGroup.exams.push(candidate);
        }
      }
    });

    // If no exams scheduled yet, fallback gracefully to standard school terms
    let options = termGroups;
    if (options.length === 0) {
      options = [
        {
          key: "term_1_exam",
          title: "Term 1 Examination",
          displayLabel: "Term 1 Examination (October 2026)",
          exams: [],
        },
        {
          key: "unit_test_1",
          title: "Unit Test 1",
          displayLabel: "Unit Test 1 (August 2026)",
          exams: [],
        },
        {
          key: "annual_exam",
          title: "Annual Examination",
          displayLabel: "Annual Examination (March 2026)",
          exams: [],
        },
      ];
    }

    // Deduplicate options by unique key
    const uniqueTermMap = new Map<string, ExamTermOption>();
    options.forEach((opt) => {
      if (!uniqueTermMap.has(opt.key)) {
        uniqueTermMap.set(opt.key, opt);
      }
    });
    const dedupedOptions = Array.from(uniqueTermMap.values());

    setAvailableExamOptions(dedupedOptions);

    // Keep selection if valid, or default to first
    if (!dedupedOptions.some((o) => o.key === selectedExamKey)) {
      setSelectedExamKey(dedupedOptions[0]?.key || "");
    }
  }, [selectedDivisionId, divisionList, allExams]);

  // 3. Fetch Students, All Division Subjects, and Real Database Marks for ALL subjects in the term
  useEffect(() => {
    if (!selectedDivisionId || !selectedExamKey) return;

    const currentDiv = divisionList.find((d) => d.id === selectedDivisionId);
    const selectedOption = availableExamOptions.find((o) => o.key === selectedExamKey);

    async function loadClassData() {
      setLoading(true);
      try {
        // A. Fetch students for this division
        let fetchedStudents: StudentItem[] = [];
        try {
          const stRes = await fetchWithAuth(
            `${API_BASE_URL}/get/attendance/students/?division_id=${selectedDivisionId}`
          );
          if (stRes && stRes.ok) {
            const data = await stRes.json();
            const list = Array.isArray(data)
              ? data
              : (data.students ?? data.data ?? data.results ?? []);

            fetchedStudents = list.map((st: any) => ({
              id: st.id,
              student_name:
                [st.name, st.surname].filter(Boolean).join(" ") ||
                st.student_name ||
                st.name ||
                st.surname ||
                `Student ${st.id}`,
              gr_no: st.gr_no || "",
              school_class_name: st.school_class_name || currentDiv?.className || "Class",
              division_name: st.division_name || currentDiv?.divisionName || "A",
              roll_no: st.roll_no || "",
              photo: st.profile_photo || st.photo || "",
              father_name: st.father_name || st.fatherName || "",
              mother_name: st.mother_name || st.motherName || "",
              date_of_birth: st.dob || st.date_of_birth || "",
            }));
          }
        } catch {}

        // Fallback to /api/get-student/ if empty
        if (fetchedStudents.length === 0) {
          try {
            const fallbackRes = await fetchWithAuth(
              `${API_BASE_URL}/get-student/?division_id=${selectedDivisionId}`
            );
            if (fallbackRes && fallbackRes.ok) {
              const data = await fallbackRes.json();
              const list = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
              fetchedStudents = list.map((st: any) => ({
                id: st.id,
                student_name:
                  [st.name, st.surname].filter(Boolean).join(" ") ||
                  st.student_name ||
                  st.name ||
                  `Student ${st.id}`,
                gr_no: st.gr_no || "",
                school_class_name: st.school_class_name || currentDiv?.className || "Class",
                division_name: st.division_name || currentDiv?.divisionName || "A",
                roll_no: st.roll_no || "",
                photo: st.profile_photo || st.photo || "",
                father_name: st.father_name || st.fatherName || "",
                mother_name: st.mother_name || st.motherName || "",
                date_of_birth: st.dob || st.date_of_birth || "",
              }));
            }
          } catch {}
        }

        // B. Fetch official subjects for this division
        const subRes = await fetchWithAuth(`${API_BASE_URL}/setSubject/`).catch(() => null);
        let fetchedSubjects: SubjectItem[] = [];
        if (subRes && subRes.ok) {
          const data = await subRes.json();
          const list = Array.isArray(data) ? data : (data.data ?? data.results ?? []);
          fetchedSubjects = list.filter(
            (s: any) =>
              String(s.division) === String(selectedDivisionId) ||
              (s.division && String(s.division.id) === String(selectedDivisionId))
          );
          if (fetchedSubjects.length === 0) {
            fetchedSubjects = list;
          }
        }
        setDivisionSubjects(fetchedSubjects);
        setStudents(fetchedStudents);

        // C. Target all exams for this term
        const termExams = selectedOption?.exams || [];

        // D. Fetch real database marks for each exam in this term
        const examMarksByExamId: Record<number, any[]> = {};
        await Promise.all(
          termExams.map(async (ex) => {
            try {
              const res = await apiFetch(`/api/subject-marks/?exam=${ex.id}`);
              const marksList = Array.isArray(res) ? res : res?.results || [];
              examMarksByExamId[ex.id] = marksList;
            } catch (err) {
              examMarksByExamId[ex.id] = [];
            }
          })
        );

        // E. Build a complete, comprehensive map of ALL subjects for this class
        // Combines division subjects with term exams to ensure ALL subjects are shown!
        const distinctSubjectMap = new Map<
          string,
          { subjectId?: number; examId?: number; maxMarks: number; passingMarks: number }
        >();

        // First, add all subjects from the scheduled exams
        termExams.forEach((ex) => {
          const sName = ex.subject_name || (ex.subject ? `Subject ${ex.subject}` : "General Subject");
          if (sName && !distinctSubjectMap.has(sName)) {
            const parsedMax = Number(ex.max_marks) || 100;
            const parsedPass = Number(ex.passing_marks) || Math.round(parsedMax * 0.4);
            distinctSubjectMap.set(sName, {
              subjectId: ex.subject,
              examId: ex.id,
              maxMarks: parsedMax,
              passingMarks: parsedPass,
            });
          }
        });

        // Next, ensure every official class subject from division is present
        fetchedSubjects.forEach((sub) => {
          if (sub.name && !distinctSubjectMap.has(sub.name)) {
            distinctSubjectMap.set(sub.name, {
              subjectId: sub.id,
              maxMarks: 100,
              passingMarks: 40,
            });
          }
        });

        const existingStore = loadPublishedStore(selectedDivisionId, selectedExamKey);

        // F. Assemble the comprehensive report map for all students
        const newMap: Record<number, StudentReportData> = {};

        fetchedStudents.forEach((st) => {
          const cached = existingStore[st.id] || {};

          const studentAcademics: AcademicMark[] = [];
          let hasAnyMark = false;
          let totalScore = 0;
          let maxTotalScore = 0;
          let evaluatedSubjectsCount = 0;
          let anyFailed = false;

          distinctSubjectMap.forEach((meta, subjectName) => {
            let score: number | null = null;
            let isAbsent = false;

            if (meta.examId && examMarksByExamId[meta.examId]) {
              const studentEntry = examMarksByExamId[meta.examId].find((m: any) => m.student === st.id);
              if (studentEntry) {
                if (studentEntry.is_absent) {
                  isAbsent = true;
                  score = 0;
                  hasAnyMark = true;
                } else if (studentEntry.marks_obtained !== null && studentEntry.marks_obtained !== undefined) {
                  score = Number(studentEntry.marks_obtained);
                  hasAnyMark = true;
                }
              }
            }

            const maxM = Number(meta.maxMarks) || 100;
            const passM = Number(meta.passingMarks) || Math.round(maxM * 0.4);

            if (score !== null) {
              totalScore += score;
              maxTotalScore += maxM;
              evaluatedSubjectsCount++;
              if (score < passM) {
                anyFailed = true;
              }
            }

            const evalResult = computeGradeAndRemarks(score, maxM);

            studentAcademics.push({
              subjectName,
              subjectId: meta.subjectId,
              examId: meta.examId,
              score,
              maxMarks: maxM,
              passingMarks: passM,
              grade: isAbsent ? "ABS" : evalResult.grade,
              isAbsent,
              remarks: isAbsent ? "Absent" : evalResult.remarks,
            });
          });

          const overallPct =
            maxTotalScore > 0 && evaluatedSubjectsCount > 0
              ? Math.round((totalScore / maxTotalScore) * 100 * 10) / 10
              : null;
          const overallGrade = computeGrade(overallPct);

          // Determine official standing
          let resultStatus: StudentReportData["resultStatus"] = "PENDING";
          if (overallPct !== null) {
            if (anyFailed || overallPct < 40) {
              resultStatus = "NEEDS_IMPROVEMENT";
            } else if (overallPct >= 75) {
              resultStatus = "DISTINCTION";
            } else if (overallPct >= 60) {
              resultStatus = "FIRST_CLASS";
            } else if (overallPct >= 50) {
              resultStatus = "SECOND_CLASS";
            } else {
              resultStatus = "PASS";
            }
          }

          newMap[st.id] = {
            studentId: st.id,
            studentName: st.student_name,
            grNo: st.gr_no || "",
            rollNo: st.roll_no || "",
            className: st.school_class_name || currentDiv?.className || "Class",
            divisionName: st.division_name || currentDiv?.divisionName || "A",
            photo: st.photo,
            fatherName: st.father_name,
            motherName: st.mother_name,
            dateOfBirth: st.date_of_birth,
            reportMonth: selectedOption?.displayLabel || selectedExamKey,
            attendancePct: cached.attendancePct ?? null,
            behavior: {
              cooperative: cached.behavior?.cooperative || "--",
              neatAndOrderly: cached.behavior?.neatAndOrderly || "--",
              responsible: cached.behavior?.responsible || "--",
              attendance: cached.behavior?.attendance || "--",
            },
            academics: studentAcademics,
            teacherRemarks: cached.teacherRemarks || "",
            status: hasAnyMark ? "Evaluated & Ready" : "Pending Marks",
            isPublished: cached.isPublished ?? false,
            publishedDate: cached.publishedDate,
            totalScore: hasAnyMark ? totalScore : undefined,
            maxTotalScore: hasAnyMark ? maxTotalScore : undefined,
            overallPercentage: overallPct,
            overallGrade,
            resultStatus,
          };
        });

        setStudentReportsMap(newMap);
      } catch (err) {
        console.error("Error loading progress reports data:", err);
        toast.error("Failed to load marks and student records.");
      } finally {
        setLoading(false);
      }
    }

    loadClassData();
  }, [selectedDivisionId, selectedExamKey, availableExamOptions]);

  const handleUpdateStudentReport = (updated: StudentReportData) => {
    setStudentReportsMap((prev) => {
      const next = { ...prev, [updated.studentId]: updated };
      savePublishedStore(selectedDivisionId, selectedExamKey, next);
      return next;
    });
  };

  const handleTogglePublish = (studentId: number) => {
    setStudentReportsMap((prev) => {
      const report = prev[studentId];
      if (!report) return prev;

      const newPublished = !report.isPublished;
      const todayStr = new Date().toLocaleDateString();
      const updated: StudentReportData = {
        ...report,
        isPublished: newPublished,
        publishedDate: newPublished ? todayStr : undefined,
      };

      const next = { ...prev, [studentId]: updated };
      savePublishedStore(selectedDivisionId, selectedExamKey, next);

      if (newPublished) {
        toast.success(`📲 Published ${report.studentName}'s report card to Student & Parent Portals!`);
      } else {
        toast.info(`🔒 Unpublished ${report.studentName}'s report card. Hidden from portals.`);
      }

      return next;
    });
  };

  const handlePublishAll = () => {
    const todayStr = new Date().toLocaleDateString();
    setStudentReportsMap((prev) => {
      const next = { ...prev };
      let publishedCount = 0;
      Object.keys(next).forEach((key) => {
        const id = Number(key);
        if (next[id]) {
          next[id] = {
            ...next[id],
            isPublished: true,
            publishedDate: todayStr,
          };
          publishedCount++;
        }
      });

      savePublishedStore(selectedDivisionId, selectedExamKey, next);
      toast.success(`📲 Published all ${publishedCount} progress reports to Student & Parent Portals!`);
      return next;
    });
  };

  const selectedReport = previewStudentId ? studentReportsMap[previewStudentId] : null;

  const publishedCount = useMemo(() => {
    return Object.values(studentReportsMap).filter((r) => r.isPublished).length;
  }, [studentReportsMap]);

  // Class-Wide Performance & Progress Analytics
  const classStats = useMemo(() => {
    const reports = Object.values(studentReportsMap);
    const evaluatedReports = reports.filter(
      (r) => r.overallPercentage !== null && r.overallPercentage !== undefined
    );

    if (evaluatedReports.length === 0) {
      return {
        averagePct: null,
        topScore: null,
        topperName: null,
        passPct: null,
        passedCount: 0,
        evaluatedCount: 0,
      };
    }

    const totalSum = evaluatedReports.reduce((acc, r) => acc + (r.overallPercentage || 0), 0);
    const avg = Math.round((totalSum / evaluatedReports.length) * 10) / 10;

    let maxScore = -1;
    let topper: string | null = null;
    let passed = 0;

    evaluatedReports.forEach((r) => {
      const score = r.overallPercentage || 0;
      if (score > maxScore) {
        maxScore = score;
        topper = r.studentName;
      }
      if (r.resultStatus !== "NEEDS_IMPROVEMENT" && score >= 40) {
        passed++;
      }
    });

    const passRate = Math.round((passed / evaluatedReports.length) * 100);

    return {
      averagePct: avg,
      topScore: maxScore >= 0 ? maxScore : null,
      topperName: topper,
      passPct: passRate,
      passedCount: passed,
      evaluatedCount: evaluatedReports.length,
    };
  }, [studentReportsMap]);

  const filteredStudents = useMemo(() => {
    let list = students;

    if (statusFilter === "EVALUATED") {
      list = list.filter((s) => studentReportsMap[s.id]?.status === "Evaluated & Ready");
    } else if (statusFilter === "PENDING") {
      list = list.filter((s) => studentReportsMap[s.id]?.status === "Pending Marks");
    } else if (statusFilter === "PUBLISHED") {
      list = list.filter((s) => studentReportsMap[s.id]?.isPublished);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        (s.student_name || "").toLowerCase().includes(q) ||
        (s.gr_no || "").toLowerCase().includes(q) ||
        (s.roll_no || "").toLowerCase().includes(q)
    );
  }, [students, studentReportsMap, statusFilter, searchQuery]);

  const currentExamDisplayTitle = useMemo(() => {
    const opt = availableExamOptions.find((o) => o.key === selectedExamKey);
    return opt?.displayLabel || selectedExamKey || "Official School Examination";
  }, [availableExamOptions, selectedExamKey]);

  const currentDiv = divisionList.find((d) => d.id === selectedDivisionId);

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-24 lg:pb-12 px-3 sm:px-6 py-3 sm:py-5 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden font-sans">
      {/* Print Media Stylesheet to print ONLY the report card */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-card,
          #printable-report-card * {
            visibility: visible !important;
          }
          #printable-report-card {
            position: absolute !important;
            left: 50% !important;
            top: 20px !important;
            transform: translateX(-50%) !important;
            width: 100% !important;
            max-width: 680px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Top Banner (Dashboard Matching Style) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-4 sm:p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-white mb-2 border border-white/20">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Class Teacher Portal</span>
              <span className="opacity-60">•</span>
              <span>{currentDiv ? currentDiv.name : "My Assigned Class"}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Class Progress & Report Cards</span>
              <Sparkles className="h-5 w-5 text-amber-300" />
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mt-1 leading-relaxed">
              Review comprehensive term results across all subjects for your assigned class, evaluate qualitative behavioral progress, and publish official report cards to parents.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              onClick={handlePublishAll}
              disabled={students.length === 0}
              className="h-9 sm:h-10 text-xs font-bold rounded-xl gap-2 bg-white text-[#2563EB] hover:bg-blue-50 shadow-md cursor-pointer border-none"
            >
              <Send className="h-3.5 w-3.5" /> Publish All Reports ({publishedCount}/{students.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Selectors Card (Restricted Strictly to Teacher's Assigned Class + School Exam Term) */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardContent className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-center">
          {/* Class & Division Selector (Teacher's Own Assigned Class) */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#2563EB]" />
                My Assigned Class
              </span>
              <Badge variant="outline" className="text-[9px] font-bold text-[#2563EB] border-blue-200 bg-blue-50">
                Class Teacher
              </Badge>
            </label>
            <ResponsiveSelect
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(Number(e.target.value))}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer text-slate-900 dark:text-zinc-100"
            >
              {divisionList.map((d, idx) => (
                <option key={`div-${d.id}-${idx}`} value={d.id}>
                  {d.name} {d.isMyClass ? "★ (My Class)" : ""}
                </option>
              ))}
            </ResponsiveSelect>
          </div>

          {/* Official School Examination Term Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
                School Exam / Term
              </span>
              <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 border-emerald-200 bg-emerald-50">
                Official Term
              </Badge>
            </label>
            <ResponsiveSelect
              value={selectedExamKey}
              onChange={(e) => setSelectedExamKey(e.target.value)}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer text-slate-900 dark:text-zinc-100"
            >
              {availableExamOptions.map((opt, idx) => (
                <option key={`opt-${opt.key}-${idx}`} value={opt.key}>
                  {opt.displayLabel}
                </option>
              ))}
            </ResponsiveSelect>
          </div>

          {/* Quick Context Pill */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700">
            <div className="min-w-0">
              <span className="text-slate-500 dark:text-zinc-400 font-semibold block text-[10px] uppercase">Curriculum Subjects</span>
              <span className="font-extrabold text-slate-900 dark:text-zinc-100 truncate block text-xs">
                {divisionSubjects.length} Official Subjects
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-zinc-700 shrink-0" />
            <div className="shrink-0 text-right">
              <span className="text-slate-500 dark:text-zinc-400 font-semibold block text-[10px] uppercase">Class Size</span>
              <span className="font-extrabold text-[#2563EB]">
                {students.length} Students
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Progress & Performance Analytics Overview (Dashboard KPI Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Class Average */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Class Average
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB]">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100">
              {classStats.averagePct !== null ? `${classStats.averagePct}%` : "—"}
            </span>
            {classStats.averagePct !== null && (
              <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                Grade {computeGrade(classStats.averagePct)}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1 truncate">
            {classStats.evaluatedCount} of {students.length} students evaluated
          </p>
        </div>

        {/* 2. Class Topper / Highest Score */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Highest Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100">
              {classStats.topScore !== null ? `${classStats.topScore}%` : "—"}
            </span>
            {classStats.topperName && (
              <Badge
                variant="outline"
                className="text-[9px] font-bold text-amber-700 bg-amber-50 border-amber-200 truncate max-w-[90px] sm:max-w-[120px]"
              >
                {classStats.topperName}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1 truncate">
            {classStats.topperName ? `Topper: ${classStats.topperName}` : "Awaiting exam marks"}
          </p>
        </div>

        {/* 3. Pass Percentage */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Pass Percentage
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100">
              {classStats.passPct !== null ? `${classStats.passPct}%` : "—"}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
              ({classStats.passedCount}/{classStats.evaluatedCount || 0})
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1">
            Passing threshold (≥ 40% aggregate)
          </p>
        </div>

        {/* 4. Portal Published */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Portal Published
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100">
              {publishedCount}
            </span>
            <span className="text-xs font-bold text-slate-400">/ {students.length} Reports</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1">
            Live on student & parent portals
          </p>
        </div>
      </div>

      {/* Roster Section */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        {/* Roster Controls Bar */}
        <div className="p-3.5 sm:p-4 border-b dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="h-4 w-4 text-[#2563EB]" />
              Class Progress Reports Roster
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Live marks synchronized from official school examinations. View individual report cards and publish to student & parent portals.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {/* Quick Status Filter Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-400">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  statusFilter === "ALL" ? "bg-white dark:bg-zinc-900 text-[#2563EB] shadow-xs" : ""
                )}
              >
                All ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("EVALUATED")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  statusFilter === "EVALUATED" ? "bg-white dark:bg-zinc-900 text-[#2563EB] shadow-xs" : ""
                )}
              >
                Evaluated
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  statusFilter === "PENDING" ? "bg-white dark:bg-zinc-900 text-amber-700 shadow-xs" : ""
                )}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PUBLISHED")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  statusFilter === "PUBLISHED" ? "bg-white dark:bg-zinc-900 text-emerald-700 shadow-xs" : ""
                )}
              >
                Published
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or GR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 h-8 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:border-[#2563EB] text-slate-900 dark:text-zinc-100"
              />
            </div>

            {/* Mobile View Toggle */}
            <div className="sm:hidden flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700 shrink-0">
              <button
                type="button"
                onClick={() => setMobileViewMode("cards")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  mobileViewMode === "cards" ? "bg-white dark:bg-zinc-900 text-[#2563EB] shadow-xs" : "text-slate-500"
                )}
                aria-label="Cards view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode("table")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  mobileViewMode === "table" ? "bg-white dark:bg-zinc-900 text-[#2563EB] shadow-xs" : "text-slate-500"
                )}
                aria-label="Table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
              <span>Loading student roster and academic records for {currentExamDisplayTitle}...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">
              <img src="/images/empty-folder.png" alt="No students found" className="mx-auto mb-2 h-20 w-20 object-contain" />
              {students.length === 0 ? "No students found for this class." : "No students match your search filter."}
            </div>
          ) : (
            <>
              {/* ── MOBILE CARDS VIEW ── */}
              {mobileViewMode === "cards" && (
                <div className="sm:hidden p-3 space-y-2.5">
                  {filteredStudents.map((st) => {
                    const r = studentReportsMap[st.id];
                    const isEvaluated = r?.status === "Evaluated & Ready";
                    const isPublished = r?.isPublished;
                    const avatarColor = getAvatarColor(st.student_name);

                    return (
                      <div
                        key={`mob-${st.id}`}
                        className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-2.5"
                      >
                        {/* Student Header */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                              style={{ background: avatarColor }}
                            >
                              {getInitials(st.student_name)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs truncate">
                                {st.student_name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                {st.roll_no ? (
                                  <span className="font-semibold text-slate-600 dark:text-zinc-400">Roll #{st.roll_no}</span>
                                ) : (
                                  <span>No Roll</span>
                                )}
                                <span>• GR: {st.gr_no || `GR-${st.id}`}</span>
                              </div>
                            </div>
                          </div>

                          {/* Visibility Badge */}
                          <div className="shrink-0 text-right">
                            <Badge
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                isPublished
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              )}
                            >
                              {isPublished ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Published
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Hidden (Draft)
                                </span>
                              )}
                            </Badge>
                          </div>
                        </div>

                        {/* Status & Academics Quick Info */}
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
                          <Badge
                            className={cn(
                              "font-bold text-[10px] px-2 py-0.5 gap-1",
                              isEvaluated
                                ? "bg-blue-50 text-[#2563EB] border border-blue-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            )}
                          >
                            {isEvaluated ? (
                              <>
                                <CheckCircle2 className="h-2.5 w-2.5" /> Evaluated & Ready
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-2.5 w-2.5" /> Awaiting Exam Marks
                              </>
                            )}
                          </Badge>

                          {r?.overallPercentage !== null && r?.overallPercentage !== undefined ? (
                            <span className="text-[11px] font-black text-[#2563EB]">
                              {r.totalScore}/{r.maxTotalScore} ({r.overallPercentage}%)
                            </span>
                          ) : r && r.academics && r.academics.length > 0 ? (
                            <span className="text-[10px] font-bold text-slate-500">
                              {r.academics.filter((a) => a.score !== null).length}/{r.academics.length} Subjects
                            </span>
                          ) : null}
                        </div>

                        {/* Full Subjects Mini Pill Grid */}
                        {r && r.academics && r.academics.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            {r.academics.map((a, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[10px] font-medium bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
                              >
                                <span className="truncate mr-1 font-semibold">{a.subjectName}</span>
                                <span className="font-mono font-bold shrink-0">
                                  {a.isAbsent ? (
                                    <span className="text-rose-600">ABS</span>
                                  ) : a.score !== null ? (
                                    <b className="text-slate-900 dark:text-zinc-100">{a.score}</b>
                                  ) : (
                                    <span className="text-slate-400">--</span>
                                  )}
                                  <span className="text-slate-400 text-[9px]">/{a.maxMarks}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            onClick={() => setPreviewStudentId(st.id)}
                            className="h-8.5 text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Progress Card</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTogglePublish(st.id)}
                            className={cn(
                              "h-8.5 text-xs font-bold rounded-xl gap-1 border cursor-pointer",
                              isPublished
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            )}
                          >
                            {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                            <span>{isPublished ? "Unpublish" : "Publish"}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── DESKTOP & TABLE VIEW ── */}
              <div className={cn("overflow-x-auto w-full", mobileViewMode === "cards" ? "hidden sm:block" : "block")}>
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-4 py-3.5">Student Name</th>
                      <th className="px-4 py-3.5">GR Number</th>
                      <th className="px-4 py-3.5 text-center">Exam Term</th>
                      <th className="px-4 py-3.5 text-center">Subjects Evaluated</th>
                      <th className="px-4 py-3.5 text-center">Grand Aggregate</th>
                      <th className="px-4 py-3.5 text-center">Marks Status</th>
                      <th className="px-4 py-3.5 text-center">Portal Visibility</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                    {filteredStudents.map((st, index) => {
                      const r = studentReportsMap[st.id];
                      const isEvaluated = r?.status === "Evaluated & Ready";
                      const isPublished = r?.isPublished;
                      const evaluatedCount = r?.academics.filter((a) => a.score !== null).length || 0;
                      const totalSubjects = r?.academics.length || 0;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                          <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-zinc-100">{st.student_name}</div>
                            {st.roll_no && (
                              <div className="text-[10px] text-slate-400 font-mono">Roll #{st.roll_no}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-mono text-[11px]">
                              GR: {st.gr_no || `GR-${st.id}`}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className="font-bold text-[10px] gap-1 px-2 py-0.5 truncate max-w-[150px]">
                              <Calendar className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{currentExamDisplayTitle}</span>
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-center font-mono">
                            <span className="font-bold text-slate-700 dark:text-zinc-300">
                              {evaluatedCount}/{totalSubjects}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">Subjects</span>
                          </td>

                          <td className="px-4 py-3 text-center font-mono">
                            {r?.overallPercentage !== null && r?.overallPercentage !== undefined ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-black text-[#2563EB] text-xs">
                                  {r.totalScore}/{r.maxTotalScore}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                  {r.overallPercentage}% ({r.overallGrade})
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">--</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <Badge
                              className={`font-bold text-[10px] gap-1 px-2.5 py-0.5 ${
                                isEvaluated
                                  ? "bg-blue-100 text-[#2563EB] dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {isEvaluated ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" /> Evaluated & Ready
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3 w-3" /> Awaiting Marks
                                </>
                              )}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <Badge
                              className={`font-bold text-[10px] gap-1 px-2.5 py-0.5 ${
                                isPublished
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400"
                              }`}
                            >
                              {isPublished ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" /> Published ({r.publishedDate})
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3 text-slate-400" /> Hidden (Draft)
                                </>
                              )}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => setPreviewStudentId(st.id)}
                                className="h-8 text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Progress Card
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTogglePublish(st.id)}
                                className={`h-8 text-xs font-bold rounded-xl gap-1 border cursor-pointer ${
                                  isPublished
                                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                                {isPublished ? "Unpublish" : "Publish"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Official Institutional Marksheet Modal */}
      {selectedReport && (
        <ClassicReportCardModal
          report={selectedReport}
          schoolBrand={schoolBrand}
          onClose={() => setPreviewStudentId(null)}
          onUpdateBehavior={handleUpdateStudentReport}
          onTogglePublish={handleTogglePublish}
        />
      )}
    </div>
  );
}