"use client";

import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  Sparkles,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  Send,
  Layers,
  FileCheck,
  ShieldCheck,
  Globe,
  Printer,
  RotateCcw,
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
import {
  calculateResults,
  getFinalResults,
  publishResults,
  getWeightageConfigs,
  getExamsFull,
  type FinalStudentResult,
  type ResultWeightageConfig,
} from "@/lib/exam-api";

function PublishPageInner() {
  const searchParams = useSearchParams();
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");

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
    return Array.from(set).sort();
  }, [divisions, selectedClassId, exams]);

  const [weightageConfig, setWeightageConfig] = useState<ResultWeightageConfig | null>(null);
  const [calculatedResults, setCalculatedResults] = useState<FinalStudentResult[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Modal view for student report card preview
  const [previewStudent, setPreviewStudent] = useState<FinalStudentResult | null>(null);

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

      const paramYear = searchParams.get("academic_year") || searchParams.get("year_id");
      const paramClass = searchParams.get("class_id") || searchParams.get("school_class");
      const paramDivision = searchParams.get("division");

      let resolvedYearId = "";
      if (paramYear && yearsData.some((y: any) => String(y.id) === paramYear)) {
        resolvedYearId = paramYear;
      } else if (yearsData && yearsData.length > 0) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        resolvedYearId = String(activeYr.id);
      }
      setSelectedYearId(resolvedYearId);

      if (resolvedYearId) {
        const examsList = await getExamsFull({ academic_year: Number(resolvedYearId) });
        setExams(examsList || []);

        const classIdsWithExams = new Set(
          (examsList || []).map((e: any) =>
            String(typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group)
          ).filter(Boolean)
        );

        let resolvedClassId = "";
        if (paramClass && classesData.some((c: any) => String(c.id) === paramClass)) {
          resolvedClassId = paramClass;
        } else if (classesData && classesData.length > 0) {
          const firstValidClass = classesData.find((c: any) => classIdsWithExams.has(String(c.id))) || classesData[0];
          resolvedClassId = String(firstValidClass.id);
        }
        setSelectedClassId(resolvedClassId);
      }

      if (paramDivision && paramDivision !== "ALL") {
        setSelectedDivFilter(paramDivision);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load initial data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const [resultsData, setResultsData] = useState<FinalStudentResult[]>([]);

  const fetchResultsData = useCallback(async () => {
    if (!selectedYearId || !selectedClassId || selectedClassId === "ALL") return;
    setIsLoading(true);
    try {
      const configs = await getWeightageConfigs(Number(selectedYearId));
      if (configs && configs.length > 0) {
        setWeightageConfig(configs[0]);
      } else {
        setWeightageConfig(null);
      }

      // Fetch final results for the table
      const fetched = await getFinalResults(
        Number(selectedYearId), 
        Number(selectedClassId), 
        selectedDivFilter
      );
      setResultsData(fetched);
    } catch (err) {
      console.error("Failed to load setup for result processing", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter]);

  useEffect(() => {
    if (selectedYearId && selectedClassId && selectedClassId !== "ALL") {
      fetchResultsData();
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter, fetchResultsData]);

  // Run Dynamic Result Engine
  const handleCalculateResults = async () => {
    if (!selectedYearId || !selectedClassId || selectedClassId === "ALL") return;

    setIsProcessing(true);
    try {
      const res = await calculateResults(
        Number(selectedYearId),
        Number(selectedClassId),
        selectedDivFilter !== "ALL" ? selectedDivFilter : undefined
      );

      if (res.success) {
        toast.success(`✨ Dynamic Result Engine processed ${res.processed_count} student results!`);
        await fetchResultsData();
      } else {
        toast.error(res.reason || "Result engine failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process results.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Publish Results
  const handlePublish = async (action: "PUBLISH" | "UNPUBLISH") => {
    if (!selectedYearId || !selectedClassId || selectedClassId === "ALL") return;

    setIsPublishing(true);
    try {
      const res = await publishResults(
        Number(selectedYearId),
        Number(selectedClassId),
        selectedDivFilter,
        action
      );

      toast.success(`🎉 ${res.message || "Result publication status updated!"}`);
      await fetchResultsData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish results.");
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return resultsData;
    const q = searchQuery.toLowerCase();
    return resultsData.filter((r) =>
      (r.student_name || "").toLowerCase().includes(q) ||
      (r.roll_no || "").toLowerCase().includes(q) ||
      (r.gr_no || "").toLowerCase().includes(q)
    );
  }, [resultsData, searchQuery]);

  const hasPublished = resultsData.some((r) => r.status === "PUBLISHED" || r.is_published);
  const currentClassObj = classes.find((c) => String(c.id) === selectedClassId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  Dynamic Result Processing & Publication Engine
                </h1>
                <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                  Principal Authorization
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Run calculation engine against active dynamic weightage breakdown and publish student report cards to Student & Parent portals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleCalculateResults}
            disabled={isProcessing || !selectedClassId || selectedClassId === "ALL"}
            className="rounded-xl text-xs gap-1.5 font-bold bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20 h-10 px-4"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Re-Calculate Results
          </Button>

          {hasPublished && (
            <Button
              variant="outline"
              onClick={() => handlePublish("UNPUBLISH")}
              disabled={isPublishing || !selectedClassId || selectedClassId === "ALL"}
              className="rounded-xl text-xs gap-1.5 font-bold border-rose-200 text-rose-600 hover:bg-rose-50 h-10 px-4"
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Unpublish Results
            </Button>
          )}

          <Button
            onClick={() => handlePublish("PUBLISH")}
            disabled={isPublishing || !selectedClassId || selectedClassId === "ALL" || resultsData.length === 0}
            className="rounded-xl text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 h-10 px-5"
          >
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {hasPublished ? "Update Published Results" : "Publish Results"}
          </Button>
        </div>
      </div>

      {/* Control Filters */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-bold text-[#5c28e8] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> Result Engine Target Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Academic Year:</label>
              <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
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
                        {label}
                      </SelectItem>
                    );
                  })}
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
                    setSelectedDivFilter("ALL");
                  }
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
                  <SelectValue placeholder="Select Class...">
                    {classesWithExams.find((cls) => String(cls.id) === selectedClassId)?.school_class || (selectedClassId ? `Class #${selectedClassId}` : "Select Class...")}
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
              <Select value={selectedDivFilter} onValueChange={(val) => { if (val) setSelectedDivFilter(val); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
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
          </div>
        </CardContent>
      </Card>

      {/* Active Weightage Info Card */}
      {weightageConfig && (
        <Card className={`rounded-2xl border shadow-2xs ${(weightageConfig.total_weightage ?? 0) === 100 ? 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/30'}`}>
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <Layers className={`h-5 w-5 shrink-0 ${(weightageConfig.total_weightage ?? 0) === 100 ? 'text-indigo-600' : 'text-red-600'}`} />
              <div>
                <span className={`font-bold uppercase tracking-wider ${(weightageConfig.total_weightage ?? 0) === 100 ? 'text-indigo-950 dark:text-indigo-200' : 'text-red-950 dark:text-red-200'}`}>
                  Active Dynamic Weightage Rule:
                </span>
                <p className="text-slate-600 dark:text-zinc-300 text-[11px] mt-0.5">
                  {weightageConfig.components?.map((c) => `${c.name} (${c.weightage_percentage}%)`).join(" + ")} = {weightageConfig.total_weightage ?? 0}% Total
                </p>
                {(weightageConfig.total_weightage ?? 0) !== 100 && (
                  <p className="text-red-600 font-semibold text-[11px] mt-0.5">
                    Action Required: Please add {100 - (weightageConfig.total_weightage ?? 0)}% more weightage in Result Settings.
                  </p>
                )}
              </div>
            </div>

            <Badge className={`${(weightageConfig.total_weightage ?? 0) === 100 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'} text-[10px] uppercase font-bold shrink-0`}>
              {(weightageConfig.total_weightage ?? 0) === 100 ? 'Active & Valid 100%' : 'Invalid Configuration'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Result Preview List */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                Final Result Preview — {currentClassObj?.school_class || "Class"}
              </CardTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                {resultsData.length} Students
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Review computed percentages and grades before publishing to students and parents.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800"
              />
            </div>
          </div>
        </CardHeader>

        {resultsData.length === 0 ? (
          <CardContent className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
            <Sparkles className="h-8 w-8 text-amber-500 animate-pulse" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                Ready to Process Results for {currentClassObj?.school_class || "Selected Class"}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Click the <strong>"Calculate Results"</strong> button above to run the dynamic calculation engine against active weightages and generate report cards.
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                    <TableHead className="w-20 text-center font-bold text-xs">Roll No.</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs">GR No.</TableHead>
                    <TableHead className="font-bold text-xs min-w-[200px]">Student Name</TableHead>
                    <TableHead className="text-center font-bold text-xs">Total Marks</TableHead>
                    <TableHead className="text-center font-bold text-xs">Percentage</TableHead>
                    <TableHead className="text-center font-bold text-xs">Grade</TableHead>
                    <TableHead className="text-center font-bold text-xs">Status</TableHead>
                    <TableHead className="text-center font-bold text-xs w-28">Breakdown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((res, idx) => (
                    <TableRow key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50">
                      <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{res.roll_no || "—"}</TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-zinc-400">{res.gr_no || "—"}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">{res.student_name || `Student #${res.student}`}</TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {res.total_marks_obtained !== undefined && res.total_marks_obtained !== null
                          ? `${res.total_marks_obtained} / ${res.total_max_marks ?? 100}` 
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {res.total_percentage !== undefined ? `${res.total_percentage}%` : (res.percentage !== undefined ? `${res.percentage}%` : "—")}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold">
                        <span className={`px-2.5 py-0.5 rounded-md font-extrabold ${res.grade === 'F' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
                          {res.grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {res.status === 'PUBLISHED' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">PUBLISHED</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-200 dark:text-zinc-400">APPROVED</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setPreviewStudent(res)}
                          className="h-7 text-xs gap-1 font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Student Component Breakdown Dialog */}
      <Dialog open={!!previewStudent} onOpenChange={(open) => { if (!open) setPreviewStudent(null); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              {previewStudent?.student_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Roll No: <strong>{previewStudent?.roll_no || "—"}</strong> | GR No: <strong>{previewStudent?.gr_no || "—"}</strong> | Final Result: <strong>{previewStudent?.total_percentage}% ({previewStudent?.grade})</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dynamic Weightage Contribution</h4>
            <div className="space-y-2">
              {previewStudent?.component_breakdown?.components?.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                      <span>{c.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({c.weightage_pct}% weight)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{c.details || `Score: ${c.score_pct}%`}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">+{c.contribution_pct}%</div>
                    <div className="text-[10px] text-slate-400">Raw: {c.score_pct}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Total Computed Percentage</span>
              <span className="text-sm font-black font-mono text-indigo-700 dark:text-indigo-300">{previewStudent?.total_percentage}% ({previewStudent?.grade})</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewStudent(null)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResultProcessingPublishPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#5c28e8]" />
          <p className="text-xs text-muted-foreground font-semibold">Loading result publishing workspace...</p>
        </div>
      }
    >
      <PublishPageInner />
    </Suspense>
  );
}
