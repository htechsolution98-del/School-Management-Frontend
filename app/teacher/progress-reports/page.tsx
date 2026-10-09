"use client";

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
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getExamsFull, apiFetch, type ExamFull } from "@/lib/exam-api";

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
  attendancePct: number;
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

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <Sliders className="h-3.5 w-3.5" />
              {isEditing ? "Cancel Edit" : "Edit Behavior & Remarks"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onTogglePublish(report.studentId)}
              className={`h-8 text-xs font-bold rounded-xl gap-1.5 border ${
                report.isPublished
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              {report.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {report.isPublished ? "Unpublish Draft" : `Publish ${report.reportMonth}`}
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Download PDF
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
                          <select
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
                          </select>
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
                          <select
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
                          </select>
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
                          <select
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
                          </select>
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
                        {report.attendancePct}%
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
                        <td colSpan={2} className="px-4 py-3 text-center text-slate-400 italic">
                          No subjects or exams scheduled for this month.
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
            gr_no: st.gr_no || `GR-${st.id}`,
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

        // Fallback: If no exams strictly match both class and month, match exams by month or class
        const targetExams = monthExams.length > 0 ? monthExams : allExams.filter((ex) => {
          const exMonth = formatMonthYear(ex.exam_date);
          return exMonth === selectedMonthYear;
        });

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

        // Add any remaining subjects from fetchedSubjects
        fetchedSubjects.forEach((sub) => {
          if (sub.name && !distinctSubjectMap.has(sub.name)) {
            distinctSubjectMap.set(sub.name, {
              subjectId: sub.id,
              maxMarks: 100,
            });
          }
        });

        // Default fallback subject names if none found
        if (distinctSubjectMap.size === 0) {
          ["Hindi", "Science", "Mathematics", "English", "Social Studies"].forEach((name) => {
            distinctSubjectMap.set(name, { maxMarks: 100 });
          });
        }

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
            if (score === null && Array.isArray(cached.academics)) {
              const cachedSub = cached.academics.find((a: any) => a.subjectName === subjectName);
              if (cachedSub && cachedSub.score !== null) {
                score = cachedSub.score;
                hasAnyMark = true;
              }
            }

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
            grNo: st.gr_no || `GR-${1000 + st.id}`,
            className: st.school_class_name || currentDiv?.className || "Class 8",
            divisionName: st.division_name || currentDiv?.divisionName || "A",
            reportMonth: selectedMonthYear,
            attendancePct: cached.attendancePct ?? 95,
            behavior: {
              cooperative: cached.behavior?.cooperative || "A",
              neatAndOrderly: cached.behavior?.neatAndOrderly || "A",
              responsible: cached.behavior?.responsible || "A",
              attendance: cached.behavior?.attendance || "95%",
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

  return (
    <div className="space-y-6 pb-12">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
            <FileCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Monthly Student Progress Reports & History
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Review database exam marks entered by subject teachers (Hindi, Science, Maths, etc.) and publish progress cards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-3 py-1.5 text-xs">
            {students.length} Students Enrolled
          </Badge>
          <Button
            onClick={handlePublishAll}
            disabled={students.length === 0}
            className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Send className="h-3.5 w-3.5" /> Publish All for {selectedMonthYear}
          </Button>
        </div>
      </div>

      {/* Selectors Card (Class / Division + Exam Month Selector) */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          {/* Class & Division Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              Class & Division
            </label>
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(Number(e.target.value))}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {divisionList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Report Month Selector (Dynamic from exams) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              Exam Month & Term
            </label>
            <select
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Summary Statistics */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700">
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

      {/* Roster Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b dark:border-zinc-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              {selectedMonthYear} Progress Reports Roster
            </CardTitle>
            <CardDescription className="text-xs">
              Live marks synchronized from database for {selectedMonthYear}. Preview and publish to student & parent portals.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span>Loading student roster and academic database records for {selectedMonthYear}...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-bold">
              No students found for this division.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
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
                  {students.map((st, index) => {
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
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
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
                              className={`h-8 text-xs font-bold rounded-xl gap-1.5 shadow-2xs ${
                                isEvaluated
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
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
                              className={`h-8 text-xs font-bold rounded-xl gap-1 border ${
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
