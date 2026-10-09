"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ClipboardList,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  School,
  BookOpen,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  Send,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getClasses } from "@/lib/clerk/classes";
import {
  getExamTerms,
  getMarksOverview,
  getExamsFull,
  type MarksOverviewRow,
  type ExamTerm,
} from "@/lib/exam-api";

export default function MarksOverviewPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedTermId, setSelectedTermId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [marksRows, setMarksRows] = useState<MarksOverviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const loadInitial = async () => {
    setIsLoading(true);
    try {
      const [yearsData, classesData] = await Promise.all([
        getAcademicYearsForPrincipal(),
        getClasses(),
      ]);

      setAcademicYears(yearsData || []);
      setClasses(classesData || []);

      if (yearsData && yearsData.length > 0) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        const yrId = selectedYearId || String(activeYr.id);
        setSelectedYearId(yrId);

        const [terms, examsList] = await Promise.all([
          getExamTerms(Number(yrId)),
          getExamsFull({ academic_year: Number(yrId) }),
        ]);
        setExamTerms(terms || []);
        setExams(examsList || []);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load marks overview filters.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadMarks = async () => {
    if (!selectedYearId) return;
    setIsLoading(true);
    try {
      const res = await getMarksOverview({
        academic_year: Number(selectedYearId),
        school_class: selectedClassId !== "ALL" ? Number(selectedClassId) : undefined,
        exam_term: selectedTermId !== "ALL" ? Number(selectedTermId) : undefined,
      });

      setMarksRows(res?.exams || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load marks overview data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      loadMarks();
    }
  }, [selectedYearId, selectedClassId, selectedTermId]);

  const filteredRows = marksRows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.subject_name.toLowerCase().includes(q) ||
      r.class_name.toLowerCase().includes(q) ||
      r.term_name.toLowerCase().includes(q)
    );
  });

  const totalPapers = marksRows.length;
  const fullyEntered = marksRows.filter((r) => r.completion_percentage >= 100).length;
  const verifiedCount = marksRows.filter((r) => r.is_verified).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Marks Management Overview
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                Exam Module
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Track subject teacher marks completion progress across all classes and verify class consolidated marks sheets.
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
                  {y.name || `${y.start_year}-${y.end_year}`} {y.is_active ? "(Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild className="rounded-xl text-xs font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20">
            <Link href="/principal/result/marks/verification">
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Class Verification Grid
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Exam Papers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-zinc-100">{totalPapers}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all classes & divisions</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Marks Entered (100%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-mono text-[#5c28e8]">
              {fullyEntered} / {totalPapers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPapers > 0 ? Math.round((fullyEntered / totalPapers) * 100) : 0}% Completion Rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Class Teacher Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-mono text-emerald-600">
              {verifiedCount} / {totalPapers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPapers > 0 ? Math.round((verifiedCount / totalPapers) * 100) : 0}% Verified by Class Teacher
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Row */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-[#5c28e8]">
            <Filter className="h-4 w-4 text-[#5c28e8]" /> FILTER MARKS GRID
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Exam Term:</label>
              <Select value={selectedTermId} onValueChange={(val) => { if (val) setSelectedTermId(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="All Terms">
                    {selectedTermId === "ALL"
                      ? "All Terms"
                      : examTerms.find((t) => String(t.id) === String(selectedTermId))?.name || "Select Term"}
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
              <Select value={selectedClassId} onValueChange={(val) => { if (val) setSelectedClassId(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200">
                  <SelectValue placeholder="All Classes">
                    {selectedClassId === "ALL"
                      ? "All Classes"
                      : classesWithExams.find((c) => String(c.id) === String(selectedClassId))?.school_class || "Select Class"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classesWithExams.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.school_class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Search:</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Subject, class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Marks Overview Table */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#5c28e8]" />
              Subject Marks Completion Tracker ({filteredRows.length} Papers)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Real-time progress of marks entered by Subject Teachers and Class Teacher verification status.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadMarks} className="rounded-xl text-xs gap-1 h-9 border-gray-200">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#5c28e8]" /> Loading marks data...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No examination papers found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Term</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Class / Div</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Subject</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Max Marks</TableHead>
                    <TableHead className="w-36 font-bold text-xs uppercase tracking-wider text-slate-500">Progress</TableHead>
                    <TableHead className="w-28 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Entered / Total</TableHead>
                    <TableHead className="w-28 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Verification</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r, idx) => (
                    <TableRow key={r.exam_id} className="hover:bg-slate-50/50">
                      <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">{r.term_name}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-mono bg-slate-50 text-slate-800 border-gray-200">
                          {r.class_name} {r.division ? `(Div ${r.division})` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[#5c28e8] dark:text-purple-400">
                        {r.subject_name}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {r.max_marks} (Pass: {r.passing_marks})
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono font-semibold">
                            <span>{r.completion_percentage}%</span>
                          </div>
                          <Progress value={r.completion_percentage} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono font-semibold text-slate-700">
                        {r.entered_count} / {r.total_students}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[10px] ${
                            r.verification_status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : r.verification_status === "SENT_BACK"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {r.verification_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold text-[#5c28e8] hover:text-[#4d20cb] hover:bg-purple-50">
                          <Link href={`/principal/result/marks/verification?class_id=${r.class_id}`}>
                            Verify &gt;
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
