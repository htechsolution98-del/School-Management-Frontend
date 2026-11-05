"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  FileCheck,
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
import { getSubjectsByClass } from "@/lib/clerk/subjects";
import {
  getExamTerms,
  createExamTerm,
  getExamsFull,
  createExamFull,
  updateExamFull,
  deleteExamFull,
  getWeightageConfigs,
  type ExamTerm,
  type ExamFull,
  type ResultWeightageComponent,
} from "@/lib/exam-api";

export default function ExamManagementPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");

  const availableDivisions = useMemo(() => {
    let filtered = divisions;
    if (selectedClassId && selectedClassId !== "ALL") {
      filtered = divisions.filter((d: any) => String(d.SchoolClass || d.school_class) === String(selectedClassId));
    }
    const divSet = new Set(filtered.map((d: any) => d.division).filter(Boolean));
    if (divSet.size === 0 && divisions.length > 0) {
      divisions.forEach((d: any) => { if (d.division) divSet.add(d.division); });
    }
    return Array.from(divSet).sort();
  }, [divisions, selectedClassId]);

  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);
  const [exams, setExams] = useState<ExamFull[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state for adding/editing Exam Schedule
  const [editingExam, setEditingExam] = useState<ExamFull | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [loadingClassSubjects, setLoadingClassSubjects] = useState(false);
  const subjectRequestId = useRef(0);
  const [newDivision, setNewDivision] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("12:00");
  const [newMaxMarks, setNewMaxMarks] = useState("100");
  const [newPassingMarks, setNewPassingMarks] = useState("33");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModalClassChange = async (classId: string) => {
    const requestId = ++subjectRequestId.current;
    setNewClassId(classId);
    setNewSubjectId("");
    setClassSubjects([]);
    if (!classId) {
      setLoadingClassSubjects(false);
      return;
    }
    setLoadingClassSubjects(true);
    try {
      const subs = await getSubjectsByClass(Number(classId));
      if (requestId === subjectRequestId.current) {
        const uniqueSubjects = new Map<string, any>();
        (subs || []).forEach((subject: any) => {
          const key = String(subject.name || subject.subject_name || "").trim().toLowerCase();
          if (key && !uniqueSubjects.has(key)) uniqueSubjects.set(key, subject);
        });
        setClassSubjects(Array.from(uniqueSubjects.values()));
      }
    } catch (error: any) {
      if (requestId === subjectRequestId.current) {
        setClassSubjects([]);
        toast.error(error?.message || "Could not load subjects for this class.");
      }
    } finally {
      if (requestId === subjectRequestId.current) setLoadingClassSubjects(false);
    }
  };

  const resetForm = () => {
    subjectRequestId.current += 1;
    setEditingExam(null);
    setNewExamTitle("");
    setNewClassId("");
    setNewSubjectId("");
    setClassSubjects([]);
    setNewDivision("ALL");
    setNewExamDate("");
    setNewStartTime("09:00");
    setNewEndTime("12:00");
    setNewMaxMarks("100");
    setNewPassingMarks("33");
  };

  const modalDivisions = useMemo(() => {
    let filtered = divisions;
    if (newClassId) {
      filtered = divisions.filter((d: any) => String(d.SchoolClass || d.school_class) === String(newClassId));
    }
    const divSet = new Set(filtered.map((d: any) => d.division).filter(Boolean));
    if (divSet.size === 0 && divisions.length > 0) {
      divisions.forEach((d: any) => { if (d.division) divSet.add(d.division); });
    }
    return Array.from(divSet).sort();
  }, [divisions, newClassId]);

  const modalSubjects = classSubjects;

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [yearsRes, classesRes, divisionsRes] = await Promise.allSettled([
        getAcademicYearsForPrincipal(),
        getClasses(),
        getDivisions(),
      ]);

      const yearsData = yearsRes.status === "fulfilled" ? yearsRes.value : [];
      const classesData = classesRes.status === "fulfilled" ? classesRes.value : [];
      const divisionsData = divisionsRes.status === "fulfilled" ? divisionsRes.value : [];

      setAcademicYears(yearsData || []);
      setClasses(classesData || []);
      setDivisions(divisionsData || []);

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

  const [weightageComponents, setWeightageComponents] = useState<ResultWeightageComponent[]>([]);
  const [selectedComponentFilter, setSelectedComponentFilter] = useState<string>("ALL");
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");

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

      if (examComponents.length > 0 && !selectedComponentId) {
        setSelectedComponentId(String(examComponents[0].id));
        setNewExamTitle(examComponents[0].name);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load exams list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      loadExams();
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter]);

  // Handle Exam Schedule Creation or Update
  const handleSaveExam = async () => {
    if (!newExamTitle || !newSubjectId || !newClassId || !newExamDate) {
      toast.error("Please fill in all required fields (Title, Subject, Class, Date).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<ExamFull> = {
        academic_year: Number(selectedYearId),
        title: newExamTitle,
        subject: Number(newSubjectId),
        class_group: Number(newClassId),
        division: newDivision && newDivision !== "ALL" ? newDivision : undefined,
        exam_date: newExamDate,
        start_time: newStartTime,
        end_time: newEndTime,
        max_marks: Number(newMaxMarks) || 100,
        passing_marks: Number(newPassingMarks) || 33,
        status: "SCHEDULED",
      };

      if (editingExam) {
        await updateExamFull(editingExam.id, payload);
        toast.success("🎉 Exam schedule updated successfully!");
      } else {
        await createExamFull(payload);
        toast.success("🎉 Exam schedule created successfully!");
      }

      setIsModalOpen(false);
      resetForm();
      await loadExams();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save exam schedule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExam = (ex: ExamFull) => {
    setEditingExam(ex);
    setNewExamTitle(ex.title);
    const cId = String(ex.class_group);
    setNewClassId(cId);
    handleModalClassChange(cId);
    setNewSubjectId(ex.subject ? String(ex.subject) : "");
    setNewDivision(ex.division || "ALL");
    setNewExamDate(ex.exam_date || "");
    setNewStartTime(ex.start_time ? ex.start_time.slice(0, 5) : "09:00");
    setNewEndTime(ex.end_time ? ex.end_time.slice(0, 5) : "12:00");
    setNewMaxMarks(String(ex.max_marks || 100));
    setNewPassingMarks(String(ex.passing_marks || 33));
    setIsModalOpen(true);
  };

  const handleDeleteExam = async (id: number) => {
    if (!confirm("Are you sure you want to delete this scheduled exam paper?")) return;
    try {
      await deleteExamFull(id);
      toast.success("🗑️ Exam schedule deleted successfully!");
      await loadExams();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete exam schedule.");
    }
  };

  const filteredExams = exams.filter((ex) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (ex.title || "").toLowerCase().includes(q) ||
      (ex.subject_name || "").toLowerCase().includes(q) ||
      (ex.class_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
              <FileCheck className="h-5 w-5" />
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

        <div className="flex items-center gap-3">
          <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
            <SelectTrigger className="w-56 h-10 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 border-gray-200 font-bold text-slate-700">
              <SelectValue placeholder="Select Academic Year">
                {academicYears.find((y) => String(y.id) === selectedYearId)
                  ? (academicYears.find((y) => String(y.id) === selectedYearId).name ||
                     `${academicYears.find((y) => String(y.id) === selectedYearId).start_year || ""}-${academicYears.find((y) => String(y.id) === selectedYearId).end_year || ""}`.replace(/^-$/, "") ||
                     `Academic Year #${selectedYearId}`)
                  : "Select Academic Year"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => {
                const label = y.name || (y.start_year && y.end_year ? `${y.start_year}-${y.end_year}` : `Academic Year #${y.id}`);
                return (
                  <SelectItem key={y.id} value={String(y.id)}>
                    {label} {y.is_active ? "(Active)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="rounded-xl text-xs gap-1.5 font-bold bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20 px-4 h-10"
          >
            <Plus className="h-4 w-4" /> Schedule New Exam
          </Button>
        </div>
      </div>

      {/* Control Card: Class & Division Filter */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-bold text-[#5c28e8] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> FILTER EXAM SCHEDULES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Exam Component:</label>
              <Select value={selectedComponentFilter} onValueChange={(val) => { if (val) setSelectedComponentFilter(val); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-medium">
                  <SelectValue placeholder="All Components">
                    {selectedComponentFilter === "ALL"
                      ? "All Components"
                      : weightageComponents.find((c) => String(c.id) === selectedComponentFilter)?.name || "Component"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Components</SelectItem>
                  {weightageComponents.map((comp) => (
                    <SelectItem key={comp.id} value={String(comp.id)}>
                      {comp.name} ({comp.weightage_percentage}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Class:</label>
              <Select value={selectedClassId} onValueChange={(val) => { if (val) setSelectedClassId(val); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-medium">
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
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-medium">
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
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exam title or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Exam Timetable Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Master Examination Timetable
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              List of all finalized exam subject papers scheduled for the selected Academic Year.
            </CardDescription>
          </div>

          <Button size="sm" variant="outline" onClick={loadExams} className="rounded-xl text-xs gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" /> Loading exam timetable...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" /> No exam schedules found. Click "Schedule New Exam" above to add paper schedules.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-zinc-800/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                    <TableHead className="font-bold text-xs">Exam Title</TableHead>
                    <TableHead className="w-36 font-bold text-xs">Subject</TableHead>
                    <TableHead className="w-32 font-bold text-xs">Class / Div</TableHead>
                    <TableHead className="w-32 font-bold text-xs">Exam Date</TableHead>
                    <TableHead className="w-36 font-bold text-xs">Time Slot</TableHead>
                    <TableHead className="w-28 text-center font-bold text-xs">Max Marks</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs">Status</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredExams.map((ex, idx) => (
                    <TableRow key={ex.id}>
                      <TableCell className="text-center font-mono text-xs font-medium text-slate-500">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {ex.title}
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {ex.subject_name || "—"}
                      </TableCell>

                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-mono bg-purple-50 text-purple-700 dark:bg-purple-950 border-purple-200">
                          {ex.class_name || "Class"} {ex.division ? `(Div ${ex.division})` : ""}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-mono font-semibold text-slate-700 dark:text-zinc-300">
                        {ex.exam_date}
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
                        {ex.start_time} - {ex.end_time}
                      </TableCell>

                      <TableCell className="text-center text-xs font-bold font-mono text-indigo-600">
                        {ex.max_marks} (Pass: {ex.passing_marks})
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase">
                          {ex.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExam(ex)}
                            title="Edit Exam Schedule"
                            className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExam(ex.id)}
                            title="Delete Exam Schedule"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
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

      {/* Schedule New Exam Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                  {editingExam ? "Edit Exam Paper Schedule" : "Schedule Exam Paper"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Assign exam term, subject, class/division, date, and timing.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#5c28e8] dark:text-purple-400 flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" /> Exam Weightage Component:
              </label>
              <Select
                value={selectedComponentId}
                onValueChange={(val) => {
                  if (val) {
                    setSelectedComponentId(val);
                    const comp = weightageComponents.find((c) => String(c.id) === val);
                    if (comp) setNewExamTitle(comp.name);
                  }
                }}
              >
                <SelectTrigger className="h-11 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800 border-gray-200 font-semibold text-slate-800">
                  <SelectValue placeholder="Select EXAM Weightage Component...">
                    {weightageComponents.find((c) => String(c.id) === selectedComponentId)
                      ? `${weightageComponents.find((c) => String(c.id) === selectedComponentId)?.name} (${weightageComponents.find((c) => String(c.id) === selectedComponentId)?.weightage_percentage}% Weightage)`
                      : "Select EXAM Weightage Component..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl">
                  {weightageComponents.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs font-semibold py-2">
                      {c.name} ({c.weightage_percentage}% Weightage)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-zinc-300">Exam Title / Paper Name:</label>
              <Input
                placeholder="e.g. Term 1 Mathematics Examination"
                value={newExamTitle}
                onChange={(e) => setNewExamTitle(e.target.value)}
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
                    <SelectValue placeholder={loadingClassSubjects ? "Loading subjects..." : !newClassId ? "Select Class first" : modalSubjects.length === 0 ? "No subjects assigned to this class" : "Select Subject"}>
                      {loadingClassSubjects
                        ? "Loading subjects..."
                        : !newClassId
                        ? "Select Class first"
                        : modalSubjects.find((sub) => String(sub.id) === newSubjectId)?.name ||
                          modalSubjects.find((sub) => String(sub.id) === newSubjectId)?.subject_name ||
                          (modalSubjects.length === 0 ? "No subjects assigned to this class" : "Select Subject")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    {modalSubjects.length === 0 ? (
                      <SelectItem value="no-subjects" disabled className="text-xs text-slate-500">
                        No subjects assigned to this class
                      </SelectItem>
                    ) : modalSubjects.map((sub) => (
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
                <Select value={newDivision || "ALL"} onValueChange={(val) => { if (val) setNewDivision(val); }}>
                  <SelectTrigger className="h-11 text-xs rounded-2xl bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                    <SelectValue placeholder="All Divisions">
                      {newDivision && newDivision !== "ALL" ? `Division ${newDivision}` : "All Divisions"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    <SelectItem value="ALL" className="text-xs font-semibold py-2">All Divisions</SelectItem>
                    {modalDivisions.map((divName) => (
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
