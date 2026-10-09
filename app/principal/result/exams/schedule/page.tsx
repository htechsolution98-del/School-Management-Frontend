"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Plus,
  Calendar,
  Clock,
  School,
  BookOpen,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  Percent,
  Pencil,
  Trash2,
  Hash,
  Sparkles,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import { getSubjects, getSubjectsByClass } from "@/lib/clerk/subjects";
import {
  getExamTerms,
  getExamRooms,
  getExamsFull,
  createExamFull,
  updateExamFull,
  deleteExamFull,
  getWeightageConfigs,
  type ExamTerm,
  type ExamRoom,
  type ExamFull,
  type ResultWeightageComponent,
} from "@/lib/exam-api";

export default function ExamSchedulePage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);
  const [weightageComponents, setWeightageComponents] = useState<ResultWeightageComponent[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [exams, setExams] = useState<ExamFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamFull | null>(null);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newTermId, setNewTermId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [loadingClassSubjects, setLoadingClassSubjects] = useState(false);
  const [newDivision, setNewDivision] = useState("ALL");
  const [newRoomId, setNewRoomId] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("12:00");
  const [newMaxMarks, setNewMaxMarks] = useState("100");
  const [newPassingMarks, setNewPassingMarks] = useState("33");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModalClassChange = async (classId: string) => {
    setNewClassId(classId);
    setNewSubjectId("");
    if (!classId) {
      setClassSubjects([]);
      return;
    }
    setLoadingClassSubjects(true);
    try {
      const subs = await getSubjectsByClass(Number(classId));
      if (subs && subs.length > 0) {
        setClassSubjects(subs);
      } else {
        const classDivIds = new Set(
          divisions
            .filter((d: any) => String(d.SchoolClass || d.school_class) === String(classId))
            .map((d: any) => d.id)
        );
        let fallback = subjects;
        if (classDivIds.size > 0) {
          fallback = subjects.filter(
            (s: any) => !s.division || classDivIds.has(s.division) || classDivIds.has(s.division_id)
          );
        }
        setClassSubjects(fallback.length > 0 ? fallback : subjects);
      }
    } catch {
      const classDivIds = new Set(
        divisions
          .filter((d: any) => String(d.SchoolClass || d.school_class) === String(classId))
          .map((d: any) => d.id)
      );
      let fallback = subjects;
      if (classDivIds.size > 0) {
        fallback = subjects.filter(
          (s: any) => !s.division || classDivIds.has(s.division) || classDivIds.has(s.division_id)
        );
      }
      setClassSubjects(fallback.length > 0 ? fallback : subjects);
    } finally {
      setLoadingClassSubjects(false);
    }
  };

  const modalSubjects = useMemo(() => {
    if (classSubjects.length > 0) return classSubjects;
    if (!newClassId) return [];
    const classDivIds = new Set(
      divisions
        .filter((d: any) => String(d.SchoolClass || d.school_class) === String(newClassId))
        .map((d: any) => d.id)
    );
    if (classDivIds.size > 0) {
      const filtered = subjects.filter(
        (s: any) => !s.division || classDivIds.has(s.division) || classDivIds.has(s.division_id)
      );
      if (filtered.length > 0) return filtered;
    }
    return subjects;
  }, [classSubjects, newClassId, divisions, subjects]);

  const availableDivisions = useMemo(() => {
    if (selectedClassId && selectedClassId !== "ALL") {
      const filtered = divisions.filter((d: any) => String(d.SchoolClass || d.school_class) === String(selectedClassId));
      const divSet = new Set(filtered.map((d: any) => d.division).filter(Boolean));
      return Array.from(divSet).sort();
    }
    const divSet = new Set(divisions.map((d: any) => d.division).filter(Boolean));
    return Array.from(divSet).sort();
  }, [divisions, selectedClassId]);

  const modalDivisions = useMemo(() => {
    if (!newClassId) return [];
    const filtered = divisions.filter((d: any) => String(d.SchoolClass || d.school_class) === String(newClassId));
    const divSet = new Set(filtered.map((d: any) => d.division).filter(Boolean));
    return Array.from(divSet).sort();
  }, [divisions, newClassId]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [yearsRes, classesRes, divisionsRes, subjectsRes, roomsRes] = await Promise.allSettled([
        getAcademicYearsForPrincipal(),
        getClasses(),
        getDivisions(),
        getSubjects(),
        getExamRooms(),
      ]);

      const yearsData = yearsRes.status === "fulfilled" ? yearsRes.value : [];
      const classesData = classesRes.status === "fulfilled" ? classesRes.value : [];
      const divisionsData = divisionsRes.status === "fulfilled" ? divisionsRes.value : [];
      const subjectsData = subjectsRes.status === "fulfilled" ? subjectsRes.value : [];
      const roomsData = roomsRes.status === "fulfilled" ? roomsRes.value : [];

      setAcademicYears(yearsData || []);
      setClasses(classesData || []);
      setDivisions(divisionsData || []);
      setSubjects(subjectsData || []);
      setRooms(roomsData || []);

      if (yearsData && yearsData.length > 0 && !selectedYearId) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        setSelectedYearId(String(activeYr.id));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load academic data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadExams = async () => {
    if (!selectedYearId) return;
    setIsLoading(true);
    try {
      const [weightageConfigs, termsData, examsData] = await Promise.all([
        getWeightageConfigs(Number(selectedYearId)).catch(() => []),
        getExamTerms(Number(selectedYearId)).catch(() => []),
        getExamsFull({
          academic_year: Number(selectedYearId),
          class_group: selectedClassId !== "ALL" ? Number(selectedClassId) : undefined,
          division: selectedDivFilter !== "ALL" ? selectedDivFilter : undefined,
        }).catch(() => []),
      ]);

      const activeConfig =
        weightageConfigs.find((cfg: any) => cfg.is_active || cfg.status === "ACTIVE") || weightageConfigs[0];
      const examComponents = activeConfig?.components?.filter((c: any) => c.component_type === "EXAM") || [];

      setWeightageComponents(examComponents);
      setExamTerms(termsData || []);
      setExams(examsData || []);

      if (termsData.length > 0 && !newTermId) {
        setNewTermId(String(termsData[0].id));
        setNewExamTitle(termsData[0].name);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load exam schedules.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      loadExams();
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter, selectedTermFilter]);

  const resetForm = () => {
    setEditingExam(null);
    setNewExamTitle(examTerms.length > 0 ? examTerms[0].name : "Term 1 Examination");
    setNewTermId(examTerms.length > 0 ? String(examTerms[0].id) : "");
    setNewClassId("");
    setNewSubjectId("");
    setClassSubjects([]);
    setNewDivision("ALL");
    setNewRoomId("");
    setNewExamDate("");
    setNewStartTime("09:00");
    setNewEndTime("12:00");
    setNewMaxMarks("100");
    setNewPassingMarks("33");
  };

  const handleSaveExam = async () => {
    if (!newExamTitle || !newSubjectId || !newClassId || !newExamDate) {
      toast.error("Please fill in all required fields (Title, Class, Subject, Exam Date).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<ExamFull> = {
        academic_year: Number(selectedYearId),
        exam_term: newTermId ? Number(newTermId) : undefined,
        title: newExamTitle,
        subject: Number(newSubjectId),
        class_group: Number(newClassId),
        division: newDivision && newDivision !== "ALL" ? newDivision : undefined,
        room: newRoomId ? Number(newRoomId) : undefined,
        exam_date: newExamDate,
        start_time: newStartTime,
        end_time: newEndTime,
        max_marks: Number(newMaxMarks) || 100,
        passing_marks: Number(newPassingMarks) || 33,
        status: "SCHEDULED",
      };

      if (editingExam) {
        await updateExamFull(editingExam.id, payload);
        toast.success("Exam schedule updated successfully!");
      } else {
        await createExamFull(payload);
        toast.success("Exam scheduled successfully!");
      }

      setIsModalOpen(false);
      resetForm();
      await loadExams();
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule exam.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExam = (ex: ExamFull) => {
    setEditingExam(ex);
    setNewExamTitle(ex.title);
    setNewTermId(ex.exam_term ? String(ex.exam_term) : "");
    const cId = String(ex.class_group);
    setNewClassId(cId);
    handleModalClassChange(cId);
    setNewSubjectId(ex.subject ? String(ex.subject) : "");
    setNewDivision(ex.division || "ALL");
    setNewRoomId(ex.room ? String(ex.room) : "");
    setNewExamDate(ex.exam_date || "");
    setNewStartTime(ex.start_time ? ex.start_time.slice(0, 5) : "09:00");
    setNewEndTime(ex.end_time ? ex.end_time.slice(0, 5) : "12:00");
    setNewMaxMarks(String(ex.max_marks || 100));
    setNewPassingMarks(String(ex.passing_marks || 33));
    setIsModalOpen(true);
  };

  const handleDeleteExam = async (id: number) => {
    if (!confirm("Are you sure you want to delete this exam schedule?")) return;
    try {
      await deleteExamFull(id);
      toast.success("Exam schedule deleted.");
      await loadExams();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete exam.");
    }
  };

  const filteredExams = exams.filter((ex) => {
    if (selectedTermFilter !== "ALL") {
      if (String(ex.exam_term) !== selectedTermFilter && !ex.title.toLowerCase().includes(selectedTermFilter.toLowerCase())) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = ex.subject_name?.toLowerCase().includes(q);
      const matchTitle = ex.title?.toLowerCase().includes(q);
      const matchClass = ex.class_name?.toLowerCase().includes(q);
      if (!matchSub && !matchTitle && !matchClass) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  Exam Schedule & Timetable Management
                </h1>
                <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                  Exam Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Configure examination schedules, assign subject paper dates, start times & duration per class division.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
            <SelectTrigger className="h-10 w-36 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 border-gray-200 font-bold text-slate-700">
              <SelectValue placeholder="Academic Year">
                {academicYears.find((y) => String(y.id) === selectedYearId)?.name ||
                 `${academicYears.find((y) => String(y.id) === selectedYearId)?.start_year || ""}-${academicYears.find((y) => String(y.id) === selectedYearId)?.end_year || ""}`.replace(/^-$/, "") ||
                 "Academic Year"}
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
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="rounded-xl text-xs gap-1.5 font-bold bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20 px-4 h-10"
          >
            <Plus className="h-4 w-4" /> Schedule New Exam
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-bold text-[#5c28e8] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> FILTER EXAM SCHEDULES
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Exam Component:</label>
              <Select value={selectedTermFilter} onValueChange={(val) => { if (val) setSelectedTermFilter(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-medium">
                  <SelectValue placeholder="All Components">
                    {selectedTermFilter === "ALL"
                      ? "All Components"
                      : examTerms.find((t) => String(t.id) === selectedTermFilter)?.name ||
                        weightageComponents.find((w) => w.name === selectedTermFilter)?.name ||
                        selectedTermFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Components</SelectItem>
                  {examTerms.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                  {weightageComponents.map((w) => (
                    <SelectItem key={`comp-${w.id}`} value={w.name}>
                      {w.name} ({w.weightage_percentage}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Class:</label>
              <Select value={selectedClassId} onValueChange={(val) => { if (val) setSelectedClassId(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-medium">
                  <SelectValue placeholder="All Classes">
                    {selectedClassId === "ALL"
                      ? "All Classes"
                      : classes.find((cls) => String(cls.id) === selectedClassId)?.school_class || `Class #${selectedClassId}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.school_class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Division:</label>
              <Select value={selectedDivFilter} onValueChange={(val) => { if (val) setSelectedDivFilter(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-medium">
                  <SelectValue placeholder="All Divisions">
                    {selectedDivFilter === "ALL" ? "All Divisions" : `Division ${selectedDivFilter}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Divisions</SelectItem>
                  {availableDivisions.map((divName) => (
                    <SelectItem key={divName} value={divName}>
                      Division {divName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Search Paper:</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search exam title or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 text-xs rounded-xl border-gray-200 bg-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Master Timetable Table */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Master Examination Timetable
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                List of all finalized exam subject papers scheduled for the selected Academic Year.
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadExams}
            className="rounded-xl text-xs gap-1.5 border-gray-200 hover:bg-slate-50 h-9 font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-[#5c28e8]" /> Loading scheduled exams...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-1">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="font-semibold text-slate-700">No exam schedules found.</p>
              <p className="text-slate-400">Click &quot;Schedule New Exam&quot; above to add paper schedules.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Term / Component</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Subject Paper</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Class & Division</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Exam Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Time Slot</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Room</TableHead>
                    <TableHead className="w-28 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Max / Pass Marks</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((ex, idx) => (
                    <TableRow key={ex.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/60 transition-colors">
                      <TableCell className="text-center font-mono text-xs text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {ex.term_name || ex.title}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[#5c28e8] dark:text-purple-400">
                        {ex.subject_name || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">
                          {ex.class_name} {ex.division ? `(Div ${ex.division})` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-slate-800 dark:text-zinc-200">
                        {ex.exam_date}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
                        {ex.start_time?.slice(0, 5)} - {ex.end_time?.slice(0, 5)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 font-mono text-[11px] font-semibold text-slate-600">
                          {ex.room_number ? `Room ${ex.room_number}` : "TBA"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold font-mono text-slate-900 dark:text-zinc-100">
                        {ex.max_marks} <span className="text-slate-400 font-normal">/ {ex.passing_marks}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          {ex.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExam(ex)}
                            className="h-8 w-8 text-[#5c28e8] hover:bg-purple-50 rounded-xl"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExam(ex.id)}
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                  {editingExam ? "Edit Exam Paper Schedule" : "Schedule Exam Paper"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Add paper schedule date, time, subject and class division for this examination.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Weightage Component Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#5c28e8] dark:text-purple-400 flex items-center gap-1 text-xs">
                <Percent className="h-3.5 w-3.5" /> Select Weightage Exam Component / Term:
              </label>
              <Select
                value={newTermId}
                onValueChange={(val) => {
                  if (val) {
                    setNewTermId(val);
                    const t = examTerms.find((term) => String(term.id) === val);
                    const w = weightageComponents.find((comp) => String(comp.id) === val);
                    if (t) setNewExamTitle(t.name);
                    else if (w) setNewExamTitle(w.name);
                  }
                }}
              >
                <SelectTrigger className="h-11 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800 border-gray-200 font-semibold text-slate-800">
                  <SelectValue placeholder="Select EXAM Weightage Component...">
                    {(() => {
                      const t = examTerms.find((term) => String(term.id) === newTermId);
                      if (t) return t.name;
                      const w = weightageComponents.find((comp) => String(comp.id) === newTermId);
                      if (w) return `${w.name} (${w.weightage_percentage}% Weightage)`;
                      return "Select EXAM Weightage Component...";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl">
                  {examTerms.map((t) => (
                    <SelectItem key={`term-${t.id}`} value={String(t.id)} className="text-xs font-semibold py-2">
                      {t.name}
                    </SelectItem>
                  ))}
                  {weightageComponents.map((w) => (
                    <SelectItem key={`weight-${w.id}`} value={String(w.id)} className="text-xs font-semibold py-2">
                      {w.name} ({w.weightage_percentage}% Weightage)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-zinc-300">Exam Title / Paper Name:</label>
              <Input
                value={newExamTitle}
                onChange={(e) => setNewExamTitle(e.target.value)}
                placeholder="e.g. Term 1 Mathematics Examination"
                className="h-11 text-xs rounded-2xl border-gray-200 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Class:</label>
                <Select value={newClassId} onValueChange={(val) => { if (val) handleModalClassChange(val); }}>
                  <SelectTrigger className="h-11 text-xs rounded-2xl bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                    <SelectValue placeholder="Select Class">
                      {classes.find((cls) => String(cls.id) === newClassId)?.school_class || "Select Class"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={String(cls.id)} className="text-xs font-semibold py-2">
                        {cls.school_class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Subject:</label>
                <Select
                  value={newSubjectId}
                  onValueChange={(val) => { if (val) setNewSubjectId(val); }}
                  disabled={!newClassId || loadingClassSubjects}
                >
                  <SelectTrigger className="h-11 text-xs rounded-2xl bg-white dark:bg-zinc-800 border-gray-200 font-semibold disabled:opacity-60">
                    <SelectValue placeholder={loadingClassSubjects ? "Loading subjects..." : !newClassId ? "Select Class first" : "Select Subject"}>
                      {loadingClassSubjects
                        ? "Loading subjects..."
                        : !newClassId
                        ? "Select Class first"
                        : modalSubjects.find((sub) => String(sub.id) === newSubjectId)?.name ||
                          modalSubjects.find((sub) => String(sub.id) === newSubjectId)?.subject_name ||
                          "Select Subject"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    {modalSubjects.map((sub) => (
                      <SelectItem key={sub.id} value={String(sub.id)} className="text-xs font-semibold py-2">
                        {sub.name || sub.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Division (Optional):</label>
                <Select value={newDivision} onValueChange={(val) => { if (val) setNewDivision(val); }}>
                  <SelectTrigger className="h-11 text-xs rounded-2xl bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                    <SelectValue placeholder="All Divisions">
                      {newDivision && newDivision !== "ALL" ? `Division ${newDivision}` : "All Divisions"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    <SelectItem value="ALL" className="text-xs font-semibold py-2">All Divisions</SelectItem>
                    {modalDivisions.map((divName: string) => (
                      <SelectItem key={divName} value={divName} className="text-xs font-semibold py-2">
                        Division {divName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Exam Date:</label>
                <Input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  className="h-11 text-xs rounded-2xl border-gray-200 bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Start Time:</label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="h-11 text-xs rounded-2xl border-gray-200 bg-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">End Time:</label>
                <Input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="h-11 text-xs rounded-2xl border-gray-200 bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Max Marks:</label>
                <Input
                  type="number"
                  value={newMaxMarks}
                  onChange={(e) => setNewMaxMarks(e.target.value)}
                  className="h-11 text-xs rounded-2xl border-gray-200 bg-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Passing Marks:</label>
                <Input
                  type="number"
                  value={newPassingMarks}
                  onChange={(e) => setNewPassingMarks(e.target.value)}
                  className="h-11 text-xs rounded-2xl border-gray-200 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2.5 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-2xl text-xs font-semibold h-11 px-5 border-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveExam}
              disabled={isSubmitting}
              className="rounded-2xl text-xs font-bold bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20 h-11 px-6"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingExam ? "Update Schedule" : "Save Exam Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
