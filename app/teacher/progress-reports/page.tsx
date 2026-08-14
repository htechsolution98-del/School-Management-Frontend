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
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DivisionOption {
  id: number;
  name: string;
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
  division: any;
}

interface BehaviorEvaluations {
  cooperative: string;
  neatAndOrderly: string;
  responsible: string;
  attendance: string;
}

interface AcademicMark {
  subjectName: string;
  score: number | null; // null when teacher hasn't entered marks yet
  grade: string;
}

interface StudentReportData {
  studentId: number;
  studentName: string;
  grNo: string;
  className: string;
  divisionName: string;
  reportMonth: string; // e.g. "August 2026", "July 2026"
  attendancePct: number;
  behavior: BehaviorEvaluations;
  academics: AcademicMark[];
  teacherRemarks: string;
  status: "Pending Marks" | "Evaluated & Ready";
  isPublished: boolean; // false until explicitly published by teacher
  publishedDate?: string;
}

const AVAILABLE_MONTHS = [
  "August 2026",
  "July 2026",
  "June 2026",
  "May 2026",
  "April 2026",
  "March 2026",
  "February 2026",
  "January 2026",
];

// Helper to convert numeric score to letter grade
function computeGrade(score: number | null): string {
  if (score === null || score === undefined || isNaN(score)) return "--";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
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
  const [isEditing, setIsEditing] = useState(report.status === "Pending Marks");
  const [cooperative, setCooperative] = useState(report.behavior.cooperative);
  const [neatAndOrderly, setNeatAndOrderly] = useState(report.behavior.neatAndOrderly);
  const [responsible, setResponsible] = useState(report.behavior.responsible);
  const [remarks, setRemarks] = useState(report.teacherRemarks);
  const [academics, setAcademics] = useState<AcademicMark[]>(report.academics);

  const printRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    const isAnyFilled = academics.some((a) => a.score !== null);
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
    toast.success(`Progress card for ${report.reportMonth} saved successfully!`);
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
      const val = Math.min(100, Math.max(0, Number(newScoreStr) || 0));
      next[index] = {
        ...next[index],
        score: val,
        grade: computeGrade(val),
      };
    }
    setAcademics(next);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto rounded-3xl p-4 sm:p-6 bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
        {/* Modal Top Header Bar */}
        <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="pr-6">
            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-400 shrink-0" />
              {report.reportMonth} Report Card: {report.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{report.className} - Div {report.divisionName} (GR No: {report.grNo})</span>
              <span className="text-slate-600">•</span>
              <Badge
                className={`text-[10px] font-bold ${
                  report.isPublished
                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                    : "bg-slate-800 text-slate-400 border-slate-700"
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
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            >
              <Sliders className="h-3.5 w-3.5" />
              {isEditing ? "Cancel Edit" : "Edit Marks & Behavior"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onTogglePublish(report.studentId)}
              className={`h-8 text-xs font-bold rounded-xl gap-1.5 border ${
                report.isPublished
                  ? "bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900"
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
                    <span className="font-bold text-emerald-700">A</span> 90-100
                  </div>
                  <div>
                    <span className="font-bold text-sky-700">C</span> 70-79
                  </div>
                  <div>
                    <span className="font-bold text-rose-700">F</span> 59-0
                  </div>
                  <div>
                    <span className="font-bold text-blue-700">B</span> 80-89
                  </div>
                  <div>
                    <span className="font-bold text-amber-700">D</span> 60-69
                  </div>
                </div>
              </div>

              {/* Table 1: BEHAVIOR */}
              <div className="mb-5 rounded-lg overflow-hidden border-2 border-[#334e68]">
                <div className="bg-[#334e68] text-white px-4 py-2 text-xs font-extrabold tracking-widest uppercase">
                  BEHAVIOR
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

              {/* Table 2: ACADEMICS */}
              <div className="rounded-lg overflow-hidden border-2 border-[#334e68]">
                <div className="bg-[#334e68] text-white px-4 py-2 text-xs font-extrabold tracking-widest uppercase">
                  ACADEMICS
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
                                max={100}
                                placeholder="Marks"
                                value={sub.score === null ? "" : sub.score}
                                onChange={(e) => handleMarkChange(idx, e.target.value)}
                                className="w-16 border rounded px-2 py-0.5 text-center font-mono text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-slate-500 font-bold text-xs">
                                ({sub.grade})
                              </span>
                            </div>
                          ) : sub.score === null ? (
                            <span className="text-slate-400 italic">-- / --</span>
                          ) : (
                            `${sub.score}% (${sub.grade})`
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Teacher Remarks & Signatures */}
              <div className="mt-5 pt-3 border-t border-slate-300 space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#243b53]">
                    Teacher Remarks:
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
                      "{remarks || "No teacher remarks entered yet."}"
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
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800 mt-2">
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-6 h-9"
            >
              Save Marks & Progress Report
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
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>("August 2026");

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [studentReportsMap, setStudentReportsMap] = useState<Record<number, StudentReportData>>({});
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);

  // Load persistent published reports from localStorage for division + month
  const loadPublishedStore = (divId: number, monthYear: string): Record<number, StudentReportData> => {
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

  // 1. Fetch available assigned divisions
  useEffect(() => {
    async function loadDivisions() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/divisionlist/`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.data ?? data.results ?? []);
          const mapped = list.map((item: any) => {
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
            return { id: item.id, name: fullName };
          });
          if (mapped.length > 0) {
            setDivisionList(mapped);
            setSelectedDivisionId(mapped[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load division list:", e);
      }
    }
    loadDivisions();
  }, []);

  // 2. Fetch students & subjects whenever selectedDivisionId or selectedMonthYear changes
  useEffect(() => {
    if (!selectedDivisionId) return;

    async function loadData() {
      setLoading(true);
      try {
        // Fetch students
        const stRes = await fetchWithAuth(
          `${API_BASE_URL}/get/attendance/students/?division_id=${selectedDivisionId}`
        );
        let fetchedStudents: StudentItem[] = [];
        if (stRes.ok) {
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
            school_class_name: st.school_class_name || data.division_name || "Std 1",
            division_name: st.division_name || "A",
          }));
        }

        // Fetch subjects
        const subRes = await fetchWithAuth(`${API_BASE_URL}/setSubject/`);
        let fetchedSubjects: SubjectItem[] = [];
        if (subRes.ok) {
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
        setSubjects(fetchedSubjects);

        const existingStore = loadPublishedStore(selectedDivisionId, selectedMonthYear);

        // Build reports map for each student
        const defaultSubjectsList =
          fetchedSubjects.length > 0
            ? fetchedSubjects.map((s) => s.name)
            : ["Maths", "Science", "English", "Social Studies", "Gujarati", "Computer"];

        const newMap: Record<number, StudentReportData> = {};
        fetchedStudents.forEach((st) => {
          if (existingStore[st.id]) {
            newMap[st.id] = {
              ...existingStore[st.id],
              reportMonth: selectedMonthYear,
            };
            return;
          }

          const academicsMarks: AcademicMark[] = defaultSubjectsList.map((subName) => ({
            subjectName: subName,
            score: null, // Initial score is empty until entered by teacher
            grade: "--",
          }));

          newMap[st.id] = {
            studentId: st.id,
            studentName: st.student_name,
            grNo: st.gr_no || `GR-${1000 + st.id}`,
            className: st.school_class_name || "Std 1",
            divisionName: st.division_name || "A",
            reportMonth: selectedMonthYear,
            attendancePct: 95,
            behavior: {
              cooperative: "--",
              neatAndOrderly: "--",
              responsible: "--",
              attendance: "95%",
            },
            academics: academicsMarks,
            teacherRemarks: "",
            status: "Pending Marks",
            isPublished: false, // Default unpublished draft
          };
        });

        setStudentReportsMap(newMap);
      } catch (err) {
        console.error("Error loading progress reports data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDivisionId, selectedMonthYear]);

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
            Select Report Month to generate, review history, and publish progress cards to Student & Parent Portals.
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

      {/* Selectors Card (Class / Division + Report Month History Selector) */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          {/* Class / Division Selector */}
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

          {/* Report Month History Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              Report Month & Term
            </label>
            <select
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {AVAILABLE_MONTHS.map((m) => (
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
              Fill in marks, preview report cards, and publish/unpublish reports for {selectedMonthYear}.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-bold">
              Loading student roster and academic records for {selectedMonthYear}...
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
