"use client";

import { useEffect, useState, useMemo } from "react";
import {
  GraduationCap,
  Save,
  Loader2,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Users,
  BookOpen,
  Search,
  X,
  Check,
  Lock,
  Sparkles,
  Calculator,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { getAssignedTeachers } from "@/lib/clerk/assign-teacher";
import { getAcademicYears } from "@/lib/fees/academic-year";
import { apiFetch } from "@/lib/exam-api";
import type { AssignedTeacher } from "@/types/clerk";
import type { AcademicYear } from "@/types/fees";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface AssessmentRow {
  student_id: number;
  student_name: string;
  roll_no?: string;
  gr_no?: string;
  score: string;
  max_score: string;
  remarks: string;
  is_modified?: boolean;
}

interface ClassItem {
  class_name: string;
  division_name: string;
  class_id: string;
  is_class_teacher: boolean;
  subjects: { id: number | string; name: string }[];
}

interface SubjectItem {
  subject: number | string;
  subject_name: string;
}

// ─── Visual Helpers ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
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

function getSubjectVisual(subjectName: string) {
  const name = (subjectName || "").toLowerCase();
  if (name.includes("math")) {
    return {
      icon: Calculator,
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    };
  }
  if (name.includes("sci")) {
    return {
      icon: Sparkles,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    };
  }
  if (name.includes("eng") || name.includes("lang")) {
    return {
      icon: BookOpen,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
    };
  }
  if (name.includes("hin") || name.includes("mar") || name.includes("guj")) {
    return {
      icon: BookOpen,
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
      iconBg: "bg-orange-50 text-orange-600 border-orange-100",
    };
  }
  return {
    icon: FileText,
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    iconBg: "bg-sky-50 text-sky-600 border-sky-100",
  };
}

function getScoreEvaluation(score: number | null, max: number): {
  pct: number;
  grade: string;
  label: string;
  color: string;
} {
  if (score === null || isNaN(score) || max <= 0) {
    return { pct: 0, grade: "—", label: "Unscored", color: "text-slate-400 bg-slate-50 border-slate-200" };
  }
  const pct = Math.round((score / max) * 100);
  if (pct >= 90) return { pct, grade: "A+", label: "Outstanding", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (pct >= 80) return { pct, grade: "A", label: "Excellent", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (pct >= 70) return { pct, grade: "B+", label: "Very Good", color: "text-blue-600 bg-blue-50 border-blue-200" };
  if (pct >= 60) return { pct, grade: "B", label: "Good", color: "text-blue-500 bg-blue-50 border-blue-200" };
  if (pct >= 50) return { pct, grade: "C", label: "Average", color: "text-amber-600 bg-amber-50 border-amber-200" };
  if (pct >= 35) return { pct, grade: "D", label: "Needs Help", color: "text-orange-600 bg-orange-50 border-orange-200" };
  return { pct, grade: "F", label: "Low", color: "text-rose-600 bg-rose-50 border-rose-200" };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TeacherAssessmentPage() {
  const [step, setStep] = useState<"YEAR" | "CLASS" | "SUBJECT" | "ENTRY">("CLASS");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [assignments, setAssignments] = useState<AssignedTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Selections
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);

  // Class Selection Filters
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [classFilterTab, setClassFilterTab] = useState<"ALL" | "MY_CLASS" | "OTHER_CLASSES">("ALL");

  // Subject Selection Filters
  const [subjectSearch, setSubjectSearch] = useState("");

  // Student Entry State
  const [studentRows, setStudentRows] = useState<AssessmentRow[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingScores, setHasExistingScores] = useState(false);
  const [globalMaxScore, setGlobalMaxScore] = useState<string>("10");

  // Student Filters
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<"ALL" | "PENDING" | "SCORED">("ALL");

  // Load initial data
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const [assigns, years] = await Promise.all([
          getAssignedTeachers(),
          getAcademicYears(),
        ]);
        setAssignments(assigns || []);
        setAcademicYears(years || []);

        // Default to active year or first available year
        const activeYear = (years || []).find((y: any) => y.is_active) || (years || [])[0] || null;
        setSelectedYear(activeYear);
        if (activeYear) {
          setStep("CLASS");
        } else {
          setStep("YEAR");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load teacher assessment data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, []);

  // ─── Group unique classes and identify My Class (Class Teacher) vs Other Classes ──
  const { uniqueClasses, myClasses, otherClasses } = useMemo(() => {
    const classesMap = new Map<string, ClassItem>();

    assignments.forEach((a) => {
      if (!a.class_name) return;
      const key = `${a.class_name}-${a.division_name || ""}`;
      const isCt = Boolean(a.is_class_teacher);
      const existing = classesMap.get(key);

      if (!existing) {
        classesMap.set(key, {
          class_name: a.class_name,
          division_name: a.division_name || "",
          class_id: String(
            (a as any).class_id ||
            (a as any).class_name_id ||
            (a as any).school_class ||
            (a as any).division_name_id ||
            ""
          ),
          is_class_teacher: isCt,
          subjects: a.subject && a.subject_name ? [{ id: a.subject, name: a.subject_name }] : [],
        });
      } else {
        if (isCt) existing.is_class_teacher = true;
        if (a.subject && a.subject_name && !existing.subjects.some((s) => s.id === a.subject)) {
          existing.subjects.push({ id: a.subject, name: a.subject_name });
        }
      }
    });

    const unique = Array.from(classesMap.values());
    const my = unique.filter((c) => c.is_class_teacher);
    const other = unique.filter((c) => !c.is_class_teacher);

    return { uniqueClasses: unique, myClasses: my, otherClasses: other };
  }, [assignments]);

  // Filter classes by search query
  const filterClassesList = (list: ClassItem[]) => {
    if (!classSearchQuery.trim()) return list;
    const q = classSearchQuery.toLowerCase().trim();
    return list.filter((c) => {
      const cName = (c.class_name || "").toLowerCase();
      const dName = (c.division_name || "").toLowerCase();
      const combined = `${cName} ${dName}`.toLowerCase();
      const divCombo = `division ${dName}`.toLowerCase();
      const subMatch = c.subjects.some((s) => s.name.toLowerCase().includes(q));
      return cName.includes(q) || dName.includes(q) || combined.includes(q) || divCombo.includes(q) || subMatch;
    });
  };

  const filteredMyClasses = useMemo(() => filterClassesList(myClasses), [myClasses, classSearchQuery]);
  const filteredOtherClasses = useMemo(() => filterClassesList(otherClasses), [otherClasses, classSearchQuery]);
  const filteredAllClasses = useMemo(() => filterClassesList(uniqueClasses), [uniqueClasses, classSearchQuery]);

  // Subjects assigned to this teacher for the selected class
  const classSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const subjectsMap = new Map<string, SubjectItem>();

    assignments
      .filter(
        (a) =>
          a.class_name === selectedClass.class_name &&
          (!selectedClass.division_name || a.division_name === selectedClass.division_name)
      )
      .forEach((a) => {
        if (!a.subject && !a.subject_name) return;
        const key = String(a.subject || a.subject_name).toLowerCase().trim();
        if (!subjectsMap.has(key)) {
          subjectsMap.set(key, {
            subject: a.subject,
            subject_name: a.subject_name || `Subject #${a.subject}`,
          });
        }
      });

    return Array.from(subjectsMap.values());
  }, [assignments, selectedClass]);

  const filteredClassSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return classSubjects;
    const q = subjectSearch.toLowerCase().trim();
    return classSubjects.filter((s) => s.subject_name.toLowerCase().includes(q));
  }, [classSubjects, subjectSearch]);

  // ─── Step Actions ──────────────────────────────────────────────────────────

  const handleYearSelect = (year: AcademicYear) => {
    setSelectedYear(year);
    setStep("CLASS");
  };

  const handleClassSelect = (cls: ClassItem) => {
    setSelectedClass(cls);
    setSubjectSearch("");
    setStep("SUBJECT");
  };

  const handleSubjectSelect = async (sub: SubjectItem) => {
    setSelectedSubject(sub);
    setStudentSearchQuery("");
    setStudentFilter("ALL");
    setStep("ENTRY");
    await loadStudents(selectedClass?.class_id || "", selectedClass?.division_name || "", selectedYear?.id, sub.subject);
  };

  const loadStudents = async (classId: string, division: string, yearId?: number, subjectId?: number | string) => {
    setIsLoading(true);
    setIsEditMode(false);
    setHasExistingScores(false);
    try {
      let url = `/api/get-student/?school_class=${classId}`;
      if (division) {
        url += `&division=${encodeURIComponent(division)}`;
      }

      const [studentsData, existingData] = await Promise.all([
        apiFetch(url),
        apiFetch(`/api/teacher-assessment/?academic_year=${yearId}&subject=${subjectId}`).catch(() => []),
      ]);

      const stList = Array.isArray(studentsData) ? studentsData : studentsData?.results || [];
      const marksList = Array.isArray(existingData) ? existingData : existingData?.results || [];

      // Filter existing marks for this class's students
      const studentIds = new Set(stList.map((s: any) => s.id));
      const relevantMarks = marksList.filter((m: any) => studentIds.has(m.student));

      if (relevantMarks.length > 0) {
        setHasExistingScores(true);
        if (relevantMarks[0].max_score) {
          setGlobalMaxScore(String(relevantMarks[0].max_score));
        }
      }

      const currentMax = relevantMarks[0]?.max_score ? String(relevantMarks[0].max_score) : globalMaxScore;

      const mappedMarks: AssessmentRow[] = stList.map((s: any) => {
        const existing = relevantMarks.find((m: any) => m.student === s.id);
        return {
          student_id: s.id,
          student_name: s.full_name || [s.surname, s.name, s.father_name].filter(Boolean).join(" ") || `Student #${s.id}`,
          roll_no: s.roll_no || "",
          gr_no: s.gr_no || "",
          score: existing && existing.score !== null ? String(existing.score) : "",
          max_score: existing && existing.max_score !== null ? String(existing.max_score) : currentMax,
          remarks: existing ? existing.remarks || "" : "",
          is_modified: false,
        };
      });

      if (stList.length > 0 && (!classId || classId === "")) {
        const resolvedClassId = String(stList[0].school_class || "");
        if (resolvedClassId) {
          setSelectedClass((prev) => (prev ? { ...prev, class_id: resolvedClassId } : null));
        }
      }

      const sortedMarks = mappedMarks.sort((a, b) => {
        const rollA = parseInt(a.roll_no || "", 10);
        const rollB = parseInt(b.roll_no || "", 10);
        if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
        if (!isNaN(rollA)) return -1;
        if (!isNaN(rollB)) return 1;
        return (a.student_name || "").localeCompare(b.student_name || "");
      });

      setStudentRows(sortedMarks);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load students for assessment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (studentId: number, field: keyof AssessmentRow, val: any) => {
    if (field === "score" && val !== "") {
      const maxScore = Number(globalMaxScore) || 10;
      if (Number(val) > maxScore) {
        toast.error(`Score cannot exceed max score (${maxScore}).`);
        val = maxScore.toString();
      } else if (Number(val) < 0) {
        val = "0";
      }
    }
    setStudentRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, [field]: val, is_modified: true } : r))
    );
  };

  const handleGlobalMaxScoreChange = (val: string) => {
    setGlobalMaxScore(val);
    setStudentRows((prev) => prev.map((r) => ({ ...r, max_score: val, is_modified: true })));
  };

  const handleSaveScores = async () => {
    if (!selectedYear || !selectedSubject || !selectedClass) return;

    const validScores = studentRows
      .filter((r) => r.score !== "" && r.score !== null)
      .map((r) => ({
        student_id: r.student_id,
        score: Number(r.score),
        max_score: Number(r.max_score) || Number(globalMaxScore) || 10,
        remarks: r.remarks || "",
      }));

    if (validScores.length === 0) {
      toast.error("Please enter a score for at least one student before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const resolvedClassId = selectedClass.class_id || "";
      const payload = {
        academic_year: selectedYear.id,
        school_class: resolvedClassId,
        subject_id: selectedSubject.subject,
        scores: validScores,
      };

      await apiFetch("/api/teacher-assessment/bulk-save/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("🎉 Teacher assessments saved successfully!");
      setStudentRows((prev) => prev.map((r) => ({ ...r, is_modified: false })));
      setHasExistingScores(true);
      setIsEditMode(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save assessments.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Filtered Students & Metrics ──────────────────────────────────────────

  const filteredStudents = useMemo(() => {
    return studentRows.filter((st) => {
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase().trim();
        const matchesName = st.student_name.toLowerCase().includes(q);
        const matchesRoll = (st.roll_no || "").toLowerCase().includes(q);
        const matchesGr = (st.gr_no || "").toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesGr) return false;
      }
      if (studentFilter === "SCORED") {
        return st.score !== "" && st.score !== null;
      }
      if (studentFilter === "PENDING") {
        return st.score === "" || st.score === null;
      }
      return true;
    });
  }, [studentRows, studentSearchQuery, studentFilter]);

  const stats = useMemo(() => {
    const total = studentRows.length;
    const scored = studentRows.filter((r) => r.score !== "" && r.score !== null).length;
    const pending = total - scored;
    const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
    return { total, scored, pending, pct };
  }, [studentRows]);

  const maxVal = Number(globalMaxScore) || 10;
  const isInputDisabled = hasExistingScores && !isEditMode;

  return (
    <div className="space-y-4 pb-3 sm:pb-5 lg:pb-12 px-3 sm:px-6 py-3 sm:py-5 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden font-sans">
      {/* ── Top Compact Breadcrumb Header Bar ── */}
      <div className="bg-white dark:bg-zinc-900 px-4 py-3 sm:py-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {step !== "CLASS" && (
            <button
              type="button"
              onClick={() => {
                if (step === "ENTRY") setStep("SUBJECT");
                else if (step === "SUBJECT") setStep("CLASS");
                else if (step === "YEAR") setStep("CLASS");
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-100 truncate">
                {step === "YEAR" && "Select Academic Year"}
                {step === "CLASS" && "Teacher Assessment Portal"}
                {step === "SUBJECT" && `${selectedClass?.class_name} • Div ${selectedClass?.division_name || "A"}`}
                {step === "ENTRY" && `${selectedSubject?.subject_name}`}
              </h1>

              {step === "CLASS" ? (
                myClasses.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 shrink-0">
                    Class Teacher Mode
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    Subject Teacher Mode
                  </span>
                )
              ) : selectedClass?.is_class_teacher ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Class Teacher
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  Subject Teacher
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {step === "YEAR" && "Choose an academic year to manage assessment scores"}
              {step === "CLASS" && "Select a class to enter periodic teacher assessments"}
              {step === "SUBJECT" && "Select subject for teacher assessment"}
              {step === "ENTRY" && `${selectedClass?.class_name} Div ${selectedClass?.division_name || "A"} • Max Score: ${globalMaxScore}`}
            </p>
          </div>
        </div>

        {/* Right Action: Academic Year Switcher & Step Indicator */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Year Switcher Pill */}
          {academicYears.length > 1 ? (
            <div className="relative">
              <select
                value={selectedYear?.id || ""}
                onChange={(e) => {
                  const yr = academicYears.find((y) => String(y.id) === e.target.value);
                  if (yr) {
                    setSelectedYear(yr);
                    if (step === "ENTRY" && selectedClass && selectedSubject) {
                      loadStudents(selectedClass.class_id, selectedClass.division_name, yr.id, selectedSubject.subject);
                    }
                  }
                }}
                className="text-[11px] font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    📅 {y.name} {y.is_active ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : selectedYear ? (
            <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{selectedYear.name}</span>
            </span>
          ) : null}

          {/* Step Counter */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <span className="text-[#2563EB]">
              {step === "CLASS" && "1"}
              {step === "SUBJECT" && "2"}
              {step === "ENTRY" && "3"}
              {step === "YEAR" && "•"}
            </span>
            <span>/</span>
            <span>3</span>
          </div>
        </div>
      </div>

      {/* ── Loader ── */}
      {isLoading && step !== "ENTRY" ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#2563EB]">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading assessment details...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              STEP: YEAR SELECTION (CLEAN & COMPLETE FALLBACK)
             ══════════════════════════════════════════════════════════════════ */}
          {step === "YEAR" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {academicYears.map((year) => (
                  <Card
                    key={year.id}
                    className={cn(
                      "group cursor-pointer hover:shadow-md transition-all rounded-2xl border bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden",
                      selectedYear?.id === year.id
                        ? "border-[#2563EB] ring-2 ring-blue-500/20"
                        : "border-gray-200 hover:border-blue-300"
                    )}
                    onClick={() => handleYearSelect(year)}
                  >
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                          <Calendar className="h-5 w-5 text-[#2563EB]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-slate-900 text-sm">{year.name}</h3>
                            {year.is_active && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9.5px]">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Click to view class assessments</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: CLASS SELECTION (MY CLASS & OTHER CLASSES WITH SEARCH)
             ══════════════════════════════════════════════════════════════════ */}
          {step === "CLASS" && (
            <div className="space-y-4">
              {/* Filtration Toolbar: Search + Quick Category Tabs */}
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-xs space-y-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search class, division, or subject..."
                    value={classSearchQuery}
                    onChange={(e) => setClassSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all"
                  />
                  {classSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setClassSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setClassFilterTab("ALL")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                      classFilterTab === "ALL"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    )}
                  >
                    <span>All Classes</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15">
                      {filteredAllClasses.length}
                    </span>
                  </button>

                  {myClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setClassFilterTab("MY_CLASS")}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                        classFilterTab === "MY_CLASS"
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200/60"
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>My Class</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200/60 text-[#2563EB]">
                        {filteredMyClasses.length}
                      </span>
                    </button>
                  )}

                  {otherClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setClassFilterTab("OTHER_CLASSES")}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                        classFilterTab === "OTHER_CLASSES"
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60"
                      )}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Other Classes</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200/60 text-blue-700">
                        {filteredOtherClasses.length}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── SECTION 1: MY CLASS (CLASS TEACHER) ── */}
              {(classFilterTab === "ALL" || classFilterTab === "MY_CLASS") && filteredMyClasses.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                        My Class
                      </h2>
                    </div>
                    <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Class Teacher
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMyClasses.map((cls, idx) => (
                      <Card
                        key={`my-class-${idx}`}
                        className="cursor-pointer border-2 border-blue-300/80 hover:border-[#2563EB] hover:shadow-md transition-all group rounded-2xl shadow-xs bg-linear-to-br from-white via-blue-50/20 to-white dark:from-zinc-900 dark:to-zinc-900 overflow-hidden"
                        onClick={() => handleClassSelect(cls)}
                      >
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-11 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
                              <GraduationCap className="h-5 w-5 text-[#2563EB]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-extrabold text-slate-900 text-sm truncate">
                                  {cls.class_name}
                                </h3>
                                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-[#2563EB]">
                                  Div {cls.division_name || "A"}
                                </span>
                              </div>
                              <p className="text-xs text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Class Teacher Authority
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {cls.subjects.length} assigned {cls.subjects.length === 1 ? "subject" : "subjects"}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-blue-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION 2: OTHER CLASSES ── */}
              {(classFilterTab === "ALL" || classFilterTab === "OTHER_CLASSES") && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                        Other Classes
                      </h2>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {filteredOtherClasses.length} {filteredOtherClasses.length === 1 ? "Class" : "Classes"}
                    </span>
                  </div>

                  {filteredOtherClasses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredOtherClasses.map((cls, idx) => (
                        <Card
                          key={`other-class-${idx}`}
                          className="cursor-pointer border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all group rounded-2xl shadow-xs bg-white dark:bg-zinc-900 overflow-hidden"
                          onClick={() => handleClassSelect(cls)}
                        >
                          <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm truncate">
                                  {cls.class_name}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                  Division {cls.division_name || "N/A"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  {cls.subjects.length} assigned {cls.subjects.length === 1 ? "subject" : "subjects"}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="py-5 text-center text-slate-500 text-xs bg-white rounded-xl border border-dashed border-gray-200">
                      No other classes matching &quot;{classSearchQuery}&quot;.
                    </div>
                  )}
                </div>
              )}

              {/* Empty state when teacher has no assignments */}
              {uniqueClasses.length === 0 && !isLoading && (
                <div className="py-16 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No classes assigned</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You have not been assigned to any classes for teacher assessment.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: SUBJECT SELECTION (STREAMLINED & POLISHED)
             ══════════════════════════════════════════════════════════════════ */}
          {step === "SUBJECT" && (
            <div className="space-y-3.5">
              {/* Class Teacher Banner */}
              {selectedClass?.is_class_teacher && (
                <div className="bg-gradient-to-r from-blue-50 via-sky-50/50 to-white dark:from-blue-950/20 dark:via-zinc-900 dark:to-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-blue-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                          Class Teacher Dashboard
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200">
                          My Class
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        Select your assigned subject to enter teacher assessments. You can also view the full class assessment grid in Verify Marks.
                      </p>
                    </div>
                  </div>
                  <a
                    href="/teacher/verify-marks"
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
                  >
                    <span>View Class Grid</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Subject Search */}
              {classSubjects.length > 3 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search subject..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-7 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                  />
                  {subjectSearch && (
                    <button
                      type="button"
                      onClick={() => setSubjectSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Subjects Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredClassSubjects.map((sub, idx) => {
                  const visual = getSubjectVisual(sub.subject_name);
                  const Icon = visual.icon;

                  return (
                    <Card
                      key={`sub-${idx}`}
                      className="cursor-pointer border transition-all rounded-2xl shadow-2xs group overflow-hidden bg-white hover:border-[#2563EB] hover:shadow-md"
                      onClick={() => handleSubjectSelect(sub)}
                    >
                      <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", visual.iconBg)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-slate-900 text-sm truncate">
                              {sub.subject_name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-2.5 h-2.5" /> Assigned
                              </span>
                              <span className="text-[9.5px] font-medium text-slate-400">
                                Teacher Assessment
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredClassSubjects.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-dashed border-gray-200 p-6 space-y-3">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>
                      <p className="font-bold text-slate-700 text-sm">No Assigned Subjects Found</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {selectedClass?.is_class_teacher
                          ? "You are assigned as Class Teacher for this class. If other subject teachers enter assessments, you can view the complete class grid in Verify Marks."
                          : "You do not have any assigned subjects for this class."}
                      </p>
                    </div>
                    {selectedClass?.is_class_teacher && (
                      <a
                        href="/teacher/verify-marks"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold hover:bg-[#1D4ED8] shadow-xs"
                      >
                        <span>Go to Verify Marks</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 3: STUDENT ASSESSMENT ENTRY (MOBILE-FIRST & DESKTOP)
             ══════════════════════════════════════════════════════════════════ */}
          {step === "ENTRY" && (
            <div className="space-y-3.5">
              {/* Progress & Summary Bar */}
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-bold text-slate-700">Scored Progress:</span>
                    <span className="font-extrabold text-[#2563EB]">
                      {stats.scored} / {stats.total}
                    </span>
                    <span className="text-slate-400">({stats.pct}%)</span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                    <Badge
                      className={
                        studentRows.some((r) => r.is_modified)
                          ? "bg-amber-100 text-amber-800 border-amber-200 text-[10px]"
                          : hasExistingScores
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]"
                          : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                      }
                    >
                      {studentRows.some((r) => r.is_modified)
                        ? "Unsaved Changes"
                        : hasExistingScores
                        ? "Saved in Database"
                        : "Draft"}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2563EB] to-[#22c55e] transition-all duration-300 rounded-full"
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>

                {/* Max Score Configuration Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                      Max Score:
                    </span>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1">
                      {["10", "20", "25", "50", "100"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleGlobalMaxScoreChange(preset)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                            globalMaxScore === preset
                              ? "bg-[#2563EB] text-white shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Custom input */}
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={globalMaxScore}
                      onChange={(e) => handleGlobalMaxScoreChange(e.target.value)}
                      className="w-14 h-7 text-center font-extrabold text-xs rounded-lg bg-slate-50 border border-slate-200 text-[#2563EB] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Set per school assessment guidelines
                  </span>
                </div>

                {/* Search & Filter row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search student by name, roll no, GR..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full h-8.5 pl-8.5 pr-7 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                    {studentSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStudentSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setStudentFilter("ALL")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                        studentFilter === "ALL"
                          ? "bg-[#2563EB] text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}
                    >
                      All ({stats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentFilter("PENDING")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                        studentFilter === "PENDING"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}
                    >
                      Pending ({stats.pending})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentFilter("SCORED")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                        studentFilter === "SCORED"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}
                    >
                      Scored ({stats.scored})
                    </button>
                  </div>
                </div>
              </div>

              {/* ── MOBILE STUDENT CARDS (sm:hidden) ── */}
              <div className="sm:hidden space-y-2.5">
                {filteredStudents.map((st) => {
                  const avatarColor = getAvatarColor(st.student_name);
                  const scoreVal = st.score !== "" && st.score !== null ? Number(st.score) : null;
                  const evalInfo = getScoreEvaluation(scoreVal, maxVal);

                  return (
                    <div
                      key={`mob-${st.student_id}`}
                      className={cn(
                        "bg-white rounded-2xl p-3.5 border transition-all shadow-2xs space-y-2.5",
                        st.score !== ""
                          ? "border-emerald-200/80 bg-emerald-50/10"
                          : "border-slate-200"
                      )}
                    >
                      {/* Top Row: Avatar + Name + Roll + Evaluation */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ background: avatarColor }}
                          >
                            {getInitials(st.student_name)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">
                              {st.student_name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              {st.roll_no ? (
                                <span className="font-semibold text-slate-600">Roll #{st.roll_no}</span>
                              ) : (
                                <span>No Roll</span>
                              )}
                              {st.gr_no && <span>• GR: {st.gr_no}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Performance Chip */}
                        {st.score !== "" ? (
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", evalInfo.color)}>
                            {evalInfo.pct}% • {evalInfo.grade} ({evalInfo.label})
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                            Unscored
                          </span>
                        )}
                      </div>

                      {/* Inputs Row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {/* Score Input Block */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxVal}
                            step="0.5"
                            placeholder="0"
                            disabled={isInputDisabled}
                            value={st.score}
                            onChange={(e) => handleScoreChange(st.student_id, "score", e.target.value)}
                            className="w-16 h-10 text-center text-base font-extrabold rounded-xl bg-slate-50 border border-slate-200 text-[#2563EB] focus:bg-white focus:border-[#2563EB] focus:outline-none disabled:opacity-50 disabled:bg-slate-100"
                          />
                          <span className="text-xs font-semibold text-slate-400">/ {maxVal}</span>
                        </div>

                        {/* Remarks Input */}
                        <div className="flex-1 max-w-[200px]">
                          <input
                            type="text"
                            placeholder="Remark..."
                            disabled={isInputDisabled}
                            value={st.remarks || ""}
                            onChange={(e) => handleScoreChange(st.student_id, "remarks", e.target.value)}
                            className="w-full h-9 px-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-xs bg-white rounded-xl border border-dashed border-gray-200">
                    No students found matching your search.
                  </div>
                )}
              </div>

              {/* ── DESKTOP TABLE VIEW (hidden sm:block) ── */}
              <div className="hidden sm:block">
                <div className="rounded-2xl border border-gray-200/90 bg-white shadow-2xs overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/90 border-b border-gray-100">
                      <TableRow>
                        <TableHead className="w-12 text-center font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                          #
                        </TableHead>
                        <TableHead className="w-20 font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                          Roll No.
                        </TableHead>
                        <TableHead className="w-24 font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                          GR No.
                        </TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                          Student Name
                        </TableHead>
                        <TableHead className="w-32 text-center font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                          Score (/{maxVal})
                        </TableHead>
                        <TableHead className="w-36 text-center font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                          Evaluation
                        </TableHead>
                        <TableHead className="w-56 font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                          Remarks
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((st, idx) => {
                        const avatarColor = getAvatarColor(st.student_name);
                        const scoreVal = st.score !== "" && st.score !== null ? Number(st.score) : null;
                        const evalInfo = getScoreEvaluation(scoreVal, maxVal);

                        return (
                          <TableRow
                            key={st.student_id}
                            className={cn(
                              "hover:bg-slate-50/60 transition-colors",
                              st.score !== "" && "bg-emerald-50/20"
                            )}
                          >
                            <TableCell className="text-center font-mono text-xs text-slate-400">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-bold text-[#2563EB]">
                              {st.roll_no || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-500">
                              {st.gr_no || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs"
                                  style={{ background: avatarColor }}
                                >
                                  {getInitials(st.student_name)}
                                </div>
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {st.student_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min="0"
                                max={maxVal}
                                step="0.5"
                                placeholder={`/${maxVal}`}
                                disabled={isInputDisabled}
                                value={st.score}
                                onChange={(e) => handleScoreChange(st.student_id, "score", e.target.value)}
                                className="h-8.5 text-center font-extrabold text-xs bg-slate-50 focus:bg-white text-[#2563EB] rounded-xl border-gray-200 w-24 mx-auto disabled:opacity-50"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {st.score !== "" ? (
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block", evalInfo.color)}>
                                  {evalInfo.pct}% • {evalInfo.grade}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Optional remarks..."
                                disabled={isInputDisabled}
                                value={st.remarks || ""}
                                onChange={(e) => handleScoreChange(st.student_id, "remarks", e.target.value)}
                                className="h-8.5 text-xs bg-slate-50 focus:bg-white rounded-xl border-gray-200 disabled:opacity-50"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* ── STICKY BOTTOM ACTION BAR (Save & Edit) ── */}
              <div className="sticky bottom-16 lg:bottom-4 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-800">Scored:</span>
                  <span className="font-extrabold text-[#2563EB]">
                    {stats.scored} / {stats.total}
                  </span>
                  <span className="text-slate-400">({stats.pct}%)</span>
                </div>

                <div className="flex items-center gap-2">
                  {hasExistingScores && !isEditMode && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(true)}
                      className="rounded-xl text-xs font-bold h-9 px-3 border-gray-200 hover:bg-slate-50"
                    >
                      Edit Scores
                    </Button>
                  )}

                  <Button
                    onClick={handleSaveScores}
                    disabled={isSaving || studentRows.length === 0}
                    className="rounded-xl text-xs gap-1.5 font-bold h-9 sm:h-10 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>{hasExistingScores ? "Update Scores" : "Save Assessments"}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
