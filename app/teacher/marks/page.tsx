"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Save,
  Loader2,
  BookOpen,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Users
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getAssignedTeachers } from "@/lib/clerk/assign-teacher";
import { getExamsFull, apiFetch, type ExamFull } from "@/lib/exam-api";
import type { AssignedTeacher } from "@/types/clerk";

interface StudentMarkRow {
  student_id: number;
  student_name: string;
  roll_no?: string;
  gr_no?: string;
  marks_obtained: string;
  is_absent: boolean;
  remarks?: string;
  is_modified?: boolean;
}

export default function EnterMarksPage() {
  const [step, setStep] = useState<"CLASS" | "SUBJECT" | "EXAM" | "ENTRY">("CLASS");
  const [assignments, setAssignments] = useState<AssignedTeacher[]>([]);
  const [exams, setExams] = useState<ExamFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Selections
  const [selectedClass, setSelectedClass] = useState<{ class_name: string; division_name: string; class_id: string } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<{ subject: number | string; subject_name: string } | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamFull | null>(null);

  const [studentRows, setStudentRows] = useState<StudentMarkRow[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingMarks, setHasExistingMarks] = useState(false);

  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const [assigns, examsData] = await Promise.all([
          getAssignedTeachers(),
          getExamsFull()
        ]);
        setAssignments(assigns || []);
        setExams(examsData || []);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load assignments or exams.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, []);

  const handleClassSelect = (className: string, divisionName: string, classId: string) => {
    setSelectedClass({ class_name: className, division_name: divisionName, class_id: classId });
    setStep("SUBJECT");
  };

  const handleSubjectSelect = (subjectId: number | string, subjectName: string) => {
    setSelectedSubject({ subject: subjectId, subject_name: subjectName });
    setStep("EXAM");
  };

  const handleExamSelect = async (exam: ExamFull) => {
    setSelectedExam(exam);
    setStep("ENTRY");
    await loadStudents(exam);
  };

  const loadStudents = async (exam: ExamFull) => {
    setIsLoading(true);
    setIsEditMode(false);
    setHasExistingMarks(false);
    try {
      const division = selectedClass?.division_name;
      const classId = exam.class_group || selectedClass?.class_id;
      
      let url = `/api/get-student/?school_class=${classId}`;
      if (division) {
        url += `&division=${division}`;
      }
      
      const [studentsData, existingMarks] = await Promise.all([
        apiFetch(url),
        apiFetch(`/api/subject-marks/?exam=${exam.id}`).catch(() => []) // fallback to empty if endpoint fails
      ]);
      
      const stList = Array.isArray(studentsData) ? studentsData : studentsData?.results || [];
      const marksList = Array.isArray(existingMarks) ? existingMarks : existingMarks?.results || [];

      if (marksList.length > 0) {
        setHasExistingMarks(true);
      }

      const mappedMarks: StudentMarkRow[] = stList.map((s: any) => {
        const existing = marksList.find((m: any) => m.student === s.id);
        return {
          student_id: s.id,
          student_name: s.full_name || [s.surname, s.name, s.father_name].filter(Boolean).join(" ") || `Student #${s.id}`,
          roll_no: s.roll_no || "",
          gr_no: s.gr_no || "",
          marks_obtained: existing ? (existing.marks_obtained !== null ? String(existing.marks_obtained) : "") : "",
          is_absent: existing ? existing.is_absent : false,
          remarks: existing ? existing.remarks : "",
          is_modified: false,
        };
      });

      setStudentRows(mappedMarks);
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
        toast.error(`Marks cannot exceed the total marks (${maxMarks}).`);
        val = maxMarks.toString();
      } else if (Number(val) < 0) {
        val = "0";
      }
    }
    setStudentRows((prev) =>
      prev.map((r) => r.student_id === studentId ? { ...r, [field]: val, is_modified: true } : r)
    );
  };

  const handleSaveMarks = async () => {
    if (!selectedExam) return;
    setIsSaving(true);
    try {
      const payload = {
        exam_id: selectedExam.id,
        marks: studentRows.map((r) => ({
          student_id: r.student_id,
          marks_obtained: r.is_absent ? null : Number(r.marks_obtained) || 0,
          is_absent: r.is_absent,
          remarks: r.remarks,
          status: "SUBMITTED",
        })),
      };

      await apiFetch("/api/subject-marks/bulk-save/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("🎉 Subject marks saved successfully!");
      setStudentRows((prev) => prev.map((r) => ({ ...r, is_modified: false })));
      setHasExistingMarks(true);
      setIsEditMode(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save marks.");
    } finally {
      setIsSaving(false);
    }
  };

  // Group classes
  const classesMap = new Map();
  assignments.forEach((a) => {
    const key = `${a.class_name}-${a.division_name}`;
    if (!classesMap.has(key)) {
      classesMap.set(key, { class_name: a.class_name, division_name: a.division_name, class_id: (a as any).class_name_id || (a as any).school_class || (a as any).division_name_id || "" }); 
    }
  });
  const uniqueClasses = Array.from(classesMap.values());

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-indigo-600" />
              Marks Entry Portal
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              Teacher
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {step === "CLASS" && "Select a class to enter marks."}
            {step === "SUBJECT" && `Select a subject for ${selectedClass?.class_name} Div ${selectedClass?.division_name}.`}
            {step === "EXAM" && `Select an exam for ${selectedSubject?.subject_name}.`}
            {step === "ENTRY" && `Enter marks for ${selectedSubject?.subject_name} - ${selectedExam?.title}.`}
          </p>
        </div>
        
        {step !== "CLASS" && (
            <Button variant="outline" size="sm" onClick={() => {
                if (step === "ENTRY") setStep("EXAM");
                else if (step === "EXAM") setStep("SUBJECT");
                else if (step === "SUBJECT") setStep("CLASS");
            }} className="text-xs gap-1.5 shadow-sm rounded-xl">
                <ArrowLeft className="h-4 w-4" /> Back
            </Button>
        )}
      </div>

      {isLoading && step !== "ENTRY" ? (
        <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm text-slate-500 font-medium">Loading details...</p>
        </div>
      ) : (
        <>
          {step === "CLASS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueClasses.map((cls, idx) => (
                <Card 
                  key={idx} 
                  className="cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
                  onClick={() => handleClassSelect(cls.class_name, cls.division_name, cls.class_id)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-zinc-800 flex items-center justify-center">
                        <Users className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-zinc-100">{cls.class_name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Division {cls.division_name || "N/A"}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </CardContent>
                </Card>
              ))}
              {uniqueClasses.length === 0 && !isLoading && (
                 <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed">
                   You are not assigned to any classes.
                 </div>
              )}
            </div>
          )}

          {step === "SUBJECT" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments
                  .filter((a) => a.class_name === selectedClass?.class_name && a.division_name === selectedClass?.division_name)
                  .map((a, idx) => (
                    <Card 
                      key={idx} 
                      className="cursor-pointer hover:border-violet-400 hover:shadow-md transition-all group"
                      onClick={() => handleSubjectSelect(a.subject, a.subject_name || "Unknown")}
                    >
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-violet-50 dark:bg-zinc-800 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-violet-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-zinc-100">{a.subject_name}</h3>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-600 transition-colors" />
                      </CardContent>
                    </Card>
                  ))}
            </div>
          )}

          {step === "EXAM" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams
                  .filter((e) => {
                    if (e.subject_name !== selectedSubject?.subject_name) return false;
                    if (e.class_name !== selectedClass?.class_name) return false;
                    if (e.division && e.division !== selectedClass?.division_name) return false;
                    return true;
                  })
                  .map((ex) => (
                    <Card 
                      key={ex.id} 
                      className="cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
                      onClick={() => handleExamSelect(ex)}
                    >
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-zinc-800 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-zinc-100">{ex.title}</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{ex.exam_date}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                      </CardContent>
                    </Card>
                  ))}
                {exams.filter((e) => {
                    if (e.subject_name !== selectedSubject?.subject_name) return false;
                    if (e.class_name !== selectedClass?.class_name) return false;
                    if (e.division && e.division !== selectedClass?.division_name) return false;
                    return true;
                  }).length === 0 && (
                   <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed">
                     No exams found for this subject.
                   </div>
                )}
            </div>
          )}

          {step === "ENTRY" && (
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-2">
                {hasExistingMarks && !isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditMode(true)}
                    className="rounded-xl text-xs gap-1.5 font-bold shadow-xs"
                  >
                    Edit Marks
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveMarks}
                  disabled={isSaving || studentRows.length === 0 || (hasExistingMarks && !isEditMode)}
                  className="rounded-xl text-xs gap-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {hasExistingMarks ? (isEditMode ? "Update Marks" : "Marks Saved") : "Save Marks"}
                </Button>
              </div>

              <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                {isLoading ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                    <p className="text-xs text-slate-500">Loading students...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-zinc-800/50">
                        <TableRow>
                          <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                          <TableHead className="w-24 font-bold text-xs">Roll No.</TableHead>
                          <TableHead className="w-28 font-bold text-xs">GR No.</TableHead>
                          <TableHead className="font-bold text-xs">Student Name</TableHead>
                          <TableHead className="w-24 text-center font-bold text-xs">Total Marks</TableHead>
                          <TableHead className="w-36 text-center font-bold text-xs">Obtained Marks</TableHead>
                          <TableHead className="w-24 text-center font-bold text-xs">Absent?</TableHead>
                          <TableHead className="w-48 font-bold text-xs">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentRows.map((st, idx) => (
                          <TableRow key={st.student_id}>
                            <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-mono font-bold text-indigo-600">{st.roll_no || "—"}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">{st.student_name}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-slate-500">{selectedExam?.max_marks || 100}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={selectedExam?.max_marks || 100}
                                placeholder="Marks"
                                disabled={st.is_absent || (hasExistingMarks && !isEditMode)}
                                value={st.marks_obtained}
                                onChange={(e) => handleMarkChange(st.student_id, "marks_obtained", e.target.value)}
                                className="h-8 text-center font-bold bg-white text-xs"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <label className="flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-zinc-300 text-red-600 shadow-sm focus:ring-red-500 h-4 w-4 disabled:opacity-50"
                                  disabled={hasExistingMarks && !isEditMode}
                                  checked={st.is_absent}
                                  onChange={(e) => {
                                    handleMarkChange(st.student_id, "is_absent", e.target.checked);
                                    if (e.target.checked) {
                                      handleMarkChange(st.student_id, "marks_obtained", "");
                                    }
                                  }}
                                />
                              </label>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Optional remark..."
                                disabled={hasExistingMarks && !isEditMode}
                                value={st.remarks || ""}
                                onChange={(e) => handleMarkChange(st.student_id, "remarks", e.target.value)}
                                className="h-8 text-xs bg-white"
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
