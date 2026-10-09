"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Users, CheckCircle2, Loader2, Calendar, 
  ChevronRight, ArrowLeft, GraduationCap, XCircle, Lock,
  Sparkles, BookOpen, Award, Search, Download, TrendingUp, BarChart3, Percent,
  Edit3, Save
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getAssignedTeachers } from "@/lib/clerk/assign-teacher";
import { getAcademicYears } from "@/lib/fees/academic-year";
import { getExamTerms, type ExamTerm } from "@/lib/exam-api";
import { apiFetch } from "@/lib/exam-api";
import type { AcademicYear } from "@/types/fees";

export default function VerifyMarksPage() {
  const [step, setStep] = useState<"CLASS" | "YEAR" | "VERIFY">("CLASS");
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
          const key = `${a.class_name}-${a.division_name}`;
          if (!classesMap.has(key)) {
            classesMap.set(key, {
              class_name: a.class_name,
              division_name: a.division_name,
              class_id: a.class_id || a.class_name_id || a.school_class || a.division_name_id || "",
            });
          }
        });
        
        setClassTeacherAssignments(Array.from(classesMap.values()));
        setAcademicYears(years || []);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, []);

  const handleClassSelect = (cls: any) => {
    setSelectedClass(cls);
    setStep("YEAR");
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
      await loadVerificationData(year.id, null);
    } catch (err: any) {
      toast.error("Failed to load exam verification data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadVerificationData = async (yearId?: number, termId?: number | null) => {
    if (!yearId || !selectedClass) return;
    setIsLoading(true);
    try {
      const classId = selectedClass.class_id;
      const className = selectedClass.class_name;
      const division = selectedClass.division_name;
      
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
        apiFetch(statusUrl),
        apiFetch(gridUrl)
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
      toast.error("Failed to load class data.");
    } finally {
      setIsLoading(false);
    }
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

      toast.success("Class marks saved successfully by Class Teacher!");
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

  const handleVerifyAction = async (action: "VERIFIED" | "SENT_BACK") => {
    if (!selectedYear || !selectedClass) return;
    
    if (action === "SENT_BACK" && !remarks.trim()) {
      toast.error("Remarks are required when sending back.");
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
        // Update existing
        await apiFetch(`/api/class-verification/${verificationData.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        // Create new
        await apiFetch("/api/class-verification/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      toast.success(action === "VERIFIED" ? "Marks submitted, verified and locked successfully!" : "Status updated to Sent Back!");
      await loadVerificationData(selectedYear.id, selectedTerm?.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update verification status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "VERIFIED") return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> LOCKED & VERIFIED</span>;
    if (status === "SENT_BACK") return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">SENT BACK</span>;
    return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">PENDING VERIFICATION</span>;
  };

  const getGradeAndColor = (pct: number | null, isAbsent: boolean) => {
    if (pct === null) return { grade: "—", label: "Pending", bg: "bg-slate-100 text-slate-500 border-slate-200" };
    if (isAbsent) return { grade: "AB", label: "Absent", bg: "bg-red-100 text-red-700 border-red-200" };
    if (pct >= 90) return { grade: "A+", label: "Outstanding", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    if (pct >= 80) return { grade: "A", label: "Distinction", bg: "bg-teal-100 text-teal-800 border-teal-300" };
    if (pct >= 70) return { grade: "B+", label: "First Class", bg: "bg-blue-100 text-blue-800 border-blue-300" };
    if (pct >= 60) return { grade: "B", label: "Second Class", bg: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    if (pct >= 50) return { grade: "C", label: "Higher Second", bg: "bg-purple-100 text-purple-800 border-purple-300" };
    if (pct >= 35) return { grade: "D", label: "Pass", bg: "bg-amber-100 text-amber-800 border-amber-300" };
    return { grade: "F", label: "Fail / Low", bg: "bg-rose-100 text-rose-800 border-rose-300" };
  };

  const isVerified = verificationData?.status === "VERIFIED";


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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Class Marks Verification & Master Sheet
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                Class Teacher Panel
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {step === "CLASS" && "Select a class where you are assigned as the Class Teacher."}
              {step === "YEAR" && "Select an academic year to review student marks."}
              {step === "VERIFY" && `Comprehensive Master Marks Table for ${selectedClass?.class_name} Division ${selectedClass?.division_name || "N/A"}.`}
            </p>
          </div>
        </div>
        {step !== "CLASS" && (
          <Button
            variant="outline"
            onClick={() => {
              if (step === "YEAR") setStep("CLASS");
              if (step === "VERIFY") setStep("YEAR");
            }}
            className="rounded-xl h-10 px-4 font-bold border-gray-200 hover:bg-slate-50 text-xs gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      {isLoading && step !== "VERIFY" ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#5c28e8]" />
          <p className="text-slate-500 mt-4 text-sm font-medium">Loading details...</p>
        </div>
      ) : (
        <>
          {step === "CLASS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classTeacherAssignments.map((cls, idx) => (
                <Card 
                  key={idx} 
                  className="group cursor-pointer hover:shadow-md transition-all duration-300 border-gray-200/80 hover:border-purple-300 bg-white rounded-2xl shadow-sm"
                  onClick={() => handleClassSelect(cls)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8]">
                        <GraduationCap className="h-6 w-6 text-[#5c28e8]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{cls.class_name}</h3>
                        {cls.division_name && <p className="text-xs text-slate-500 font-medium mt-0.5">Division {cls.division_name}</p>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#5c28e8] transition-colors" />
                  </CardContent>
                </Card>
              ))}
              {classTeacherAssignments.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                  You are not assigned as a Class Teacher for any class.
                </div>
              )}
            </div>
          )}

          {step === "YEAR" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {academicYears.map((year) => (
                <Card 
                  key={year.id} 
                  className="group cursor-pointer hover:shadow-md transition-all duration-300 border-gray-200/80 hover:border-purple-300 bg-white rounded-2xl shadow-sm"
                  onClick={() => handleYearSelect(year)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8]">
                        <Calendar className="h-6 w-6 text-[#5c28e8]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{year.name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{year.is_active ? "Current Active Year" : "Academic Session"}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#5c28e8] transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === "VERIFY" && (
            <div className="space-y-6">
              
              {/* Class Performance Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
                      <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">{classStats.total}</h4>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class Average</p>
                      <h4 className="text-lg font-extrabold text-[#5c28e8] mt-0.5">{classStats.avgPct}%</h4>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Top Score</p>
                      <h4 className="text-lg font-extrabold text-emerald-700 mt-0.5">{classStats.topPct}%</h4>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                      <Percent className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pass Rate</p>
                      <h4 className="text-lg font-extrabold text-teal-700 mt-0.5">{classStats.passRate}% ({classStats.passCount}/{classStats.total})</h4>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Verification & Lock Controls */}
              <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedClass?.class_name} Division {selectedClass?.division_name || ""} - Verification & Marks Authority
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        As Class Teacher, all submitted subject marks are consolidated below. You have the authority to edit, save, and submit/verify class marks.
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verification State</span>
                      {getStatusBadge(verificationData?.status || "PENDING")}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Class Teacher Remarks {isVerified ? "(Locked)" : "(Optional observation or reason if sending back)"}</label>
                    <Textarea 
                      placeholder={isVerified ? "Remarks are locked." : "Add remarks or feedback regarding class marks..."}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={isVerified}
                      className="resize-none h-20 rounded-xl border-gray-200 bg-slate-50 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div>
                      {!isVerified && (
                        <Button
                          variant={isEditMode ? "default" : "outline"}
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={`rounded-xl font-bold h-10 px-4 text-xs gap-1.5 ${isEditMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                        >
                          <Edit3 className="w-4 h-4" />
                          {isEditMode ? "Done Editing" : "Enable Edit Marks"}
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Send Back Button */}
                      <Button 
                        variant="outline" 
                        onClick={() => handleVerifyAction("SENT_BACK")}
                        disabled={isSubmitting || isVerified}
                        className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-bold h-10 px-4 text-xs"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Send Back to Teachers
                      </Button>

                      {/* Save Marks Button */}
                      {!isVerified && (
                        <Button
                          onClick={handleSaveClassMarks}
                          disabled={isSavingMarks || isSubmitting}
                          variant="outline"
                          className="rounded-xl font-bold h-10 px-4 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200 shadow-sm gap-1.5"
                        >
                          {isSavingMarks ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Marks
                        </Button>
                      )}

                      {/* Submit & Verify Marks Button */}
                      <Button 
                        onClick={handleSubmitAndVerify}
                        disabled={isSubmitting || isVerified}
                        className={`rounded-xl font-bold h-10 px-5 text-xs ${isVerified ? "bg-emerald-600 opacity-80" : "bg-[#5c28e8] hover:bg-[#4d20cb] shadow-md shadow-purple-500/20"} text-white gap-1.5`}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {isVerified ? "Marks Verified & Locked" : "Submit & Verify Marks"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Master Marks Grid with Multi-Evaluation Tabs */}
              <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#5c28e8]" />
                      Class Master Marks Sheet
                      {isEditMode && !isVerified && (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold ml-1">
                          Edit Mode Active
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Showing {students.length} of {rawStudents.length} enrolled students
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search student, roll..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs rounded-xl border-gray-200 w-44"
                      />
                    </div>

                    {/* Export Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportCSV}
                      className="rounded-xl text-xs font-bold gap-1.5 h-8 border-gray-200"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Sheet
                    </Button>

                    {/* Tab Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <Button
                        size="sm"
                        variant={activeTab === "ALL" ? "default" : "ghost"}
                        onClick={() => setActiveTab("ALL")}
                        className={`rounded-lg text-xs font-bold gap-1.5 h-7 px-3 ${activeTab === "ALL" ? "bg-[#5c28e8] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                      >
                        <Sparkles className="h-3 w-3" /> All Combined
                      </Button>

                      {terms.map((t: any) => (
                        <Button
                          key={t.id}
                          size="sm"
                          variant={activeTab === t.id ? "default" : "ghost"}
                          onClick={() => setActiveTab(t.id)}
                          className={`rounded-lg text-xs font-bold gap-1.5 h-7 px-3 ${activeTab === t.id ? "bg-[#5c28e8] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                        >
                          <BookOpen className="h-3 w-3" /> {t.name}
                        </Button>
                      ))}

                      {taSubjects.length > 0 && (
                        <Button
                          size="sm"
                          variant={activeTab === "TEACHER_ASSESSMENT" ? "default" : "ghost"}
                          onClick={() => setActiveTab("TEACHER_ASSESSMENT")}
                          className={`rounded-lg text-xs font-bold gap-1.5 h-7 px-3 ${activeTab === "TEACHER_ASSESSMENT" ? "bg-[#5c28e8] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                        >
                          <GraduationCap className="h-3 w-3" /> Assessment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#5c28e8] mb-2" />
                    <p className="text-xs text-slate-500">Loading master marks grid...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader className="bg-slate-50 border-b border-zinc-200">
                        {/* Level 1 Header (Term / Group Banners) */}
                        {activeTab === "ALL" ? (
                          <>
                            <TableRow className="bg-slate-100/70 border-b border-zinc-200 font-bold">
                              <TableHead colSpan={4} className="text-center font-bold text-xs uppercase tracking-wider text-slate-600 bg-slate-100 sticky left-0 z-20 border-r border-zinc-200">
                                Student Information
                              </TableHead>

                              {terms.map((t: any) => (
                                <TableHead key={t.id} colSpan={Math.max(t.subjects.length, 1)} className="text-center font-extrabold text-xs uppercase tracking-wider text-indigo-900 bg-indigo-50/70 border-r border-indigo-100">
                                  📘 {t.name}
                                </TableHead>
                              ))}

                              {taSubjects.length > 0 && (
                                <TableHead colSpan={taSubjects.length} className="text-center font-extrabold text-xs uppercase tracking-wider text-amber-900 bg-amber-50/70 border-r border-amber-100">
                                  📝 Teacher Assessment
                                </TableHead>
                              )}

                              {/* RIGHT SIDE MASTER TOTAL & PERCENTAGE HEADER */}
                              <TableHead colSpan={4} className="text-center font-extrabold text-xs uppercase tracking-wider text-purple-900 bg-purple-100/70 border-l-2 border-purple-200">
                                📊 Overall Totals & Percentage
                              </TableHead>
                            </TableRow>

                            {/* Level 2 Header (Subjects + Totals) */}
                            <TableRow className="bg-slate-50 border-b border-zinc-200">
                              <TableHead className="w-10 text-center font-bold text-[11px] sticky left-0 bg-slate-50 z-20">#</TableHead>
                              <TableHead className="w-14 font-bold text-[11px] sticky left-10 bg-slate-50 z-20">Roll</TableHead>
                              <TableHead className="w-16 font-bold text-[11px]">GR No.</TableHead>
                              <TableHead className="min-w-[180px] font-bold text-[11px] border-r border-zinc-200">Student Name</TableHead>

                              {terms.map((t: any) => 
                                t.subjects.map((sub: any) => (
                                  <TableHead key={`${t.id}-${sub.id}`} className="min-w-[95px] text-center font-bold text-[11px] border-r border-zinc-100 bg-indigo-50/20">
                                    <div className="font-bold text-slate-800 truncate">{sub.name}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_marks}</div>
                                  </TableHead>
                                ))
                              )}

                              {taSubjects.map((sub: any) => (
                                <TableHead key={`ta-${sub.id}`} className="min-w-[95px] text-center font-bold text-[11px] border-r border-zinc-100 bg-amber-50/20">
                                  <div className="font-bold text-slate-800 truncate">{sub.name}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_score}</div>
                                </TableHead>
                              ))}

                              {/* RIGHT SIDE MASTER TOTAL HEADERS */}
                              <TableHead className="min-w-[85px] text-center font-bold text-[11px] bg-purple-50/50 border-l-2 border-purple-200 text-purple-950">
                                Total Max
                              </TableHead>
                              <TableHead className="min-w-[95px] text-center font-bold text-[11px] bg-purple-50/50 text-purple-950">
                                Marks Gained
                              </TableHead>
                              <TableHead className="min-w-[95px] text-center font-bold text-[11px] bg-purple-50/50 text-purple-950">
                                Percentage (%)
                              </TableHead>
                              <TableHead className="min-w-[85px] text-center font-bold text-[11px] bg-purple-50/50 text-purple-950">
                                Result / Grade
                              </TableHead>
                            </TableRow>
                          </>
                        ) : activeTab === "TEACHER_ASSESSMENT" ? (
                          <TableRow className="bg-slate-50 border-b border-zinc-200">
                            <TableHead className="w-12 text-center font-bold text-xs sticky left-0 bg-slate-50 z-10">#</TableHead>
                            <TableHead className="w-16 font-bold text-xs">Roll No.</TableHead>
                            <TableHead className="w-20 font-bold text-xs">GR No.</TableHead>
                            <TableHead className="min-w-[180px] font-bold text-xs border-r border-zinc-200">Student Name</TableHead>
                            {taSubjects.map((sub: any) => (
                              <TableHead key={sub.id} className="min-w-[110px] text-center font-bold text-xs border-r border-zinc-100 bg-amber-50/40">
                                <div>{sub.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_score}</div>
                              </TableHead>
                            ))}
                            <TableHead className="min-w-[90px] text-center font-bold text-xs bg-purple-50 border-l-2 border-purple-200 text-purple-950">
                              Total Max
                            </TableHead>
                            <TableHead className="min-w-[100px] text-center font-bold text-xs bg-purple-50 text-purple-950">
                              Marks Gained
                            </TableHead>
                            <TableHead className="min-w-[100px] text-center font-bold text-xs bg-purple-50 text-purple-950">
                              Percentage (%)
                            </TableHead>
                            <TableHead className="min-w-[85px] text-center font-bold text-xs bg-purple-50 text-purple-950">
                              Grade
                            </TableHead>
                          </TableRow>
                        ) : (
                          /* Specific Term View */
                          (() => {
                            const currentTerm = terms.find((t: any) => t.id === activeTab);
                            const currentSubjects = currentTerm?.subjects || [];
                            return (
                              <TableRow className="bg-slate-50 border-b border-zinc-200">
                                <TableHead className="w-12 text-center font-bold text-xs sticky left-0 bg-slate-50 z-10">#</TableHead>
                                <TableHead className="w-16 font-bold text-xs">Roll No.</TableHead>
                                <TableHead className="w-20 font-bold text-xs">GR No.</TableHead>
                                <TableHead className="min-w-[180px] font-bold text-xs border-r border-zinc-200">Student Name</TableHead>
                                {currentSubjects.map((sub: any) => (
                                  <TableHead key={sub.id} className="min-w-[110px] text-center font-bold text-xs border-r border-zinc-100 bg-indigo-50/40">
                                    <div>{sub.name}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_marks}</div>
                                  </TableHead>
                                ))}
                                <TableHead className="min-w-[90px] text-center font-bold text-xs bg-purple-50 border-l-2 border-purple-200 text-purple-950">
                                  Term Max
                                </TableHead>
                                <TableHead className="min-w-[100px] text-center font-bold text-xs bg-purple-50 text-purple-950">
                                  Marks Gained
                                </TableHead>
                                <TableHead className="min-w-[100px] text-center font-bold text-xs bg-purple-50 text-purple-950">
                                  Percentage (%)
                                </TableHead>
                                <TableHead className="min-w-[85px] text-center font-bold text-xs bg-purple-50 text-purple-950">
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
                            <TableCell colSpan={20} className="text-center py-12 text-slate-500">
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
                                  <TableCell className="text-xs font-mono font-bold text-[#5c28e8] sticky left-10 bg-white z-10">{st.roll_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>

                                  {/* Term Exam Marks */}
                                  {terms.map((t: any) => 
                                    t.subjects.map((sub: any) => {
                                      const mark = st.terms_marks?.[t.id]?.[String(sub.id)];
                                      return (
                                        <TableCell key={`${t.id}-${sub.id}`} className="text-center border-r border-zinc-100 py-2">
                                          {isEditMode && !isVerified ? (
                                            <div className="flex items-center justify-center gap-1">
                                              <Input
                                                type="number"
                                                min={0}
                                                max={sub.max_marks}
                                                value={mark && mark.score !== null && mark.score !== undefined ? mark.score : ""}
                                                disabled={mark?.is_absent}
                                                onChange={(e) => {
                                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                                  handleTermMarkChange(st.id, t.id, sub.id, val, mark?.is_absent || false);
                                                }}
                                                className="w-14 h-7 text-center font-bold text-xs p-1 rounded-lg border-slate-200 focus:ring-1 focus:ring-purple-500"
                                              />
                                            </div>
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
                                          <Input
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
                                  <TableCell className="text-center border-l-2 border-purple-100 font-mono text-xs text-slate-600 bg-purple-50/20 font-bold">
                                    {totalMax}
                                  </TableCell>
                                  <TableCell className="text-center font-mono text-xs font-extrabold text-purple-950 bg-purple-50/20">
                                    {isAbsent ? <span className="text-red-600 font-bold">AB</span> : totalObtained}
                                  </TableCell>
                                  <TableCell className="text-center bg-purple-50/20">
                                    {percentage !== null ? (
                                      <Badge variant="outline" className={`font-mono text-[11px] font-extrabold ${gradeInfo.bg}`}>
                                        {percentage.toFixed(1)}%
                                      </Badge>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-mono">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center bg-purple-50/20">
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
                                  <TableCell className="text-xs font-mono font-bold text-[#5c28e8]">{st.roll_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>
                                  {taSubjects.map((sub: any) => {
                                    const ta = st.teacher_assessments?.[String(sub.id)];
                                    return (
                                      <TableCell key={sub.id} className="text-center border-r border-zinc-100 py-2">
                                        {isEditMode && !isVerified ? (
                                          <Input
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

                                  {/* RIGHT SIDE TOTALS */}
                                  <TableCell className="text-center border-l-2 border-purple-100 font-mono text-xs text-slate-600 bg-purple-50/20 font-bold">
                                    {totalMax}
                                  </TableCell>
                                  <TableCell className="text-center font-mono text-xs font-extrabold text-purple-950 bg-purple-50/20">
                                    {totalObtained}
                                  </TableCell>
                                  <TableCell className="text-center bg-purple-50/20">
                                    {percentage !== null ? (
                                      <Badge variant="outline" className={`font-mono text-[11px] font-extrabold ${gradeInfo.bg}`}>
                                        {percentage.toFixed(1)}%
                                      </Badge>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-mono">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center bg-purple-50/20">
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
                                <TableCell className="text-xs font-mono font-bold text-[#5c28e8]">{st.roll_no || "—"}</TableCell>
                                <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>
                                {currentSubjects.map((sub: any) => {
                                  const mark = st.terms_marks?.[activeTab]?.[String(sub.id)];
                                  return (
                                    <TableCell key={sub.id} className="text-center border-r border-zinc-100 py-2">
                                      {isEditMode && !isVerified ? (
                                        <Input
                                          type="number"
                                          min={0}
                                          max={sub.max_marks}
                                          value={mark && mark.score !== null && mark.score !== undefined ? mark.score : ""}
                                          disabled={mark?.is_absent}
                                          onChange={(e) => {
                                            const val = e.target.value === "" ? null : Number(e.target.value);
                                            handleTermMarkChange(st.id, activeTab, sub.id, val, mark?.is_absent || false);
                                          }}
                                          className="w-16 h-7 text-center font-bold text-xs p-1 rounded-lg border-slate-200 focus:ring-1 focus:ring-purple-500"
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

                                {/* RIGHT SIDE TOTALS */}
                                <TableCell className="text-center border-l-2 border-purple-100 font-mono text-xs text-slate-600 bg-purple-50/20 font-bold">
                                  {totalMax}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs font-extrabold text-purple-950 bg-purple-50/20">
                                  {isAbsent ? <span className="text-red-600 font-bold">AB</span> : totalObtained}
                                </TableCell>
                                <TableCell className="text-center bg-purple-50/20">
                                  {percentage !== null ? (
                                    <Badge variant="outline" className={`font-mono text-[11px] font-extrabold ${gradeInfo.bg}`}>
                                      {percentage.toFixed(1)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 text-xs font-mono">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center bg-purple-50/20">
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
                )}
              </Card>

            </div>
          )}
        </>
      )}
    </div>
  );
}
