"use client";

import { useEffect, useState, useMemo } from "react";
import {
  GraduationCap,
  Save,
  Loader2,
  BookOpen,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Users,
  Lock,
  AlertCircle,
  Search,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Check,
  Calculator,
  FlaskConical,
  FileText,
  UserCheck,
  UserX,
  Clock,
  Award,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getAssignedTeachers } from "@/lib/clerk/assign-teacher";
import { getExamsFull, apiFetch, type ExamFull } from "@/lib/exam-api";
import type { AssignedTeacher } from "@/types/clerk";
import { cn } from "@/lib/utils";

interface StudentMarkRow {
  student_id: number;
  student_name: string;
  roll_no?: string;
  gr_no?: string;
  marks_obtained: string;
  is_absent: boolean;
  remarks?: string;
  status?: string;
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
  is_assigned: boolean;
  exam_count: number;
}

const AVATAR_COLORS = [
  "#2563EB", "#0284C7", "#0BAA78", "#F59E0B", "#0D9488",
  "#EC4899", "#1D4ED8", "#F43F5E", "#10B981", "#3B82F6",
];

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

function formatSubjectName(name: string): string {
  if (!name) return "Subject";
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function getSubjectVisual(name: string) {
  const n = (name || "").toLowerCase();
  if (n.includes("math")) {
    return {
      icon: Calculator,
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    };
  }
  if (n.includes("sci")) {
    return {
      icon: FlaskConical,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    };
  }
  if (n.includes("eng") || n.includes("hin") || n.includes("guj") || n.includes("lang")) {
    return {
      icon: BookOpen,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
    };
  }
  return {
    icon: FileText,
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    iconBg: "bg-sky-50 text-sky-600 border-sky-100",
  };
}

function calculateGrade(obtained: number | null, max: number): { grade: string; color: string; percent: number } {
  if (obtained === null || isNaN(obtained) || max <= 0) {
    return { grade: "—", color: "text-slate-400 bg-slate-50 border-slate-200", percent: 0 };
  }
  const pct = Math.round((obtained / max) * 100);
  if (pct >= 90) return { grade: "A+", color: "text-emerald-700 bg-emerald-50 border-emerald-200", percent: pct };
  if (pct >= 80) return { grade: "A", color: "text-emerald-600 bg-emerald-50 border-emerald-200", percent: pct };
  if (pct >= 70) return { grade: "B+", color: "text-blue-600 bg-blue-50 border-blue-200", percent: pct };
  if (pct >= 60) return { grade: "B", color: "text-blue-500 bg-blue-50 border-blue-200", percent: pct };
  if (pct >= 50) return { grade: "C", color: "text-amber-600 bg-amber-50 border-amber-200", percent: pct };
  if (pct >= 33) return { grade: "D", color: "text-orange-600 bg-orange-50 border-orange-200", percent: pct };
  return { grade: "F", color: "text-rose-600 bg-rose-50 border-rose-200", percent: pct };
}

export default function EnterMarksPage() {
  const [step, setStep] = useState<"CLASS" | "SUBJECT" | "EXAM" | "ENTRY">("CLASS");
  const [assignments, setAssignments] = useState<AssignedTeacher[]>([]);
  const [exams, setExams] = useState<ExamFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Class Filtration state
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilterTab, setClassFilterTab] = useState<"ALL" | "MY_CLASS" | "OTHER_CLASSES">("ALL");

  // Subject step state
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [classSubjects, setClassSubjects] = useState<SubjectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Exam step state
  const [selectedSubject, setSelectedSubject] = useState<{ subject: number | string; subject_name: string } | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamFull | null>(null);

  // Student Entry step state
  const [studentRows, setStudentRows] = useState<StudentMarkRow[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState<"ALL" | "PENDING" | "ENTERED" | "ABSENT">("ALL");
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingMarks, setHasExistingMarks] = useState(false);
  const [marksStatus, setMarksStatus] = useState<string>("DRAFT");
  const [lockedByOtherTeacher, setLockedByOtherTeacher] = useState<string | null>(null);
  const [currentStaffId, setCurrentStaffId] = useState<number | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Determine if user has any class teacher assignment across the school
  const hasAnyClassTeacherAssignment = useMemo(() => {
    return isAdminUser || assignments.some((a) => a.is_class_teacher);
  }, [assignments, isAdminUser]);

  // Determine if current user is Class Teacher for selected class
  const isClassTeacher = useMemo(() => {
    if (isAdminUser) return true;
    if (selectedClass?.is_class_teacher) return true;
    return assignments.some(
      (a) =>
        a.class_name === selectedClass?.class_name &&
        (!selectedClass?.division_name || a.division_name === selectedClass?.division_name) &&
        a.is_class_teacher
    );
  }, [isAdminUser, selectedClass, assignments]);

  const isSubmittedToClassTeacher = !isClassTeacher && (marksStatus === "SUBMITTED" || marksStatus === "VERIFIED");

  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const [assigns, examsData, meData] = await Promise.all([
          getAssignedTeachers(),
          getExamsFull(),
          apiFetch("/api/me/").catch(() => null),
        ]);
        setAssignments(assigns || []);
        setExams(examsData || []);
        if (meData) {
          setCurrentStaffId(meData.staff_profile?.id || null);
          const roles = meData.roles || [];
          const isPrivileged =
            meData.is_superuser ||
            roles.includes("PRINCIPAL") ||
            roles.includes("ADMIN") ||
            roles.includes("CLERK") ||
            roles.includes("ASSISTANT CLERK") ||
            roles.includes("assistant clerk");
          setIsAdminUser(isPrivileged);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load assignments or exams.");
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
        if (isCt) {
          existing.is_class_teacher = true;
        }
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

  // Filter classes according to search input
  const filterClassesList = (list: ClassItem[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((c) => {
      const cName = (c.class_name || "").toLowerCase();
      const dName = (c.division_name || "").toLowerCase();
      const combined = `${cName} ${dName}`.toLowerCase();
      const divCombo = `division ${dName}`.toLowerCase();
      const subMatch = c.subjects.some((s) => s.name.toLowerCase().includes(q));
      return cName.includes(q) || dName.includes(q) || combined.includes(q) || divCombo.includes(q) || subMatch;
    });
  };

  const filteredMyClasses = useMemo(() => filterClassesList(myClasses), [myClasses, searchQuery]);
  const filteredOtherClasses = useMemo(() => filterClassesList(otherClasses), [otherClasses, searchQuery]);
  const filteredAllClasses = useMemo(() => filterClassesList(uniqueClasses), [uniqueClasses, searchQuery]);

  // ─── Class Selection & Subject Loading ──────────────────────────────────────
  const handleClassSelect = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setSubjectSearch("");
    setStep("SUBJECT");
    setLoadingSubjects(true);

    try {
      // Fetch fresh exams to guarantee class teacher exams are available
      const freshExams = await getExamsFull().catch(() => exams);
      if (freshExams && freshExams.length > 0) {
        setExams(freshExams);
      }
      const activeExams = freshExams && freshExams.length > 0 ? freshExams : exams;

      // 1. Subjects directly assigned to this teacher for this class
      const assignedForThisClass = assignments.filter(
        (a) =>
          a.class_name === cls.class_name &&
          (!cls.division_name || a.division_name === cls.division_name)
      );

      // 2. Exams scheduled for this class
      const examsForClass = activeExams.filter((e) => {
        const classMatches =
          (cls.class_id && e.class_group && String(cls.class_id) === String(e.class_group)) ||
          (e.class_name && cls.class_name && e.class_name.toLowerCase().trim() === cls.class_name.toLowerCase().trim());
        if (!classMatches) return false;

        if (e.division && cls.division_name) {
          if (e.division.toLowerCase().trim() !== cls.division_name.toLowerCase().trim()) {
            return false;
          }
        }
        return true;
      });

      // 3. For Admins only, fetch school subjects for this class
      let classSubjectsApi: any[] = [];
      if (cls.class_id && isAdminUser) {
        try {
          const res = await apiFetch(`/classes/${cls.class_id}/subjects/`).catch(() => []);
          classSubjectsApi = Array.isArray(res) ? res : res?.results || res?.data || [];
        } catch { }
      }

      const subjectsMap = new Map<string, SubjectItem>();

      // Add assigned subjects for this teacher
      assignedForThisClass.forEach((a) => {
        if (!a.subject && !a.subject_name) return;
        const key = String(a.subject || a.subject_name).toLowerCase().trim();
        const name = a.subject_name || `Subject #${a.subject}`;
        if (!subjectsMap.has(key)) {
          subjectsMap.set(key, {
            subject: a.subject,
            subject_name: name,
            is_assigned: true,
            exam_count: 0,
          });
        }
      });

      // If global admin/principal user, include other subjects for this class
      if (isAdminUser) {
        classSubjectsApi.forEach((s: any) => {
          const sId = s.id || s.subject_id || 0;
          const sName = s.name || s.subject_name || `Subject #${sId}`;
          const key = String(s.name || s.subject_name || sId).toLowerCase().trim();
          if (!key) return;
          if (!subjectsMap.has(key)) {
            subjectsMap.set(key, {
              subject: sId,
              subject_name: sName,
              is_assigned: false,
              exam_count: 0,
            });
          }
        });
      }

      // Compute available exam counts for each subject
      subjectsMap.forEach((sub) => {
        const count = examsForClass.filter((e) => {
          if (sub.subject && e.subject && String(e.subject) === String(sub.subject)) return true;
          return (e.subject_name || "").toLowerCase().trim() === sub.subject_name.toLowerCase().trim();
        }).length;
        sub.exam_count = count;
      });

      setClassSubjects(Array.from(subjectsMap.values()));
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSubjectSelect = (subjectId: number | string, subjectName: string) => {
    setSelectedSubject({ subject: subjectId, subject_name: subjectName });
    setStep("EXAM");
  };

  const handleExamSelect = async (exam: ExamFull) => {
    setSelectedExam(exam);
    setStudentSearch("");
    setStudentFilter("ALL");
    setStep("ENTRY");
    await loadStudents(exam);
  };

  const loadStudents = async (exam: ExamFull) => {
    setIsLoading(true);
    setIsEditMode(false);
    setHasExistingMarks(false);
    setLockedByOtherTeacher(null);
    setMarksStatus("DRAFT");
    try {
      const division = selectedClass?.division_name;
      const classId = exam.class_group || selectedClass?.class_id;

      let url = `/api/get-student/?school_class=${classId}`;
      if (division) {
        url += `&division=${encodeURIComponent(division)}`;
      }

      const [studentsData, existingMarks] = await Promise.all([
        apiFetch(url),
        apiFetch(`/api/subject-marks/?exam=${exam.id}`).catch(() => []),
      ]);

      const stList = Array.isArray(studentsData) ? studentsData : studentsData?.results || [];
      const marksList = Array.isArray(existingMarks) ? existingMarks : existingMarks?.results || [];

      if (marksList.length > 0) {
        setHasExistingMarks(true);
        const existingStatus = marksList[0]?.status || "DRAFT";
        setMarksStatus(existingStatus);

        const firstEntry = marksList.find((m: any) => m.entered_by_id);
        if (firstEntry && firstEntry.entered_by_id) {
          if (currentStaffId && firstEntry.entered_by_id !== currentStaffId && !isAdminUser && !isClassTeacher) {
            setLockedByOtherTeacher(firstEntry.entered_by_name || `Teacher #${firstEntry.entered_by_id}`);
          }
        }
      }

      const mappedMarks: StudentMarkRow[] = stList.map((s: any) => {
        const existing = marksList.find((m: any) => m.student === s.id);
        return {
          student_id: s.id,
          student_name:
            s.full_name || [s.surname, s.name, s.father_name].filter(Boolean).join(" ") || `Student #${s.id}`,
          roll_no: s.roll_no || "",
          gr_no: s.gr_no || "",
          marks_obtained: existing ? (existing.marks_obtained !== null && existing.marks_obtained !== undefined ? String(existing.marks_obtained) : "") : "",
          is_absent: existing ? Boolean(existing.is_absent) : false,
          remarks: existing ? existing.remarks || "" : "",
          status: existing ? existing.status : "DRAFT",
          is_modified: false,
        };
      });

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
      toast.error(err?.message || "Failed to load students.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkChange = (studentId: number, field: keyof StudentMarkRow, val: any) => {
    if (field === "marks_obtained" && val !== "") {
      const maxMarks = selectedExam?.max_marks || 100;
      if (Number(val) > maxMarks) {
        toast.error(`Marks cannot exceed max marks (${maxMarks}).`);
        val = maxMarks.toString();
      } else if (Number(val) < 0) {
        val = "0";
      }
    }
    setStudentRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, [field]: val, is_modified: true } : r))
    );
  };

  const handleSaveMarks = async (targetStatus: "DRAFT" | "SUBMITTED" = "DRAFT") => {
    if (!selectedExam) return;
    if (targetStatus === "SUBMITTED") {
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }

    try {
      const payload = {
        exam_id: selectedExam.id,
        status: targetStatus,
        marks: studentRows.map((r) => ({
          student_id: r.student_id,
          marks_obtained: r.is_absent ? null : r.marks_obtained !== "" ? Number(r.marks_obtained) : null,
          is_absent: r.is_absent,
          remarks: r.remarks,
          status: targetStatus,
        })),
      };

      await apiFetch("/api/subject-marks/bulk-save/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (targetStatus === "SUBMITTED") {
        toast.success("Marks submitted to Class Teacher successfully! Authority transferred to Class Teacher.");
        setMarksStatus("SUBMITTED");
      } else {
        toast.success("Draft marks saved successfully!");
        setMarksStatus("DRAFT");
      }

      setStudentRows((prev) => prev.map((r) => ({ ...r, is_modified: false, status: targetStatus })));
      setHasExistingMarks(true);
      setIsEditMode(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save marks.");
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  // Filtered exams for current subject
  const matchingExams = useMemo(() => {
    if (!selectedSubject || !selectedClass) return [];
    return exams.filter((e) => {
      const subjectMatches =
        (selectedSubject.subject && e.subject && String(selectedSubject.subject) === String(e.subject)) ||
        (e.subject_name &&
          selectedSubject.subject_name &&
          e.subject_name.toLowerCase().trim() === selectedSubject.subject_name.toLowerCase().trim());
      if (!subjectMatches) return false;

      const classMatches =
        (selectedClass.class_id && e.class_group && String(selectedClass.class_id) === String(e.class_group)) ||
        (e.class_name &&
          selectedClass.class_name &&
          e.class_name.toLowerCase().trim() === selectedClass.class_name.toLowerCase().trim());
      if (!classMatches) return false;

      if (e.division && selectedClass.division_name) {
        if (e.division.toLowerCase().trim() !== selectedClass.division_name.toLowerCase().trim()) {
          return false;
        }
      }
      return true;
    });
  }, [exams, selectedSubject, selectedClass]);

  // Filtered subjects in step === "SUBJECT"
  const filteredClassSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return classSubjects;
    const q = subjectSearch.toLowerCase().trim();
    return classSubjects.filter((s) => s.subject_name.toLowerCase().includes(q));
  }, [classSubjects, subjectSearch]);

  // Summary Metrics in Student Entry Step
  const entryStats = useMemo(() => {
    const total = studentRows.length;
    const absent = studentRows.filter((r) => r.is_absent).length;
    const entered = studentRows.filter((r) => !r.is_absent && r.marks_obtained !== "").length;
    const pending = total - (entered + absent);
    const completionPercent = total > 0 ? Math.round(((entered + absent) / total) * 100) : 0;
    return { total, absent, entered, pending, completionPercent };
  }, [studentRows]);

  // Filtered students in step === "ENTRY"
  const filteredStudents = useMemo(() => {
    return studentRows.filter((st) => {
      // Search matching
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase().trim();
        const nameMatch = st.student_name.toLowerCase().includes(q);
        const rollMatch = (st.roll_no || "").toLowerCase().includes(q);
        const grMatch = (st.gr_no || "").toLowerCase().includes(q);
        if (!nameMatch && !rollMatch && !grMatch) return false;
      }

      // Tab filter
      if (studentFilter === "PENDING") {
        return !st.is_absent && st.marks_obtained === "";
      }
      if (studentFilter === "ENTERED") {
        return !st.is_absent && st.marks_obtained !== "";
      }
      if (studentFilter === "ABSENT") {
        return st.is_absent;
      }
      return true;
    });
  }, [studentRows, studentSearch, studentFilter]);

  const maxMarks = selectedExam?.max_marks || 100;

  return (
    <div className="space-y-4 pb-24 lg:pb-10 px-3 sm:px-6 py-3 sm:py-5 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden font-sans">
      {/* ── Top Compact Breadcrumb Header Bar ── */}
      <div className="bg-white dark:bg-zinc-900 px-4 py-3 sm:py-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {step !== "CLASS" && (
            <button
              type="button"
              onClick={() => {
                if (step === "ENTRY") setStep("EXAM");
                else if (step === "EXAM") setStep("SUBJECT");
                else if (step === "SUBJECT") setStep("CLASS");
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
                {step === "CLASS" && "Marks Entry Portal"}
                {step === "SUBJECT" && `${selectedClass?.class_name} • Div ${selectedClass?.division_name || "A"}`}
                {step === "EXAM" && `${formatSubjectName(selectedSubject?.subject_name || "")}`}
                {step === "ENTRY" && `${selectedExam?.title}`}
              </h1>

              {step === "CLASS" ? (
                hasAnyClassTeacherAssignment ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 shrink-0">
                    Class Teacher Mode
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    Subject Teacher Mode
                  </span>
                )
              ) : isClassTeacher ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Class Teacher Authority
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  Subject Teacher
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {step === "CLASS" && "Select a class to manage student marks"}
              {step === "SUBJECT" && "Select subject to enter marks"}
              {step === "EXAM" && `${selectedClass?.class_name} Div ${selectedClass?.division_name || "A"} • Select exam`}
              {step === "ENTRY" && `${formatSubjectName(selectedSubject?.subject_name || "")} • ${selectedClass?.class_name} Div ${selectedClass?.division_name} • Max: ${maxMarks}`}
            </p>
          </div>
        </div>

        {/* Step Counter Badge */}
        <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
          <span className="text-[#2563EB]">
            {step === "CLASS" && "1"}
            {step === "SUBJECT" && "2"}
            {step === "EXAM" && "3"}
            {step === "ENTRY" && "4"}
          </span>
          <span>/</span>
          <span>4</span>
        </div>
      </div>

      {isLoading && step !== "ENTRY" ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#2563EB]">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading details...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: CLASS SELECTION
             ══════════════════════════════════════════════════════════════════ */}
          {step === "CLASS" && (
            <div className="space-y-4">
              {/* Filtration & Search Bar */}
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search class or division (e.g. Class 8, Div A)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills (Tabs) */}
                {myClasses.length > 0 && otherClasses.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setClassFilterTab("ALL")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        classFilterTab === "ALL"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      All ({uniqueClasses.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setClassFilterTab("MY_CLASS")}
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        classFilterTab === "MY_CLASS"
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "text-slate-600 hover:text-[#2563EB]"
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>My Class ({myClasses.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClassFilterTab("OTHER_CLASSES")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        classFilterTab === "OTHER_CLASSES"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Other Classes ({otherClasses.length})
                    </button>
                  </div>
                )}
              </div>

              {/* ── Section A: "My Class" (Class Teacher) ── */}
              {(classFilterTab === "ALL" || classFilterTab === "MY_CLASS") && myClasses.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#2563EB]" />
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                        My Class
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200">
                        Class Teacher
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {filteredMyClasses.length} {filteredMyClasses.length === 1 ? "class" : "classes"}
                    </span>
                  </div>

                  {filteredMyClasses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredMyClasses.map((cls, idx) => (
                        <Card
                          key={`my-class-${idx}`}
                          className="cursor-pointer border-2 border-blue-200/90 hover:border-[#2563EB] bg-gradient-to-br from-white via-blue-50/20 to-white hover:shadow-md transition-all group rounded-2xl shadow-xs overflow-hidden"
                          onClick={() => handleClassSelect(cls)}
                        >
                          <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white shrink-0 shadow-xs">
                                <Users className="h-5 w-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-extrabold text-slate-900 text-sm truncate">
                                  {cls.class_name}
                                </h3>
                                <p className="text-xs font-semibold text-[#2563EB]">
                                  Division {cls.division_name || "A"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  Full Marks Entry Authority
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center text-[#2563EB] shrink-0 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="py-5 text-center text-slate-500 text-xs bg-white rounded-xl border border-dashed border-gray-200">
                      No &quot;My Class&quot; matching &quot;{searchQuery}&quot;.
                    </div>
                  )}
                </div>
              )}

              {/* ── Section B: "Other Classes" (Subject Teacher) ── */}
              {(classFilterTab === "ALL" || classFilterTab === "OTHER_CLASSES") && otherClasses.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                        {myClasses.length > 0 ? "Other Classes" : "Assigned Classes"}
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Subject Teacher
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {filteredOtherClasses.length} {filteredOtherClasses.length === 1 ? "class" : "classes"}
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
                      No other classes matching &quot;{searchQuery}&quot;.
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
                    You have not been assigned to any classes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: SUBJECT SELECTION (FIXED & STREAMLINED)
             ══════════════════════════════════════════════════════════════════ */}
          {step === "SUBJECT" && (
            <div className="space-y-3.5">
              {/* Class Teacher Guidance Banner */}
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
                        Enter marks for your assigned subject below. Once other subject teachers submit their marks, you can review, verify, and finalize results in Verify Marks.
                      </p>
                    </div>
                  </div>
                  <a
                    href="/teacher/verify-marks"
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
                  >
                    <span>Verify & Finalize Results</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Search Bar for subjects if multiple */}
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

              {loadingSubjects ? (
                <div className="py-16 text-center text-[#2563EB]">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Loading subjects...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {filteredClassSubjects.map((sub, idx) => {
                    const visual = getSubjectVisual(sub.subject_name);
                    const Icon = visual.icon;
                    const hasExams = sub.exam_count > 0;

                    return (
                      <Card
                        key={`sub-${idx}`}
                        className={cn(
                          "cursor-pointer border transition-all rounded-2xl shadow-2xs group overflow-hidden",
                          hasExams
                            ? "bg-white hover:border-[#2563EB] hover:shadow-md"
                            : "bg-white/80 hover:bg-white border-slate-200"
                        )}
                        onClick={() => handleSubjectSelect(sub.subject, sub.subject_name)}
                      >
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", visual.iconBg)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-slate-900 text-sm truncate">
                                {formatSubjectName(sub.subject_name)}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {sub.is_assigned ? (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Check className="w-2.5 h-2.5" /> Assigned
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200">
                                    Class Subject
                                  </span>
                                )}

                                {hasExams ? (
                                  <span className="inline-flex items-center text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#2563EB] border border-sky-200">
                                    {sub.exam_count} {sub.exam_count === 1 ? "Exam" : "Exams"}
                                  </span>
                                ) : (
                                  <span className="text-[9.5px] font-medium text-slate-400">
                                    No exams yet
                                  </span>
                                )}
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
                        <p className="font-bold text-slate-700 text-sm">No Assigned Subjects for You</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {selectedClass?.is_class_teacher
                            ? "You are the Class Teacher for this class. Subject teachers enter marks for their assigned subjects and submit them to you. You can review all submissions and compile final results in Verify Marks."
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
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 3: EXAM SELECTION (FIXED & POLISHED)
             ══════════════════════════════════════════════════════════════════ */}
          {step === "EXAM" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {matchingExams.map((ex) => (
                  <Card
                    key={ex.id}
                    className="cursor-pointer border border-gray-200 hover:border-[#2563EB] hover:shadow-md transition-all group rounded-2xl shadow-2xs bg-white overflow-hidden"
                    onClick={() => handleExamSelect(ex)}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                          <Calendar className="h-5 w-5 text-[#2563EB]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate">
                            {ex.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span>Max: <strong className="text-slate-800">{ex.max_marks || 100}</strong></span>
                            <span>•</span>
                            <span>{ex.exam_date || "Date scheduled"}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </CardContent>
                  </Card>
                ))}

                {matchingExams.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-dashed border-gray-200">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No exams scheduled for this subject</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No examination has been created for {formatSubjectName(selectedSubject?.subject_name || "")} in {selectedClass?.class_name}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 4: ENTER STUDENT MARKS (MOBILE-FIRST & DESKTOP OPTIMIZED)
             ══════════════════════════════════════════════════════════════════ */}
          {step === "ENTRY" && (
            <div className="space-y-3.5">
              {/* Informational Banners */}
              {isSubmittedToClassTeacher && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <strong>Marks Submitted to Class Teacher: </strong>
                    These marks have been submitted. Editing authority belongs to the Class Teacher.
                  </div>
                </div>
              )}

              {isClassTeacher && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between gap-2.5 text-blue-900 text-xs">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#2563EB] shrink-0" />
                    <span>
                      <strong>Class Teacher Authority:</strong> You can edit and update any student marks directly.
                    </span>
                  </div>
                  <Badge className="bg-[#2563EB] text-white text-[10px] shrink-0">Class Teacher</Badge>
                </div>
              )}

              {/* Progress & Summary Bar */}
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                    <span className="font-bold text-slate-700">Progress:</span>
                    <span className="font-extrabold text-[#2563EB]">
                      {entryStats.entered + entryStats.absent} / {entryStats.total}
                    </span>
                    <span className="text-slate-400">({entryStats.completionPercent}%)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                    <Badge
                      className={
                        marksStatus === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]"
                          : marksStatus === "SUBMITTED"
                            ? "bg-blue-100 text-blue-800 border-blue-200 text-[10px]"
                            : "bg-amber-100 text-amber-800 border-amber-200 text-[10px]"
                      }
                    >
                      {marksStatus === "VERIFIED"
                        ? "Verified"
                        : marksStatus === "SUBMITTED"
                          ? "Submitted"
                          : "Draft"}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2563EB] to-[#22c55e] transition-all duration-300 rounded-full"
                    style={{ width: `${entryStats.completionPercent}%` }}
                  />
                </div>

                {/* Search & Filter row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search student by name, roll no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full h-8.5 pl-8.5 pr-7 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white"
                    />
                    {studentSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-0.5 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => setStudentFilter("ALL")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        studentFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                      )}
                    >
                      All ({entryStats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentFilter("PENDING")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        studentFilter === "PENDING" ? "bg-white text-amber-700 shadow-2xs" : "text-slate-600"
                      )}
                    >
                      Pending ({entryStats.pending})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentFilter("ENTERED")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        studentFilter === "ENTERED" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"
                      )}
                    >
                      Entered ({entryStats.entered})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentFilter("ABSENT")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        studentFilter === "ABSENT" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-600"
                      )}
                    >
                      Absent ({entryStats.absent})
                    </button>
                  </div>
                </div>
              </div>

              {/* ── MOBILE-FRIENDLY STUDENT CARD LIST (sm:hidden) ── */}
              <div className="block sm:hidden space-y-2.5">
                {filteredStudents.map((st) => {
                  const avatarColor = getAvatarColor(st.student_id);
                  const marksVal = st.marks_obtained !== "" ? Number(st.marks_obtained) : null;
                  const gradeInfo = calculateGrade(marksVal, maxMarks);
                  const isLocked = isSubmittedToClassTeacher || (hasExistingMarks && !isEditMode && !isClassTeacher);

                  return (
                    <div
                      key={`mob-${st.student_id}`}
                      className={cn(
                        "bg-white rounded-2xl p-3.5 border transition-all shadow-2xs space-y-2.5",
                        st.is_absent
                          ? "border-rose-200 bg-rose-50/20"
                          : st.marks_obtained !== ""
                            ? "border-emerald-200/80 bg-emerald-50/10"
                            : "border-slate-200"
                      )}
                    >
                      {/* Student Top Row */}
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

                        {/* Grade / Status Chip */}
                        {st.is_absent ? (
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            ABSENT
                          </span>
                        ) : st.marks_obtained !== "" ? (
                          <span className={cn("text-[10.5px] font-bold px-2 py-0.5 rounded-full border", gradeInfo.color)}>
                            {gradeInfo.percent}% • {gradeInfo.grade}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                            Unmarked
                          </span>
                        )}
                      </div>

                      {/* Marks Input & Absent Control Row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {/* Marks Input Block */}
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max={maxMarks}
                              placeholder="0"
                              disabled={st.is_absent || isLocked}
                              value={st.marks_obtained}
                              onChange={(e) => handleMarkChange(st.student_id, "marks_obtained", e.target.value)}
                              className="w-16 h-10 text-center text-base font-extrabold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-[#2563EB] focus:outline-none disabled:opacity-40 disabled:bg-slate-100"
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-400">/ {maxMarks}</span>
                        </div>

                        {/* Absent Checkbox Button */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            const nextAbsent = !st.is_absent;
                            handleMarkChange(st.student_id, "is_absent", nextAbsent);
                            if (nextAbsent) {
                              handleMarkChange(st.student_id, "marks_obtained", "");
                            }
                          }}
                          className={cn(
                            "h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5",
                            st.is_absent
                              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>{st.is_absent ? "Absent" : "Mark Absent"}</span>
                        </button>
                      </div>

                      {/* Remarks Row */}
                      <div>
                        <input
                          type="text"
                          placeholder="Remark (optional)..."
                          disabled={isLocked}
                          value={st.remarks || ""}
                          onChange={(e) => handleMarkChange(st.student_id, "remarks", e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-700 placeholder-slate-400 focus:bg-white focus:border-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-dashed border-gray-200">
                    No students matching &quot;{studentSearch}&quot;.
                  </div>
                )}
              </div>

              {/* ── DESKTOP DATA TABLE (hidden sm:block) ── */}
              <div className="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <Table className="min-w-[700px]">
                    <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                      <TableRow>
                        <TableHead className="w-12 text-center font-bold text-xs uppercase text-slate-500">#</TableHead>
                        <TableHead className="w-20 font-bold text-xs uppercase text-slate-500">Roll</TableHead>
                        <TableHead className="w-24 font-bold text-xs uppercase text-slate-500">GR No.</TableHead>
                        <TableHead className="font-bold text-xs uppercase text-slate-500">Student Name</TableHead>
                        <TableHead className="w-20 text-center font-bold text-xs uppercase text-slate-500">Max</TableHead>
                        <TableHead className="w-32 text-center font-bold text-xs uppercase text-slate-500">Marks</TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs uppercase text-slate-500">Grade</TableHead>
                        <TableHead className="w-20 text-center font-bold text-xs uppercase text-slate-500">Absent?</TableHead>
                        <TableHead className="w-44 font-bold text-xs uppercase text-slate-500">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((st, idx) => {
                        const marksVal = st.marks_obtained !== "" ? Number(st.marks_obtained) : null;
                        const gradeInfo = calculateGrade(marksVal, maxMarks);
                        const isLocked = isSubmittedToClassTeacher || (hasExistingMarks && !isEditMode && !isClassTeacher);

                        return (
                          <TableRow key={`dt-${st.student_id}`} className="hover:bg-slate-50/50">
                            <TableCell className="text-center font-mono text-xs text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-mono font-bold text-[#2563EB]">
                              {st.roll_no ? `#${st.roll_no}` : "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-500">{st.gr_no || "—"}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-900">{st.student_name}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-slate-500">{maxMarks}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={maxMarks}
                                placeholder="Marks"
                                disabled={st.is_absent || isLocked}
                                value={st.marks_obtained}
                                onChange={(e) => handleMarkChange(st.student_id, "marks_obtained", e.target.value)}
                                className="h-8.5 text-center font-extrabold bg-slate-50 focus:bg-white text-xs rounded-xl border-gray-200"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {st.is_absent ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                  ABSENT
                                </span>
                              ) : st.marks_obtained !== "" ? (
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", gradeInfo.color)}>
                                  {gradeInfo.grade}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={isLocked}
                                  checked={st.is_absent}
                                  onChange={(e) => {
                                    handleMarkChange(st.student_id, "is_absent", e.target.checked);
                                    if (e.target.checked) {
                                      handleMarkChange(st.student_id, "marks_obtained", "");
                                    }
                                  }}
                                  className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                                />
                              </label>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Remark..."
                                disabled={isLocked}
                                value={st.remarks || ""}
                                onChange={(e) => handleMarkChange(st.student_id, "remarks", e.target.value)}
                                className="h-8.5 text-xs bg-slate-50 focus:bg-white rounded-xl border-gray-200"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* ── STICKY BOTTOM ACTION BAR (Save & Submit) ── */}
              <div className="sticky bottom-16 lg:bottom-4 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-800">Entered:</span>
                  <span className="font-extrabold text-[#2563EB]">
                    {entryStats.entered + entryStats.absent} / {entryStats.total}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasExistingMarks && !isEditMode && !isSubmittedToClassTeacher && !lockedByOtherTeacher && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(true)}
                      className="rounded-xl text-xs font-bold h-9 px-3 border-gray-200"
                    >
                      Edit Marks
                    </Button>
                  )}

                  <Button
                    onClick={() => handleSaveMarks("DRAFT")}
                    disabled={
                      isSaving ||
                      isSubmitting ||
                      studentRows.length === 0 ||
                      isSubmittedToClassTeacher ||
                      (!!lockedByOtherTeacher && !isClassTeacher)
                    }
                    variant="outline"
                    className="rounded-xl text-xs gap-1.5 font-bold h-9 sm:h-10 px-3.5 border-blue-200 text-[#2563EB] hover:bg-blue-50"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Save Draft</span>
                  </Button>

                  <Button
                    onClick={() => handleSaveMarks("SUBMITTED")}
                    disabled={
                      isSaving ||
                      isSubmitting ||
                      studentRows.length === 0 ||
                      isSubmittedToClassTeacher ||
                      (!!lockedByOtherTeacher && !isClassTeacher)
                    }
                    className="rounded-xl text-xs gap-1.5 font-bold h-9 sm:h-10 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <GraduationCap className="h-3.5 w-3.5" />
                    )}
                    <span>{isClassTeacher ? "Submit Marks" : "Submit to Class Teacher"}</span>
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
