"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Hash,
  Award,
  Layers,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  Check,
  XCircle,
  Users,
  Eye,
  Send,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getResultDashboardSummary, type ResultDashboardSummary } from "@/lib/exam-api";

export default function ResultDashboardPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [summary, setSummary] = useState<ResultDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (yrId?: string) => {
    setIsLoading(true);
    try {
      const years = await getAcademicYearsForPrincipal();
      setAcademicYears(years || []);

      if (years && years.length > 0) {
        const targetId = yrId || selectedYearId || String((years.find((y: any) => y.is_active) || years[0]).id);
        setSelectedYearId(targetId);

        const data = await getResultDashboardSummary(Number(targetId));
        setSummary(data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load result dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYearId);
  }, [selectedYearId]);

  const activeYearObj = academicYears.find((y) => String(y.id) === selectedYearId);
  const isWeightageValid = summary?.weightage?.status === "ACTIVE" || summary?.weightage?.status === "LOCKED";
  const isResultReady = summary?.overall_readiness?.is_ready;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  Exam & Result Management Dashboard
                </h1>
                <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                  Principal Authorization
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Complete functional flow tracking: Dynamic Weightage (100%), Term 1 & 2 Schedules, Seating Allocation, Teacher Assessment, and Final Result Publication.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
            <SelectTrigger className="w-56 h-10 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 border-gray-200 font-bold text-slate-700">
              <SelectValue placeholder="Select Academic Year">
                {activeYearObj
                  ? (activeYearObj.name ||
                     `${activeYearObj.start_year || ""}-${activeYearObj.end_year || ""}`.replace(/^-$/, "") ||
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
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dynamic Weightage */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Weightage Config
              {isWeightageValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">
              {summary ? `${summary.weightage.total_weightage}%` : "0%"}
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Status: <Badge variant="outline" className="font-semibold text-[10px]">{summary?.weightage?.status || "NOT CONFIGURED"}</Badge>
            </p>
            <Link
              href="/principal/result/weightage"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-2"
            >
              Configure Weightage <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Card 2: Exams Scheduled */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Total Scheduled Exams
              <FileCheck className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">
              {summary?.counts?.total_exams ?? 0}
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {summary?.counts?.scheduled_exams ?? 0} active exam papers
            </p>
            <Link
              href="/principal/result/exams/schedule"
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 mt-2"
            >
              View Exam Schedule <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Card 3: Teacher Assessment */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Teacher Assessment (10%)
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">
              {summary?.teacher_assessment?.percentage ?? 0}%
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {summary?.teacher_assessment?.assessed_students ?? 0} / {summary?.teacher_assessment?.total_students ?? 0} Students Assessed
            </p>
            <Link
              href="/principal/result/marks/assessment"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 mt-2"
            >
              Manage Assessments <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Card 4: Result Processing & Publish */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Published Results
              <Award className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">
              {summary?.counts?.published_count ?? 0}
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {summary?.counts?.ready_count ?? 0} Ready for Review
            </p>
            <Link
              href="/principal/result/publish"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 mt-2"
            >
              Publish Results <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Complete Functional Flow Status Matrix (Adhering to Section 5) */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Workflow Stage Status Matrix — {activeYearObj?.name || "Selected Year"}
            </span>
            <Badge variant={isResultReady ? "default" : "secondary"} className={isResultReady ? "bg-emerald-600 text-white" : ""}>
              {isResultReady ? "Result Ready for Publish" : "Processing Pending"}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Live evaluation of all prerequisite stages required before final results can be calculated and published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading workflow status...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Stage 1: Result Configuration */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600" /> Result Configuration (100%)
                    </span>
                    {isWeightageValid ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        ✓ Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Weightage Sum: <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{summary?.weightage?.total_weightage}%</span> / 100%
                  </p>
                  <div className="flex justify-end pt-1">
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold text-indigo-600">
                      <Link href="/principal/result/weightage">Configure &gt;</Link>
                    </Button>
                  </div>
                </div>

                {/* Stage 2 & 3: Term 1 & Term 2 Summary */}
                {summary?.terms && summary.terms.length > 0 ? (
                  summary.terms.map((term) => (
                    <div key={term.term_id} className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-purple-600" /> {term.term_name}
                        </span>
                        <Badge
                          className={`text-[10px] ${
                            term.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : term.status === "In Progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {term.status}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Exam Schedule:</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{term.exams_count} papers</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Marks Entry:</span>
                          <span className="font-bold font-mono text-purple-600">{term.marks_percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Class Teacher Verification:</span>
                          <span className="font-bold font-mono text-emerald-600">{term.verification_percentage}%</span>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold text-purple-600">
                          <Link href="/principal/result/marks/overview">View Marks &gt;</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-purple-600" /> Terms (Term 1 & Term 2)
                      </span>
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                        Not Created
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No exam terms created yet for {activeYearObj?.name || "this year"}.
                    </p>
                    <div className="flex justify-end pt-1">
                      <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold text-purple-600">
                        <Link href="/principal/result/exams">Create Terms &gt;</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stage 4: Attendance Status */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600" /> Attendance (10%)
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                      ✓ {summary?.attendance?.status || "Available"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sourced automatically from Attendance module: <span className="font-bold text-slate-800 dark:text-zinc-200">{summary?.attendance?.total_logs ?? 0}</span> logs tracked.
                  </p>
                  <div className="flex justify-end pt-1">
                    <span className="text-[11px] font-semibold text-emerald-600">Auto Normalized to 10%</span>
                  </div>
                </div>

                {/* Stage 5: Teacher Assessment */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-blue-600" /> Teacher Assessment (10%)
                    </span>
                    <Badge
                      className={`text-[10px] ${
                        (summary?.teacher_assessment?.percentage ?? 0) >= 100
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {summary?.teacher_assessment?.status || "Pending"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Assessed Students:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{summary?.teacher_assessment?.assessed_students ?? 0} / {summary?.teacher_assessment?.total_students ?? 0}</span>
                    </div>
                    <Progress value={summary?.teacher_assessment?.percentage ?? 0} className="h-1.5" />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold text-blue-600">
                      <Link href="/principal/result/marks/assessment">Enter Scores &gt;</Link>
                    </Button>
                  </div>
                </div>

                {/* Stage 6: Result Publication */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-600" /> Final Result Publication
                    </span>
                    <Badge
                      className={`text-[10px] ${
                        (summary?.counts?.published_count ?? 0) > 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {(summary?.counts?.published_count ?? 0) > 0 ? "Published" : "Not Published"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Published: <span className="font-bold text-slate-800 dark:text-zinc-200">{summary?.counts?.published_count ?? 0}</span> students visible on Student & Parent portals.
                  </p>
                  <div className="flex justify-end pt-1">
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold text-amber-600">
                      <Link href="/principal/result/publish">Publish Result &gt;</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Blockers & Pending Dependencies List (Section 30 requirement) */}
              {summary?.overall_readiness?.blockers && summary.overall_readiness.blockers.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Pending Workflow Blockers (Result cannot be published until resolved):
                  </div>
                  <ul className="space-y-1 pl-6 list-disc text-xs text-amber-700 dark:text-amber-400">
                    {summary.overall_readiness.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Weightage Component Breakdown */}
      {summary?.weightage?.components && summary.weightage.components.length > 0 && (
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Configured Result Weightage Component Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {summary.weightage.components.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {comp.type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                      {comp.name}
                    </h4>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Weightage:</span>
                    <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                      {comp.weightage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <span>Total Normalized Dynamic Distribution:</span>
                <span className="font-mono font-bold text-indigo-600">{summary.weightage.total_weightage}% / 100%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                {summary.weightage.components.map((c, i) => {
                  const bgColors = ["bg-indigo-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-cyan-500"];
                  return (
                    <div
                      key={i}
                      style={{ width: `${c.weightage}%` }}
                      className={`${bgColors[i % bgColors.length]} h-full transition-all duration-300`}
                      title={`${c.name}: ${c.weightage}%`}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
