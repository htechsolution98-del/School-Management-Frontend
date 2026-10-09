"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Calendar,
  School,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Send,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import {
  getExamTerms,
  getClassMarksGrid,
  verifyClassMarks,
  getExamsFull,
  type ExamTerm,
} from "@/lib/exam-api";

function MarksVerificationInner() {
  const searchParams = useSearchParams();
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDiv, setSelectedDiv] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [gridData, setGridData] = useState<{
    terms?: any[];
    subjects?: any[];
    students?: any[];
    is_submitted_to_principal?: boolean;
    has_submitted_marks?: boolean;
    class_teacher_verification_status?: string;
    class_teacher_name?: string;
    verified_at?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  // Send back modal
  const [isSendBackOpen, setIsSendBackOpen] = useState(false);
  const [sendBackRemarks, setSendBackRemarks] = useState("");

  const [exams, setExams] = useState<any[]>([]);

  const classesWithExams = useMemo(() => {
    if (!exams || exams.length === 0) return classes;
    const classIdsWithExams = new Set(
      exams.map((e: any) =>
        String(typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group)
      ).filter(Boolean)
    );
    const filtered = classes.filter((c: any) => classIdsWithExams.has(String(c.id)));
    return filtered.length > 0 ? filtered : classes;
  }, [classes, exams]);

  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    if (!selectedClassId || selectedClassId === "ALL") {
      divisions.forEach((d: any) => { if (d.division) set.add(String(d.division).trim()); });
      exams.forEach((e: any) => { if (e.division && e.division !== "ALL") set.add(String(e.division).trim()); });
      gridData?.students?.forEach((s: any) => { if (s.division) set.add(String(s.division).trim()); });
      return Array.from(set).sort();
    }
    const targetClassId = String(selectedClassId);
    divisions.forEach((d: any) => {
      const rawClass = typeof d.SchoolClass === "object" && d.SchoolClass !== null
        ? d.SchoolClass.id
        : (d.SchoolClass ?? d.school_class ?? d.school_class_id);
      if (String(rawClass) === targetClassId && d.division) {
        set.add(String(d.division).trim());
      }
    });
    exams.forEach((e: any) => {
      const cId = typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group;
      if (String(cId) === targetClassId && e.division && e.division !== "ALL") {
        set.add(String(e.division).trim());
      }
    });
    gridData?.students?.forEach((s: any) => {
      if (s.division) set.add(String(s.division).trim());
    });
    return Array.from(set).sort();
  }, [divisions, selectedClassId, exams, gridData]);

  const loadInitial = async () => {
    setIsLoading(true);
    try {
      const [yearsData, classesData, divisionsData] = await Promise.all([
        getAcademicYearsForPrincipal(),
        getClasses(),
        getDivisions(),
      ]);

      setAcademicYears(yearsData || []);
      setClasses(classesData || []);
      setDivisions(divisionsData || []);

      const paramYear = searchParams.get("academic_year") || searchParams.get("year_id");
      const paramClass = searchParams.get("class_id") || searchParams.get("school_class");
      const paramTerm = searchParams.get("exam_term") || searchParams.get("term_id");
      const paramDivision = searchParams.get("division");

      let resolvedYearId = "";
      if (paramYear && yearsData.some((y: any) => String(y.id) === paramYear)) {
        resolvedYearId = paramYear;
      } else if (yearsData && yearsData.length > 0) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        resolvedYearId = String(activeYr.id);
      }
      setSelectedYearId(resolvedYearId);

      let resolvedClassId = "";
      if (paramClass && classesData.some((c: any) => String(c.id) === paramClass)) {
        resolvedClassId = paramClass;
      } else if (classesData && classesData.length > 0) {
        resolvedClassId = String(classesData[0].id);
      }
      setSelectedClassId(resolvedClassId);

      if (paramDivision) {
        setSelectedDiv(paramDivision);
      }

      let initialTerm = "ALL";
      if (resolvedYearId) {
        const [terms, examsList] = await Promise.all([
          getExamTerms(Number(resolvedYearId)),
          getExamsFull({ academic_year: Number(resolvedYearId) }),
        ]);
        setExamTerms(terms || []);
        setExams(examsList || []);

        if (examsList && examsList.length > 0) {
          const classIdsWithExams = new Set(
            examsList.map((e: any) =>
              String(typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group)
            ).filter(Boolean)
          );
          if (!classIdsWithExams.has(resolvedClassId)) {
            const firstValidClass = classesData.find((c: any) => classIdsWithExams.has(String(c.id)));
            if (firstValidClass) {
              setSelectedClassId(String(firstValidClass.id));
            }
          }
        }

        if (paramTerm) {
          initialTerm = paramTerm;
        } else if (terms && terms.length > 0) {
          initialTerm = String(terms[0].id);
        }
      }
      setSelectedTermId(initialTerm);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load verification metadata.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadGrid = async () => {
    if (!selectedYearId || !selectedClassId) return;
    setIsLoading(true);
    try {
      const res = await getClassMarksGrid({
        academic_year: Number(selectedYearId),
        school_class: Number(selectedClassId),
        exam_term: selectedTermId && selectedTermId !== "ALL" ? Number(selectedTermId) : undefined,
        division: selectedDiv !== "ALL" ? selectedDiv : undefined,
      });

      setGridData(res);
      if (res?.terms && res.terms.length > 0) {
        setExamTerms((prev) => {
          const map = new Map();
          prev.forEach((t) => map.set(String(t.id), t));
          res.terms.forEach((t: any) => {
            if (!map.has(String(t.id))) {
              map.set(String(t.id), { id: t.id, name: t.name });
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load class marks verification grid.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId && selectedClassId) {
      loadGrid();
    }
  }, [selectedYearId, selectedClassId, selectedTermId, selectedDiv]);

  // Handle Verify Consolidated Marks
  const handleVerify = async () => {
    if (!selectedYearId || !selectedClassId) {
      toast.error("Please select academic year and class.");
      return;
    }

    const termToVerify =
      selectedTermId && selectedTermId !== "ALL"
        ? Number(selectedTermId)
        : examTerms.length > 0
        ? Number(examTerms[0].id)
        : gridData?.terms && gridData.terms.length > 0
        ? Number(gridData.terms[0].id)
        : 1;

    setIsVerifying(true);
    try {
      await verifyClassMarks({
        academic_year: Number(selectedYearId),
        exam_term: termToVerify,
        school_class: Number(selectedClassId),
        division: selectedDiv !== "ALL" ? selectedDiv : undefined,
        status: "VERIFIED",
        remarks: "Verified and approved by Principal",
      });

      toast.success("✅ Class marks consolidated sheet successfully verified and locked!");
      await loadGrid();
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify class marks.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Send Back for Corrections
  const handleSendBack = async () => {
    if (!sendBackRemarks.trim()) {
      toast.error("Please enter a reason/remark for sending marks back to the teacher.");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyClassMarks({
        academic_year: Number(selectedYearId),
        exam_term: Number(selectedTermId),
        school_class: Number(selectedClassId),
        division: selectedDiv !== "ALL" ? selectedDiv : undefined,
        status: "SENT_BACK",
        remarks: sendBackRemarks,
      });

      toast.success("↩️ Marks sent back to Subject Teachers for correction.");
      setIsSendBackOpen(false);
      setSendBackRemarks("");
      await loadGrid();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send back marks.");
    } finally {
      setIsVerifying(false);
    }
  };

  const students = gridData?.students || [];
  const subjects = gridData?.subjects || [];
  const termsList = gridData?.terms || [];

  const filteredStudents = students.filter((st: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (st.name || "").toLowerCase().includes(q) ||
      (st.roll_no || "").toLowerCase().includes(q) ||
      (st.gr_no || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Class Consolidated Marks Verification
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                Exam Module
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Review consolidated subject marks for each class. Approve and verify marks or send back with correction notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsSendBackOpen(true)}
            disabled={isVerifying || filteredStudents.length === 0}
            className="rounded-xl text-xs gap-1.5 font-bold text-rose-600 border-rose-200 hover:bg-rose-50 h-10 px-4"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Send Back to Teachers
          </Button>

          <Button
            onClick={handleVerify}
            disabled={isVerifying || filteredStudents.length === 0 || (!gridData?.is_submitted_to_principal && !gridData?.has_submitted_marks)}
            className="rounded-xl text-xs gap-1.5 font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20 disabled:opacity-50"
          >
            {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Verify & Approve Consolidated Sheet
          </Button>
        </div>
      </div>

      {/* Control Filter Card */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-[#5c28e8]">
            <Filter className="h-4 w-4 text-[#5c28e8]" /> SELECT CLASS TO VERIFY
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Academic Year:</label>
              <Select
                value={selectedYearId}
                onValueChange={async (val) => {
                  if (val) {
                    setSelectedYearId(val);
                    const terms = await getExamTerms(Number(val));
                    setExamTerms(terms || []);
                    if (terms && terms.length > 0) {
                      setSelectedTermId(String(terms[0].id));
                    } else {
                      setSelectedTermId("ALL");
                    }
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="Academic Year">
                    {(() => {
                      const yr = academicYears.find((y) => String(y.id) === String(selectedYearId));
                      if (!yr) return selectedYearId ? `Academic Year ${selectedYearId}` : "Academic Year";
                      return yr.name || (yr.start_year && yr.end_year ? `${yr.start_year}-${yr.end_year}` : `Academic Year ${yr.id}`);
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={String(y.id)}>
                      {y.name || `${y.start_year}-${y.end_year}`} {y.is_active ? "(Active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Exam Term:</label>
              <Select
                value={selectedTermId || "ALL"}
                onValueChange={(val) => {
                  if (val) setSelectedTermId(val);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="All Terms">
                    {selectedTermId === "ALL" || !selectedTermId
                      ? "All Terms"
                      : examTerms.find((t) => String(t.id) === String(selectedTermId))?.name || `Term ${selectedTermId}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Terms</SelectItem>
                  {examTerms.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Class:</label>
              <Select
                value={selectedClassId}
                onValueChange={(val) => {
                  if (val) {
                    setSelectedClassId(val);
                    setSelectedDiv("ALL");
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="Select Class">
                    {classesWithExams.find((cls) => String(cls.id) === String(selectedClassId))?.school_class ||
                     classesWithExams.find((cls) => String(cls.id) === String(selectedClassId))?.name ||
                     (selectedClassId ? `Class ${selectedClassId}` : "Select Class")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classesWithExams.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.school_class || cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Division:</label>
              <Select value={selectedDiv} onValueChange={(val) => { if (val) setSelectedDiv(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="All Divisions">
                    {selectedDiv === "ALL" ? "All Divisions" : `Division ${selectedDiv}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Divisions</SelectItem>
                  {availableDivisions.map((divName: string) => (
                    <SelectItem key={divName} value={divName}>
                      Division {divName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consolidated Marks Grid */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <School className="h-5 w-5 text-[#5c28e8]" />
              Consolidated Class Marks Sheet ({filteredStudents.length} Students)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Multi-subject consolidated view for Class Teacher and Principal verification.
            </CardDescription>
          </div>

          <Button size="sm" variant="outline" onClick={loadGrid} className="rounded-xl text-xs gap-1 h-9 border-gray-200">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoading && gridData && !gridData.is_submitted_to_principal && !gridData.has_submitted_marks && (
            <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Pending Submission from Class Teacher
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  The Class Teacher has not yet submitted or verified the consolidated marks for this examination term. Marks will appear here once submitted by the Class Teacher.
                </p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#5c28e8]" /> Loading consolidated marks grid...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No student marks recorded for this class and exam term.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Roll</TableHead>
                    <TableHead className="w-48 font-bold text-xs uppercase tracking-wider text-slate-500">Student Name</TableHead>
                    {subjects.map((subj: any) => (
                      <TableHead key={subj.id} className="text-center font-bold text-xs uppercase tracking-wider text-slate-500 min-w-[90px]">
                        {subj.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-slate-500 w-28">Total</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-slate-500 w-24">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((st: any) => {
                    let totalObtained = 0;
                    let totalMax = 0;
                    let hasMarks = false;

                    return (
                      <TableRow key={st.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-mono text-xs font-semibold text-slate-500">
                          {st.roll_no || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                          {st.name}
                        </TableCell>

                        {subjects.map((subj: any) => {
                          const termMarksObj =
                            selectedTermId && selectedTermId !== "ALL" && st.terms_marks
                              ? st.terms_marks[selectedTermId]
                              : null;
                          const markObj = termMarksObj
                            ? termMarksObj[String(subj.id)]
                            : st.marks
                            ? st.marks[String(subj.id)]
                            : null;

                          if (markObj && markObj.score !== null && !markObj.is_absent) {
                            totalObtained += Number(markObj.score);
                            totalMax += Number(markObj.max || 100);
                            hasMarks = true;
                          }

                          return (
                            <TableCell key={subj.id} className="text-center font-mono text-xs">
                              {markObj ? (
                                markObj.status === "PENDING_CLASS_TEACHER_SUBMISSION" ? (
                                  <span className="text-amber-500 font-medium text-[10px] tracking-tight">Pending CT</span>
                                ) : markObj.is_absent ? (
                                  <span className="text-rose-600 font-bold">AB</span>
                                ) : markObj.score !== null ? (
                                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                    {markObj.score} <span className="text-slate-400 font-normal">/{markObj.max}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-center font-mono font-bold text-xs text-[#5c28e8]">
                          {hasMarks ? `${totalObtained} / ${totalMax}` : "—"}
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs text-emerald-600">
                          {hasMarks && totalMax > 0 ? `${Math.round((totalObtained / totalMax) * 100)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Back Modal */}
      <Dialog open={isSendBackOpen} onOpenChange={setIsSendBackOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-gray-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <RotateCcw className="h-5 w-5" /> Send Marks Back for Correction
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide feedback or instructions to Subject Teachers on which marks need revision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Reason for Sending Back (Mandatory):</label>
              <Textarea
                rows={4}
                value={sendBackRemarks}
                onChange={(e) => setSendBackRemarks(e.target.value)}
                placeholder="e.g. Science practical marks need re-checking for Roll numbers 12 and 15."
                className="text-xs rounded-2xl border-gray-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button variant="ghost" onClick={() => setIsSendBackOpen(false)} className="rounded-xl text-xs h-10">
              Cancel
            </Button>
            <Button
              onClick={handleSendBack}
              disabled={isVerifying}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white h-10 px-5"
            >
              {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Send Back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MarksVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#5c28e8]" />
        </div>
      }
    >
      <MarksVerificationInner />
    </Suspense>
  );
}

