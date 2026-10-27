"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Users, CheckCircle2, Loader2, Calendar, 
  ChevronRight, ArrowLeft, GraduationCap, XCircle, Lock, Unlock,
  Sparkles, BookOpen, Award, Search, Download, TrendingUp, BarChart3, Percent,
  Edit3, Save, Clock, LayoutGrid, Table as TableIcon
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { getAssignedTeachers } from "@/lib/clerk/assign-teacher";
import { getAcademicYears } from "@/lib/fees/academic-year";
import { getExamTerms, type ExamTerm } from "@/lib/exam-api";
import { apiFetch } from "@/lib/exam-api";
import type { AcademicYear } from "@/types/fees";

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VerifyMarksPage() {
  const [step, setStep] = useState<"CLASS" | "YEAR" | "VERIFY">("VERIFY");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);
  
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<ExamTerm | null>(null);

  const [verificationData, setVerificationData] = useState<any | null>(null);
  const [remarks, setRemarks] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile View Toggle: "cards" vs "table"
  const [mobileViewMode, setMobileViewMode] = useState<"cards" | "table">("cards");

  // Grid Data
  const [gridData, setGridData] = useState<{
    terms?: any[];
    teacher_assessment_subjects?: any[];
    subjects: any[];
    students: any[];
  } | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<string>("ALL");

  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const [assigns, years] = await Promise.all([
          getAssignedTeachers(),
          getAcademicYears()
        ]);
        
        const ctAssignments = (assigns || []).filter((a: any) => a.is_class_teacher);
        
        const classesMap = new Map();
        ctAssignments.forEach((a: any) => {
          if (!a.class_name) return;
          const key = `${a.class_name}-${a.division_name || ""}`;
          if (!classesMap.has(key)) {
            classesMap.set(key, {
              class_name: a.class_name,
              division_name: a.division_name || "",
              class_id: a.class_id || a.class_name_id || a.school_class || a.division_name_id || "",
            });
          }
        });
        
        const uniqueCTClasses = Array.from(classesMap.values());
        setClassTeacherAssignments(uniqueCTClasses);
        setAcademicYears(years || []);

        const defaultYear = (years || []).find((y: any) => y.is_active) || (years || [])[0] || null;

        // Auto-advance directly to verification if 1 class teacher assignment and 1 year
        if (uniqueCTClasses.length > 0 && defaultYear) {
          const firstClass = uniqueCTClasses[0];
          setSelectedClass(firstClass);
          setSelectedYear(defaultYear);
          setStep("VERIFY");
          const terms = await getExamTerms(defaultYear.id).catch(() => []);
          setExamTerms(terms || []);
          await loadVerificationDataForClass(firstClass, defaultYear.id, null);
        } else if (uniqueCTClasses.length > 1) {
          setStep("CLASS");
        } else if (uniqueCTClasses.length === 0) {
          setStep("CLASS");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load class verification data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, []);

  const handleClassSelect = async (cls: any) => {
    setSelectedClass(cls);
    const defaultYear = (academicYears || []).find((y: any) => y.is_active) || (academicYears || [])[0] || null;
    if (defaultYear) {
      setSelectedYear(defaultYear);
      setStep("VERIFY");
      setIsLoading(true);
      try {
        const terms = await getExamTerms(defaultYear.id).catch(() => []);
        setExamTerms(terms || []);
        setActiveTab("ALL");
        setSearchQuery("");
        await loadVerificationDataForClass(cls, defaultYear.id, null);
      } catch (err: any) {
        toast.error("Failed to load verification grid.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep("YEAR");
    }
  };

  const handleYearSelect = async (year: AcademicYear) => {
    setSelectedYear(year);
    setIsLoading(true);
    try {
      const terms = await getExamTerms(year.id).catch(() => []);
      setExamTerms(terms || []);
      setStep("VERIFY");
      setActiveTab("ALL");
      setSearchQuery("");
      if (selectedClass) {
        await loadVerificationDataForClass(selectedClass, year.id, null);
      }
    } catch (err: any) {
      toast.error("Failed to load exam verification data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadVerificationDataForClass = async (cls: any, yearId?: number, termId?: number | null) => {
    if (!yearId || !cls) return;
    setIsLoading(true);
    try {
      const classId = cls.class_id;
      const className = cls.class_name;
      const division = cls.division_name;
      
      // 1. Fetch Verification Status
      let statusUrl = `/api/class-verification/?academic_year=${yearId}`;
      if (classId) statusUrl += `&school_class=${classId}`;
      else statusUrl += `&class_name=${encodeURIComponent(className)}`;
      if (termId) statusUrl += `&exam_term=${termId}`;
      if (division) statusUrl += `&division=${encodeURIComponent(division)}`;
      
      // 2. Fetch Comprehensive Marks Grid
      let gridUrl = `/api/class-verification/marks-grid/?academic_year=${yearId}`;
      if (classId) gridUrl += `&school_class=${classId}`;
      else gridUrl += `&class_name=${encodeURIComponent(className)}`;
      if (division) gridUrl += `&division=${encodeURIComponent(division)}`;

      const [statusRes, gridRes] = await Promise.all([
        apiFetch(statusUrl).catch(() => []),
        apiFetch(gridUrl).catch(() => null)
      ]);

      const statusData = Array.isArray(statusRes) ? statusRes : statusRes?.results || [];
      if (statusData.length > 0) {
        setVerificationData(statusData[0]);
        setRemarks(statusData[0].remarks || "");
      } else {
        setVerificationData(null);
        setRemarks("");
      }

      setGridData(gridRes);
    } catch (err: any) {
      toast.error("Failed to load class verification data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadVerificationData = async (yearId?: number, termId?: number | null) => {
    return loadVerificationDataForClass(selectedClass, yearId, termId);
  };

  const handleTermMarkChange = (studentId: number, termId: string, subjectId: string, val: string | number | null, isAbsent: boolean = false) => {
    setGridData((prev) => {
      if (!prev) return prev;
      const updatedStudents = prev.students.map((st: any) => {
        if (st.id !== studentId) return st;
        const currentTermMarks = { ...(st.terms_marks || {}) };
        const currentSubjectMarks = { ...(currentTermMarks[termId] || {}) };
        const existingMark = currentSubjectMarks[subjectId] || {};

        let scoreVal = val === "" || val === null ? null : Number(val);
        if (scoreVal !== null && existingMark.max && scoreVal > existingMark.max) {
          toast.error(`Marks cannot exceed max marks (${existingMark.max})`);
          scoreVal = existingMark.max;
        }

        currentSubjectMarks[subjectId] = {
          ...existingMark,
          score: isAbsent ? 0 : scoreVal,
          is_absent: isAbsent,
          is_modified: true,
        };
        currentTermMarks[termId] = currentSubjectMarks;

        return {
          ...st,
          terms_marks: currentTermMarks,
        };
      });

      return { ...prev, students: updatedStudents };
    });
  };

  const handleTeacherAssessmentChange = (studentId: number, subjectId: string, val: string | number | null) => {
    setGridData((prev) => {
      if (!prev) return prev;
      const updatedStudents = prev.students.map((st: any) => {
        if (st.id !== studentId) return st;
        const currentTAs = { ...(st.teacher_assessments || {}) };
        const existingTA = currentTAs[subjectId] || {};

        let scoreVal = val === "" || val === null ? null : Number(val);
        if (scoreVal !== null && existingTA.max_score && scoreVal > existingTA.max_score) {
          toast.error(`Score cannot exceed max score (${existingTA.max_score})`);
          scoreVal = existingTA.max_score;
        }

        currentTAs[subjectId] = {
          ...existingTA,
          score: scoreVal,
          is_modified: true,
        };

        return {
          ...st,
          teacher_assessments: currentTAs,
        };
      });

      return { ...prev, students: updatedStudents };
    });
  };

  const handleSaveClassMarks = async () => {
    if (!selectedYear || !selectedClass || !gridData) return;
    setIsSavingMarks(true);

    try {
      const marksPayload: any[] = [];
      const taPayload: any[] = [];

      gridData.students.forEach((st: any) => {
        // Collect exam marks
        if (st.terms_marks) {
          Object.values(st.terms_marks).forEach((subjMap: any) => {
            Object.values(subjMap).forEach((m: any) => {
              if (m.exam_id) {
                marksPayload.push({
                  exam_id: m.exam_id,
                  student_id: st.id,
                  marks_obtained: m.is_absent ? null : m.score,
                  is_absent: m.is_absent || false,
                  remarks: m.remarks || "",
                });
              }
            });
          });
        }

        // Collect teacher assessments
        if (st.teacher_assessments) {
          Object.entries(st.teacher_assessments).forEach(([subjId, ta]: [string, any]) => {
            if (ta.score !== null && ta.score !== undefined) {
              taPayload.push({
                student_id: st.id,
                subject_id: Number(subjId),
                score: Number(ta.score),
                max_score: Number(ta.max_score || 10),
                remarks: ta.remarks || "",
              });
            }
          });
        }
      });

      const payload = {
        academic_year: selectedYear.id,
        school_class: selectedClass.class_id,
        class_name: selectedClass.class_name,
        division: selectedClass.division_name || "",
        marks: marksPayload,
        teacher_assessments: taPayload,
      };

      await apiFetch("/api/class-verification/bulk-save-marks/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("🎉 Class marks saved successfully by Class Teacher!");
      setIsEditMode(false);
      await loadVerificationData(selectedYear.id, selectedTerm?.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save class marks.");
    } finally {
      setIsSavingMarks(false);
    }
  };

  const handleSubmitAndVerify = async () => {
    if (!selectedYear || !selectedClass) return;
    
    // If in edit mode, save first
    if (isEditMode) {
      await handleSaveClassMarks();
    }

    await handleVerifyAction("VERIFIED");
  };

  const handleVerifyAction = async (action: "VERIFIED" | "SENT_BACK" | "PENDING") => {
    if (!selectedYear || !selectedClass) return;
    
    if (action === "SENT_BACK" && !remarks.trim()) {
      toast.error("Remarks are required when sending back to subject teachers.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        academic_year: selectedYear.id,
        exam_term: selectedTerm?.id || null,
        school_class: selectedClass.class_id,
        class_name: selectedClass.class_name,
        division: selectedClass.division_name || "",
        status: action,
        remarks: remarks,
      };

      if (verificationData?.id) {
        await apiFetch(`/api/class-verification/${verificationData.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/api/class-verification/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      toast.success(
        action === "VERIFIED"
          ? "✅ Class marks submitted, verified, and locked successfully!"
          : action === "PENDING"
          ? "🔓 Class verification unlocked! You can now edit marks."
          : "⚠️ Marks sent back to subject teachers with remarks."
      );
      await loadVerificationData(selectedYear.id, selectedTerm?.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update verification status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVerified = verificationData?.status === "VERIFIED";

  const getStatusBadge = (status: string) => {
    if (status === "VERIFIED") {
      return (
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <Lock className="w-3.5 h-3.5" /> LOCKED & VERIFIED
        </span>
      );
    }
    if (status === "SENT_BACK") {
      return (
        <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <XCircle className="w-3.5 h-3.5" /> SENT BACK
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
        <Clock className="w-3.5 h-3.5" /> PENDING VERIFICATION
      </span>
    );
  };

  const getGradeAndColor = (pct: number | null, isAbsent: boolean) => {
    if (pct === null) return { grade: "—", label: "Pending", bg: "bg-slate-100 text-slate-500 border-slate-200" };
    if (isAbsent) return { grade: "AB", label: "Absent", bg: "bg-red-100 text-red-700 border-red-200" };
    if (pct >= 90) return { grade: "A+", label: "Outstanding", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    if (pct >= 80) return { grade: "A", label: "Distinction", bg: "bg-teal-100 text-teal-800 border-teal-300" };
    if (pct >= 70) return { grade: "B+", label: "First Class", bg: "bg-blue-100 text-blue-800 border-blue-300" };
    if (pct >= 60) return { grade: "B", label: "Second Class", bg: "bg-sky-100 text-sky-800 border-sky-300" };
    if (pct >= 50) return { grade: "C", label: "Higher Second", bg: "bg-cyan-100 text-cyan-800 border-cyan-300" };
    if (pct >= 35) return { grade: "D", label: "Pass", bg: "bg-amber-100 text-amber-800 border-amber-300" };
    return { grade: "F", label: "Fail / Low", bg: "bg-rose-100 text-rose-800 border-rose-300" };
  };

  // Data helpers
  const terms = gridData?.terms || [];
  const taSubjects = gridData?.teacher_assessment_subjects || [];
  const rawStudents = gridData?.students || [];

  // Filtered students by search
  const students = useMemo(() => {
    if (!searchQuery.trim()) return rawStudents;
    const q = searchQuery.toLowerCase();
    return rawStudents.filter((s: any) => 
      (s.name || "").toLowerCase().includes(q) ||
      (s.roll_no || "").toLowerCase().includes(q) ||
      (s.gr_no || "").toLowerCase().includes(q)
    );
  }, [rawStudents, searchQuery]);

  // Compute student totals per tab
  const getStudentTotals = (st: any) => {
    let totalMax = 0;
    let totalObtained = 0;
    let hasAnyMarks = false;
    let allAbsent = true;

    if (activeTab === "ALL") {
      terms.forEach((t: any) => {
        t.subjects.forEach((sub: any) => {
          const mark = st.terms_marks?.[t.id]?.[String(sub.id)];
          totalMax += Number(sub.max_marks) || 0;
          if (mark) {
            hasAnyMarks = true;
            if (!mark.is_absent && mark.score !== null && mark.score !== undefined) {
              totalObtained += Number(mark.score);
              allAbsent = false;
            }
          }
        });
      });
      taSubjects.forEach((sub: any) => {
        const ta = st.teacher_assessments?.[String(sub.id)];
        totalMax += Number(sub.max_score) || 0;
        if (ta) {
          hasAnyMarks = true;
          if (ta.score !== null && ta.score !== undefined) {
            totalObtained += Number(ta.score);
            allAbsent = false;
          }
        }
      });
    } else if (activeTab === "TEACHER_ASSESSMENT") {
      taSubjects.forEach((sub: any) => {
        const ta = st.teacher_assessments?.[String(sub.id)];
        totalMax += Number(sub.max_score) || 0;
        if (ta) {
          hasAnyMarks = true;
          if (ta.score !== null && ta.score !== undefined) {
            totalObtained += Number(ta.score);
            allAbsent = false;
          }
        }
      });
    } else {
      // Specific Term
      const currentTerm = terms.find((t: any) => t.id === activeTab);
      const currentSubjects = currentTerm?.subjects || [];
      currentSubjects.forEach((sub: any) => {
        const mark = st.terms_marks?.[activeTab]?.[String(sub.id)];
        totalMax += Number(sub.max_marks) || 0;
        if (mark) {
          hasAnyMarks = true;
          if (!mark.is_absent && mark.score !== null && mark.score !== undefined) {
            totalObtained += Number(mark.score);
            allAbsent = false;
          }
        }
      });
    }

    const percentage = totalMax > 0 && hasAnyMarks ? ((totalObtained / totalMax) * 100) : null;
    return { totalMax, totalObtained, percentage, isAbsent: hasAnyMarks && allAbsent, hasAnyMarks };
  };

  // Class Summary Statistics
  const classStats = useMemo(() => {
    if (rawStudents.length === 0) return { avgPct: "0.0", topPct: "0.0", passCount: 0, total: 0, passRate: "0.0" };
    let sumPct = 0;
    let count = 0;
    let maxPct = 0;
    let pass = 0;

    rawStudents.forEach((st: any) => {
      const { percentage } = getStudentTotals(st);
      if (percentage !== null) {
        sumPct += percentage;
        count++;
        if (percentage > maxPct) maxPct = percentage;
        if (percentage >= 35) pass++;
      }
    });

    return {
      total: rawStudents.length,
      evaluated: count,
      avgPct: count > 0 ? (sumPct / count).toFixed(1) : "0.0",
      topPct: maxPct.toFixed(1),
      passCount: pass,
      passRate: count > 0 ? ((pass / count) * 100).toFixed(1) : "0.0"
    };
  }, [rawStudents, activeTab, terms, taSubjects]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (students.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const headers = ["#", "Roll No", "GR No", "Student Name"];

    if (activeTab === "ALL") {
      terms.forEach((t: any) => {
        t.subjects.forEach((sub: any) => {
          headers.push(`${t.name} - ${sub.name} (Max: ${sub.max_marks})`);
        });
      });
      taSubjects.forEach((sub: any) => {
        headers.push(`TA - ${sub.name} (Max: ${sub.max_score})`);
      });
    } else if (activeTab === "TEACHER_ASSESSMENT") {
      taSubjects.forEach((sub: any) => {
        headers.push(`TA - ${sub.name} (Max: ${sub.max_score})`);
      });
    } else {
      const currentTerm = terms.find((t: any) => t.id === activeTab);
      (currentTerm?.subjects || []).forEach((sub: any) => {
        headers.push(`${currentTerm?.name || "Term"} - ${sub.name} (Max: ${sub.max_marks})`);
      });
    }

    headers.push("Total Max Marks", "Total Gained Marks", "Percentage (%)", "Grade");

    const rows = students.map((st: any, idx: number) => {
      const row = [
        String(idx + 1),
        st.roll_no || "",
        st.gr_no || "",
        st.name || "",
      ];

      if (activeTab === "ALL") {
        terms.forEach((t: any) => {
          t.subjects.forEach((sub: any) => {
            const mark = st.terms_marks?.[t.id]?.[String(sub.id)];
            row.push(mark ? (mark.is_absent ? "AB" : String(mark.score)) : "—");
          });
        });
        taSubjects.forEach((sub: any) => {
          const ta = st.teacher_assessments?.[String(sub.id)];
          row.push(ta && ta.score !== null ? String(ta.score) : "—");
        });
      } else if (activeTab === "TEACHER_ASSESSMENT") {
        taSubjects.forEach((sub: any) => {
          const ta = st.teacher_assessments?.[String(sub.id)];
          row.push(ta && ta.score !== null ? String(ta.score) : "—");
        });
      } else {
        const currentTerm = terms.find((t: any) => t.id === activeTab);
        (currentTerm?.subjects || []).forEach((sub: any) => {
          const mark = st.terms_marks?.[activeTab]?.[String(sub.id)];
          row.push(mark ? (mark.is_absent ? "AB" : String(mark.score)) : "—");
        });
      }

      const { totalMax, totalObtained, percentage, isAbsent } = getStudentTotals(st);
      const gradeInfo = getGradeAndColor(percentage, isAbsent);

      row.push(
        String(totalMax),
        String(totalObtained),
        percentage !== null ? `${percentage.toFixed(1)}%` : "—",
        gradeInfo.grade
      );

      return row;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `class_marks_${selectedClass?.class_name || "class"}_${selectedClass?.division_name || ""}_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-28 lg:pb-12 px-3 sm:px-6 py-3 sm:py-5 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden font-sans">
      {/* ── Compact Breadcrumb Header Bar ── */}
      <div className="bg-white dark:bg-zinc-900 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {step !== "CLASS" && classTeacherAssignments.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (step === "VERIFY") setStep("CLASS");
                else if (step === "YEAR") setStep("CLASS");
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-100 truncate">
                {step === "CLASS" && "Class Verification"}
                {step === "YEAR" && "Select Academic Year"}
                {step === "VERIFY" && `${selectedClass?.class_name} • Div ${selectedClass?.division_name || "A"}`}
              </h1>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 shrink-0 hidden sm:inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Class Teacher Authority
              </span>

              {step === "VERIFY" && getStatusBadge(verificationData?.status || "PENDING")}
            </div>

            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {step === "CLASS" && "Select a class to review and verify student marks"}
              {step === "YEAR" && "Choose academic year for verification"}
              {step === "VERIFY" && `Consolidated Master Marks • ${rawStudents.length} Students`}
            </p>
          </div>
        </div>

        {/* Right Action: Year Switcher & Class Switcher */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {/* Year Switcher */}
          {academicYears.length > 1 ? (
            <select
              value={selectedYear?.id || ""}
              onChange={(e) => {
                const yr = academicYears.find((y) => String(y.id) === e.target.value);
                if (yr) handleYearSelect(yr);
              }}
              className="text-[11px] font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-2 sm:px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  📅 {y.name} {y.is_active ? "(Active)" : ""}
                </option>
              ))}
            </select>
          ) : selectedYear ? (
            <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 border border-blue-200 rounded-xl px-2 sm:px-2.5 py-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{selectedYear.name}</span>
            </span>
          ) : null}

          {/* If multiple class teacher assignments, allow switching */}
          {classTeacherAssignments.length > 1 && step === "VERIFY" && (
            <button
              type="button"
              onClick={() => setStep("CLASS")}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Change Class
            </button>
          )}
        </div>
      </div>

      {isLoading && step !== "VERIFY" ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#2563EB]">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading verification data...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              STEP: CLASS SELECTION
             ══════════════════════════════════════════════════════════════════ */}
          {step === "CLASS" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {classTeacherAssignments.map((cls, idx) => (
                  <Card 
                    key={idx} 
                    className="group cursor-pointer hover:shadow-md transition-all rounded-2xl border-2 border-blue-200/80 hover:border-[#2563EB] bg-white shadow-2xs overflow-hidden"
                    onClick={() => handleClassSelect(cls)}
                  >
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                          <GraduationCap className="h-6 w-6 text-[#2563EB]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate">{cls.class_name}</h3>
                          <p className="text-xs text-blue-700 font-semibold mt-0.5">
                            Division {cls.division_name || "A"} • Class Teacher
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {classTeacherAssignments.length === 0 && (
                <div className="py-16 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No Class Teacher Assignment</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You are not currently assigned as the Class Teacher for any class.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP: YEAR SELECTION
             ══════════════════════════════════════════════════════════════════ */}
          {step === "YEAR" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {academicYears.map((year) => (
                <Card 
                  key={year.id} 
                  className="group cursor-pointer hover:shadow-md transition-all rounded-2xl border border-gray-200/80 hover:border-[#2563EB] bg-white shadow-2xs overflow-hidden"
                  onClick={() => handleYearSelect(year)}
                >
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                        <Calendar className="h-5 w-5 text-[#2563EB]" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{year.name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {year.is_active ? "Current Active Year" : "Academic Session"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP: VERIFICATION & MASTER MARKS SHEET
             ══════════════════════════════════════════════════════════════════ */}
          {step === "VERIFY" && (
            <div className="space-y-4">
              {/* ── Class Performance Metrics Cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-xs p-2.5 sm:p-3.5">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Enrolled</p>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{classStats.total}</h4>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-xs p-2.5 sm:p-3.5">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Class Average</p>
                      <h4 className="text-base sm:text-lg font-black text-[#2563EB] leading-tight">{classStats.avgPct}%</h4>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-xs p-2.5 sm:p-3.5">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Top Score</p>
                      <h4 className="text-base sm:text-lg font-black text-emerald-700 leading-tight">{classStats.topPct}%</h4>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-xs p-2.5 sm:p-3.5">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                      <Percent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Pass Rate</p>
                      <h4 className="text-base sm:text-lg font-black text-teal-700 leading-tight">{classStats.passRate}%</h4>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── Verification & Authority Control Card ── */}
              <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      Class Teacher Verification & Authority
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Review all submitted subject marks. You have authority to edit, save, unlock, or lock final results.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(verificationData?.status || "PENDING")}
                  </div>
                </div>

                {/* Remarks Textarea */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Class Teacher Remarks
                    </label>
                    {isVerified && <span className="text-[10px] text-emerald-700 font-semibold">(Verified & Locked)</span>}
                  </div>
                  <Textarea 
                    placeholder={isVerified ? "Marks are locked. Click 'Unlock Verification' to edit remarks or update marks." : "Enter observations, feedback, or reason if sending back to subject teachers..."}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isVerified}
                    rows={2}
                    className="resize-none min-h-[52px] sm:min-h-[58px] text-xs rounded-xl border-gray-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Action Controls Bar */}
                <div className="pt-2.5 border-t border-slate-100">
                  {isVerified ? (
                    <Button
                      onClick={() => handleVerifyAction("PENDING")}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto rounded-xl text-xs font-bold h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-xs cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>Unlock Verification & Edit</span>
                    </Button>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                      {/* Secondary Actions */}
                      <div className="grid grid-cols-3 sm:flex items-center gap-2">
                        <Button
                          variant={isEditMode ? "default" : "outline"}
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={cn(
                            "rounded-xl font-bold h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs gap-1.5 cursor-pointer",
                            isEditMode
                              ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : "border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{isEditMode ? "Done" : "Edit Marks"}</span>
                        </Button>

                        <Button
                          onClick={handleSaveClassMarks}
                          disabled={isSavingMarks || isSubmitting}
                          variant="outline"
                          className="rounded-xl font-bold h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs text-[#2563EB] bg-blue-50 hover:bg-blue-100 border-blue-200 gap-1.5 cursor-pointer"
                        >
                          {isSavingMarks ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">Save Marks</span>
                        </Button>

                        <Button 
                          variant="outline" 
                          onClick={() => handleVerifyAction("SENT_BACK")}
                          disabled={isSubmitting}
                          className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 font-bold h-9 px-2 sm:px-3 text-[11px] sm:text-xs gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Send Back</span>
                        </Button>
                      </div>

                      {/* Primary Submit & Verify */}
                      <Button 
                        onClick={handleSubmitAndVerify}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto rounded-xl font-bold h-9 sm:h-10 px-4 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20 gap-1.5 cursor-pointer justify-center"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                        <span>Submit & Verify Marks</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Master Marks Grid Section ── */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden space-y-3 p-3 sm:p-4">
                {/* Search + Tab Bar + Export */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-[#2563EB]" />
                      Class Master Marks Sheet
                    </h3>
                    {isEditMode && !isVerified && (
                      <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Edit Mode Active
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 h-8 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    {/* Mobile View Toggle */}
                    <div className="sm:hidden flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMobileViewMode("cards")}
                        className={cn(
                          "p-1.5 rounded-lg text-xs font-bold transition-all",
                          mobileViewMode === "cards" ? "bg-white text-[#2563EB] shadow-xs" : "text-slate-500"
                        )}
                        aria-label="Cards view"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileViewMode("table")}
                        className={cn(
                          "p-1.5 rounded-lg text-xs font-bold transition-all",
                          mobileViewMode === "table" ? "bg-white text-[#2563EB] shadow-xs" : "text-slate-500"
                        )}
                        aria-label="Table view"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Export Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportCSV}
                      className="rounded-xl text-xs font-bold gap-1 h-8 px-2.5 border-slate-200 shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export</span>
                    </Button>
                  </div>
                </div>

                {/* Filter Tabs for Terms / Assessments */}
                <div className="flex items-center gap-1.5 bg-slate-100/70 dark:bg-zinc-800/60 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
                  <button
                    type="button"
                    onClick={() => setActiveTab("ALL")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                      activeTab === "ALL"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200/60"
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>All Combined</span>
                  </button>

                  {terms.map((t: any) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                        activeTab === t.id
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-200/60"
                      )}
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>{t.name}</span>
                    </button>
                  ))}

                  {taSubjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("TEACHER_ASSESSMENT")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                        activeTab === "TEACHER_ASSESSMENT"
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-200/60"
                      )}
                    >
                      <GraduationCap className="h-3 w-3" />
                      <span>Teacher Assessment</span>
                    </button>
                  )}
                </div>

                {/* ── MOBILE CARDS VIEW (block sm:hidden when mobileViewMode === 'cards') ── */}
                {mobileViewMode === "cards" && (
                  <div className="sm:hidden space-y-2.5">
                    {students.map((st: any) => {
                      const avatarColor = getAvatarColor(st.name);
                      const { totalMax, totalObtained, percentage, isAbsent } = getStudentTotals(st);
                      const gradeInfo = getGradeAndColor(percentage, isAbsent);

                      return (
                        <div
                          key={`mob-card-${st.id}`}
                          className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-2.5"
                        >
                          {/* Student Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ background: avatarColor }}
                              >
                                {getInitials(st.name)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs truncate">
                                  {st.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                  {st.roll_no ? (
                                    <span className="font-semibold text-slate-600 dark:text-zinc-400">Roll #{st.roll_no}</span>
                                  ) : (
                                    <span>No Roll</span>
                                  )}
                                  {st.gr_no && <span>• GR: {st.gr_no}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Summary Badge */}
                            <div className="text-right shrink-0">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", gradeInfo.bg)}>
                                {isAbsent ? "AB" : `${percentage !== null ? `${percentage.toFixed(1)}%` : "—"} • ${gradeInfo.grade}`}
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {totalObtained} / {totalMax}
                              </div>
                            </div>
                          </div>

                          {/* Subject Breakdown Grouped by Term */}
                          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                            {activeTab === "ALL" && (
                              <>
                                {terms.map((t: any) => (
                                  <div key={t.id} className="bg-slate-50/80 dark:bg-zinc-800/40 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                        <BookOpen className="w-2.5 h-2.5" />
                                        {t.name}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {t.subjects.map((sub: any) => {
                                        const mark = st.terms_marks?.[t.id]?.[String(sub.id)];
                                        return (
                                          <div
                                            key={`${t.id}-${sub.id}`}
                                            className="bg-white dark:bg-zinc-900 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px] flex items-center gap-1.5 shadow-2xs"
                                          >
                                            <span className="font-bold text-slate-700 dark:text-zinc-300 capitalize">{sub.name}:</span>
                                            {isEditMode && !isVerified ? (
                                              <input
                                                type="number"
                                                min={0}
                                                max={sub.max_marks}
                                                value={mark && mark.score !== null && mark.score !== undefined ? mark.score : ""}
                                                disabled={mark?.is_absent}
                                                onChange={(e) => {
                                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                                  handleTermMarkChange(st.id, t.id, sub.id, val, mark?.is_absent || false);
                                                }}
                                                className="w-12 h-6 text-center font-bold text-xs bg-blue-50/50 rounded border border-blue-200 focus:outline-none"
                                              />
                                            ) : (
                                              <span className="font-extrabold text-slate-900 dark:text-zinc-100">
                                                {mark ? (
                                                  mark.is_absent ? (
                                                    <span className="text-red-600 font-bold">AB</span>
                                                  ) : (
                                                    <span>{mark.score} <span className="text-slate-400 font-normal text-[9.5px]">/{sub.max_marks}</span></span>
                                                  )
                                                ) : (
                                                  <span className="text-slate-300 font-mono">—</span>
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}

                                {taSubjects.length > 0 && (
                                  <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-2 border border-amber-100 dark:border-amber-900/40">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5" />
                                        Teacher Assessment
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {taSubjects.map((sub: any) => {
                                        const ta = st.teacher_assessments?.[String(sub.id)];
                                        return (
                                          <div
                                            key={`ta-${sub.id}`}
                                            className="bg-white dark:bg-zinc-900 border border-amber-200/80 rounded-lg px-2 py-1 text-[11px] flex items-center gap-1.5 shadow-2xs"
                                          >
                                            <span className="font-bold text-slate-700 dark:text-zinc-300 capitalize">{sub.name}:</span>
                                            {isEditMode && !isVerified ? (
                                              <input
                                                type="number"
                                                min={0}
                                                max={sub.max_score}
                                                value={ta && ta.score !== null && ta.score !== undefined ? ta.score : ""}
                                                onChange={(e) => {
                                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                                  handleTeacherAssessmentChange(st.id, sub.id, val);
                                                }}
                                                className="w-12 h-6 text-center font-bold text-xs bg-amber-50/50 rounded border border-amber-300 focus:outline-none"
                                              />
                                            ) : (
                                              <span className="font-extrabold text-amber-900 dark:text-amber-300">
                                                {ta && ta.score !== null ? (
                                                  <span>{ta.score} <span className="text-amber-600 font-normal text-[9.5px]">/{sub.max_score}</span></span>
                                                ) : (
                                                  <span className="text-slate-300 font-mono">—</span>
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {activeTab === "TEACHER_ASSESSMENT" && (
                              <div className="space-y-1.5">
                                {taSubjects.map((sub: any) => {
                                  const ta = st.teacher_assessments?.[String(sub.id)];
                                  return (
                                    <div
                                      key={`ta-${sub.id}`}
                                      className="bg-amber-50/50 border border-amber-100/80 rounded-xl px-2.5 py-1.5 text-[11px] flex items-center justify-between w-full"
                                    >
                                      <span className="font-bold text-slate-800 capitalize">{sub.name}</span>
                                      {isEditMode && !isVerified ? (
                                        <input
                                          type="number"
                                          min={0}
                                          max={sub.max_score}
                                          value={ta && ta.score !== null && ta.score !== undefined ? ta.score : ""}
                                          onChange={(e) => {
                                            const val = e.target.value === "" ? null : Number(e.target.value);
                                            handleTeacherAssessmentChange(st.id, sub.id, val);
                                          }}
                                          className="w-14 h-7 text-center font-bold text-xs bg-white rounded-lg border border-amber-200"
                                        />
                                      ) : (
                                        <span className="font-extrabold text-amber-900">
                                          {ta && ta.score !== null ? `${ta.score} / ${sub.max_score}` : "—"}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {activeTab !== "ALL" && activeTab !== "TEACHER_ASSESSMENT" && (() => {
                              const currentTerm = terms.find((t: any) => t.id === activeTab);
                              return (
                                <div className="space-y-1.5">
                                  {(currentTerm?.subjects || []).map((sub: any) => {
                                    const mark = st.terms_marks?.[activeTab]?.[String(sub.id)];
                                    return (
                                      <div
                                        key={sub.id}
                                        className="bg-indigo-50/50 border border-indigo-100/80 rounded-xl px-2.5 py-1.5 text-[11px] flex items-center justify-between w-full"
                                      >
                                        <span className="font-bold text-slate-800 capitalize">{sub.name}</span>
                                        {isEditMode && !isVerified ? (
                                          <input
                                            type="number"
                                            min={0}
                                            max={sub.max_marks}
                                            value={mark && mark.score !== null && mark.score !== undefined ? mark.score : ""}
                                            disabled={mark?.is_absent}
                                            onChange={(e) => {
                                              const val = e.target.value === "" ? null : Number(e.target.value);
                                              handleTermMarkChange(st.id, activeTab, sub.id, val, mark?.is_absent || false);
                                            }}
                                            className="w-14 h-7 text-center font-bold text-xs bg-white rounded-lg border border-indigo-200"
                                          />
                                        ) : (
                                          <span className="font-extrabold text-indigo-900">
                                            {mark ? (mark.is_absent ? "AB" : `${mark.score} / ${sub.max_marks}`) : "—"}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}

                    {students.length === 0 && (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No students found matching your search.
                      </div>
                    )}
                  </div>
                )}

                {/* ── DESKTOP & TABLE VIEW ── */}
                <div className={cn("overflow-x-auto w-full rounded-xl border border-slate-200", mobileViewMode === "cards" ? "hidden sm:block" : "block")}>
                  <Table className="text-xs min-w-[750px]">
                    <TableHeader className="bg-slate-50 border-b border-zinc-200">
                      {activeTab === "ALL" ? (
                        <>
                          <TableRow className="bg-slate-100/70 border-b border-zinc-200 font-bold">
                            <TableHead colSpan={4} className="text-center font-bold text-xs uppercase tracking-wider text-slate-600 bg-slate-100 sticky left-0 z-20 border-r border-zinc-200">
                              Student Info
                            </TableHead>

                            {terms.map((t: any) => (
                              <TableHead key={t.id} colSpan={Math.max(t.subjects.length, 1)} className="text-center font-extrabold text-xs uppercase tracking-wider text-indigo-900 bg-indigo-50/80 border-r border-indigo-100">
                                📘 {t.name}
                              </TableHead>
                            ))}

                            {taSubjects.length > 0 && (
                              <TableHead colSpan={taSubjects.length} className="text-center font-extrabold text-xs uppercase tracking-wider text-amber-900 bg-amber-50/80 border-r border-amber-100">
                                📝 Teacher Assessment
                              </TableHead>
                            )}

                            <TableHead colSpan={4} className="text-center font-extrabold text-xs uppercase tracking-wider text-blue-900 bg-blue-100/80 border-l-2 border-blue-200">
                              📊 Overall Total & Grade
                            </TableHead>
                          </TableRow>

                          <TableRow className="bg-slate-50 border-b border-zinc-200">
                            <TableHead className="w-10 text-center font-bold text-[11px] sticky left-0 bg-slate-50 z-20">#</TableHead>
                            <TableHead className="w-14 font-bold text-[11px] sticky left-10 bg-slate-50 z-20">Roll</TableHead>
                            <TableHead className="w-16 font-bold text-[11px]">GR No.</TableHead>
                            <TableHead className="min-w-[170px] font-bold text-[11px] border-r border-zinc-200">Student Name</TableHead>

                            {terms.map((t: any) => 
                              t.subjects.map((sub: any) => (
                                <TableHead key={`${t.id}-${sub.id}`} className="min-w-[90px] text-center font-bold text-[11px] border-r border-zinc-100 bg-indigo-50/20">
                                  <div className="font-bold text-slate-800 truncate">{sub.name}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_marks}</div>
                                </TableHead>
                              ))
                            )}

                            {taSubjects.map((sub: any) => (
                              <TableHead key={`ta-${sub.id}`} className="min-w-[90px] text-center font-bold text-[11px] border-r border-zinc-100 bg-amber-50/20">
                                <div className="font-bold text-slate-800 truncate">{sub.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_score}</div>
                              </TableHead>
                            ))}

                            <TableHead className="min-w-[80px] text-center font-bold text-[11px] bg-blue-50/50 border-l-2 border-blue-200 text-blue-950">
                              Total Max
                            </TableHead>
                            <TableHead className="min-w-[85px] text-center font-bold text-[11px] bg-blue-50/50 text-blue-950">
                              Marks Gained
                            </TableHead>
                            <TableHead className="min-w-[85px] text-center font-bold text-[11px] bg-blue-50/50 text-blue-950">
                              Percentage
                            </TableHead>
                            <TableHead className="min-w-[80px] text-center font-bold text-[11px] bg-blue-50/50 text-blue-950">
                              Grade
                            </TableHead>
                          </TableRow>
                        </>
                      ) : activeTab === "TEACHER_ASSESSMENT" ? (
                        <TableRow className="bg-slate-50 border-b border-zinc-200">
                          <TableHead className="w-10 text-center font-bold text-xs sticky left-0 bg-slate-50 z-10">#</TableHead>
                          <TableHead className="w-16 font-bold text-xs">Roll No.</TableHead>
                          <TableHead className="w-20 font-bold text-xs">GR No.</TableHead>
                          <TableHead className="min-w-[180px] font-bold text-xs border-r border-zinc-200">Student Name</TableHead>
                          {taSubjects.map((sub: any) => (
                            <TableHead key={sub.id} className="min-w-[110px] text-center font-bold text-xs border-r border-zinc-100 bg-amber-50/40">
                              <div>{sub.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_score}</div>
                            </TableHead>
                          ))}
                          <TableHead className="min-w-[90px] text-center font-bold text-xs bg-blue-50 border-l-2 border-blue-200 text-blue-950">
                            Total Max
                          </TableHead>
                          <TableHead className="min-w-[100px] text-center font-bold text-xs bg-blue-50 text-blue-950">
                            Marks Gained
                          </TableHead>
                          <TableHead className="min-w-[100px] text-center font-bold text-xs bg-blue-50 text-blue-950">
                            Percentage
                          </TableHead>
                          <TableHead className="min-w-[85px] text-center font-bold text-xs bg-blue-50 text-blue-950">
                            Grade
                          </TableHead>
                        </TableRow>
                      ) : (
                        (() => {
                          const currentTerm = terms.find((t: any) => t.id === activeTab);
                          const currentSubjects = currentTerm?.subjects || [];
                          return (
                            <TableRow className="bg-slate-50 border-b border-zinc-200">
                              <TableHead className="w-10 text-center font-bold text-xs sticky left-0 bg-slate-50 z-10">#</TableHead>
                              <TableHead className="w-16 font-bold text-xs">Roll No.</TableHead>
                              <TableHead className="w-20 font-bold text-xs">GR No.</TableHead>
                              <TableHead className="min-w-[180px] font-bold text-xs border-r border-zinc-200">Student Name</TableHead>
                              {currentSubjects.map((sub: any) => (
                                <TableHead key={sub.id} className="min-w-[110px] text-center font-bold text-xs border-r border-zinc-100 bg-indigo-50/40">
                                  <div>{sub.name}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_marks}</div>
                                </TableHead>
                              ))}
                              <TableHead className="min-w-[90px] text-center font-bold text-xs bg-blue-50 border-l-2 border-blue-200 text-blue-950">
                                Term Max
                              </TableHead>
                              <TableHead className="min-w-[100px] text-center font-bold text-xs bg-blue-50 text-blue-950">
                                Marks Gained
                              </TableHead>
                              <TableHead className="min-w-[100px] text-center font-bold text-xs bg-blue-50 text-blue-950">
                                Percentage
                              </TableHead>
                              <TableHead className="min-w-[85px] text-center font-bold text-xs bg-blue-50 text-blue-950">
                                Grade
                              </TableHead>
                            </TableRow>
                          );
                        })()
                      )}
                    </TableHeader>

                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={25} className="text-center py-12 text-slate-400">
                            No student records found matching your selection.
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map((st: any, idx: number) => {
                          const { totalMax, totalObtained, percentage, isAbsent } = getStudentTotals(st);
                          const gradeInfo = getGradeAndColor(percentage, isAbsent);

                          if (activeTab === "ALL") {
                            return (
                              <TableRow key={st.id} className="hover:bg-slate-50/60 transition-colors">
                                <TableCell className="text-center font-mono text-[11px] text-slate-400 sticky left-0 bg-white z-10">{idx + 1}</TableCell>
                                <TableCell className="text-xs font-mono font-bold text-[#2563EB] sticky left-10 bg-white z-10">{st.roll_no || "—"}</TableCell>
                                <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>

                                {/* Term Exam Marks */}
                                {terms.map((t: any) => 
                                  t.subjects.map((sub: any) => {
                                    const mark = st.terms_marks?.[t.id]?.[String(sub.id)];
                                    return (
                                      <TableCell key={`${t.id}-${sub.id}`} className="text-center border-r border-zinc-100 py-2">
                                        {isEditMode && !isVerified ? (
                                          <input
                                            type="number"
                                            min={0}
                                            max={sub.max_marks}
                                            value={mark && mark.score !== null && mark.score !== undefined ? mark.score : ""}
                                            disabled={mark?.is_absent}
                                            onChange={(e) => {
                                              const val = e.target.value === "" ? null : Number(e.target.value);
                                              handleTermMarkChange(st.id, t.id, sub.id, val, mark?.is_absent || false);
                                            }}
                                            className="w-14 h-7 text-center font-bold text-xs p-1 rounded-lg border-slate-200 focus:ring-1 focus:ring-blue-500"
                                          />
                                        ) : mark ? (
                                          mark.is_absent ? (
                                            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">AB</span>
                                          ) : (
                                            <span className="text-xs font-bold text-slate-800">
                                              {mark.score} <span className="text-slate-400 font-normal text-[10px]">/ {mark.max}</span>
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-xs text-slate-300 font-mono">—</span>
                                        )}
                                      </TableCell>
                                    );
                                  })
                                )}

                                {/* Teacher Assessment Marks */}
                                {taSubjects.map((sub: any) => {
                                  const ta = st.teacher_assessments?.[String(sub.id)];
                                  return (
                                    <TableCell key={`ta-${sub.id}`} className="text-center border-r border-zinc-100 bg-amber-50/10 py-2">
                                      {isEditMode && !isVerified ? (
                                        <input
                                          type="number"
                                          min={0}
                                          max={sub.max_score}
                                          value={ta && ta.score !== null && ta.score !== undefined ? ta.score : ""}
                                          onChange={(e) => {
                                            const val = e.target.value === "" ? null : Number(e.target.value);
                                            handleTeacherAssessmentChange(st.id, sub.id, val);
                                          }}
                                          className="w-14 h-7 text-center font-bold text-xs p-1 rounded-lg border-amber-200 bg-white focus:ring-1 focus:ring-amber-500"
                                        />
                                      ) : ta && ta.score !== null ? (
                                        <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                                          {ta.score} <span className="text-amber-600 font-normal text-[10px]">/ {ta.max_score}</span>
                                        </span>
                                      ) : (
                                        <span className="text-xs text-slate-300 font-mono">—</span>
                                      )}
                                    </TableCell>
                                  );
                                })}

                                {/* RIGHT SIDE TOTALS & PERCENTAGE */}
                                <TableCell className="text-center border-l-2 border-blue-100 font-mono text-xs text-slate-600 bg-blue-50/20 font-bold">
                                  {totalMax}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs font-extrabold text-blue-950 bg-blue-50/20">
                                  {isAbsent ? <span className="text-red-600 font-bold">AB</span> : totalObtained}
                                </TableCell>
                                <TableCell className="text-center bg-blue-50/20">
                                  {percentage !== null ? (
                                    <Badge variant="outline" className={`font-mono text-[11px] font-extrabold ${gradeInfo.bg}`}>
                                      {percentage.toFixed(1)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 text-xs font-mono">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center bg-blue-50/20">
                                  <Badge variant="outline" className={`text-[10px] font-bold ${gradeInfo.bg}`}>
                                    {gradeInfo.grade}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          if (activeTab === "TEACHER_ASSESSMENT") {
                            return (
                              <TableRow key={st.id} className="hover:bg-slate-50/60 transition-colors">
                                <TableCell className="text-center font-mono text-xs text-slate-400 sticky left-0 bg-white z-10">{idx + 1}</TableCell>
                                <TableCell className="text-xs font-mono font-bold text-[#2563EB]">{st.roll_no || "—"}</TableCell>
                                <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>
                                {taSubjects.map((sub: any) => {
                                  const ta = st.teacher_assessments?.[String(sub.id)];
                                  return (
                                    <TableCell key={sub.id} className="text-center border-r border-zinc-100 py-2">
                                      {isEditMode && !isVerified ? (
                                        <input
                                          type="number"
                                          min={0}
                                          max={sub.max_score}
                                          value={ta && ta.score !== null && ta.score !== undefined ? ta.score : ""}
                                          onChange={(e) => {
                                            const val = e.target.value === "" ? null : Number(e.target.value);
                                            handleTeacherAssessmentChange(st.id, sub.id, val);
                                          }}
                                          className="w-16 h-7 text-center font-bold text-xs p-1 rounded-lg border-amber-200 bg-white focus:ring-1 focus:ring-amber-500"
                                        />
                                      ) : ta && ta.score !== null ? (
                                        <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                          {ta.score} <span className="text-amber-600 font-normal text-[11px]">/ {ta.max_score}</span>
                                        </span>
                                      ) : (
                                        <span className="text-xs text-slate-300 font-mono">—</span>
                                      )}
                                    </TableCell>
                                  );
                                })}

                                <TableCell className="text-center border-l-2 border-blue-100 font-mono text-xs text-slate-600 bg-blue-50/20 font-bold">
                                  {totalMax}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs font-extrabold text-blue-950 bg-blue-50/20">
                                  {totalObtained}
                                </TableCell>
                                <TableCell className="text-center bg-blue-50/20">
                                  {percentage !== null ? (
                                    <Badge variant="outline" className={`font-mono text-[11px] font-extrabold ${gradeInfo.bg}`}>
                                      {percentage.toFixed(1)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 text-xs font-mono">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center bg-blue-50/20">
                                  <Badge variant="outline" className={`text-[10px] font-bold ${gradeInfo.bg}`}>
                                    {gradeInfo.grade}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          // Specific Term View
                          const currentTerm = terms.find((t: any) => t.id === activeTab);
                          const currentSubjects = currentTerm?.subjects || [];
                          return (
                            <TableRow key={st.id} className="hover:bg-slate-50/60 transition-colors">
                              <TableCell className="text-center font-mono text-xs text-slate-400 sticky left-0 bg-white z-10">{idx + 1}</TableCell>
                              <TableCell className="text-xs font-mono font-bold text-[#2563EB]">{st.roll_no || "—"}</TableCell>
                              <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                              <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>
                              {currentSubjects.map((sub: any) => {
                                const mark = st.terms_marks?.[activeTab]?.[String(sub.id)];
                                return (
                                  <TableCell key={sub.id} className="text-center border-r border-zinc-100 py-2">
                                    {isEditMode && !isVerified ? (
                                      <input
                                        type="number"
                                        min={0}
                                        max={sub.max_marks}
                                        value={mark && mark.score !== null && mark.score !== undefined ? mark.score : ""}
                                        disabled={mark?.is_absent}
                                        onChange={(e) => {
                                          const val = e.target.value === "" ? null : Number(e.target.value);
                                          handleTermMarkChange(st.id, activeTab, sub.id, val, mark?.is_absent || false);
                                        }}
                                        className="w-16 h-7 text-center font-bold text-xs p-1 rounded-lg border-slate-200 focus:ring-1 focus:ring-blue-500"
                                      />
                                    ) : mark ? (
                                      mark.is_absent ? (
                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">AB</span>
                                      ) : (
                                        <span className="text-xs font-bold text-slate-800">
                                          {mark.score} <span className="text-slate-400 font-normal text-[10px]">/ {mark.max}</span>
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-xs text-slate-300 font-mono">—</span>
                                    )}
                                  </TableCell>
                                );
                              })}

                              <TableCell className="text-center border-l-2 border-blue-100 font-mono text-xs text-slate-600 bg-blue-50/20 font-bold">
                                {totalMax}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-extrabold text-blue-950 bg-blue-50/20">
                                {isAbsent ? <span className="text-red-600 font-bold">AB</span> : totalObtained}
                              </TableCell>
                              <TableCell className="text-center bg-blue-50/20">
                                {percentage !== null ? (
                                  <Badge variant="outline" className={`font-mono text-[11px] font-extrabold ${gradeInfo.bg}`}>
                                    {percentage.toFixed(1)}%
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs font-mono">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center bg-blue-50/20">
                                <Badge variant="outline" className={`text-[10px] font-bold ${gradeInfo.bg}`}>
                                  {gradeInfo.grade}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Sticky Floating Action Bar on Mobile during Edit Mode ── */}
      {isEditMode && !isVerified && (
        <div className="fixed bottom-20 left-4 right-4 sm:hidden z-30 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold truncate">Editing Marks Active</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsEditMode(false)}
              variant="ghost"
              className="h-8 px-2.5 text-xs text-slate-300 hover:text-white"
            >
              Done
            </Button>
            <Button
              size="sm"
              onClick={handleSaveClassMarks}
              disabled={isSavingMarks}
              className="h-8 px-3 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-xs"
            >
              {isSavingMarks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
