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
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getWeightageConfigs, getExamsFull, type ResultWeightageConfig } from "@/lib/exam-api";

export default function ResultDashboardPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [weightageConfig, setWeightageConfig] = useState<ResultWeightageConfig | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const years = await getAcademicYearsForPrincipal();
      setAcademicYears(years || []);

      if (years && years.length > 0) {
        const activeYr = years.find((y: any) => y.is_active) || years[0];
        const yrId = selectedYearId || String(activeYr.id);
        setSelectedYearId(yrId);

        const [configs, examsList] = await Promise.all([
          getWeightageConfigs(Number(yrId)),
          getExamsFull({ academic_year: Number(yrId) }),
        ]);

        if (configs && configs.length > 0) {
          setWeightageConfig(configs[0]);
        } else {
          setWeightageConfig(null);
        }

        setExams(examsList || []);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load result dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYearId]);

  const activeYearObj = academicYears.find((y) => String(y.id) === selectedYearId);
  const isWeightageValid = weightageConfig?.status === "ACTIVE" || weightageConfig?.status === "LOCKED";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
              Exam & Result Management Dashboard
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              Principal Control
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete functional flow status for dynamic weightage, exam schedules, seating allocations & result publications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
            <SelectTrigger className="w-52 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
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
        </div>
      </div>

      {/* Overview Cards */}
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
              {weightageConfig ? `${weightageConfig.total_weightage}%` : "0%"}
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Status: <Badge variant="outline" className="font-semibold text-[10px]">{weightageConfig?.status || "NOT CONFIGURED"}</Badge>
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
              {exams.length}
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {activeYearObj?.name || "Selected Year"} Exam Schedules
            </p>
            <Link
              href="/principal/result/exams"
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 mt-2"
            >
              Manage Exams & Terms <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Card 3: Seating Allocation */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Seating Arrangement
              <Hash className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">
              Auto Allocator
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Room & Seat Number Assignment
            </p>
            <Link
              href="/principal/result/seating"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 mt-2"
            >
              Manage Seating <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Card 4: Result Processing & Publish */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Result Processing
              <Award className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono">
              Engine & Publish
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Preview, Review & Publish Results
            </p>
            <Link
              href="/principal/result/publish"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 mt-2"
            >
              Process Results <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Weightage Component Summary Card */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            Active Result Weightage Component Distribution — {activeYearObj?.name || "Academic Year"}
          </CardTitle>
          <CardDescription className="text-xs">
            Dynamic percentage breakdown configured by the Principal for calculating final student report cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading weightage configuration...
            </div>
          ) : !weightageConfig || !weightageConfig.components || weightageConfig.components.length === 0 ? (
            <div className="p-8 text-center text-xs text-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 flex flex-col items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
              <span>No active Result Weightage Configuration found for {activeYearObj?.name || "this year"}. Please set up dynamic weightage components (Sum = 100%).</span>
              <Button asChild size="sm" className="mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                <Link href="/principal/result/weightage">Create Dynamic Weightage</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {weightageConfig.components.map((comp) => (
                  <div
                    key={comp.id || comp.name}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {comp.component_type}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                        {comp.name}
                      </h4>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Weightage:</span>
                      <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                        {comp.weightage_percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Bar of Weightage Breakdown */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <span>Total Dynamic Distribution:</span>
                  <span className="font-mono font-bold text-indigo-600">{weightageConfig.total_weightage}% / 100%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                  {weightageConfig.components.map((c, i) => {
                    const bgColors = ["bg-indigo-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-cyan-500"];
                    return (
                      <div
                        key={c.id || i}
                        style={{ width: `${c.weightage_percentage}%` }}
                        className={`${bgColors[i % bgColors.length]} h-full transition-all duration-300`}
                        title={`${c.name}: ${c.weightage_percentage}%`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
