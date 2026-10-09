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
  Users,
  Lock,
  AlertCircle
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
  status?: string;
  is_modified?: boolean;
}

export default function EnterMarksPage() {
  const [step, setStep] = useState<"CLASS" | "SUBJECT" | "EXAM" | "ENTRY">("CLASS");
  const [assignments, setAssignments] = useState<AssignedTeacher[]>([]);
  const [exams, setExams] = useState<ExamFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selections
  const [selectedClass, setSelectedClass] = useState<{ class_name: string; division_name: string; class_id: string } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<{ subject: number | string; subject_name: string } | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamFull | null>(null);

  const [studentRows, setStudentRows] = useState<StudentMarkRow[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingMarks, setHasExistingMarks] = useState(false);
  const [marksStatus, setMarksStatus] = useState<string>("DRAFT");
  const [lockedByOtherTeacher, setLockedByOtherTeacher] = useState<string | null>(null);
  const [currentStaffId, setCurrentStaffId] = useState<number | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Determine if current user is Class Teacher for selected class
  const isClassTeacher = (
    isAdminUser ||
    assignments.some(
      (a) =>
        a.class_name === selectedClass?.class_name &&
        (!selectedClass?.division_name || a.division_name === selectedClass?.division_name) &&
        a.is_class_teacher
    )
  );

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
        apiFetch(`/api/subject-marks/?exam=${exam.id}`).catch(() => [])
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
          student_name: s.full_name || [s.surname, s.name, s.father_name].filter(Boolean).join(" ") || `Student #${s.id}`,
          roll_no: s.roll_no || "",
          gr_no: s.gr_no || "",
          marks_obtained: existing ? (existing.marks_obtained !== null ? String(existing.marks_obtained) : "") : "",
          is_absent: existing ? existing.is_absent : false,
          remarks: existing ? existing.remarks : "",
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
          marks_obtained: r.is_absent ? null : (r.marks_obtained !== "" ? Number(r.marks_obtained) : 0),
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

  // Group classes
  const classesMap = new Map();
  assignments.forEach((a) => {
    const key = `${a.class_name}-${a.division_name}`;
    if (!classesMap.has(key)) {
      classesMap.set(key, { 
        class_name: a.class_name, 
        division_name: a.division_name, 
        class_id: (a as any).class_id || (a as any).class_name_id || (a as any).school_class || (a as any).division_name_id || "" 
      }); 
    }
  });
  const uniqueClasses = Array.from(classesMap.values());

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Marks Entry Portal
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                {isClassTeacher ? "Class Teacher Mode" : "Subject Teacher Mode"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {step === "CLASS" && "Select a class to enter marks."}
              {step === "SUBJECT" && `Select a subject for ${selectedClass?.class_name} Div ${selectedClass?.division_name}.`}
              {step === "EXAM" && `Select an exam for ${selectedSubject?.subject_name}.`}
              {step === "ENTRY" && `Enter marks for ${selectedSubject?.subject_name} - ${selectedExam?.title}.`}
            </p>
          </div>
        </div>
        
        {step !== "CLASS" && (
          <Button variant="outline" onClick={() => {
            if (step === "ENTRY") setStep("EXAM");
            else if (step === "EXAM") setStep("SUBJECT");
            else if (step === "SUBJECT") setStep("CLASS");
          }} className="text-xs gap-1.5 font-bold h-10 px-4 rounded-xl border-gray-200">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
      </div>

      {isLoading && step !== "ENTRY" ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#5c28e8]">
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
                  className="cursor-pointer border-gray-200/80 hover:border-purple-300 hover:shadow-md transition-all group rounded-2xl shadow-sm"
                  onClick={() => handleClassSelect(cls.class_name, cls.division_name, cls.class_id)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8]">
                        <Users className="h-6 w-6 text-[#5c28e8]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-zinc-100">{cls.class_name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Division {cls.division_name || "N/A"}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#5c28e8] transition-colors" />
                  </CardContent>
                </Card>
              ))}
              {uniqueClasses.length === 0 && !isLoading && (
                 <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
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
                      className="cursor-pointer border-gray-200/80 hover:border-purple-300 hover:shadow-md transition-all group rounded-2xl shadow-sm"
                      onClick={() => handleSubjectSelect(a.subject, a.subject_name || "Unknown")}
                    >
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8]">
                            <BookOpen className="h-6 w-6 text-[#5c28e8]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-zinc-100">{a.subject_name}</h3>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#5c28e8] transition-colors" />
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
                      className="cursor-pointer border-gray-200/80 hover:border-purple-300 hover:shadow-md transition-all group rounded-2xl shadow-sm"
                      onClick={() => handleExamSelect(ex)}
                    >
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8]">
                            <Calendar className="h-6 w-6 text-[#5c28e8]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-zinc-100">{ex.title}</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{ex.exam_date}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#5c28e8] transition-colors" />
                      </CardContent>
                    </Card>
                  ))}
                {exams.filter((e) => {
                    if (e.subject_name !== selectedSubject?.subject_name) return false;
                    if (e.class_name !== selectedClass?.class_name) return false;
                    if (e.division && e.division !== selectedClass?.division_name) return false;
                    return true;
                  }).length === 0 && (
                   <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                     No exams found for this subject.
                   </div>
                )}
            </div>
          )}

          {step === "ENTRY" && (
            <div className="space-y-4">
              {/* Informational Banners */}
              {isSubmittedToClassTeacher && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200">
                  <Lock className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold">Marks Submitted to Class Teacher (Locked for Subject Teacher): </span>
                    You have submitted these marks to the Class Teacher. All authority to modify or finalize marks now belongs to the Class Teacher. If any correction is required, please request the Class Teacher to update or send back the marks.
                  </div>
                </div>
              )}

              {isClassTeacher && (
                <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2.5 text-xs">
                    <GraduationCap className="h-4 w-4 text-[#5c28e8] shrink-0" />
                    <span><strong>Class Teacher Full Authority:</strong> You can edit and update any student marks directly. Use <strong>Save Marks</strong> to update draft values, and <strong>Submit Marks</strong> when finalized.</span>
                  </div>
                  <Badge className="bg-[#5c28e8] text-white text-[10px] shrink-0">Class Teacher</Badge>
                </div>
              )}

              {lockedByOtherTeacher && !isClassTeacher && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200">
                  <Lock className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold">Editing Locked by Assigned Teacher: </span>
                    Marks for this exam were submitted by <strong className="underline">{lockedByOtherTeacher}</strong>.
                  </div>
                </div>
              )}

              {/* Action Buttons Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                  <Badge className={
                    marksStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                    marksStatus === "SUBMITTED" ? "bg-blue-100 text-blue-800 border-blue-200" :
                    "bg-amber-100 text-amber-800 border-amber-200"
                  }>
                    {marksStatus === "VERIFIED" ? "Verified & Locked" : marksStatus === "SUBMITTED" ? "Submitted to Class Teacher" : "Draft (Editable)"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {hasExistingMarks && !isEditMode && !isSubmittedToClassTeacher && !lockedByOtherTeacher && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(true)}
                      className="rounded-xl text-xs gap-1.5 font-bold h-10 px-4 border-gray-200"
                    >
                      Edit Marks
                    </Button>
                  )}

                  {/* For Subject Teacher */}
                  {!isClassTeacher && (
                    <>
                      <Button
                        onClick={() => handleSaveMarks("DRAFT")}
                        disabled={isSaving || isSubmitting || studentRows.length === 0 || isSubmittedToClassTeacher || !!lockedByOtherTeacher}
                        variant="outline"
                        className="rounded-xl text-xs gap-1.5 font-bold h-10 px-4 border-purple-200 text-[#5c28e8] hover:bg-purple-50"
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Draft
                      </Button>

                      <Button
                        onClick={() => handleSaveMarks("SUBMITTED")}
                        disabled={isSaving || isSubmitting || studentRows.length === 0 || isSubmittedToClassTeacher || !!lockedByOtherTeacher}
                        className="rounded-xl text-xs gap-1.5 font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
                      >
                        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="h-3.5 w-3.5" />}
                        Submit Marks to Class Teacher
                      </Button>
                    </>
                  )}

                  {/* For Class Teacher */}
                  {isClassTeacher && (
                    <>
                      <Button
                        onClick={() => handleSaveMarks("DRAFT")}
                        disabled={isSaving || isSubmitting || studentRows.length === 0}
                        variant="outline"
                        className="rounded-xl text-xs gap-1.5 font-bold h-10 px-4 border-purple-200 text-[#5c28e8] hover:bg-purple-50"
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Marks
                      </Button>

                      <Button
                        onClick={() => handleSaveMarks("SUBMITTED")}
                        disabled={isSaving || isSubmitting || studentRows.length === 0}
                        className="rounded-xl text-xs gap-1.5 font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
                      >
                        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="h-3.5 w-3.5" />}
                        Submit Marks
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
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
                          <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Total Marks</TableHead>
                          <TableHead className="w-36 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Obtained Marks</TableHead>
                          <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Absent?</TableHead>
                          <TableHead className="w-48 font-bold text-xs uppercase tracking-wider text-slate-500">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentRows.map((st, idx) => (
                          <TableRow key={st.student_id} className="hover:bg-slate-50/50">
                            <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-mono font-bold text-[#5c28e8]">{st.roll_no || "—"}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">{st.gr_no || "—"}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">{st.student_name}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-slate-500">{selectedExam?.max_marks || 100}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={selectedExam?.max_marks || 100}
                                placeholder="Marks"
                                disabled={st.is_absent || isSubmittedToClassTeacher || (hasExistingMarks && !isEditMode && !isClassTeacher)}
                                value={st.marks_obtained}
                                onChange={(e) => handleMarkChange(st.student_id, "marks_obtained", e.target.value)}
                                className="h-9 text-center font-bold bg-white text-xs rounded-xl border-gray-200"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <label className="flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-zinc-300 text-red-600 shadow-sm focus:ring-red-500 h-4 w-4 disabled:opacity-50"
                                  disabled={isSubmittedToClassTeacher || (hasExistingMarks && !isEditMode && !isClassTeacher)}
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
                                disabled={isSubmittedToClassTeacher || (hasExistingMarks && !isEditMode && !isClassTeacher)}
                                value={st.remarks || ""}
                                onChange={(e) => handleMarkChange(st.student_id, "remarks", e.target.value)}
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

