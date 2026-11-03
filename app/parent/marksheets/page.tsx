"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
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
  ArrowLeft,
  ChevronRight,
  TrendingUp,
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
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
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

  // Load initial branding and children
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
    if (!selectedExamTitle) return [];
    return examsGrouped.get(selectedExamTitle) || [];
  }, [examsGrouped, selectedExamTitle]);

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

  const handleOpenMarksheet = (title: string) => {
    setSelectedExamTitle(title);
    setShowMarksheetModal(true);
  };

  const handlePrintOfficialMarksheet = async () => {
    if (!activeChild || activeExamResults.length === 0) {
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
      (activeExamResults[0]?.report_template as ResultTemplateId) || resultTemplate || "classic";

    await writePrintableResultCards({
      printWindow,
      students: [
        {
          studentId: activeChild.id,
          name: capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim()) || "Student",
          rollNumber: activeChild.roll_no,
          admissionNumber: activeChild.gr_no,
          className: capitalizeWords(activeChild.school_class_name || ""),
          division: (activeChild.division || "").toUpperCase(),
          dateOfBirth: activeChild.date_of_birth,
          photo: (activeChild as any).photo || (activeChild as any).profile_photo,
          subjects: marksheetSubjects,
          totalMaximum: activeExamMetrics.totalMax,
          totalObtained: activeExamMetrics.totalObtained,
          percentage: activeExamMetrics.percentage,
          overallGrade: formatGrade(activeExamMetrics.overallGrade),
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
      title: selectedExamTitle || "Examination Result",
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
    <div className="space-y-6 pb-12">
      {/* ── TOP BREADCRUMB & BACK LINK ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/parent" className="hover:text-blue-600 transition flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="text-blue-700 font-bold">Child Marksheet</span>
        </div>

        {/* Multi-Child Selector Pills */}
        {children.length > 1 && (
          <div className="flex items-center gap-1.5 rounded-2xl bg-white p-1 border border-slate-200/80 shadow-xs">
            {children.map((child, idx) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedChildIndex(idx)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedChildIndex === idx
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {capitalizeWords(child.name)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── HERO BANNER IN BLUE THEME ── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100/90 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/80 p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                Official Academic Records
              </span>
              <span className="text-xs text-slate-500 font-medium">Academic Year 2026-27</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Child <span className="text-blue-600">Marksheet & Evaluations</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Official school performance evaluations for <strong className="text-slate-900 font-bold">{studentFullName}</strong>.
              Review term marksheets, subject grades, and print official report cards.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="h-11 flex-1 sm:flex-none rounded-xl border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <RefreshCw className="h-4 w-4 text-slate-500" />}
              Refresh
            </Button>

            {examTitles.length > 0 && (
              <Button
                onClick={() => handleOpenMarksheet(examTitles[0])}
                className="h-11 flex-1 sm:flex-none rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 gap-2"
              >
                <FileText className="h-4 w-4 text-white" />
                Latest Marksheet
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── 2 SUMMARY STATS CARDS (BLUE THEME) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Cumulative Performance */}
        <Card className="rounded-3xl border border-blue-100/90 bg-white shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Cumulative Performance
            </div>
            <div className="text-3xl font-black text-blue-700 font-mono">
              {stats.avgPercentage}%
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Average score across all completed examinations
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Award className="h-7 w-7" />
          </div>
        </Card>

        {/* Card 2: Published Examinations */}
        <Card className="rounded-3xl border border-blue-100/90 bg-white shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Conducted Evaluations
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono">
              {stats.completed}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Total published exams verified by school faculty
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </div>
        </Card>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam by title (e.g., Term 1, Unit Test)..."
            className="pl-10 h-11 rounded-2xl border-slate-200 bg-white text-xs font-medium placeholder:text-slate-400 focus-visible:ring-blue-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500">
          Showing <span className="text-blue-700">{examTitles.length}</span> published exam marksheets
        </div>
      </div>

      {/* ── EXAM MARKSHEETS LIST / GRID ── */}
      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xs">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
          <h4 className="text-sm font-bold text-slate-800">Loading Academic Marksheets...</h4>
          <p className="mt-1 text-xs text-slate-400">Fetching published results from school server</p>
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
              Clear Filter
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
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xs transition hover:border-blue-200 hover:shadow-sm"
              >
                {/* Header Band */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 via-slate-50/40 to-white px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                        {title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {resultsList.length} subjects evaluated · Class: {capitalizeWords(activeChild?.school_class_name || "Grade")} ({(activeChild?.division || "A").toUpperCase()})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border ${gradeBadge.bg} ${gradeBadge.text} ${gradeBadge.border}`}
                    >
                      Grade {examGrade}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-black font-mono">
                      {examPct}%
                    </span>
                  </div>
                </div>

                {/* Score & Subjects Table */}
                <div className="p-5 space-y-4">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Marks</span>
                        <strong className="text-slate-800 font-mono font-bold text-sm">
                          {examTotalObtained} / {examTotalMax}
                        </strong>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                        <strong className={`font-bold ${numP >= 35 ? "text-emerald-700" : "text-rose-700"}`}>
                          {numP >= 35 ? "PASSED" : "FAILED"}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenLeaderboard(title, resultsList)}
                        className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 gap-1.5"
                      >
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        Class Rankings
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handleOpenMarksheet(title)}
                        className="h-9 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 text-white" />
                        View Marksheet
                      </Button>
                    </div>
                  </div>

                  {/* Subject rows table */}
                  <div className="rounded-2xl border border-slate-100 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/90 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-2.5 pl-3">Sr. No.</th>
                          <th className="p-2.5">Subject</th>
                          <th className="p-2.5 text-center">Max Marks</th>
                          <th className="p-2.5 text-center">Marks Obtained</th>
                          <th className="p-2.5 text-center">Grade</th>
                          <th className="p-2.5">Remarks</th>
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
                            <tr key={r.id || idx} className="hover:bg-slate-50/40 transition">
                              <td className="p-2.5 pl-3 font-mono text-slate-400 text-center w-12">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-800">{subj}</td>
                              <td className="p-2.5 text-center text-slate-500">{max}</td>
                              <td className={`p-2.5 text-center font-black ${r.is_absent ? "text-rose-600" : "text-blue-700"}`}>
                                {obtained}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${subjectBadge.bg} ${subjectBadge.text} ${subjectBadge.border}`}>
                                  {grade}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-500 text-[11px]">
                                {r.remarks ? capitalizeSentence(r.remarks) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── EXACT PRINCIPAL OFFICIAL MARKSHEET MODAL & PRINT VIEW (BLUE THEME) ── */}
      <Dialog open={showMarksheetModal} onOpenChange={setShowMarksheetModal}>
        <DialogContent className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-slate-100/90 p-0 sm:left-1/2 sm:top-1/2 sm:h-[92dvh] sm:w-[94vw] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl shadow-2xl">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex justify-center">
            {activeChild && activeExamResults.length > 0 && (
              <ResultCardPreview
                title={selectedExamTitle || (examTitles[0] ?? "Examination Result")}
                template={((activeExamResults[0]?.report_template as ResultTemplateId) || resultTemplate || "classic")}
                school={{
                  name: schoolBrand.name,
                  shortName: schoolBrand.shortName,
                  logo: schoolBrand.logo,
                  watermark: schoolBrand.watermark,
                  tagline: schoolBrand.tagline,
                  address: schoolBrand.address,
                  phone: schoolBrand.phone,
                  email: schoolBrand.email,
                  establishmentYear: schoolBrand.establishmentYear,
                  boardAffiliation: schoolBrand.boardAffiliation,
                  schoolCode: schoolBrand.schoolCode,
                  udiseCode: schoolBrand.udiseCode,
                  principalName: schoolBrand.principalName,
                  teacherName: schoolBrand.teacherName,
                  principalSignature: schoolBrand.principalSignature,
                  teacherSignature: schoolBrand.teacherSignature,
                  stamp: schoolBrand.stamp,
                  academicYear: "2026-27",
                }}
                student={{
                  id: activeChild.id,
                  name: capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim()),
                  fatherName: activeChild.father_name ? capitalizeWords(activeChild.father_name) : undefined,
                  motherName: activeChild.mother_name ? capitalizeWords(activeChild.mother_name) : undefined,
                  rollNumber: activeChild.roll_no,
                  admissionNumber: activeChild.gr_no,
                  className: `${capitalizeWords(activeChild.school_class_name || "")}${activeChild.division ? ` - ${activeChild.division.toUpperCase()}` : ""}`.trim(),
                  dateOfBirth: activeChild.date_of_birth,
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
            )}
          </div>

          <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMarksheetModal(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF || !activeChild || activeExamResults.length === 0}
              className="gap-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              {isDownloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloadingPDF ? "Downloading..." : "Download PDF"}
            </Button>
            <Button
              type="button"
              onClick={handlePrintOfficialMarksheet}
              disabled={!activeChild || activeExamResults.length === 0}
              className="gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              <Printer className="h-4 w-4" /> Print Marksheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CLASS RANKINGS LEADERBOARD MODAL (BLUE THEME) ── */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Class Performance</span>
              <h3 className="text-base font-black text-slate-900">{leaderboardTitle} Leaderboard</h3>
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-2 py-3">
            {leaderboardLoading ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Calculating class rankings...</p>
              </div>
            ) : leaderboardError ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center text-xs text-rose-700">
                {leaderboardError}
              </div>
            ) : rankings.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
                No rank data published for this evaluation.
              </div>
            ) : (
              rankings.map((entry) => {
                const isMyChild = Number(entry.student) === Number(activeChild?.id);
                return (
                  <div
                    key={entry.student}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isMyChild
                        ? "bg-blue-50/80 border-blue-200 shadow-2xs"
                        : "bg-slate-50/60 border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold font-mono text-xs ${
                          entry.rank === 1
                            ? "bg-amber-400 text-white shadow-xs"
                            : entry.rank === 2
                            ? "bg-slate-300 text-slate-800"
                            : entry.rank === 3
                            ? "bg-amber-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        #{entry.rank}
                      </span>
                      <div>
                        <p className={`text-xs font-bold ${isMyChild ? "text-blue-900" : "text-slate-800"}`}>
                          {capitalizeWords(entry.student_name || `Student #${entry.student}`)}
                          {isMyChild && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[9px] font-black uppercase">
                              Your Child
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Roll: #{(entry as any).roll_no || "—"} · GR: {(entry as any).gr_no || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <strong className="block text-xs font-black text-slate-900 font-mono">
                        {entry.marks_obtained} / {entry.max_marks}
                      </strong>
                      <span className="text-[10px] font-bold text-blue-600">
                        Grade {formatGrade(entry.grade)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLeaderboard(false)}
              className="w-full rounded-xl text-xs font-bold"
            >
              Close Leaderboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
