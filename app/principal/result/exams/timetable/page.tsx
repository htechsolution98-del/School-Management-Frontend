"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  Calendar,
  Layers,
  Send,
  Printer,
  CheckCircle2,
  AlertCircle,
  Filter,
  Loader2,
  RefreshCw,
  School,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import {
  getExamTerms,
  getExamTimetableGrid,
  publishExamTimetable,
  bulkAutoGenerateSeating,
  type ExamTerm,
} from "@/lib/exam-api";

export default function ExamTimetablePage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("ALL");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedDiv, setSelectedDiv] = useState<string>("ALL");

  const [timetableExams, setTimetableExams] = useState<any[]>([]);
  const [isAllPublished, setIsAllPublished] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  const activeYearObj = useMemo(() => {
    return academicYears.find((y) => String(y.id) === selectedYearId);
  }, [academicYears, selectedYearId]);

  const availableDivisions = useMemo(() => {
    let filtered = divisions;
    if (selectedClassId && selectedClassId !== "ALL") {
      filtered = divisions.filter((d: any) => {
        const clsVal = d.SchoolClass ?? d.school_class ?? d.SchoolClass_id ?? d.school_class_id;
        return String(clsVal) === String(selectedClassId);
      });
    }
    const divSet = new Set<string>();
    filtered.forEach((d: any) => {
      if (d && d.division) {
        divSet.add(String(d.division).trim());
      }
    });
    return Array.from(divSet).sort();
  }, [divisions, selectedClassId]);

  const loadInitial = async () => {
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

      if (yearsData && yearsData.length > 0) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        const yrId = selectedYearId || String(activeYr.id);
        setSelectedYearId(yrId);

        const terms = await getExamTerms(Number(yrId));
        setExamTerms(terms || []);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load timetable metadata.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadTimetable = async () => {
    if (!selectedYearId) return;
    setIsLoading(true);
    try {
      const data = await getExamTimetableGrid({
        academic_year: Number(selectedYearId),
        exam_term: selectedTermId !== "ALL" ? Number(selectedTermId) : undefined,
        class_group: selectedClassId !== "ALL" ? Number(selectedClassId) : undefined,
        division: selectedDiv !== "ALL" ? selectedDiv : undefined,
      });

      setTimetableExams(data?.exams || []);
      setIsAllPublished(data?.is_all_published || false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load exam timetable.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      loadTimetable();
    }
  }, [selectedYearId, selectedTermId, selectedClassId, selectedDiv]);

  // Publish / Draft action
  const handlePublishTimetable = async (actionType: "PUBLISH" | "DRAFT") => {
    if (!selectedYearId) return;
    setIsPublishing(true);
    try {
      const res = await publishExamTimetable({
        academic_year: Number(selectedYearId),
        exam_term: selectedTermId !== "ALL" ? Number(selectedTermId) : undefined,
        class_group: selectedClassId !== "ALL" ? Number(selectedClassId) : undefined,
        division: selectedDiv !== "ALL" ? selectedDiv : undefined,
        action: actionType,
      });

      toast.success(res.message || `Timetable ${actionType === "PUBLISH" ? "Published" : "Set to Draft"}.`);
      await loadTimetable();
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish timetable.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Group exams by class for the class-wise view
  const classGroupedTimetable = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    timetableExams.forEach((ex) => {
      const groupKey = `${ex.class_name} (Div ${ex.division || "ALL"})`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(ex);
    });
    return groups;
  }, [timetableExams]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Exam Timetable & Publishing
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                Exam Module
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Generate and review Class-Wise & School-Wide examination timetables. Publish to make them visible to students, teachers, and parents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
            <SelectTrigger className="w-52 h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
              <SelectValue placeholder="Select Academic Year">
                {academicYears.find((y) => String(y.id) === selectedYearId)?.name ||
                 `${academicYears.find((y) => String(y.id) === selectedYearId)?.start_year || ""}-${academicYears.find((y) => String(y.id) === selectedYearId)?.end_year || ""}`.replace(/^-$/, "") ||
                 "Select Academic Year"}
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

          <Button
            onClick={() => handlePublishTimetable(isAllPublished ? "DRAFT" : "PUBLISH")}
            disabled={isPublishing || timetableExams.length === 0}
            className={`rounded-xl text-xs gap-1.5 font-bold h-10 px-5 shadow-md ${
              isAllPublished
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20"
                : "bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-purple-500/20"
            }`}
          >
            {isPublishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isAllPublished ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {isAllPublished ? "Unpublish Timetable" : "Publish Timetable"}
          </Button>

          <Button
            variant="outline"
            onClick={() => window.print()}
            className="rounded-xl text-xs gap-1.5 font-bold h-10 px-4 border-gray-200"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-[#5c28e8]">
            <Filter className="h-4 w-4 text-[#5c28e8]" /> FILTER TIMETABLE VIEW
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Exam Term:</label>
              <Select value={selectedTermId} onValueChange={(val) => { if (val) setSelectedTermId(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="All Terms">
                    {selectedTermId === "ALL" ? "All Terms" : examTerms.find((t) => String(t.id) === selectedTermId)?.name || selectedTermId}
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
                  <SelectValue placeholder="All Classes">
                    {selectedClassId === "ALL" ? "All Classes" : classes.find((cls) => String(cls.id) === selectedClassId)?.school_class || selectedClassId}
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

      {/* Tabs: Class-Wise View vs School-Wide View */}
      <Tabs defaultValue="class-wise" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl h-11">
          <TabsTrigger value="class-wise" className="text-xs font-bold rounded-lg h-9 px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-[#5c28e8] data-[state=active]:shadow-sm">
            Class-Wise Timetable
          </TabsTrigger>
          <TabsTrigger value="school-wide" className="text-xs font-bold rounded-lg h-9 px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-[#5c28e8] data-[state=active]:shadow-sm">
            School-Wide Master Timetable
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Class-Wise Timetable View */}
        <TabsContent value="class-wise" className="space-y-6">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#5c28e8]" /> Loading class timetables...
            </div>
          ) : Object.keys(classGroupedTimetable).length === 0 ? (
            <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-xs text-muted-foreground shadow-sm">
              No exam papers scheduled for the selected filter criteria.
            </Card>
          ) : (
            Object.entries(classGroupedTimetable).map(([groupTitle, groupExams]) => (
              <Card key={groupTitle} className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/80 dark:bg-zinc-800/60 pb-3 flex flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4 text-[#5c28e8]" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      {groupTitle} — {activeYearObj?.name || "Academic Year"}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold bg-white border-purple-200 text-[#5c28e8]">
                    {groupExams.length} Paper(s)
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                      <TableRow>
                        <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Date & Day</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Subject</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Timing</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Room</TableHead>
                        <TableHead className="w-28 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Max Marks</TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupExams.map((ex, idx) => (
                        <TableRow key={ex.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-900 dark:text-zinc-100 font-mono">
                            {ex.date} <span className="text-slate-400 font-normal">({ex.day})</span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-[#5c28e8] dark:text-purple-400">
                            {ex.subject_name}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-600 dark:text-zinc-400">
                            {ex.start_time} - {ex.end_time} ({ex.duration_minutes} mins)
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium text-slate-700">
                            Room {ex.room_number}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                            {ex.max_marks} (Pass: {ex.passing_marks})
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={ex.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-slate-100 text-slate-700 text-[10px]"}>
                              {ex.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 2: School-Wide Timetable View */}
        <TabsContent value="school-wide">
          <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#5c28e8]" />
                  School-Wide Examination Schedule ({timetableExams.length} Total Papers)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Chronological schedule of all examination papers across all classes and standards.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={loadTimetable} className="rounded-xl text-xs gap-1 h-9 border-gray-200">
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5c28e8]" /> Loading master timetable...
                </div>
              ) : timetableExams.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No exam papers scheduled.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                    <TableRow>
                      <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Date & Day</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Class / Division</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Subject</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Time Slot</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Room</TableHead>
                      <TableHead className="w-28 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Max Marks</TableHead>
                      <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timetableExams.map((ex, idx) => (
                      <TableRow key={ex.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900 dark:text-zinc-100 font-mono">
                          {ex.date} <span className="text-slate-400 font-normal">({ex.day})</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="font-mono bg-slate-50 text-slate-800 border-gray-200">
                            {ex.class_name} {ex.division ? `(Div ${ex.division})` : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-[#5c28e8] dark:text-purple-400">
                          {ex.subject_name}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 dark:text-zinc-400">
                          {ex.start_time} - {ex.end_time}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium text-slate-700">
                          Room {ex.room_number}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                          {ex.max_marks} (Pass: {ex.passing_marks})
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={ex.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-slate-100 text-slate-700 text-[10px]"}>
                            {ex.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
