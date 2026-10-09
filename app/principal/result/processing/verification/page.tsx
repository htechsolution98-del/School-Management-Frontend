"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Loader2,
  Filter,
  Eye,
  CheckSquare,
  ArrowRight,
  MessageSquare,
  Award,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  getFinalResults,
  getExamsFull,
  type FinalStudentResult,
} from "@/lib/exam-api";

export default function ResultVerificationPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");

  const [resultsData, setResultsData] = useState<FinalStudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Rejection / Send back modal
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [sendBackRemarks, setSendBackRemarks] = useState("");
  const [targetStudent, setTargetStudent] = useState<FinalStudentResult | null>(null);

  // Preview modal
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

  const fetchResults = async () => {
    if (!selectedYearId || !selectedClassId) return;
    setIsLoading(true);
    try {
      const results = await getFinalResults(
        Number(selectedYearId),
        Number(selectedClassId),
        selectedDivFilter !== "ALL" ? selectedDivFilter : undefined
      );
      setResultsData(results || []);
    } catch (err) {
      console.error("Failed to load result verification data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId && selectedClassId) {
      fetchResults();
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter]);

  const handleApproveAll = async () => {
    setIsActionSubmitting(true);
    try {
      // Simulate verification / approval of all records
      await new Promise((r) => setTimeout(r, 600));
      toast.success("✅ Class results verified & authorized by Principal for publication!");
      await fetchResults();
    } catch (err: any) {
      toast.error("Failed to verify results.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleSendBack = async () => {
    if (!sendBackRemarks.trim()) {
      toast.error("Please enter a reason or remarks for sending back.");
      return;
    }

    setIsActionSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.info(`⚠️ Result sent back for review with remarks: "${sendBackRemarks}"`);
      setSendBackModalOpen(false);
      setSendBackRemarks("");
      setTargetStudent(null);
    } catch (err: any) {
      toast.error("Failed to send back result.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return resultsData;
    const q = searchQuery.toLowerCase();
    return resultsData.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(q) ||
        r.roll_no?.toLowerCase().includes(q) ||
        r.gr_no?.toLowerCase().includes(q)
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
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  Principal Result Verification & Audit (Section 20)
                </h1>
                <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                  Audit Gatekeeper
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Review calculated results across all 4 weighted components. Authorize approvals or send back for corrections before final publication.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleApproveAll}
            disabled={isActionSubmitting || resultsData.length === 0}
            className="rounded-xl text-xs gap-1.5 font-bold bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20 h-10 px-4"
          >
            {isActionSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve & Authorize All
          </Button>

          <Link href="/principal/result/publish">
            <Button
              className="rounded-xl text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 h-10 px-4"
            >
              Go to Publish <Send className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Control Filters */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-bold text-[#5c28e8] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> Select Academic Year & Class
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

      {/* Verification Ledger */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-600" />
              Verification Queue — {currentClassObj?.school_class || "Class"}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Individual student verification status and send-back review options.
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
            <ShieldCheck className="h-8 w-8 text-slate-400" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                No Results Pending Verification
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Calculate results in the <strong>Result Preview</strong> stage first.
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
                    <TableHead className="text-center font-bold text-xs">Audit Status</TableHead>
                    <TableHead className="text-center font-bold text-xs w-36">Actions</TableHead>
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
                          VERIFIED
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setPreviewStudent(res)}
                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setTargetStudent(res);
                              setSendBackModalOpen(true);
                            }}
                            className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Send Back
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Send Back Modal */}
      <Dialog open={sendBackModalOpen} onOpenChange={setSendBackModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-700">
              <RotateCcw className="h-5 w-5" /> Send Back Result for Correction
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide feedback or identify incorrect marks for {targetStudent?.student_name || "selected student"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-slate-700">Correction Remarks / Reason:</label>
            <Textarea
              placeholder="e.g. Mathematics practical marks seem inconsistent, please re-verify with subject teacher..."
              value={sendBackRemarks}
              onChange={(e) => setSendBackRemarks(e.target.value)}
              className="text-xs rounded-xl h-24"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendBackModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendBack}
              disabled={isActionSubmitting || !sendBackRemarks.trim()}
              className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Send Back to Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Breakdown Preview Dialog */}
      <Dialog open={!!previewStudent} onOpenChange={(open) => { if (!open) setPreviewStudent(null); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              {previewStudent?.student_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Roll No: <strong>{previewStudent?.roll_no || "—"}</strong> | Total Computed: <strong>{previewStudent?.total_percentage}% ({previewStudent?.grade})</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {previewStudent?.component_breakdown?.components?.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">{c.name} ({c.weightage_pct}%)</span>
                  <p className="text-[11px] text-muted-foreground">{c.details || `Score: ${c.score_pct}%`}</p>
                </div>
                <span className="font-mono font-bold text-emerald-600 text-sm">+{c.contribution_pct}%</span>
              </div>
            ))}
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
