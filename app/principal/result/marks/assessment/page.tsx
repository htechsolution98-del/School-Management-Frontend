"use client";

import { useEffect, useState, useMemo } from "react";
import {
  UserCheck,
  Calendar,
  School,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Users,
  Award,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import { getSubjects } from "@/lib/clerk/subjects";
import {
  getClassMarksGrid,
  saveTeacherAssessments,
  getExamsFull,
} from "@/lib/exam-api";

export default function TeacherAssessmentPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjId, setSelectedSubjId] = useState<string>("");
  const [selectedDiv, setSelectedDiv] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<{ [studentId: number]: { score: number; remarks: string } }>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      students.forEach((s: any) => { if (s.division) set.add(String(s.division).trim()); });
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
    students.forEach((s: any) => {
      if (s.division) set.add(String(s.division).trim());
    });
    return Array.from(set).sort();
  }, [divisions, selectedClassId, exams, students]);

  const loadInitial = async () => {
    setIsLoading(true);
    try {
      const [yearsData, classesData, divisionsData, subjectsData] = await Promise.all([
        getAcademicYearsForPrincipal(),
        getClasses(),
        getDivisions(),
        getSubjects(),
      ]);

      setAcademicYears(yearsData || []);
      setClasses(classesData || []);
      setDivisions(divisionsData || []);
      setSubjects(subjectsData || []);

      if (yearsData && yearsData.length > 0) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        const yrId = selectedYearId || String(activeYr.id);
        setSelectedYearId(yrId);

        const examsList = await getExamsFull({ academic_year: Number(yrId) });
        setExams(examsList || []);

        const classIdsWithExams = new Set(
          (examsList || []).map((e: any) =>
            String(typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group)
          ).filter(Boolean)
        );

        if (classesData && classesData.length > 0 && !selectedClassId) {
          const firstValidClass = classesData.find((c: any) => classIdsWithExams.has(String(c.id))) || classesData[0];
          setSelectedClassId(String(firstValidClass.id));
        }
        if (subjectsData && subjectsData.length > 0 && !selectedSubjId) {
          setSelectedSubjId(String(subjectsData[0].id));
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load evaluation metadata.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadStudentScores = async () => {
    if (!selectedYearId || !selectedClassId) return;
    setIsLoading(true);
    try {
      const res = await getClassMarksGrid({
        academic_year: Number(selectedYearId),
        school_class: Number(selectedClassId),
        division: selectedDiv !== "ALL" ? selectedDiv : undefined,
      });

      const stList = res?.students || [];
      setStudents(stList);

      const initialScores: { [id: number]: { score: number; remarks: string } } = {};
      stList.forEach((st: any) => {
        const taObj = st.teacher_assessments ? st.teacher_assessments[selectedSubjId] : null;
        initialScores[st.id] = {
          score: taObj?.score !== undefined && taObj?.score !== null ? Number(taObj.score) : 8.5,
          remarks: taObj?.remarks || "",
        };
      });
      setScores(initialScores);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load student evaluation records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId && selectedClassId && selectedSubjId) {
      loadStudentScores();
    }
  }, [selectedYearId, selectedClassId, selectedSubjId, selectedDiv]);

  const handleScoreChange = (stId: number, val: number) => {
    const clamped = Math.max(0, Math.min(10, val));
    setScores((prev) => ({
      ...prev,
      [stId]: {
        ...prev[stId],
        score: clamped,
      },
    }));
  };

  const handleRemarksChange = (stId: number, remarks: string) => {
    setScores((prev) => ({
      ...prev,
      [stId]: {
        ...prev[stId],
        remarks,
      },
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedYearId || !selectedClassId || !selectedSubjId) {
      toast.error("Please select academic year, class, and subject.");
      return;
    }

    setIsSaving(true);
    try {
      const payloadScores = Object.entries(scores).map(([stId, val]) => ({
        student_id: Number(stId),
        score: val.score,
        max_score: 10,
        remarks: val.remarks,
      }));

      await saveTeacherAssessments({
        academic_year: Number(selectedYearId),
        school_class: Number(selectedClassId),
        subject_id: Number(selectedSubjId),
        scores: payloadScores,
      });

      toast.success("🎉 Teacher assessment scores saved successfully!");
      await loadStudentScores();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save teacher assessment scores.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (st.name || "").toLowerCase().includes(q) ||
      (st.roll_no || "").toLowerCase().includes(q)
    );
  });



  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Teacher Assessment Manager (10% Component)
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                Exam Module
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Subject Teachers and Class Teachers evaluate student classroom engagement, discipline, and behavioral performance (Out of 10).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
            <SelectTrigger className="w-52 h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
              <SelectValue placeholder="Select Academic Year">
                {academicYears.find((y) => String(y.id) === String(selectedYearId))
                  ? `${academicYears.find((y) => String(y.id) === String(selectedYearId)).name || `${academicYears.find((y) => String(y.id) === String(selectedYearId)).start_year}-${academicYears.find((y) => String(y.id) === String(selectedYearId)).end_year}`}${academicYears.find((y) => String(y.id) === String(selectedYearId)).is_active ? " (Active)" : ""}`
                  : "Select Academic Year"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => (
                <SelectItem key={y.id} value={String(y.id)}>
                  {y.name || `${y.start_year}-${y.end_year}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSaveAll}
            disabled={isSaving || students.length === 0}
            className="rounded-xl text-xs gap-1.5 font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Assessments
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-[#5c28e8]">
            <Filter className="h-4 w-4 text-[#5c28e8]" /> ASSESSMENT CRITERIA
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                    {classesWithExams.find((c) => String(c.id) === String(selectedClassId))?.school_class || "Select Class"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classesWithExams.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.school_class}
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Subject / Evaluation Domain:</label>
              <Select value={selectedSubjId} onValueChange={(val) => { if (val) setSelectedSubjId(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="Select Subject">
                    {subjects.find((s) => String(s.id) === String(selectedSubjId))?.name ||
                      subjects.find((s) => String(s.id) === String(selectedSubjId))?.subject_name ||
                      "Select Subject"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.name || sub.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Search Student:</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Roll no, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Entry Grid */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#5c28e8]" />
              Student Evaluation Roster ({filteredStudents.length} Enrolled Students)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Scores are entered out of 10 and dynamically normalized to the 10% result weightage component.
            </CardDescription>
          </div>

          <Button size="sm" variant="outline" onClick={loadStudentScores} className="rounded-xl text-xs gap-1 h-9 border-gray-200">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#5c28e8]" /> Loading student evaluation scores...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No students enrolled in this class.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                    <TableHead className="w-16 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Roll</TableHead>
                    <TableHead className="w-64 font-bold text-xs uppercase tracking-wider text-slate-500">Student Name</TableHead>
                    <TableHead className="w-48 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Assessment Score (0 - 10)</TableHead>
                    <TableHead className="w-32 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Normalized 10% Contribution</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Teacher Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((st, idx) => {
                    const currentVal = scores[st.id]?.score ?? 8.5;
                    const normContrib = (currentVal * 1.0).toFixed(2);

                    return (
                      <TableRow key={st.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="text-center font-mono text-xs font-semibold text-slate-700">
                          {st.roll_no || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                          {st.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={currentVal}
                              onChange={(e) => handleScoreChange(st.id, parseFloat(e.target.value) || 0)}
                              className="h-9 w-20 text-center font-mono font-bold text-xs text-[#5c28e8] rounded-xl border-gray-200"
                            />
                            <span className="text-xs font-bold text-slate-400">/ 10</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-xs text-emerald-600">
                          {normContrib} / 10.00
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Optional remark (e.g. Excellent discipline)"
                            value={scores[st.id]?.remarks || ""}
                            onChange={(e) => handleRemarksChange(st.id, e.target.value)}
                            className="h-9 text-xs rounded-xl border-gray-200"
                          />
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
    </div>
  );
}
