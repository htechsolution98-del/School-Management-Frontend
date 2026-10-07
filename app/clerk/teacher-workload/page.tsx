"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  Building2,
  Edit3,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Info,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  getTeacherWorkloads,
  updateTeacherWorkload,
  bulkUpdateTeacherWorkloads,
} from "@/lib/clerk";
import type { TeacherWorkload } from "@/types/clerk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function TeacherWorkloadPage() {
  const [teachers, setTeachers] = useState<TeacherWorkload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [workloadFilter, setWorkloadFilter] = useState("all");

  // Single Edit Modal State
  const [editingTeacher, setEditingTeacher] = useState<TeacherWorkload | null>(null);
  const [periodsMon, setPeriodsMon] = useState<number>(5);
  const [periodsTue, setPeriodsTue] = useState<number>(5);
  const [periodsWed, setPeriodsWed] = useState<number>(5);
  const [periodsThu, setPeriodsThu] = useState<number>(5);
  const [periodsFri, setPeriodsFri] = useState<number>(5);
  const [periodsSat, setPeriodsSat] = useState<number>(5);
  const [weeklyPeriods, setWeeklyPeriods] = useState<number>(25);
  const [consecutivePeriods, setConsecutivePeriods] = useState<number>(3);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Bulk Edit Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkMon, setBulkMon] = useState<number>(5);
  const [bulkTue, setBulkTue] = useState<number>(5);
  const [bulkWed, setBulkWed] = useState<number>(5);
  const [bulkThu, setBulkThu] = useState<number>(5);
  const [bulkFri, setBulkFri] = useState<number>(5);
  const [bulkSat, setBulkSat] = useState<number>(5);
  const [bulkWeekly, setBulkWeekly] = useState<number>(25);
  const [bulkConsecutive, setBulkConsecutive] = useState<number>(3);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Fetch data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getTeacherWorkloads();
      setTeachers(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load teacher workloads");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Edit Modal
  const openEditModal = (teacher: TeacherWorkload) => {
    setEditingTeacher(teacher);
    setPeriodsMon(teacher.max_periods_mon ?? 5);
    setPeriodsTue(teacher.max_periods_tue ?? 5);
    setPeriodsWed(teacher.max_periods_wed ?? 5);
    setPeriodsThu(teacher.max_periods_thu ?? 5);
    setPeriodsFri(teacher.max_periods_fri ?? 5);
    setPeriodsSat(teacher.max_periods_sat ?? 5);
    setWeeklyPeriods(teacher.max_weekly_periods ?? 25);
    setConsecutivePeriods(teacher.max_consecutive_periods ?? 3);
    setValidationError(null);
  };

  // Validate form in modal
  useEffect(() => {
    if (!editingTeacher) return;
    const days = [
      { name: "Monday", val: periodsMon },
      { name: "Tuesday", val: periodsTue },
      { name: "Wednesday", val: periodsWed },
      { name: "Thursday", val: periodsThu },
      { name: "Friday", val: periodsFri },
      { name: "Saturday", val: periodsSat },
    ];

    for (const d of days) {
      if (d.val < 0 || d.val > 15) {
        setValidationError(`${d.name} limit must be between 0 and 15 periods.`);
        return;
      }
    }

    const maxDayVal = Math.max(
      periodsMon,
      periodsTue,
      periodsWed,
      periodsThu,
      periodsFri,
      periodsSat
    );

    const sumDailyVal =
      periodsMon + periodsTue + periodsWed + periodsThu + periodsFri + periodsSat;

    if (weeklyPeriods < 1 || weeklyPeriods > 60) {
      setValidationError("Max weekly periods must be between 1 and 60.");
    } else if (consecutivePeriods < 1 || consecutivePeriods > 10) {
      setValidationError("Max consecutive periods must be between 1 and 10.");
    } else if (consecutivePeriods > maxDayVal && maxDayVal > 0) {
      setValidationError(
        `Consecutive periods (${consecutivePeriods}) cannot exceed highest daily limit (${maxDayVal}).`
      );
    } else if (weeklyPeriods > sumDailyVal) {
      setValidationError(
        `Weekly limit (${weeklyPeriods}) cannot exceed the sum of all daily limits (${sumDailyVal}).`
      );
    } else {
      setValidationError(null);
    }
  }, [
    periodsMon,
    periodsTue,
    periodsWed,
    periodsThu,
    periodsFri,
    periodsSat,
    weeklyPeriods,
    consecutivePeriods,
    editingTeacher,
  ]);

  // Apply Quick Preset to edit modal
  const applyPreset = (
    mon: number,
    tue: number,
    wed: number,
    thu: number,
    fri: number,
    sat: number,
    weekly: number,
    consecutive: number
  ) => {
    setPeriodsMon(mon);
    setPeriodsTue(tue);
    setPeriodsWed(wed);
    setPeriodsThu(thu);
    setPeriodsFri(fri);
    setPeriodsSat(sat);
    setWeeklyPeriods(weekly);
    setConsecutivePeriods(consecutive);
  };

  // Save single teacher edit
  const handleSaveTeacher = async () => {
    if (!editingTeacher || validationError) return;

    setIsSaving(true);
    try {
      const updated = await updateTeacherWorkload(editingTeacher.id, {
        max_periods_mon: periodsMon,
        max_periods_tue: periodsTue,
        max_periods_wed: periodsWed,
        max_periods_thu: periodsThu,
        max_periods_fri: periodsFri,
        max_periods_sat: periodsSat,
        max_weekly_periods: weeklyPeriods,
        max_consecutive_periods: consecutivePeriods,
      });

      setTeachers((prev) =>
        prev.map((t) => (t.id === editingTeacher.id ? { ...t, ...updated } : t))
      );

      toast.success(`Workload limits updated for ${editingTeacher.name || "Teacher"}.`, {
        description: `M:${periodsMon} T:${periodsTue} W:${periodsWed} T:${periodsThu} F:${periodsFri} S:${periodsSat} | Weekly: ${weeklyPeriods}`,
      });
      setEditingTeacher(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save workload limits");
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk Apply
  const handleBulkApply = async () => {
    const maxBulkDay = Math.max(bulkMon, bulkTue, bulkWed, bulkThu, bulkFri, bulkSat);
    if (bulkConsecutive > maxBulkDay && maxBulkDay > 0) {
      toast.error("Consecutive periods cannot exceed highest daily limit");
      return;
    }
    if (bulkWeekly < maxBulkDay) {
      toast.error("Weekly periods cannot be less than highest daily limit");
      return;
    }

    setIsBulkSaving(true);
    try {
      const res = await bulkUpdateTeacherWorkloads({
        max_periods_mon: bulkMon,
        max_periods_tue: bulkTue,
        max_periods_wed: bulkWed,
        max_periods_thu: bulkThu,
        max_periods_fri: bulkFri,
        max_periods_sat: bulkSat,
        max_weekly_periods: bulkWeekly,
        max_consecutive_periods: bulkConsecutive,
      });

      toast.success(res.message || "Bulk limits applied successfully!");
      setIsBulkModalOpen(false);
      await fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply bulk limits");
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.department_name) set.add(t.department_name);
    });
    return Array.from(set).sort();
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (t.name || "").toLowerCase().includes(q);
      const emailMatch = (t.email || "").toLowerCase().includes(q);
      const deptMatch = (t.department_name || "").toLowerCase().includes(q);
      const matchesSearch = !q || nameMatch || emailMatch || deptMatch;

      // Department
      const matchesDept =
        departmentFilter === "all" ||
        (t.department_name || "").toLowerCase() === departmentFilter.toLowerCase();

      // Workload Level based on weekly or max daily
      const maxDaily = Math.max(
        t.max_periods_mon ?? 5,
        t.max_periods_tue ?? 5,
        t.max_periods_wed ?? 5,
        t.max_periods_thu ?? 5,
        t.max_periods_fri ?? 5,
        t.max_periods_sat ?? 5
      );
      let matchesWorkload = true;
      if (workloadFilter === "high") {
        matchesWorkload = maxDaily >= 6 || (t.max_weekly_periods ?? 25) >= 30;
      } else if (workloadFilter === "standard") {
        matchesWorkload = maxDaily === 5 && (t.max_weekly_periods ?? 25) === 25;
      } else if (workloadFilter === "light") {
        matchesWorkload = maxDaily <= 4 || (t.max_weekly_periods ?? 25) <= 20;
      }

      return matchesSearch && matchesDept && matchesWorkload;
    });
  }, [teachers, searchQuery, departmentFilter, workloadFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = teachers.length;
    if (total === 0) {
      return { total: 0, avgDaily: "5.0", avgWeekly: "25.0", avgConsecutive: "3.0" };
    }
    const sumDaily = teachers.reduce((acc, t) => {
      const avg =
        ((t.max_periods_mon ?? 5) +
          (t.max_periods_tue ?? 5) +
          (t.max_periods_wed ?? 5) +
          (t.max_periods_thu ?? 5) +
          (t.max_periods_fri ?? 5) +
          (t.max_periods_sat ?? 5)) /
        6;
      return acc + avg;
    }, 0);
    const sumWeekly = teachers.reduce((acc, t) => acc + (t.max_weekly_periods ?? 25), 0);
    const sumConsecutive = teachers.reduce(
      (acc, t) => acc + (t.max_consecutive_periods ?? 3),
      0
    );
    return {
      total,
      avgDaily: (sumDaily / total).toFixed(1),
      avgWeekly: (sumWeekly / total).toFixed(1),
      avgConsecutive: (sumConsecutive / total).toFixed(1),
    };
  }, [teachers]);

  const totalDailySum =
    periodsMon + periodsTue + periodsWed + periodsThu + periodsFri + periodsSat;
  const isWeeklyExceedingSum = weeklyPeriods > totalDailySum;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              Day-Specific Constraints
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Clerk Administration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Teacher Workload & Capacity Limits
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure granular day-by-day (Mon–Sat) and weekly capacity limits to balance timetable distribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing || isLoading}
            className="h-9 gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-indigo-600")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkModalOpen(true)}
            className="h-9 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            Batch Set Defaults
          </Button>

          <Link href="/clerk/timetable">
            <Button size="sm" className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <span>View Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── METRIC STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Teaching Staff
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
                <span className="text-xs font-medium text-slate-500">Teachers</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Avg Daily Period Limit
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stats.avgDaily}</span>
                <span className="text-xs font-medium text-slate-500">Periods / Day</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Avg Weekly Capacity
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stats.avgWeekly}</span>
                <span className="text-xs font-medium text-slate-500">Periods / Week</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Consecutive Threshold
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stats.avgConsecutive}</span>
                <span className="text-xs font-medium text-slate-500">Max Back-to-Back</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TOOLBAR / FILTERS ────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search teacher by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Department Filter */}
            <div className="w-full md:w-52">
              <Select value={departmentFilter} onValueChange={(val) => setDepartmentFilter(val ?? "all")}>
                <SelectTrigger className="h-9 text-sm bg-slate-50/50 border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <SelectValue placeholder="Department" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Workload Filter */}
            <div className="w-full md:w-44">
              <Select value={workloadFilter} onValueChange={(val) => setWorkloadFilter(val ?? "all")}>
                <SelectTrigger className="h-9 text-sm bg-slate-50/50 border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <SelectValue placeholder="Workload Tier" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Capacity Tiers</SelectItem>
                  <SelectItem value="high">Heavy (≥ 6/day)</SelectItem>
                  <SelectItem value="standard">Standard (5/day)</SelectItem>
                  <SelectItem value="light">Light (≤ 4/day)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── TEACHER WORKLOAD TABLE ──────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">
              Teacher Capacity Configuration
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Showing {filteredTeachers.length} of {teachers.length} teachers
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Format: M (Mon) · T (Tue) · W (Wed) · T (Thu) · F (Fri) · S (Sat)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium text-slate-600">Loading teacher workloads...</p>
              <p className="text-xs text-slate-400">Fetching capacity parameters from database</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No teachers found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || departmentFilter !== "all" || workloadFilter !== "all"
                  ? "No teaching staff match your current filter criteria. Try adjusting or clearing search terms."
                  : "No teachers are registered in this school yet. Add teachers under Staff Management first."}
              </p>
              {(searchQuery || departmentFilter !== "all" || workloadFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setDepartmentFilter("all");
                    setWorkloadFilter("all");
                  }}
                  className="text-xs h-8"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Teacher Name & Contact</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Day-Specific Limits (M – S)</th>
                    <th className="py-3 px-4 text-center">Max Weekly</th>
                    <th className="py-3 px-4 text-center">Max Consecutive</th>
                    <th className="py-3 px-4 text-center">Assigned</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((teacher) => {
                    const mon = teacher.max_periods_mon ?? 5;
                    const tue = teacher.max_periods_tue ?? 5;
                    const wed = teacher.max_periods_wed ?? 5;
                    const thu = teacher.max_periods_thu ?? 5;
                    const fri = teacher.max_periods_fri ?? 5;
                    const sat = teacher.max_periods_sat ?? 5;
                    const weekly = teacher.max_weekly_periods ?? 25;
                    const consecutive = teacher.max_consecutive_periods ?? 3;
                    const assigned = teacher.assigned_classes_count ?? 0;

                    const maxDay = Math.max(mon, tue, wed, thu, fri, sat);

                    // Compute health status
                    let healthBadge = {
                      label: "Balanced",
                      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    };
                    if (maxDay >= 7 || weekly >= 32) {
                      healthBadge = {
                        label: "Heavy",
                        cls: "bg-amber-50 text-amber-700 border-amber-200",
                      };
                    } else if (maxDay <= 3 && weekly <= 15) {
                      healthBadge = {
                        label: "Part-Time",
                        cls: "bg-sky-50 text-sky-700 border-sky-200",
                      };
                    }

                    const daysSummary = [
                      { label: "M", val: mon, name: "Monday" },
                      { label: "T", val: tue, name: "Tuesday" },
                      { label: "W", val: wed, name: "Wednesday" },
                      { label: "T", val: thu, name: "Thursday" },
                      { label: "F", val: fri, name: "Friday" },
                      { label: "S", val: sat, name: "Saturday" },
                    ];

                    return (
                      <tr
                        key={teacher.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Name & Contact */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-semibold text-xs shadow-sm flex-shrink-0">
                              {(teacher.name || "T")
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {teacher.name || "Unnamed Teacher"}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {teacher.email || teacher.mobile || "No contact info"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4">
                          {teacher.department_name ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {teacher.department_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">General</span>
                          )}
                        </td>

                        {/* Compact Day-by-Day Summary Pill */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1 p-1 bg-slate-50/90 border border-slate-200 rounded-lg shadow-2xs">
                            {daysSummary.map((d, idx) => (
                              <div
                                key={idx}
                                title={`${d.name}: ${d.val} periods`}
                                className={cn(
                                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors",
                                  d.val === 0
                                    ? "bg-slate-100 text-slate-400"
                                    : d.val >= 6
                                    ? "bg-amber-100/70 text-amber-900 border border-amber-200/60 font-semibold"
                                    : "bg-white text-slate-800 border border-slate-200/80 font-medium"
                                )}
                              >
                                <span className="text-[10px] font-bold text-indigo-600">{d.label}:</span>
                                <span>{d.val}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Max Weekly Periods */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {weekly} periods
                          </span>
                        </td>

                        {/* Max Consecutive */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                              consecutive > 3
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            )}
                          >
                            Max {consecutive}
                          </span>
                        </td>

                        {/* Assigned Classes */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs font-medium text-slate-600">
                            {assigned} {assigned === 1 ? "section" : "sections"}
                          </span>
                        </td>

                        {/* Workload Health */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                              healthBadge.cls
                            )}
                          >
                            {healthBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(teacher)}
                            className="h-8 gap-1.5 text-xs text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Limits</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SINGLE TEACHER EDIT MODAL ────────────────────────────────────────── */}
      <Dialog
        open={!!editingTeacher}
        onOpenChange={(open) => {
          if (!open && !isSaving) setEditingTeacher(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <SlidersHorizontal className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Workload Configuration
              </span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Configure Day-Specific Capacity Limits
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set period limits for each day and total weekly ceiling for{" "}
              <strong className="text-slate-700">{editingTeacher?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Presets */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Quick Capacity Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(5, 5, 5, 5, 5, 5, 25, 3)}
                  className="px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-medium transition"
                >
                  Standard (All 5 / 25w / 3c)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(5, 5, 5, 5, 5, 0, 25, 3)}
                  className="px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-medium transition"
                >
                  5-Day Week (Sat Off / 25w)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(6, 6, 6, 6, 6, 4, 34, 4)}
                  className="px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-medium transition"
                >
                  Intensive (6d / Sat 4 / 34w)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(4, 0, 4, 0, 4, 0, 12, 2)}
                  className="px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-medium transition"
                >
                  Part-Time (MWF 4 / 12w)
                </button>
              </div>
            </div>

            {/* Horizontal Grid of 6 Day Inputs */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-700">
                  Day-by-Day Period Limits (Mon – Sat)
                </Label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Daily Sum: <strong className="text-indigo-600 font-semibold">{totalDailySum}</strong> periods / week
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {[
                  { id: "mon", label: "Mon", val: periodsMon, setter: setPeriodsMon },
                  { id: "tue", label: "Tue", val: periodsTue, setter: setPeriodsTue },
                  { id: "wed", label: "Wed", val: periodsWed, setter: setPeriodsWed },
                  { id: "thu", label: "Thu", val: periodsThu, setter: setPeriodsThu },
                  { id: "fri", label: "Fri", val: periodsFri, setter: setPeriodsFri },
                  { id: "sat", label: "Sat", val: periodsSat, setter: setPeriodsSat },
                ].map((day) => (
                  <div key={day.id} className="flex flex-col items-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 w-full text-center">
                      {day.label}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={day.val}
                      onChange={(e) => day.setter(parseInt(e.target.value) || 0)}
                      className="h-8 text-center text-xs font-semibold px-1 w-full bg-slate-50/50 focus-visible:bg-white"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Specify maximum teaching sessions permitted on each individual day (0–15). Enter 0 for designated days off.
              </p>
            </div>

            {/* Weekly Periods Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="weeklyPeriods"
                  className={cn(
                    "text-xs font-semibold",
                    isWeeklyExceedingSum ? "text-red-600 font-bold" : "text-slate-700"
                  )}
                >
                  Max Weekly Periods (1 - 60)
                </Label>
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded transition-colors",
                    isWeeklyExceedingSum
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-indigo-50 text-indigo-600"
                  )}
                >
                  {weeklyPeriods} per week
                </span>
              </div>
              <Input
                id="weeklyPeriods"
                type="number"
                min={1}
                max={60}
                value={weeklyPeriods}
                onChange={(e) => setWeeklyPeriods(parseInt(e.target.value) || 0)}
                className={cn(
                  "h-9 text-sm transition-colors",
                  isWeeklyExceedingSum &&
                    "border-red-500 bg-red-50/50 text-red-900 focus-visible:ring-red-500"
                )}
              />
              {isWeeklyExceedingSum ? (
                <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  Weekly limit exceeds total daily capacity ({totalDailySum} periods maximum).
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Total teaching periods allowed across the entire academic week (must be ≤ {totalDailySum}).
                </p>
              )}
            </div>

            {/* Consecutive Periods Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="consecutivePeriods" className="text-xs font-semibold text-slate-700">
                  Max Consecutive Periods (1 - 10)
                </Label>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {consecutivePeriods} back-to-back
                </span>
              </div>
              <Input
                id="consecutivePeriods"
                type="number"
                min={1}
                max={10}
                value={consecutivePeriods}
                onChange={(e) => setConsecutivePeriods(parseInt(e.target.value) || 0)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-slate-400">
                Maximum continuous periods without a free period or break.
              </p>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTeacher(null)}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTeacher}
              disabled={isSaving || !!validationError || isWeeklyExceedingSum}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Capacity Limits
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BATCH / BULK UPDATE MODAL ────────────────────────────────────────── */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Zap className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                School-Wide Batch Configuration
              </span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Set Default Workloads for All Teachers
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Apply uniform day-by-day and weekly capacity limits to all {teachers.length} teaching staff members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                This will update period thresholds for all active teachers across the school.
              </span>
            </div>

            {/* 6 Day inputs for batch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Daily Limits (Mon – Sat)</Label>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { label: "Mon", val: bulkMon, setter: setBulkMon },
                  { label: "Tue", val: bulkTue, setter: setBulkTue },
                  { label: "Wed", val: bulkWed, setter: setBulkWed },
                  { label: "Thu", val: bulkThu, setter: setBulkThu },
                  { label: "Fri", val: bulkFri, setter: setBulkFri },
                  { label: "Sat", val: bulkSat, setter: setBulkSat },
                ].map((d, i) => (
                  <div key={i} className="flex flex-col items-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 w-full text-center">
                      {d.label}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={d.val}
                      onChange={(e) => d.setter(parseInt(e.target.value) || 0)}
                      className="h-8 text-center text-xs font-semibold px-1 w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Weekly Ceiling</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={bulkWeekly}
                  onChange={(e) => setBulkWeekly(parseInt(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Max Consecutive</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={bulkConsecutive}
                  onChange={(e) => setBulkConsecutive(parseInt(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkModalOpen(false)}
              disabled={isBulkSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkApply}
              disabled={isBulkSaving}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              {isBulkSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Applying Batch Limits...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Apply to All Teachers
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
