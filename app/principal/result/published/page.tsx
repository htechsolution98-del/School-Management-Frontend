"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  Download,
  School,
  GraduationCap,
  Calendar,
  User,
  CheckSquare,
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
  getFinalResults,
  getWeightageConfigs,
  getExamsFull,
  type FinalStudentResult,
  type ResultWeightageConfig,
} from "@/lib/exam-api";

export default function PublishedResultsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");

  const [resultsData, setResultsData] = useState<FinalStudentResult[]>([]);
  const [weightageConfig, setWeightageConfig] = useState<ResultWeightageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Modal view for student official report card
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<FinalStudentResult | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const fetchPublishedResults = async () => {
      if (!selectedYearId || !selectedClassId) return;
      setIsLoading(true);
      try {
        const [configs, fetched] = await Promise.allSettled([
          getWeightageConfigs(Number(selectedYearId)),
          getFinalResults(
            Number(selectedYearId),
            Number(selectedClassId),
            selectedDivFilter !== "ALL" ? selectedDivFilter : undefined
          ),
        ]);

        if (configs.status === "fulfilled" && configs.value.length > 0) {
          setWeightageConfig(configs.value[0]);
        }

        if (fetched.status === "fulfilled") {
          // Filter to only PUBLISHED results or all final results
          setResultsData(fetched.value || []);
        }
      } catch (err) {
        console.error("Failed to load published results", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedYearId && selectedClassId) {
      fetchPublishedResults();
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter]);

  const handlePrint = () => {
    window.print();
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

  const stats = useMemo(() => {
    if (resultsData.length === 0) return { count: 0, avg: "0.00", passRate: "0%", highest: "0.00" };
    const totalCount = resultsData.length;
    const passedCount = resultsData.filter((r) => r.grade !== "F").length;
    const pcts = resultsData.map((r) => Number(r.total_percentage || r.percentage || 0));
    const avg = (pcts.reduce((a, b) => a + b, 0) / totalCount).toFixed(2);
    const highest = Math.max(...pcts).toFixed(2);
    const passRate = `${Math.round((passedCount / totalCount) * 100)}%`;
    return { count: totalCount, avg, passRate, highest };
  }, [resultsData]);

  const currentClassObj = classes.find((c) => String(c.id) === selectedClassId);
  const currentYearObj = academicYears.find((y) => String(y.id) === selectedYearId);

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
                  Official Published Results & Report Cards (Section 22)
                </h1>
                <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                  Live Published Ledger
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Complete institutional archive of published student report cards with normalized breakdown and printable marksheet certificates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-bold text-[#5c28e8] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> Filter Published Results
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Published Students</span>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-100 mt-1">{stats.count}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Class Average</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.avg}%</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Highest Score</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.highest}%</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Passing Rate</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.passRate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Published Ledger Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              Published Students Ledger — {currentClassObj?.school_class || "Class"}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Official published marks records accessible by students and parents.
            </CardDescription>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search by student, roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs rounded-xl"
            />
          </div>
        </CardHeader>

        {filteredResults.length === 0 ? (
          <CardContent className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
            <Award className="h-8 w-8 text-slate-400" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                No Published Results Found
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Publish results for this class from the <strong>Result Publish</strong> menu.
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
                    <TableHead className="text-center font-bold text-xs">Final %</TableHead>
                    <TableHead className="text-center font-bold text-xs">Grade</TableHead>
                    <TableHead className="text-center font-bold text-xs">Status</TableHead>
                    <TableHead className="text-center font-bold text-xs w-36">Report Card</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((res, idx) => (
                    <TableRow key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50">
                      <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-indigo-600">{res.roll_no || "—"}</TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-zinc-400">{res.gr_no || "—"}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">{res.student_name || `Student #${res.student}`}</TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                        {res.total_percentage !== undefined ? `${res.total_percentage}%` : `${res.percentage}%`}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold">
                        <span className={`px-2 py-0.5 rounded font-extrabold ${res.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {res.grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          PUBLISHED
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Button
                          onClick={() => setSelectedStudentForCard(res)}
                          className="h-8 text-xs bg-[#5c28e8] hover:bg-[#4d20cb] text-white font-bold rounded-xl gap-1.5 shadow-md shadow-purple-500/20 px-3"
                        >
                          <Printer className="h-3.5 w-3.5" /> View Marksheet
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

      {/* Official Printable Report Card Dialog */}
      <Dialog open={!!selectedStudentForCard} onOpenChange={(open) => { if (!open) setSelectedStudentForCard(null); }}>
        <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <div ref={printRef} className="p-6 bg-white text-slate-900 space-y-6">
            {/* School Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">
                School Management System
              </h2>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest mt-0.5">
                Official Annual Academic Marksheet & Cumulative Performance Report
              </p>
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-full font-bold text-xs mt-2">
                Academic Year: {currentYearObj?.name || (currentYearObj?.start_year ? `${currentYearObj?.start_year}-${currentYearObj?.end_year}` : "2026-2027")}
              </div>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Student Name</span>
                <span className="font-bold text-slate-900 text-sm">{selectedStudentForCard?.student_name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Roll Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedStudentForCard?.roll_no || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">GR / Registration No.</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedStudentForCard?.gr_no || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Class & Division</span>
                <span className="font-bold text-slate-900 text-sm">{currentClassObj?.school_class || "—"}</span>
              </div>
            </div>

            {/* Dynamic Weightage Components Matrix Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                Institutional Performance Breakdown
              </h4>
              <Table className="border border-slate-300">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-900">Result Component</TableHead>
                    <TableHead className="text-center font-bold text-xs text-slate-900">Assigned Weight</TableHead>
                    <TableHead className="text-center font-bold text-xs text-slate-900">Normalized Score</TableHead>
                    <TableHead className="text-right font-bold text-xs text-slate-900">Weighted Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStudentForCard?.component_breakdown?.components?.map((c: any, i: number) => (
                    <TableRow key={i} className="border-b border-slate-200">
                      <TableCell className="text-xs font-bold text-slate-800">
                        {c.name}
                        {c.details && <span className="text-[10px] text-slate-500 font-normal block">{c.details}</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold">{c.weightage_pct}%</TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold">{c.score_pct}%</TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-indigo-700">+{c.contribution_pct}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-100 font-black">
                    <TableCell className="text-xs uppercase font-bold text-slate-900">Total Cumulative Assessment</TableCell>
                    <TableCell className="text-center font-mono text-xs">100%</TableCell>
                    <TableCell className="text-center font-mono text-xs">—</TableCell>
                    <TableCell className="text-right font-mono text-sm text-indigo-900">
                      {selectedStudentForCard?.total_percentage}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Final Assessment Summary Banner */}
            <div className="p-4 rounded-xl border-2 border-slate-900 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Overall Result & Performance</span>
                <div className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-3">
                  <span>Grade: {selectedStudentForCard?.grade}</span>
                  <span className="text-sm font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {selectedStudentForCard?.grade === "F" ? "NEEDS IMPROVEMENT" : "PASSED & PROMOTED"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Percentage</span>
                <div className="text-2xl font-black font-mono text-indigo-700">
                  {selectedStudentForCard?.total_percentage}%
                </div>
              </div>
            </div>

            {/* Institutional Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs border-t border-slate-300">
              <div>
                <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
                <span className="font-semibold text-slate-600">Class Teacher</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
                <span className="font-semibold text-slate-600">Exam Controller</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
                <span className="font-bold text-slate-900">Principal Authorization</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudentForCard(null)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
            >
              <Printer className="h-4 w-4" /> Print / Save Marksheet PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
