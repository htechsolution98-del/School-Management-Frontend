"use client";


import ResponsiveSelect from "@/components/ui/responsive-select";
import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Edit3,
  Send,
  Lock,
  Calendar,
  History,
  Loader2,
  RefreshCw,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getExamsFull, apiFetch, type ExamFull } from "@/lib/exam-api";
import { cn } from "@/lib/utils";

// ─── Visual Helpers ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
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
}

interface StudentItem {
  id: number;
  student_name: string;
  gr_no: string;
  roll_no?: string;
  division_name?: string;
  school_class_name?: string;
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
  score: number | null; // null when teacher hasn't entered marks yet
  maxMarks?: number;
  grade: string;
  isAbsent?: boolean;
}

interface StudentReportData {
  studentId: number;
  studentName: string;
  grNo: string;
  className: string;
  divisionName: string;
  reportMonth: string; // e.g. "April 2026", "March 2026"
  attendancePct: number | null;
  behavior: BehaviorEvaluations;
  academics: AcademicMark[];
  teacherRemarks: string;
  status: "Pending Marks" | "Evaluated & Ready";
  isPublished: boolean;
  publishedDate?: string;
}

// Fallback standard months list
const DEFAULT_MONTHS = [
  "April 2026",
  "May 2026",
  "June 2026",
  "July 2026",
  "August 2026",
  "September 2026",
  "October 2026",
  "November 2026",
  "December 2026",
  "January 2026",
  "February 2026",
  "March 2026",
];

