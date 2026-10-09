"use client";

import { useEffect, useState, useMemo } from "react";
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
  ArrowRight,
  Calculator,
  UserCheck,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  getWeightageConfigs,
  getResultReadiness,
  getExamsFull,
  type FinalStudentResult,
  type ResultWeightageConfig,
} from "@/lib/exam-api";

export default function ResultProcessingPreviewPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");

  const [weightageConfig, setWeightageConfig] = useState<ResultWeightageConfig | null>(null);
  const [resultsData, setResultsData] = useState<FinalStudentResult[]>([]);
  const [readinessData, setReadinessData] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Modal view for student report card preview
  const [previewStudent, setPreviewStudent] = useState<FinalStudentResult | null>(null);

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
      resultsData.forEach((r: any) => { if (r.division) set.add(String(r.division).trim()); });
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
    resultsData.forEach((r: any) => {
      if (r.division) set.add(String(r.division).trim());
    });
    return Array.from(set).sort();
  }, [divisions, selectedClassId, exams, resultsData]);

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

      let resolvedYearId = "";
      if (yearsData && yearsData.length > 0) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        resolvedYearId = String(activeYr.id);
        setSelectedYearId(resolvedYearId);

        const examsList = await getExamsFull({ academic_year: Number(resolvedYearId) });
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

  const fetchResultsAndReadiness = async () => {
    if (!selectedYearId || !selectedClassId) return;
    setIsCheckingReadiness(true);
    try {
      const [configs, readiness, results] = await Promise.allSettled([
        getWeightageConfigs(Number(selectedYearId)),
        getResultReadiness({
          academic_year: Number(selectedYearId),
          school_class: Number(selectedClassId),
          division: selectedDivFilter !== "ALL" ? selectedDivFilter : undefined,
        }),
        getFinalResults(
          Number(selectedYearId),
          Number(selectedClassId),
          selectedDivFilter !== "ALL" ? selectedDivFilter : undefined
        ),
      ]);

      if (configs.status === "fulfilled" && configs.value.length > 0) {
        setWeightageConfig(configs.value[0]);
      } else {
        setWeightageConfig(null);
      }

      if (readiness.status === "fulfilled") {
        setReadinessData(readiness.value);
      }

      if (results.status === "fulfilled") {
        setResultsData(results.value || []);
      }
    } catch (err) {
      console.error("Failed to load result preview data", err);
    } finally {
      setIsCheckingReadiness(false);
    }
  };

  useEffect(() => {
    if (selectedYearId && selectedClassId) {
      fetchResultsAndReadiness();
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter]);

  // Run Dynamic Result Engine
  const handleCalculateResults = async () => {
    if (!selectedYearId || !selectedClassId) return;

    setIsProcessing(true);
    try {
      const res = await calculateResults(
        Number(selectedYearId),
        Number(selectedClassId),
        selectedDivFilter !== "ALL" ? selectedDivFilter : undefined
      );

      if (res.success) {
        toast.success(`✨ Dynamic Result Engine calculated ${res.processed_count} student results!`);
        await fetchResultsAndReadiness();
      } else {
        toast.error(res.reason || "Result calculation failed. Please check prerequisites.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process results.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return resultsData;
    const q = searchQuery.toLowerCase();
    return resultsData.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(q) ||
        r.roll_no?.toLowerCase().includes(q) ||
        r.gr_no?.toLowerCase().includes(q) ||
        r.grade?.toLowerCase().includes(q)
    );
  }, [resultsData, searchQuery]);

  const currentClassObj = classes.find((c) => String(c.id) === selectedClassId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  Dynamic Result Preview Engine (Section 19)
                </h1>
                <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                  Normalized 100% Breakdown
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Pre-flight checklist & live component contribution preview (Term 1 (40%) + Term 2 (40%) + Attendance (10%) + Teacher Assessment (10%)).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCalculateResults}
            disabled={isProcessing || !selectedClassId}
            className="rounded-xl text-xs gap-1.5 font-bold bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20 h-10 px-4"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Run / Recalculate Engine
          </Button>

          <Link href="/principal/result/processing/verification">
            <Button
              variant="outline"
              className="rounded-xl text-xs gap-1.5 font-bold border-gray-200 h-10 px-4"
            >
              Go to Verification <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Control Filters */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-bold text-[#5c28e8] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> Target Academic Class & Division
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

      {/* Rule 18 Prerequisites Readiness Card */}
      {readinessData && (
        <Card className={`rounded-2xl border shadow-2xs ${readinessData.is_ready ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                <ShieldCheck className={`h-4 w-4 ${readinessData.is_ready ? 'text-emerald-600' : 'text-amber-600'}`} />
                Rule 18 — Result Processing Readiness Engine
              </CardTitle>
              <Badge className={readinessData.is_ready ? 'bg-emerald-600 text-white font-bold' : 'bg-amber-500 text-white font-bold'}>
                {readinessData.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {readinessData.checklist?.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800">
                  {item.passed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-semibold block truncate">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">{item.details}</span>
                  </div>
                </div>
              ))}
            </div>

            {readinessData.blockers && readinessData.blockers.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs">
                <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" /> Pending Blockers (Calculation Blocked):
                </div>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-800 dark:text-amber-300">
                  {readinessData.blockers.map((b: string, i: number) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result Preview Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              Dynamic Result Component Preview Matrix — {currentClassObj?.school_class || "Class"}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Normalized component contribution breakdown table as specified in Section 19.
            </CardDescription>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search by student, roll, or grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs rounded-xl"
            />
          </div>
        </CardHeader>

        {filteredResults.length === 0 ? (
          <CardContent className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
            <Sparkles className="h-8 w-8 text-indigo-500 animate-pulse" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                No Calculated Results Found for this Class
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Ensure all exam marks, verification, and teacher assessments are submitted, then click <strong>"Run / Recalculate Engine"</strong>.
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
                    <TableHead className="w-16 text-center font-bold text-xs">Roll</TableHead>
                    <TableHead className="w-20 text-center font-bold text-xs">GR No.</TableHead>
                    <TableHead className="font-bold text-xs min-w-[180px]">Student Name</TableHead>
                    <TableHead className="text-center font-bold text-xs bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                      Term 1 (40%)
                    </TableHead>
                    <TableHead className="text-center font-bold text-xs bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                      Term 2 (40%)
                    </TableHead>
                    <TableHead className="text-center font-bold text-xs bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                      Attendance (10%)
                    </TableHead>
                    <TableHead className="text-center font-bold text-xs bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                      Teacher (10%)
                    </TableHead>
                    <TableHead className="text-center font-bold text-xs bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200">
                      Final % (100%)
                    </TableHead>
                    <TableHead className="text-center font-bold text-xs">Grade</TableHead>
                    <TableHead className="text-center font-bold text-xs">Status</TableHead>
                    <TableHead className="text-center font-bold text-xs w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((res, idx) => {
                    const comps = res.component_breakdown?.components || [];
                    const t1 = comps.find((c: any) => c.component_type === "TERM1" || c.name?.toLowerCase().includes("term 1"));
                    const t2 = comps.find((c: any) => c.component_type === "TERM2" || c.name?.toLowerCase().includes("term 2"));
                    const att = comps.find((c: any) => c.component_type === "ATTENDANCE" || c.name?.toLowerCase().includes("attendance"));
                    const tch = comps.find((c: any) => c.component_type === "TEACHER_ASSESSMENT" || c.name?.toLowerCase().includes("teacher"));

                    return (
                      <TableRow key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50">
                        <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold text-indigo-600">{res.roll_no || "—"}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-zinc-400">{res.gr_no || "—"}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">{res.student_name || `Student #${res.student}`}</TableCell>

                        {/* Term 1 Contribution */}
                        <TableCell className="text-center text-xs font-mono font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                          {t1 ? (
                            <div>
                              <span className="font-bold text-indigo-700 dark:text-indigo-300">{t1.contribution_pct}%</span>
                              <span className="text-[10px] text-muted-foreground block">Raw: {t1.score_pct}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Term 2 Contribution */}
                        <TableCell className="text-center text-xs font-mono font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                          {t2 ? (
                            <div>
                              <span className="font-bold text-indigo-700 dark:text-indigo-300">{t2.contribution_pct}%</span>
                              <span className="text-[10px] text-muted-foreground block">Raw: {t2.score_pct}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Attendance Contribution */}
                        <TableCell className="text-center text-xs font-mono font-semibold bg-emerald-50/30 dark:bg-emerald-950/10">
                          {att ? (
                            <div>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">{att.contribution_pct}%</span>
                              <span className="text-[10px] text-muted-foreground block">Att: {att.score_pct}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Teacher Assessment Contribution */}
                        <TableCell className="text-center text-xs font-mono font-semibold bg-amber-50/30 dark:bg-amber-950/10">
                          {tch ? (
                            <div>
                              <span className="font-bold text-amber-700 dark:text-amber-300">{tch.contribution_pct}%</span>
                              <span className="text-[10px] text-muted-foreground block">Score: {tch.score_pct}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Final Result */}
                        <TableCell className="text-center text-xs font-black font-mono bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-sm">
                          {res.total_percentage !== undefined ? `${res.total_percentage}%` : `${res.percentage}%`}
                        </TableCell>

                        {/* Grade */}
                        <TableCell className="text-center text-xs font-bold">
                          <span className={`px-2 py-0.5 rounded font-extrabold ${res.grade === 'F' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                            {res.grade}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center text-xs">
                          {res.status === 'PUBLISHED' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">PUBLISHED</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600">CALCULATED</Badge>
                          )}
                        </TableCell>

                        {/* Breakdown Modal */}
                        <TableCell className="text-center text-xs">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setPreviewStudent(res)}
                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Student Component Breakdown Modal */}
      <Dialog open={!!previewStudent} onOpenChange={(open) => { if (!open) setPreviewStudent(null); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              {previewStudent?.student_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Roll No: <strong>{previewStudent?.roll_no || "—"}</strong> | GR No: <strong>{previewStudent?.gr_no || "—"}</strong> | Final Computed: <strong>{previewStudent?.total_percentage}% ({previewStudent?.grade})</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dynamic Component Contribution Matrix</h4>
            <div className="space-y-2">
              {previewStudent?.component_breakdown?.components?.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                      <span>{c.name}</span>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                        {c.weightage_pct}% Weight
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{c.details || `Raw Component Score: ${c.score_pct}%`}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">+{c.contribution_pct}%</div>
                    <div className="text-[10px] text-slate-400">Score: {c.score_pct}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Final Aggregated Percentage (100%)</span>
              <span className="text-base font-black font-mono text-indigo-700 dark:text-indigo-300">{previewStudent?.total_percentage}% ({previewStudent?.grade})</span>
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
