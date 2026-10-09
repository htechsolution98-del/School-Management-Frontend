"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Save, Loader2, Calendar, ChevronRight, ArrowLeft, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getAssignedTeachers } from "@/lib/clerk/assign-teacher";
import { getAcademicYears } from "@/lib/fees/academic-year";
import { apiFetch } from "@/lib/exam-api";
import type { AssignedTeacher } from "@/types/clerk";
import type { AcademicYear } from "@/types/fees";

interface AssessmentRow {
  student_id: number;
  student_name: string;
  roll_no?: string;
  gr_no?: string;
  score: string;
  max_score: string;
  remarks: string;
}

export default function TeacherAssessmentPage() {
  const [step, setStep] = useState<"YEAR" | "CLASS" | "SUBJECT" | "ENTRY">("YEAR");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [assignments, setAssignments] = useState<AssignedTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Selections
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ class_name: string; division_name: string; class_id: string } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<{ subject: number | string; subject_name: string } | null>(null);

  const [studentRows, setStudentRows] = useState<AssessmentRow[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingScores, setHasExistingScores] = useState(false);
  const [globalMaxScore, setGlobalMaxScore] = useState<string>("10");

  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const [assigns, years] = await Promise.all([
          getAssignedTeachers(),
          getAcademicYears()
        ]);
        setAssignments(assigns || []);
        setAcademicYears(years || []);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, []);

  const handleYearSelect = (year: AcademicYear) => {
    setSelectedYear(year);
    setStep("CLASS");
  };

  const handleClassSelect = (className: string, divisionName: string, classId: string) => {
    setSelectedClass({ class_name: className, division_name: divisionName, class_id: classId });
    setStep("SUBJECT");
  };

  const handleSubjectSelect = async (subjectId: number | string, subjectName: string) => {
    setSelectedSubject({ subject: subjectId, subject_name: subjectName });
    setStep("ENTRY");
    await loadStudents(selectedClass?.class_id || "", selectedClass?.division_name || "", selectedYear?.id, subjectId);
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
        apiFetch(`/api/teacher-assessment/?academic_year=${yearId}&subject=${subjectId}`).catch(() => [])
      ]);
      
      const stList = Array.isArray(studentsData) ? studentsData : studentsData?.results || [];
      const marksList = Array.isArray(existingData) ? existingData : existingData?.results || [];

      // Filter existing marks for this class's students
      const studentIds = new Set(stList.map((s: any) => s.id));
      const relevantMarks = marksList.filter((m: any) => studentIds.has(m.student));

      if (relevantMarks.length > 0) {
        setHasExistingScores(true);
        // Use the max_score of the first relevant mark if exists
        setGlobalMaxScore(String(relevantMarks[0].max_score));
      }

      const mappedMarks: AssessmentRow[] = stList.map((s: any) => {
        const existing = relevantMarks.find((m: any) => m.student === s.id);
        return {
          student_id: s.id,
          student_name: s.full_name || [s.surname, s.name, s.father_name].filter(Boolean).join(" ") || `Student #${s.id}`,
          roll_no: s.roll_no || "",
          gr_no: s.gr_no || "",
          score: existing && existing.score !== null ? String(existing.score) : "",
          max_score: existing && existing.max_score !== null ? String(existing.max_score) : globalMaxScore,
          remarks: existing ? existing.remarks || "" : "",
        };
      });

      if (stList.length > 0 && (!classId || classId === "")) {
        const resolvedClassId = String(stList[0].school_class || "");
        if (resolvedClassId) {
          setSelectedClass((prev) => prev ? { ...prev, class_id: resolvedClassId } : null);
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
      toast.error(err?.message || "Failed to load students.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (studentId: number, field: keyof AssessmentRow, val: any) => {
    if (field === "score" && val !== "") {
      const maxScore = Number(globalMaxScore) || 10;
      if (Number(val) > maxScore) {
        toast.error(`Score cannot exceed ${maxScore}.`);
        val = maxScore.toString();
      } else if (Number(val) < 0) {
        val = "0";
      }
    }
    setStudentRows((prev) =>
      prev.map((r) => r.student_id === studentId ? { ...r, [field]: val } : r)
    );
  };

  const handleGlobalMaxScoreChange = (val: string) => {
    setGlobalMaxScore(val);
    setStudentRows((prev) => prev.map((r) => ({ ...r, max_score: val })));
  };

  const handleSaveScores = async () => {
    if (!selectedYear || !selectedSubject || !selectedClass) return;
    setIsSaving(true);
    try {
      const resolvedClassId = selectedClass.class_id || "";
      const payload = {
        academic_year: selectedYear.id,
        school_class: resolvedClassId,
        subject_id: selectedSubject.subject,
        scores: studentRows.map((r) => ({
          student_id: r.student_id,
          score: Number(r.score) || 0,
          max_score: Number(r.max_score) || 10,
          remarks: r.remarks,
        })),
      };

      await apiFetch("/api/teacher-assessment/bulk-save/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("🎉 Teacher assessments saved successfully!");
      setHasExistingScores(true);
      setIsEditMode(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save assessments.");
    } finally {
      setIsSaving(false);
    }
  };

  // Group classes unique by class_name + division
  const classesMap = new Map();
  assignments.forEach((a) => {
    if (!a.class_name) return;
    const key = `${a.class_name}-${a.division_name}`;
    if (!classesMap.has(key)) {
      classesMap.set(key, {
        class_name: a.class_name,
        division_name: a.division_name,
        class_id: (a as any).class_id || (a as any).class_name_id || (a as any).school_class || (a as any).division_name_id || "",
      });
    }
  });
  const uniqueClasses = Array.from(classesMap.values());

  // Subjects for the selected class
  const classSubjects = assignments.filter(
    (a) => a.class_name === selectedClass?.class_name && a.division_name === selectedClass?.division_name
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Teacher Assessment
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                Teacher Module
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {step === "YEAR" && "Select an academic year to continue."}
              {step === "CLASS" && "Select a class to enter assessment scores."}
              {step === "SUBJECT" && `Select a subject for ${selectedClass?.class_name} ${selectedClass?.division_name || ""}.`}
              {step === "ENTRY" && `Enter scores for ${selectedSubject?.subject_name} (${selectedClass?.class_name} ${selectedClass?.division_name || ""}).`}
            </p>
          </div>
        </div>
        {step !== "YEAR" && (
          <Button
            variant="outline"
            onClick={() => {
              if (step === "CLASS") setStep("YEAR");
              if (step === "SUBJECT") setStep("CLASS");
              if (step === "ENTRY") setStep("SUBJECT");
            }}
            className="rounded-xl h-10 px-4 font-bold border-gray-200 hover:bg-slate-50 text-xs gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      {isLoading && step !== "ENTRY" ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#5c28e8]" />
          <p className="text-slate-500 mt-4 text-sm font-medium">Loading data...</p>
        </div>
      ) : (
        <>
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
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#5c28e8] transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === "CLASS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueClasses.map((cls, idx) => (
                <Card 
                  key={idx} 
                  className="group cursor-pointer hover:shadow-md transition-all duration-300 border-gray-200/80 hover:border-purple-300 bg-white rounded-2xl shadow-sm"
                  onClick={() => handleClassSelect(cls.class_name, cls.division_name, cls.class_id)}
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
              {uniqueClasses.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                  You are not assigned to any classes.
                </div>
              )}
            </div>
          )}

          {step === "SUBJECT" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classSubjects.map((sub, idx) => (
                <Card 
                  key={idx} 
                  className="group cursor-pointer hover:shadow-md transition-all duration-300 border-gray-200/80 hover:border-purple-300 bg-white rounded-2xl shadow-sm"
                  onClick={() => handleSubjectSelect(sub.subject, sub.subject_name || "Unknown")}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8]">
                        <BookOpen className="h-6 w-6 text-[#5c28e8]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{sub.subject_name}</h3>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#5c28e8] transition-colors" />
                  </CardContent>
                </Card>
              ))}
              {classSubjects.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                  No subjects found for this class.
                </div>
              )}
            </div>
          )}

          {step === "ENTRY" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">Max Score (From Principal config):</span>
                  <Input 
                    type="number" 
                    value={globalMaxScore} 
                    onChange={(e) => handleGlobalMaxScoreChange(e.target.value)}
                    disabled={hasExistingScores && !isEditMode}
                    className="w-24 h-10 font-bold bg-slate-50 border-gray-200 text-[#5c28e8] rounded-xl text-center" 
                  />
                  <p className="text-xs text-slate-500 font-medium">Set max score as per Principal's guidelines</p>
                </div>
                <div className="flex items-center gap-2">
                  {hasExistingScores && !isEditMode && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(true)}
                      className="rounded-xl text-xs gap-1.5 font-bold h-10 px-4 border-gray-200"
                    >
                      Edit Scores
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveScores}
                    disabled={isSaving || studentRows.length === 0 || (hasExistingScores && !isEditMode)}
                    className="rounded-xl text-xs gap-1.5 font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {hasExistingScores ? (isEditMode ? "Update Scores" : "Scores Saved") : "Save Scores"}
                  </Button>
                </div>
              </div>

              <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
                {isLoading ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#5c28e8] mb-2" />
                    <p className="text-xs text-slate-500">Loading students...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                        <TableRow>
                          <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                          <TableHead className="w-24 font-bold text-xs uppercase tracking-wider text-slate-500">Roll No.</TableHead>
                          <TableHead className="w-28 font-bold text-xs uppercase tracking-wider text-slate-500">GR No.</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Student Name</TableHead>
                          <TableHead className="w-36 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Score (out of {globalMaxScore})</TableHead>
                          <TableHead className="w-64 font-bold text-xs uppercase tracking-wider text-slate-500">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentRows.map((st, idx) => (
                          <TableRow key={st.student_id} className="hover:bg-slate-50/50">
                            <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-mono font-bold text-[#5c28e8]">{st.roll_no || "—"}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-900">{st.student_name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={globalMaxScore}
                                placeholder={`/${globalMaxScore}`}
                                disabled={hasExistingScores && !isEditMode}
                                value={st.score}
                                onChange={(e) => handleScoreChange(st.student_id, "score", e.target.value)}
                                className="h-9 text-center font-bold bg-white text-xs rounded-xl border-gray-200 text-[#5c28e8]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Optional remark..."
                                disabled={hasExistingScores && !isEditMode}
                                value={st.remarks || ""}
                                onChange={(e) => handleScoreChange(st.student_id, "remarks", e.target.value)}
                                className="h-9 text-xs bg-white rounded-xl border-gray-200"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
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