// Helper to convert numeric score or percentage to letter grade
function computeGrade(score: number | null): string {
  if (score === null || score === undefined || isNaN(score)) return "--";
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// Helper to format date string to "Month YYYY"
function formatMonthYear(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

// ─── Printable Classic Report Card Modal Component ─────────────────────────────

function ClassicReportCardModal({
  report,
  onClose,
  onUpdateBehavior,
  onTogglePublish,
}: {
  report: StudentReportData;
  onClose: () => void;
  onUpdateBehavior: (updated: StudentReportData) => void;
  onTogglePublish: (studentId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [cooperative, setCooperative] = useState(report.behavior.cooperative || "--");
  const [neatAndOrderly, setNeatAndOrderly] = useState(report.behavior.neatAndOrderly || "--");
  const [responsible, setResponsible] = useState(report.behavior.responsible || "--");
  const [remarks, setRemarks] = useState(report.teacherRemarks || "");
  const [academics, setAcademics] = useState<AcademicMark[]>(report.academics || []);

  const printRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    const isAnyFilled = academics.some((a) => a.score !== null && !isNaN(a.score));
    const updated: StudentReportData = {
      ...report,
      behavior: {
        ...report.behavior,
        cooperative,
        neatAndOrderly,
        responsible,
      },
      academics,
      teacherRemarks: remarks,
      status: isAnyFilled ? "Evaluated & Ready" : "Pending Marks",
    };
    onUpdateBehavior(updated);
    setIsEditing(false);
    toast.success(`Progress card for ${report.reportMonth} updated successfully!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMarkChange = (index: number, newScoreStr: string) => {
    const next = [...academics];
    if (newScoreStr.trim() === "") {
      next[index] = {
        ...next[index],
        score: null,
        grade: "--",
      };
    } else {
      const maxVal = next[index].maxMarks || 100;
      const val = Math.min(maxVal, Math.max(0, Number(newScoreStr) || 0));
      const pct = maxVal > 0 ? (val / maxVal) * 100 : val;
      next[index] = {
        ...next[index],
        score: val,
        grade: computeGrade(pct),
      };
    }
    setAcademics(next);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto rounded-3xl p-4 sm:p-6 bg-white border border-slate-200 shadow-2xl text-slate-900">
        {/* Modal Top Header Bar */}
        <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="pr-6">
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600 shrink-0" />
              {report.reportMonth} Report Card: {report.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{report.className} - Div {report.divisionName} (GR No: {report.grNo})</span>
              <span className="text-slate-400">•</span>
              <Badge
                className={`text-[10px] font-bold ${
                  report.isPublished
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {report.isPublished ? `Published (${report.publishedDate})` : "Draft (Hidden from Portals)"}
              </Badge>
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{isEditing ? "Cancel" : "Edit Details"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onTogglePublish(report.studentId)}
              className={`h-8 text-xs font-bold rounded-xl gap-1.5 border cursor-pointer ${
                report.isPublished
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              {report.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              <span>{report.isPublished ? "Unpublish" : "Publish"}</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Classic Card Frame */}
        <div className="pt-4">
          <div
            ref={printRef}
            id="printable-report-card"
            className="mx-auto w-full max-w-[620px] bg-[#344e68] p-4 sm:p-6 rounded-[24px] shadow-2xl transition-all"
            style={{
              backgroundImage:
                "radial-gradient(#486581 1px, transparent 1px), radial-gradient(#486581 1px, #344e68 1px)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 10px 10px",
            }}
          >
            {/* Inner White Sheet */}
            <div className="bg-white rounded-xl p-5 sm:p-8 border-4 border-[#243b53] shadow-inner text-slate-800 font-sans">
              {/* Header Title */}
              <div className="text-center mb-5">
                <h1
                  className="text-2xl sm:text-4xl font-extrabold tracking-[0.16em] text-[#243b53] uppercase border-b-2 border-[#243b53] pb-2 inline-block px-4"
                  style={{ fontFamily: "'Georgia', 'Playfair Display', serif" }}
                >
                  REPORT CARD
                </h1>
                <div className="text-[11px] font-bold text-[#486581] uppercase tracking-widest mt-1">
                  Term / Month: {report.reportMonth}
                </div>
              </div>

              {/* Student Meta Details */}
              <div className="space-y-2.5 mb-5 text-xs sm:text-sm font-semibold text-[#243b53]">
                <div className="flex items-baseline gap-2 border-b-2 border-[#486581] pb-1">
                  <span className="w-16 font-bold uppercase tracking-wider text-xs text-[#486581]">Name:</span>
                  <span className="flex-1 font-extrabold text-sm sm:text-base tracking-wide text-[#102a43]">
                    {report.studentName}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 border-b-2 border-[#486581] pb-1">
                  <span className="w-16 font-bold uppercase tracking-wider text-xs text-[#486581]">Level:</span>
                  <span className="flex-1 font-bold text-xs sm:text-sm text-[#102a43]">
                    {report.className} - Div {report.divisionName} (GR No: {report.grNo})
                  </span>
                </div>
              </div>

              {/* Grading System Table Legend */}
              <div className="mb-5 bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-semibold text-slate-700">
                <div className="font-extrabold text-[11px] uppercase tracking-wider text-[#243b53] mb-1.5">
                  GRADING SYSTEM:
                </div>
                <div className="grid grid-cols-3 gap-y-1 font-mono text-[11px] text-slate-600">
                  <div>
                    <span className="font-bold text-emerald-700">A+</span> 90-100
                  </div>
                  <div>
                    <span className="font-bold text-blue-700">A</span> 80-89
                  </div>
                  <div>
                    <span className="font-bold text-sky-700">B</span> 70-79
                  </div>
                  <div>
                    <span className="font-bold text-amber-700">C</span> 60-69
                  </div>
                  <div>
                    <span className="font-bold text-orange-700">D</span> 40-59
                  </div>
                  <div>
                    <span className="font-bold text-rose-700">F</span> Below 40
                  </div>
                </div>
              </div>

              {/* Table 1: BEHAVIOR */}
              <div className="mb-5 rounded-lg overflow-hidden border-2 border-[#334e68]">
                <div className="bg-[#334e68] text-white px-4 py-2 text-xs font-extrabold tracking-widest uppercase">
                  BEHAVIOR & ATTENDANCE
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <tbody className="divide-y divide-slate-300 font-medium">
                    <tr className="bg-slate-50">
                      <td className="px-4 py-2 font-semibold text-slate-700 border-r border-slate-300 w-2/3">
                        Cooperative
                      </td>
                      <td className="px-4 py-2 font-bold font-mono text-center text-[#102a43]">
                        {isEditing ? (
                          <ResponsiveSelect
                            value={cooperative}
                            onChange={(e) => setCooperative(e.target.value)}
                            className="bg-white border rounded px-2 py-0.5 text-xs outline-none"
                          >
                            <option value="--">-- (Unassigned)</option>
                            <option value="A+">A+ (Outstanding)</option>
                            <option value="A">A (Excellent)</option>
                            <option value="B">B (Good)</option>
                            <option value="C">C (Satisfactory)</option>
                            <option value="D">D (Needs Improvement)</option>
                          </ResponsiveSelect>
                        ) : (
                          cooperative
                        )}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-2 font-semibold text-slate-700 border-r border-slate-300">
                        Neat and orderly
                      </td>
                      <td className="px-4 py-2 font-bold font-mono text-center text-[#102a43]">
                        {isEditing ? (
                          <ResponsiveSelect
                            value={neatAndOrderly}
                            onChange={(e) => setNeatAndOrderly(e.target.value)}
                            className="bg-white border rounded px-2 py-0.5 text-xs outline-none"
                          >
                            <option value="--">-- (Unassigned)</option>
                            <option value="A+">A+ (Outstanding)</option>
                            <option value="A">A (Excellent)</option>
                            <option value="B">B (Good)</option>
                            <option value="C">C (Satisfactory)</option>
                            <option value="D">D (Needs Improvement)</option>
                          </ResponsiveSelect>
                        ) : (
                          neatAndOrderly
                        )}
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="px-4 py-2 font-semibold text-slate-700 border-r border-slate-300">
                        Responsible
                      </td>
                      <td className="px-4 py-2 font-bold font-mono text-center text-[#102a43]">
                        {isEditing ? (
                          <ResponsiveSelect
                            value={responsible}
                            onChange={(e) => setResponsible(e.target.value)}
                            className="bg-white border rounded px-2 py-0.5 text-xs outline-none"
                          >
                            <option value="--">-- (Unassigned)</option>
                            <option value="A+">A+ (Outstanding)</option>
                            <option value="A">A (Excellent)</option>
                            <option value="B">B (Good)</option>
                            <option value="C">C (Satisfactory)</option>
                            <option value="D">D (Needs Improvement)</option>
                          </ResponsiveSelect>
                        ) : (
                          responsible
                        )}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-2 font-semibold text-slate-700 border-r border-slate-300">
                        Attendance Rate
                      </td>
                      <td className="px-4 py-2 font-bold font-mono text-center text-emerald-700">
                        {report.attendancePct === null ? "—" : `${report.attendancePct}%`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table 2: ACADEMICS (Real Database Subject Marks) */}
              <div className="rounded-lg overflow-hidden border-2 border-[#334e68]">
                <div className="bg-[#334e68] text-white px-4 py-2 text-xs font-extrabold tracking-widest uppercase flex justify-between items-center">
                  <span>ACADEMICS (SUBJECT MARKS)</span>
                  <span className="text-[10px] font-normal lowercase tracking-normal opacity-90">Entered by Subject Teachers</span>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <tbody className="divide-y divide-slate-300 font-medium">
                    {academics.map((sub, idx) => (
                      <tr
                        key={sub.subjectName}
                        className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}
                      >
                        <td className="px-4 py-2 font-semibold text-slate-700 border-r border-slate-300 w-2/3">
                          {sub.subjectName}
                        </td>
                        <td className="px-4 py-2 font-bold font-mono text-center text-[#102a43]">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={sub.maxMarks || 100}
                                placeholder="Marks"
                                value={sub.score === null ? "" : sub.score}
                                onChange={(e) => handleMarkChange(idx, e.target.value)}
                                className="w-16 border rounded px-2 py-0.5 text-center font-mono text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-slate-500 font-bold text-xs">
                                / {sub.maxMarks || 100} ({sub.grade})
                              </span>
                            </div>
                          ) : sub.score === null ? (
                            <span className="text-slate-400 italic font-normal">-- / {sub.maxMarks || 100}</span>
                          ) : (
                            <span className="text-indigo-900 font-extrabold">
                              {sub.score} / {sub.maxMarks || 100} <Badge variant="secondary" className="ml-1 text-[10px] font-bold">{sub.grade}</Badge>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {academics.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-5 text-center text-slate-400">
                          <img src="/images/empty-folder.png" alt="No subjects or exams" className="mx-auto mb-2 h-16 w-16 object-contain" />
                          <span>No subjects or exams scheduled for this month.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Teacher Remarks & Signatures */}
              <div className="mt-5 pt-3 border-t border-slate-300 space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#243b53]">
                    Class Teacher Remarks:
                  </span>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      placeholder="Enter teacher remarks for student progress..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full mt-1 border rounded p-2 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="mt-1 text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      "{remarks || "Satisfactory academic and behavioral progress observed this term."}"
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-end pt-5 text-xs font-bold text-[#243b53]">
                  <div className="text-center">
                    <div className="w-32 sm:w-36 border-b border-slate-400 mb-1" />
                    <span>Class Teacher Signature</span>
                  </div>
                  <div className="text-center">
                    <div className="w-32 sm:w-36 border-b border-slate-400 mb-1" />
                    <span>Principal Signature</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-2">
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-6 h-9"
            >
              Save Report Card Details
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressReportsPage() {
  const [divisionList, setDivisionList] = useState<DivisionOption[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number>(0);
  const [availableMonths, setAvailableMonths] = useState<string[]>(DEFAULT_MONTHS);
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>("April 2026");

  const [allExams, setAllExams] = useState<ExamFull[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [studentReportsMap, setStudentReportsMap] = useState<Record<number, StudentReportData>>({});
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileViewMode, setMobileViewMode] = useState<"cards" | "table">("cards");

  // Load persistent published reports from localStorage for division + month
  const loadPublishedStore = (divId: number, monthYear: string): Record<number, Partial<StudentReportData>> => {
    try {
      const sanitizedMonth = monthYear.replace(/\s+/g, "_");
      const stored = localStorage.getItem(`published_progress_reports_${divId}_${sanitizedMonth}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {};
  };

  const savePublishedStore = (divId: number, monthYear: string, map: Record<number, StudentReportData>) => {
    try {
      const sanitizedMonth = monthYear.replace(/\s+/g, "_");
      localStorage.setItem(`published_progress_reports_${divId}_${sanitizedMonth}`, JSON.stringify(map));
    } catch {}
  };

  // 1. Fetch available assigned divisions and all exams to dynamically build months
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [divRes, examsData] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/divisionlist/`).catch(() => null),
          getExamsFull().catch(() => []),
        ]);

        let mappedDivs: DivisionOption[] = [];
        if (divRes && divRes.ok) {
          const data = await divRes.json();
          const list = Array.isArray(data) ? data : (data.data ?? data.results ?? []);
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
            };
          });
          if (mappedDivs.length > 0) {
            setDivisionList(mappedDivs);
            setSelectedDivisionId(mappedDivs[0].id);
          }
        }

        const validExams = Array.isArray(examsData) ? examsData : [];
        setAllExams(validExams);

        // Dynamically extract unique month-year from exams
        const examMonthsSet = new Set<string>();
        validExams.forEach((ex) => {
          const m = formatMonthYear(ex.exam_date);
          if (m) examMonthsSet.add(m);
        });

        const extractedMonths = Array.from(examMonthsSet);
        // Combine extracted exam months first, then fallback months
        const combined = Array.from(new Set([...extractedMonths, ...DEFAULT_MONTHS]));
        setAvailableMonths(combined);

        if (extractedMonths.length > 0) {
          setSelectedMonthYear(extractedMonths[0]);
        }
      } catch (e) {
        console.error("Failed to load initial data:", e);
      }
    }
    loadInitialData();
  }, []);

  // 2. Fetch students, subjects, and REAL database marks whenever division or month changes
  useEffect(() => {
    if (!selectedDivisionId) return;

    const currentDiv = divisionList.find((d) => d.id === selectedDivisionId);

    async function loadClassData() {
      setLoading(true);
      try {
        // A. Fetch students for this division
        const stRes = await fetchWithAuth(
          `${API_BASE_URL}/get/attendance/students/?division_id=${selectedDivisionId}`
        );
        let fetchedStudents: StudentItem[] = [];
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
            school_class_name: st.school_class_name || currentDiv?.className || "Class 8",
            division_name: st.division_name || currentDiv?.divisionName || "A",
            roll_no: st.roll_no || "",
          }));
        }

        // B. Fetch subjects
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

        setStudents(fetchedStudents);

        // C. Match exams scheduled in this month for this class/division
        const normalizedClassName = (currentDiv?.className || "").toLowerCase().trim();
        const normalizedDivName = (currentDiv?.divisionName || "").toLowerCase().trim();

        const monthExams = allExams.filter((ex) => {
          const exMonth = formatMonthYear(ex.exam_date);
          const isMonthMatch = exMonth === selectedMonthYear;
          
          const exClass = (ex.class_name || "").toLowerCase().trim();
          const isClassMatch =
            !normalizedClassName ||
            exClass === normalizedClassName ||
            exClass.includes(normalizedClassName) ||
            normalizedClassName.includes(exClass);

          const exDiv = (ex.division || "").toLowerCase().trim();
          const isDivMatch = !exDiv || !normalizedDivName || exDiv === normalizedDivName;

          return isMonthMatch && isClassMatch && isDivMatch;
        });

        const targetExams = monthExams;

        // D. Fetch real database marks for each matching exam
        const examMarksByExamId: Record<number, any[]> = {};
        await Promise.all(
          targetExams.map(async (ex) => {
            try {
              const res = await apiFetch(`/api/subject-marks/?exam=${ex.id}`);
              const marksList = Array.isArray(res) ? res : res?.results || [];
              examMarksByExamId[ex.id] = marksList;
            } catch (err) {
              examMarksByExamId[ex.id] = [];
            }
          })
        );

        // E. Build distinct list of subjects from matching exams or fetchedSubjects
        const distinctSubjectMap = new Map<string, { subjectId?: number; examId?: number; maxMarks: number }>();
        targetExams.forEach((ex) => {
          const sName = ex.subject_name || `Subject ${ex.subject || ""}`;
          if (sName && !distinctSubjectMap.has(sName)) {
            distinctSubjectMap.set(sName, {
              subjectId: ex.subject,
              examId: ex.id,
              maxMarks: ex.max_marks || 100,
            });
          }
        });

        const existingStore = loadPublishedStore(selectedDivisionId, selectedMonthYear);

        // F. Assemble the consolidated report map for all students
        const newMap: Record<number, StudentReportData> = {};

        fetchedStudents.forEach((st) => {
          const cached = existingStore[st.id] || {};

          // Build academics marks array with real database marks
          const studentAcademics: AcademicMark[] = [];
          let hasAnyMark = false;

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

            // If not found in exam marks, check cached
            const maxM = meta.maxMarks || 100;
            const pct = score !== null && maxM > 0 ? (score / maxM) * 100 : score;
            const grade = isAbsent ? "ABS" : computeGrade(pct);

            studentAcademics.push({
              subjectName,
              subjectId: meta.subjectId,
              examId: meta.examId,
              score,
              maxMarks: maxM,
              grade,
              isAbsent,
            });
          });

          newMap[st.id] = {
            studentId: st.id,
            studentName: st.student_name,
            grNo: st.gr_no || "",
            className: st.school_class_name || currentDiv?.className || "Class 8",
            divisionName: st.division_name || currentDiv?.divisionName || "A",
            reportMonth: selectedMonthYear,
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
  }, [selectedDivisionId, selectedMonthYear, allExams]);

  const handleUpdateStudentReport = (updated: StudentReportData) => {
    setStudentReportsMap((prev) => {
      const next = { ...prev, [updated.studentId]: updated };
      savePublishedStore(selectedDivisionId, selectedMonthYear, next);
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
      savePublishedStore(selectedDivisionId, selectedMonthYear, next);

      if (newPublished) {
        toast.success(`📲 Published ${report.studentName}'s report card for ${selectedMonthYear} to Student & Parent Portals!`);
      } else {
        toast.info(`🔒 Unpublished ${report.studentName}'s report card for ${selectedMonthYear}. Hidden from portals.`);
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

      savePublishedStore(selectedDivisionId, selectedMonthYear, next);
      toast.success(`📲 Published all ${publishedCount} progress reports for ${selectedMonthYear} to Student & Parent Portals!`);
      return next;
    });
  };

  const selectedReport = previewStudentId ? studentReportsMap[previewStudentId] : null;

  const publishedCount = useMemo(() => {
    return Object.values(studentReportsMap).filter((r) => r.isPublished).length;
  }, [studentReportsMap]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) =>
      (s.student_name || "").toLowerCase().includes(q) ||
      (s.gr_no || "").toLowerCase().includes(q) ||
      (s.roll_no || "").toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-3 sm:pb-5 lg:pb-12 px-3 sm:px-6 py-3 sm:py-5 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden font-sans">
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
            max-width: 650px !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FileCheck className="h-5 w-5 sm:h-6 sm:w-6 text-[#2563EB]" />
            Monthly Student Progress Reports
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Review exam marks entered by subject teachers and publish monthly progress cards.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Badge className="bg-blue-50 text-[#2563EB] border border-blue-200 font-bold px-2.5 py-1 text-xs shrink-0">
            {students.length} Students
          </Badge>
          <Button
            onClick={handlePublishAll}
            disabled={students.length === 0}
            className="h-8 sm:h-9 text-xs font-bold rounded-xl gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs cursor-pointer shrink-0"
          >
            <Send className="h-3.5 w-3.5" /> Publish All for {selectedMonthYear}
          </Button>
        </div>
      </div>

      {/* Selectors Card (Class / Division + Exam Month Selector) */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardContent className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
          {/* Class & Division Selector */}
          <div className="space-y-1">
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#2563EB]" />
              Class & Division
            </label>
            <ResponsiveSelect
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(Number(e.target.value))}
              className="w-full h-9 sm:h-10 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {divisionList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </ResponsiveSelect>
          </div>

          {/* Exam Report Month Selector (Dynamic from exams) */}
          <div className="space-y-1">
            <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
              Exam Month & Term
            </label>
            <ResponsiveSelect
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="w-full h-9 sm:h-10 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </ResponsiveSelect>
          </div>

          {/* Monthly Summary Statistics */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs bg-slate-50 dark:bg-zinc-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Active Term</span>
              <span className="font-extrabold text-slate-900 dark:text-zinc-100">{selectedMonthYear}</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-zinc-700" />
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Published</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {publishedCount} of {students.length} Reports
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster Section */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="h-4 w-4 text-[#2563EB]" />
              {selectedMonthYear} Progress Reports Roster
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Live marks synchronized from database. Preview and publish to student & parent portals.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or GR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 h-8 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:border-[#2563EB]"
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
              <span>Loading student roster and academic records for {selectedMonthYear}...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">
              <img src="/images/empty-folder.png" alt="No students found" className="mx-auto mb-2 h-20 w-20 object-contain" />
              {students.length === 0 ? "No students found for this division." : "No students match your search."}
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
                        className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-2.5"
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
                                <AlertCircle className="h-2.5 w-2.5" /> Pending Marks
                              </>
                            )}
                          </Badge>

                          {r && r.academics && r.academics.length > 0 && (
                            <span className="text-[10px] font-bold text-slate-500">
                              {r.academics.filter((a) => a.score !== null).length}/{r.academics.length} Subjects
                            </span>
                          )}
                        </div>

                        {/* Subjects Mini Pill Row (if marks available) */}
                        {r && r.academics && r.academics.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {r.academics.slice(0, 4).map((a, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
                              >
                                {a.subjectName}: <b className="text-slate-900 dark:text-zinc-100">{a.score !== null ? a.score : "—"}</b>
                              </span>
                            ))}
                            {r.academics.length > 4 && (
                              <span className="text-[10px] text-slate-400 font-bold self-center">
                                +{r.academics.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            onClick={() => setPreviewStudentId(st.id)}
                            className={cn(
                              "h-8.5 text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer",
                              isEvaluated
                                ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            )}
                          >
                            {isEvaluated ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                            <span>{isEvaluated ? "View Card" : "Fill Marks"}</span>
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
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-4 py-3.5">Student Name</th>
                      <th className="px-4 py-3.5">GR Number</th>
                      <th className="px-4 py-3.5 text-center">Report Term</th>
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

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                          <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-zinc-100">{st.student_name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-mono text-[11px]">
                              GR: {st.gr_no || `GR-${st.id}`}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className="font-bold text-[10px] gap-1 px-2 py-0.5">
                              <Calendar className="h-3 w-3 text-indigo-500" /> {selectedMonthYear}
                            </Badge>
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
                                  <AlertCircle className="h-3 w-3" /> Pending Marks Entry
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
                                className={`h-8 text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer ${
                                  isEvaluated
                                    ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                                    : "bg-amber-600 hover:bg-amber-700 text-white"
                                }`}
                              >
                                {isEvaluated ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                                {isEvaluated ? "View Report Card" : "Fill Marks & Evaluate"}
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

      {/* Classic Report Card Modal */}
      {selectedReport && (
        <ClassicReportCardModal
          report={selectedReport}
          onClose={() => setPreviewStudentId(null)}
          onUpdateBehavior={handleUpdateStudentReport}
          onTogglePublish={handleTogglePublish}
        />
      )}
    </div>
  );
}
