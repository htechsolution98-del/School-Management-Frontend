"use client";

import { useEffect, useState } from "react";
import { 
  Users, CheckCircle2, Save, Loader2, Calendar, 
  ChevronRight, ArrowLeft, GraduationCap, XCircle, FileText, Lock,
  Layers, Sparkles, BookOpen, Award
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<ExamTerm | null>(null);

  const [verificationData, setVerificationData] = useState<any | null>(null);
  const [remarks, setRemarks] = useState("");

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

      toast.success(action === "VERIFIED" ? "Marks verified and locked!" : "Status updated to Sent Back!");
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
    return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">PENDING</span>;
  };

  const isVerified = verificationData?.status === "VERIFIED";

  // Data helpers
  const terms = gridData?.terms || [];
  const taSubjects = gridData?.teacher_assessment_subjects || [];
  const students = gridData?.students || [];

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verify Marks</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {step === "CLASS" && "Select a class where you are the class teacher."}
              {step === "YEAR" && "Select an academic year."}
              {step === "VERIFY" && `Comprehensive Marks Verification for ${selectedClass?.class_name} ${selectedClass?.division_name || ""}.`}
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
            className="rounded-xl h-10 px-4 font-bold border-zinc-200 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
      </div>

      {isLoading && step !== "VERIFY" ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-slate-500 mt-4 text-sm font-medium">Loading...</p>
        </div>
      ) : (
        <>
          {step === "CLASS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classTeacherAssignments.map((cls, idx) => (
                <Card 
                  key={idx} 
                  className="group cursor-pointer hover:shadow-md transition-all duration-300 border-zinc-200/80 hover:border-emerald-300 bg-white"
                  onClick={() => handleClassSelect(cls)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{cls.class_name}</h3>
                        {cls.division_name && <p className="text-xs text-slate-500 font-medium mt-0.5">Division {cls.division_name}</p>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  </CardContent>
                </Card>
              ))}
              {classTeacherAssignments.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed">
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
                  className="group cursor-pointer hover:shadow-md transition-all duration-300 border-zinc-200/80 hover:border-indigo-300 bg-white"
                  onClick={() => handleYearSelect(year)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{year.name}</h3>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === "VERIFY" && (
            <div className="space-y-6">
              
              {/* Verification Controls */}
              <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
                <div className="p-8 max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedClass?.class_name} {selectedClass?.division_name} - All Evaluations Verification
                      </h2>
                      <p className="text-sm text-slate-500">
                        Review all entered marks for Term-1, Term-2, and Teacher Assessments before locking.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</span>
                      {getStatusBadge(verificationData?.status || "PENDING")}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700">Remarks {isVerified ? "(Locked)" : "(Required if Sending Back)"}</label>
                    <Textarea 
                      placeholder={isVerified ? "Remarks are locked." : "Add any observations or reasons for sending back..."}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={isVerified}
                      className="resize-none h-24 rounded-xl border-zinc-200 bg-slate-50"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleVerifyAction("SENT_BACK")}
                      disabled={isSubmitting || isVerified}
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-bold"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Send Back
                    </Button>
                    <Button 
                      onClick={() => handleVerifyAction("VERIFIED")}
                      disabled={isSubmitting || isVerified}
                      className={`rounded-xl font-bold ${isVerified ? "bg-emerald-600 opacity-80" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isVerified ? "Already Verified & Locked" : "Verify & Lock Marks"}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Marks Grid with Multi-Evaluation Tabs */}
              <Card className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Award className="h-4 w-4 text-indigo-600" />
                      Class Marks Grid
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{students.length} Students enrolled in this division</p>
                  </div>

                  {/* Tab Selector */}
                  <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 p-1.5 rounded-2xl">
                    <Button
                      size="xs"
                      variant={activeTab === "ALL" ? "default" : "ghost"}
                      onClick={() => setActiveTab("ALL")}
                      className={`rounded-xl text-xs font-bold gap-1.5 h-8 ${activeTab === "ALL" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-white"}`}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> All Combined
                    </Button>

                    {terms.map((t: any) => (
                      <Button
                        key={t.id}
                        size="xs"
                        variant={activeTab === t.id ? "default" : "ghost"}
                        onClick={() => setActiveTab(t.id)}
                        className={`rounded-xl text-xs font-bold gap-1.5 h-8 ${activeTab === t.id ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-white"}`}
                      >
                        <BookOpen className="h-3.5 w-3.5" /> {t.name}
                      </Button>
                    ))}

                    {taSubjects.length > 0 && (
                      <Button
                        size="xs"
                        variant={activeTab === "TEACHER_ASSESSMENT" ? "default" : "ghost"}
                        onClick={() => setActiveTab("TEACHER_ASSESSMENT")}
                        className={`rounded-xl text-xs font-bold gap-1.5 h-8 ${activeTab === "TEACHER_ASSESSMENT" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-white"}`}
                      >
                        <GraduationCap className="h-3.5 w-3.5" /> Teacher Assessment
                      </Button>
                    )}
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                    <p className="text-xs text-slate-500">Loading comprehensive grid...</p>
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
                            </TableRow>

                            {/* Level 2 Header (Subjects) */}
                            <TableRow className="bg-slate-50 border-b border-zinc-200">
                              <TableHead className="w-10 text-center font-bold text-[11px] sticky left-0 bg-slate-50 z-20">#</TableHead>
                              <TableHead className="w-16 font-bold text-[11px] sticky left-10 bg-slate-50 z-20">Roll</TableHead>
                              <TableHead className="w-20 font-bold text-[11px]">GR No.</TableHead>
                              <TableHead className="min-w-[180px] font-bold text-[11px] border-r border-zinc-200">Student Name</TableHead>

                              {terms.map((t: any) => 
                                t.subjects.map((sub: any) => (
                                  <TableHead key={`${t.id}-${sub.id}`} className="min-w-[100px] text-center font-bold text-[11px] border-r border-zinc-100 bg-indigo-50/20">
                                    <div className="font-bold text-slate-800">{sub.name}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_marks}</div>
                                  </TableHead>
                                ))
                              )}

                              {taSubjects.map((sub: any) => (
                                <TableHead key={`ta-${sub.id}`} className="min-w-[100px] text-center font-bold text-[11px] border-r border-zinc-100 bg-amber-50/20">
                                  <div className="font-bold text-slate-800">{sub.name}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_score}</div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </>
                        ) : activeTab === "TEACHER_ASSESSMENT" ? (
                          <TableRow className="bg-slate-50 border-b border-zinc-200">
                            <TableHead className="w-12 text-center font-bold text-xs sticky left-0 bg-slate-50 z-10">#</TableHead>
                            <TableHead className="w-20 font-bold text-xs">Roll No.</TableHead>
                            <TableHead className="w-24 font-bold text-xs">GR No.</TableHead>
                            <TableHead className="min-w-[200px] font-bold text-xs border-r border-zinc-200">Student Name</TableHead>
                            {taSubjects.map((sub: any) => (
                              <TableHead key={sub.id} className="min-w-[120px] text-center font-bold text-xs border-r border-zinc-100 bg-amber-50/40">
                                <div>{sub.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_score}</div>
                              </TableHead>
                            ))}
                          </TableRow>
                        ) : (
                          /* Specific Term View */
                          (() => {
                            const currentTerm = terms.find((t: any) => t.id === activeTab);
                            const currentSubjects = currentTerm?.subjects || [];
                            return (
                              <TableRow className="bg-slate-50 border-b border-zinc-200">
                                <TableHead className="w-12 text-center font-bold text-xs sticky left-0 bg-slate-50 z-10">#</TableHead>
                                <TableHead className="w-20 font-bold text-xs">Roll No.</TableHead>
                                <TableHead className="w-24 font-bold text-xs">GR No.</TableHead>
                                <TableHead className="min-w-[200px] font-bold text-xs border-r border-zinc-200">Student Name</TableHead>
                                {currentSubjects.map((sub: any) => (
                                  <TableHead key={sub.id} className="min-w-[120px] text-center font-bold text-xs border-r border-zinc-100 bg-indigo-50/40">
                                    <div>{sub.name}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Max: {sub.max_marks}</div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            );
                          })()
                        )}
                      </TableHeader>

                      <TableBody>
                        {students.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={12} className="text-center py-12 text-slate-500">
                              No student records found for this class & division.
                            </TableCell>
                          </TableRow>
                        ) : (
                          students.map((st: any, idx: number) => {
                            if (activeTab === "ALL") {
                              return (
                                <TableRow key={st.id} className="hover:bg-slate-50/60 transition-colors">
                                  <TableCell className="text-center font-mono text-[11px] text-slate-400 sticky left-0 bg-white z-10">{idx + 1}</TableCell>
                                  <TableCell className="text-xs font-mono font-bold text-indigo-600 sticky left-10 bg-white z-10">{st.roll_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>

                                  {/* Term Exam Marks */}
                                  {terms.map((t: any) => 
                                    t.subjects.map((sub: any) => {
                                      const mark = st.terms_marks?.[t.id]?.[String(sub.id)];
                                      return (
                                        <TableCell key={`${t.id}-${sub.id}`} className="text-center border-r border-zinc-100 py-2.5">
                                          {mark ? (
                                            mark.is_absent ? (
                                              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">AB</span>
                                            ) : (
                                              <span className="text-xs font-bold text-slate-800">
                                                {mark.score} <span className="text-slate-400 font-normal text-[11px]">/ {mark.max}</span>
                                              </span>
                                            )
                                          ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                          )}
                                        </TableCell>
                                      );
                                    })
                                  )}

                                  {/* Teacher Assessment Marks */}
                                  {taSubjects.map((sub: any) => {
                                    const ta = st.teacher_assessments?.[String(sub.id)];
                                    return (
                                      <TableCell key={`ta-${sub.id}`} className="text-center border-r border-zinc-100 bg-amber-50/10 py-2.5">
                                        {ta && ta.score !== null ? (
                                          <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                                            {ta.score} <span className="text-amber-600 font-normal text-[10px]">/ {ta.max_score}</span>
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-300">—</span>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            }

                            if (activeTab === "TEACHER_ASSESSMENT") {
                              return (
                                <TableRow key={st.id} className="hover:bg-slate-50/60 transition-colors">
                                  <TableCell className="text-center font-mono text-xs text-slate-400 sticky left-0 bg-white z-10">{idx + 1}</TableCell>
                                  <TableCell className="text-xs font-mono font-bold text-indigo-600">{st.roll_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                  <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>
                                  {taSubjects.map((sub: any) => {
                                    const ta = st.teacher_assessments?.[String(sub.id)];
                                    return (
                                      <TableCell key={sub.id} className="text-center border-r border-zinc-100 py-3">
                                        {ta && ta.score !== null ? (
                                          <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                            {ta.score} <span className="text-amber-600 font-normal text-[11px]">/ {ta.max_score}</span>
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-300">—</span>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            }

                            // Specific Term View
                            const currentTerm = terms.find((t: any) => t.id === activeTab);
                            const currentSubjects = currentTerm?.subjects || [];
                            return (
                              <TableRow key={st.id} className="hover:bg-slate-50/60 transition-colors">
                                <TableCell className="text-center font-mono text-xs text-slate-400 sticky left-0 bg-white z-10">{idx + 1}</TableCell>
                                <TableCell className="text-xs font-mono font-bold text-indigo-600">{st.roll_no || "—"}</TableCell>
                                <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                                <TableCell className="text-xs font-bold text-slate-900 border-r border-zinc-200">{st.name}</TableCell>
                                {currentSubjects.map((sub: any) => {
                                  const mark = st.terms_marks?.[activeTab]?.[String(sub.id)];
                                  return (
                                    <TableCell key={sub.id} className="text-center border-r border-zinc-100 py-3">
                                      {mark ? (
                                        mark.is_absent ? (
                                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">AB</span>
                                        ) : (
                                          <span className="text-xs font-bold text-slate-800">
                                            {mark.score} <span className="text-slate-400 font-normal">/ {mark.max}</span>
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-xs text-slate-300">—</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
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
