"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Download,
  Users,
  X,
  Star,
  BarChart3,
  CheckCircle,
  Printer,
  GraduationCap,
  TrendingUp,
  Sparkles,
  BookOpen,
  Calendar,
  School,
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getSchoolProfile } from "@/lib/school-profile";
import { getParentChildren, getParentChildResults, ChildProfile } from "@/lib/parent";
import { getExamRankings } from "@/lib/student/results";
import type { RankingEntry } from "@/types/student";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ResultCardPreview } from "@/components/results/result-card-preview";
import { writePrintableResultCards } from "@/lib/result-report-print";
import { downloadResultPreviewPDF } from "@/lib/result-dom-pdf";
import { getSavedResultTemplate, type ResultTemplateId } from "@/lib/result-template";
import { capitalizeWords, capitalizeSentence, formatSubjectName, formatGrade } from "@/lib/utils";

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "B+": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  B: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "C+": { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  C: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  D: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  F: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

function getGradeBadgeStyle(grade?: string | null) {
  const g = formatGrade(grade);
  return GRADE_STYLES[g] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
}

export default function ParentChildMarksheetsPage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [childResults, setChildResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // Official Report Card Modal State
  const [selectedExamTitle, setSelectedExamTitle] = useState<string | null>(null);
  const [showMarksheetModal, setShowMarksheetModal] = useState(false);

  // Leaderboard Modal State
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardTitle, setLeaderboardTitle] = useState("");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);

  // School branding state
  const [resultTemplate, setResultTemplate] = useState<string>("classic");
  const [schoolBrand, setSchoolBrand] = useState({
    name: "School",
    shortName: "",
    logo: "",
    watermark: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    establishmentYear: "",
    boardAffiliation: "",
    schoolCode: "",
    udiseCode: "",
    principalName: "",
    teacherName: "",
    principalSignature: "",
    teacherSignature: "",
    stamp: "",
  });

  // Load initial branding
  useEffect(() => {
    try {
      setResultTemplate(getSavedResultTemplate());
    } catch {}

    Promise.allSettled([
      getSchoolProfile(),
      fetchWithAuth(`${API_BASE_URL}/me/`).then((r) => (r.ok ? r.json() : null)),
    ]).then(([brandingResult, meResult]) => {
      const branding = brandingResult.status === "fulfilled" ? brandingResult.value : null;
      const me = meResult.status === "fulfilled" ? meResult.value : null;
      const school = me?.school || me || {};
      setSchoolBrand((brand) => ({
        ...brand,
        name: branding?.school_full_name || school.name || brand.name,
        shortName: branding?.school_short_name || brand.shortName,
        logo: branding?.print_logo_url || branding?.main_logo_url || school.logo || brand.logo,
        watermark: branding?.certificate_watermark_url || branding?.print_logo_url || "",
        tagline: branding?.tagline || brand.tagline,
        address:
          branding?.full_address ||
          [school.address, school.city, school.state, school.pincode].filter(Boolean).join(", ") ||
          brand.address,
        phone:
          (Array.isArray(branding?.phone_numbers) ? branding.phone_numbers[0] : branding?.phone_numbers) ||
          school.phone ||
          brand.phone,
        email: branding?.official_emails || school.email || brand.email,
        establishmentYear: branding?.establishment_year || brand.establishmentYear,
        boardAffiliation:
          (Array.isArray(branding?.board_affiliation)
            ? branding.board_affiliation.join(", ")
            : branding?.board_affiliation) || brand.boardAffiliation,
        schoolCode: branding?.school_code || school.school_code || school.index_no || brand.schoolCode,
        udiseCode: branding?.udise_code || school.udise_code || brand.udiseCode,
        principalName: school.principal_name || brand.principalName,
        teacherName: school.teacher_name || brand.teacherName,
        principalSignature: branding?.principal_signature_url || school.principal_signature || brand.principalSignature,
        teacherSignature: branding?.class_teacher_signature_url || school.teacher_signature || brand.teacherSignature,
        stamp: branding?.official_seal_url || school.stamp || brand.stamp,
      }));
    });
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const kids = await getParentChildren().catch(() => []);
      setChildren(kids);

      const kid = kids[selectedChildIndex] || kids[0];
      if (kid?.id) {
        const results = await getParentChildResults(kid.id).catch(() => []);
        setChildResults(results);
      } else {
        setChildResults([]);
      }
    } catch {
      setChildResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChildIndex]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeChild = children[selectedChildIndex] || children[0];

  // Group child results by exam title
  const examsGrouped = useMemo(() => {
    const map = new Map<string, any[]>();
    childResults.forEach((r) => {
      const title = r.exam_title || r.exam?.title || "Class Evaluation";
      if (!map.has(title)) map.set(title, []);
      map.get(title)!.push(r);
    });
    return map;
  }, [childResults]);

  // Unique exams list (filtered by search query)
  const examTitles = useMemo(() => {
    const titles = Array.from(examsGrouped.keys());
    if (!searchQuery.trim()) return titles;
    return titles.filter((t) => t.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [examsGrouped, searchQuery]);

  // Overall Statistics across all published exams
  const stats = useMemo(() => {
    if (childResults.length === 0) return { avgPercentage: 0, completed: 0, totalMarks: 0, totalMax: 0 };

    let totalObtained = 0;
    let totalMax = 0;
    const completedExams = new Set<string>();

    childResults.forEach((r) => {
      const title = r.exam_title || r.exam?.title;
      if (title) completedExams.add(title);
      totalMax += parseFloat(r.max_marks || r.exam?.max_marks || "0");
      if (!r.is_absent) {
        totalObtained += parseFloat(r.marks_obtained || "0");
      }
    });

    const avgPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    return { avgPercentage, completed: completedExams.size, totalMarks: totalObtained, totalMax };
  }, [childResults]);

  // Active exam results for the modal
  const activeExamResults = useMemo(() => {
    if (!selectedExamTitle) {
      if (examTitles.length > 0) return examsGrouped.get(examTitles[0]) || [];
      return [];
    }
    return examsGrouped.get(selectedExamTitle) || [];
  }, [examsGrouped, selectedExamTitle, examTitles]);

  const activeExamMetrics = useMemo(() => {
    if (activeExamResults.length === 0) {
      return { totalMax: 0, totalObtained: 0, percentage: "0.00", overallGrade: "—" };
    }
    const totalMax = activeExamResults.reduce(
      (s, r) => s + parseFloat(r.max_marks || r.exam?.max_marks || "0"),
      0
    );
    const totalObtained = activeExamResults.reduce(
      (s, r) => s + (r.is_absent ? 0 : parseFloat(r.marks_obtained || "0")),
      0
    );
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0.00";
    const numP = Number(percentage);
    const overallGrade =
      numP >= 90 ? "A+" : numP >= 75 ? "A" : numP >= 60 ? "B" : numP >= 40 ? "C" : "F";

    return { totalMax, totalObtained, percentage, overallGrade };
  }, [activeExamResults]);

  const marksheetSubjects = useMemo(() => {
    return activeExamResults.map((r: any, idx: number) => {
      const rawSubj = r.subject_name || r.subject || r.exam?.subject?.name || `Subject #${idx + 1}`;
      return {
        subject: formatSubjectName(rawSubj),
        maximum: r.max_marks || r.exam?.max_marks || 100,
        obtained: r.is_absent ? "Absent" : (r.marks_obtained ?? 0),
        grade: formatGrade(r.grade) || (r.is_absent ? "F" : "—"),
        remarks: r.remarks ? capitalizeSentence(r.remarks) : "—",
        absent: r.is_absent,
      };
    });
  }, [activeExamResults]);

  useEffect(() => {
    if (!showMarksheetModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMarksheetModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMarksheetModal]);

  const handleOpenMarksheet = (title: string) => {
    setSelectedExamTitle(title);
    setShowMarksheetModal(true);
  };

  const handlePrintOfficialMarksheet = async (examTitleOverride?: string) => {
    const currentTitle = examTitleOverride || selectedExamTitle || examTitles[0];
    const results = currentTitle ? (examsGrouped.get(currentTitle) || []) : activeExamResults;

    if (!activeChild || results.length === 0) {
      toast.error("No published marksheet available to print.");
      return;
    }

    const printWindow = window.open("", "_blank", "popup,width=1100,height=850");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print marksheet.");
      return;
    }
    printWindow.document.write(
      "<!doctype html><html><body style='font:14px Arial;padding:32px;color:#334155'>Preparing official marksheet report card...</body></html>"
    );

    const activeTemplate =
      (results[0]?.report_template as ResultTemplateId) || resultTemplate || "classic";

    const subjectsForPrint = results.map((r: any, idx: number) => {
      const rawSubj = r.subject_name || r.subject || r.exam?.subject?.name || `Subject #${idx + 1}`;
      return {
        subject: formatSubjectName(rawSubj),
        maximum: r.max_marks || r.exam?.max_marks || 100,
        obtained: r.is_absent ? "Absent" : (r.marks_obtained ?? 0),
        grade: formatGrade(r.grade) || (r.is_absent ? "F" : "—"),
        remarks: r.remarks ? capitalizeSentence(r.remarks) : "—",
        absent: r.is_absent,
      };
    });

    const totalMax = results.reduce(
      (s: number, r: any) => s + parseFloat(r.max_marks || r.exam?.max_marks || "0"),
      0
    );
    const totalObtained = results.reduce(
      (s: number, r: any) => s + (r.is_absent ? 0 : parseFloat(r.marks_obtained || "0")),
      0
    );
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0.00";
    const numP = Number(percentage);
    const overallGrade =
      numP >= 90 ? "A+" : numP >= 75 ? "A" : numP >= 60 ? "B" : numP >= 40 ? "C" : "F";

    await writePrintableResultCards({
      printWindow,
      students: [
        {
          studentId: activeChild.id,
          name: capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim()) || "Student",
          rollNumber: activeChild.roll_no,
          admissionNumber: activeChild.gr_no,
          className: capitalizeWords(activeChild.school_class_name || ""),
          division: (activeChild.division || "A").toUpperCase(),
          dateOfBirth: activeChild.date_of_birth,
          photo: (activeChild as any).photo || (activeChild as any).profile_photo,
          subjects: subjectsForPrint,
          totalMaximum: totalMax,
          totalObtained: totalObtained,
          percentage: percentage,
          overallGrade: formatGrade(overallGrade),
          remarks: "Keep up the excellent academic performance.",
        },
      ],
      school: {
        name: schoolBrand.name,
        logo: schoolBrand.logo,
        address: schoolBrand.address,
        phone: schoolBrand.phone,
        email: schoolBrand.email,
        principalName: schoolBrand.principalName,
        teacherName: schoolBrand.teacherName,
        principalSignature: schoolBrand.principalSignature,
        teacherSignature: schoolBrand.teacherSignature,
        stamp: schoolBrand.stamp,
      },
      title: currentTitle || "Examination Result",
      academicYear: "2026-27",
      template: activeTemplate,
    });
  };

  const handleDownloadPDF = async () => {
    if (!activeChild) return;
    setIsDownloadingPDF(true);
    try {
      const studentName = capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim()) || "Student";
      const card = document.querySelector<HTMLElement>("[data-result-card-preview='true']");
      if (!card) throw new Error("The result preview is not ready yet.");
      const safeName = `${studentName}_${selectedExamTitle || "Marksheet"}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
      await downloadResultPreviewPDF(card, `${safeName}_Report_Card.pdf`);
      toast.success(`Result PDF for ${studentName} downloaded successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleOpenLeaderboard = async (title: string, resultsList: any[]) => {
    setLeaderboardTitle(title);
    setShowLeaderboard(true);
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setRankings([]);

    try {
      const examIds = Array.from(new Set(resultsList.map((r) => r.exam?.id || r.exam_id).filter(Boolean)));
      if (examIds.length === 0) {
        throw new Error("No exam identifiers found for class rankings.");
      }
      const responses = await Promise.all(examIds.map((id) => getExamRankings(Number(id))));
      const combined = new Map<number, RankingEntry>();
      responses.forEach((res) => {
        (res.ranking || []).forEach((entry) => {
          const row = combined.get(entry.student) || { ...entry, marks_obtained: 0, max_marks: 0 };
          row.marks_obtained += Number(entry.marks_obtained) || 0;
          row.max_marks += Number(entry.max_marks) || 0;
          combined.set(entry.student, row);
        });
      });
      const sorted = Array.from(combined.values())
        .map((entry) => {
          const percent = entry.max_marks ? (entry.marks_obtained / entry.max_marks) * 100 : 0;
          const grade = percent >= 90 ? "A+" : percent >= 75 ? "A" : percent >= 60 ? "B" : percent >= 40 ? "C" : "F";
          return { ...entry, grade };
        })
        .sort((a, b) => (b.max_marks ? b.marks_obtained / b.max_marks : 0) - (a.max_marks ? a.marks_obtained / a.max_marks : 0));
      setRankings(sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 })));
    } catch (err: any) {
      setLeaderboardError(err?.message || "Failed to load class ranking details.");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const studentFullName = activeChild
    ? capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim())
    : "Ward";

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto pb-6 lg:pb-12 w-full min-w-0 overflow-x-hidden">
      {/* ── 1. ROYAL BLUE EXECUTIVE HEADER BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white p-5 sm:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Sparkles className="h-3.5 w-3.5" /> Official Academic Records
              </span>
              <span className="text-xs font-bold text-slate-500">
                Academic Year 2026-27
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Child Marksheet & Evaluations
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
              Official school performance evaluations for{" "}
              <span className="font-bold text-blue-700">{studentFullName}</span>. Review term marksheets,
              subject grades, and print official report cards.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="h-10 rounded-2xl border-slate-200 bg-white/90 text-xs font-bold shadow-xs hover:bg-white hover:text-blue-600 transition"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              Refresh
            </Button>

            {examTitles.length > 0 && (
              <Button
                onClick={() => handlePrintOfficialMarksheet(examTitles[0])}
                className="h-10 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shadow-sm shadow-blue-500/20 gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print Latest Report Card
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. MULTI-CHILD SELECTOR TABS ── */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto max-w-full no-scrollbar">
          {children.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm shrink-0 transition-all ${
                selectedChildIndex === idx
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="h-4 w-4" />
              {capitalizeWords(child.name)} ({capitalizeWords(child.school_class_name)}-{(child.division || "A").toUpperCase()})
            </button>
          ))}
        </div>
      )}

      {/* ── 3. WARD IDENTITY PROFILE BANNER ── */}
      {activeChild && !isLoading && (
        <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-blue-500/20 shrink-0">
                {activeChild.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {studentFullName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    Enrolled Student
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {capitalizeWords(activeChild.school_name || "School")}
                </p>
              </div>
            </div>

            {/* Identity Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">G.R. Number</span>
                <span className="font-extrabold text-slate-800">{activeChild.gr_no || "GR-801"}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Class & Section</span>
                <span className="font-extrabold text-slate-800">
                  {capitalizeWords(activeChild.school_class_name)} ({(activeChild.division || "A").toUpperCase()})
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Roll Number</span>
                <span className="font-extrabold text-slate-800">#{activeChild.roll_no || "1"}</span>
              </div>
              <div className="rounded-2xl bg-emerald-50/80 border border-emerald-100 p-2.5 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block">Academic Standing</span>
                <span className="font-extrabold text-emerald-700 text-xs sm:text-sm mt-0.5 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Passed & Promoted
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. SHIMMER SKELETON / SUMMARY METRICS ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
          <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Cumulative Performance */}
          <div className="rounded-3xl border border-blue-100/80 bg-white shadow-xs p-5 sm:p-6 flex flex-row items-center justify-between gap-4 transition hover:border-blue-200">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <BarChart3 className="h-4 w-4 text-blue-600 shrink-0" />
                Cumulative Performance
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl sm:text-4xl font-black text-blue-700 font-mono tracking-tight">
                  {stats.avgPercentage}%
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg">
                  {stats.avgPercentage >= 90 ? "Grade A+" : stats.avgPercentage >= 75 ? "Grade A" : stats.avgPercentage >= 60 ? "Grade B" : "Grade C"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Average score across all completed examinations
              </p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
              <Award className="h-7 w-7" />
            </div>
          </div>

          {/* Card 2: Conducted Evaluations */}
          <div className="rounded-3xl border border-blue-100/80 bg-white shadow-xs p-5 sm:p-6 flex flex-row items-center justify-between gap-4 transition hover:border-blue-200">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                Conducted Evaluations
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.completed}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Total published exams verified by school faculty
              </p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <CheckCircle className="h-7 w-7" />
            </div>
          </div>
        </div>
      )}

      {/* ── 5. SEARCH & FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam by title (e.g., Term 1, Unit Test)..."
            className="pl-10 h-11 w-full rounded-2xl border-slate-200 bg-white text-xs font-medium placeholder:text-slate-400 focus-visible:ring-blue-600 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 px-1 sm:px-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider sm:hidden">
            Evaluations
          </span>
          <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] sm:text-xs font-bold shadow-2xs">
            {examTitles.length} Published Exam{examTitles.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── 6. EXAM MARKSHEETS LIST ── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : examTitles.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xs">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Award className="h-8 w-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No Marksheets Found</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No exam results match "${searchQuery}". Clear your search query to see all results.`
              : `There are currently no published marksheet records for ${studentFullName}. New evaluations will appear here once published.`}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="mt-4 rounded-xl text-xs font-bold"
            >
              Clear Search Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {examTitles.map((title) => {
            const resultsList = examsGrouped.get(title) || [];
            const examTotalMax = resultsList.reduce(
              (s, r) => s + parseFloat(r.max_marks || r.exam?.max_marks || "0"),
              0
            );
            const examTotalObtained = resultsList.reduce(
              (s, r) => s + (r.is_absent ? 0 : parseFloat(r.marks_obtained || "0")),
              0
            );
            const examPct = examTotalMax > 0 ? ((examTotalObtained / examTotalMax) * 100).toFixed(2) : "0.00";
            const numP = Number(examPct);
            const examGrade = numP >= 90 ? "A+" : numP >= 75 ? "A" : numP >= 60 ? "B" : numP >= 40 ? "C" : "F";
            const gradeBadge = getGradeBadgeStyle(examGrade);

            return (
              <article
                key={title}
                className="overflow-hidden rounded-3xl border border-blue-100/90 bg-white shadow-xs transition hover:border-blue-300 hover:shadow-sm"
              >
                {/* Header Band */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white p-4 sm:p-5">
                  <div className="flex items-start sm:items-center justify-between gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-lg font-black uppercase tracking-wide text-slate-900 truncate">
                            {title}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100/70 text-blue-700">
                            Official Record
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                          {resultsList.length} subjects evaluated · Class: {capitalizeWords(activeChild?.school_class_name || "Grade")} ({(activeChild?.division || "A").toUpperCase()})
                        </p>
                      </div>
                    </div>

                    {/* Mobile Badges (top right aligned inside header) */}
                    <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wide border ${gradeBadge.bg} ${gradeBadge.text} ${gradeBadge.border}`}
                      >
                        {examGrade}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-black font-mono">
                        {examPct}%
                      </span>
                    </div>
                  </div>

                  {/* Desktop Badges (right side) */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border ${gradeBadge.bg} ${gradeBadge.text} ${gradeBadge.border}`}
                    >
                      Grade {examGrade}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-black font-mono">
                      {examPct}%
                    </span>
                  </div>
                </div>

                {/* Score & Subjects Table */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Summary Bar */}
                  <div className="rounded-2xl bg-slate-50/90 p-3.5 sm:p-4 border border-slate-100 text-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                    {/* Metrics row */}
                    <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Total Marks</span>
                        <strong className="text-slate-800 font-mono font-black text-sm sm:text-base">
                          {examTotalObtained} / {examTotalMax}
                        </strong>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Evaluation Result</span>
                        <strong className={`font-black text-xs sm:text-sm ${numP >= 35 ? "text-emerald-700" : "text-rose-700"}`}>
                          {numP >= 35 ? "PASSED & PROMOTED" : "NEEDS IMPROVEMENT"}
                        </strong>
                      </div>
                    </div>

                    {/* Action buttons: on mobile, balanced grid with View Marksheet as prominent full width */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenLeaderboard(title, resultsList)}
                        className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 gap-1.5 justify-center shadow-2xs"
                      >
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        Class Rankings
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handlePrintOfficialMarksheet(title)}
                        className="h-9 rounded-xl border-blue-200 bg-blue-50/50 text-xs font-bold text-blue-700 hover:bg-blue-100 gap-1.5 justify-center shadow-2xs"
                      >
                        <Printer className="h-3.5 w-3.5 text-blue-600" />
                        Print Card
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handleOpenMarksheet(title)}
                        className="col-span-2 sm:col-span-1 h-9 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 gap-1.5 justify-center"
                      >
                        <FileText className="h-3.5 w-3.5 text-white" />
                        View Marksheet
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Full 6-Column Table (>= md) */}
                  <div className="hidden md:block rounded-2xl border border-slate-100 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/90 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3 pl-4">Sr. No.</th>
                          <th className="p-3">Subject</th>
                          <th className="p-3 text-center">Max Marks</th>
                          <th className="p-3 text-center">Marks Obtained</th>
                          <th className="p-3 text-center">Grade</th>
                          <th className="p-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resultsList.map((r: any, idx: number) => {
                          const rawSubj = r.subject_name || r.subject || r.exam?.subject?.name || `Subject #${idx + 1}`;
                          const subj = formatSubjectName(rawSubj);
                          const max = r.max_marks || r.exam?.max_marks || "100";
                          const obtained = r.is_absent ? "Absent" : (r.marks_obtained ?? "—");
                          const grade = formatGrade(r.grade) || (r.is_absent ? "F" : "—");
                          const subjectBadge = getGradeBadgeStyle(grade);

                          return (
                            <tr key={r.id || idx} className="hover:bg-blue-50/20 transition">
                              <td className="p-3 pl-4 font-mono text-slate-400 text-center w-12">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-800">{subj}</td>
                              <td className="p-3 text-center text-slate-500 font-mono">{max}</td>
                              <td className={`p-3 text-center font-black font-mono ${r.is_absent ? "text-rose-600" : "text-blue-700"}`}>
                                {obtained}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] border ${subjectBadge.bg} ${subjectBadge.text} ${subjectBadge.border}`}>
                                  {grade}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 text-[11px]">
                                {r.remarks ? capitalizeSentence(r.remarks) : "Good Performance"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Subject Cards (< md): 100% Width, Zero Horizontal Scroll */}
                  <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xs">
                    {resultsList.map((r: any, idx: number) => {
                      const rawSubj = r.subject_name || r.subject || r.exam?.subject?.name || `Subject #${idx + 1}`;
                      const subj = formatSubjectName(rawSubj);
                      const max = parseFloat(r.max_marks || r.exam?.max_marks || "100");
                      const obtNum = parseFloat(r.marks_obtained || "0");
                      const pct = max > 0 && !r.is_absent ? Math.round((obtNum / max) * 100) : 0;
                      const obtained = r.is_absent ? "Absent" : (r.marks_obtained ?? "—");
                      const grade = formatGrade(r.grade) || (r.is_absent ? "F" : "—");
                      const subjectBadge = getGradeBadgeStyle(grade);

                      return (
                        <div key={r.id || idx} className="p-3 space-y-2 hover:bg-slate-50/40 transition">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-extrabold text-xs text-slate-900 truncate">
                                {subj}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md font-black text-[10px] border shrink-0 ${subjectBadge.bg} ${subjectBadge.text} ${subjectBadge.border}`}>
                              Grade {grade}
                            </span>
                          </div>

                          {/* Score & Remarks Row */}
                          <div className="flex items-center justify-between text-xs pl-7">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Score:</span>
                              <span className={`font-black ${r.is_absent ? "text-rose-600" : "text-blue-700"}`}>
                                {obtained}
                              </span>
                              <span className="text-slate-400">/ {max}</span>
                              {!r.is_absent && (
                                <span className="text-[10px] font-bold text-slate-400 ml-0.5">({pct}%)</span>
                              )}
                            </div>

                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px] text-right">
                              {r.remarks ? capitalizeSentence(r.remarks) : "Good Performance"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── 7. OFFICIAL REPORT CARD PREVIEW MODAL ── */}
      {showMarksheetModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/75 p-0 sm:p-4 md:p-6 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMarksheetModal(false);
          }}
        >
          <div className="relative my-auto flex h-[100dvh] sm:h-[94vh] w-full max-w-4xl flex-col overflow-hidden border-0 sm:border sm:border-slate-200 bg-white shadow-2xl rounded-none sm:rounded-3xl animate-in zoom-in-95 duration-200">
            {/* Executive Modal Header Bar */}
            <div className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                      {selectedExamTitle || "Report Card Preview"}
                    </h3>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      Official Marksheet
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {studentFullName} · Class {capitalizeWords(activeChild?.school_class_name || "")} ({(activeChild?.division || "A").toUpperCase()})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMarksheetModal(false)}
                  className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Interactive Document Stage - Fluid Full-Screen Mobile Responsive */}
            <div className="flex-1 min-h-0 touch-pan-y overflow-y-auto overflow-x-hidden p-2 sm:p-6 bg-slate-100/90 flex justify-center items-start sm:items-center">
              {activeChild && activeExamResults.length > 0 && (
                <div className="w-full max-w-[740px] mx-auto shadow-xl rounded-xl sm:rounded-2xl overflow-hidden bg-white my-auto">
                  <ResultCardPreview
                    title={selectedExamTitle || (examTitles[0] ?? "Examination Result")}
                    template={((activeExamResults[0]?.report_template as ResultTemplateId) || resultTemplate || "classic") as ResultTemplateId}
                    school={{
                      name: schoolBrand.name,
                      shortName: schoolBrand.shortName,
                      logo: schoolBrand.logo,
                      watermark: schoolBrand.watermark,
                      tagline: schoolBrand.tagline,
                      address: schoolBrand.address,
                      phone: schoolBrand.phone,
                      email: schoolBrand.email,
                      academicYear: "2026-27",
                      establishmentYear: schoolBrand.establishmentYear,
                      boardAffiliation: schoolBrand.boardAffiliation,
                      schoolCode: schoolBrand.schoolCode,
                      udiseCode: schoolBrand.udiseCode,
                      principalName: schoolBrand.principalName,
                      teacherName: schoolBrand.teacherName,
                      principalSignature: schoolBrand.principalSignature,
                      teacherSignature: schoolBrand.teacherSignature,
                      stamp: schoolBrand.stamp,
                    }}
                    student={{
                      id: activeChild.id,
                      name: studentFullName,
                      rollNumber: activeChild.roll_no,
                      admissionNumber: activeChild.gr_no,
                      className: capitalizeWords(activeChild.school_class_name || ""),
                      section: (activeChild.division || "A").toUpperCase(),
                      dateOfBirth: activeChild.date_of_birth,
                      motherName: activeChild.mother_name ? capitalizeWords(activeChild.mother_name) : undefined,
                      fatherName: activeChild.father_name ? capitalizeWords(activeChild.father_name) : undefined,
                      photo: (activeChild as any).photo || (activeChild as any).profile_photo,
                    }}
                    subjects={marksheetSubjects}
                    totals={{
                      maximum: activeExamMetrics.totalMax,
                      obtained: activeExamMetrics.totalObtained,
                      percentage: activeExamMetrics.percentage,
                      grade: formatGrade(activeExamMetrics.overallGrade),
                    }}
                    remarks="Keep up the excellent academic performance."
                  />
                </div>
              )}
            </div>

            {/* Pinned Executive Action Bar */}
            <div className="bg-white px-4 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMarksheetModal(false)}
                className="h-10 px-4 rounded-2xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF || !activeChild || activeExamResults.length === 0}
                  className="h-10 px-3.5 sm:px-4 rounded-2xl border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 font-bold text-xs gap-1.5 cursor-pointer shadow-2xs"
                >
                  {isDownloadingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <Download className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => handlePrintOfficialMarksheet(selectedExamTitle || undefined)}
                  disabled={!activeChild || activeExamResults.length === 0}
                  className="h-10 px-4 sm:px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. CLASS RANKINGS & LEADERBOARD MODAL ── */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-2xl rounded-3xl p-5 sm:p-6 border-0 shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {leaderboardTitle} · Class Rankings
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Class performance standings and student merit ranking
                </p>
              </div>
            </div>

            {leaderboardLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2 mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Computing merit rankings...</p>
              </div>
            ) : leaderboardError ? (
              <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-semibold">
                {leaderboardError}
              </div>
            ) : rankings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No class ranking entries available for this evaluation.
              </div>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto space-y-2">
                {rankings.map((r) => {
                  const isCurrentWard = activeChild && r.student === activeChild.id;
                  return (
                    <div
                      key={r.student}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-xs ${
                        isCurrentWard
                          ? "bg-blue-50/80 border-blue-200 ring-1 ring-blue-400"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-xl font-mono font-black text-xs ${
                            r.rank === 1
                              ? "bg-amber-100 text-amber-800"
                              : r.rank === 2
                              ? "bg-slate-200 text-slate-800"
                              : r.rank === 3
                              ? "bg-orange-100 text-orange-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          #{r.rank}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-900">
                            {capitalizeWords(r.student_name || "Student")}
                            {isCurrentWard && (
                              <span className="ml-2 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                                Your Ward
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            Class Standing · Student #{r.student}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                          {r.marks_obtained} / {r.max_marks}
                        </div>
                        <span className="font-bold text-blue-700 text-[11px]">
                          Grade {r.grade || "A"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
