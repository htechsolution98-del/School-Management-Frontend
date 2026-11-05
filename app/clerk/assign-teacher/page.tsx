"use client";

import { useEffect, useState, useMemo } from "react";
import {
  UserPlus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Backpack,
  Search,
  Trash2,
  UserCheck,
  BookOpen,
  GraduationCap,
  Sparkles,
  Filter,
  RotateCcw,
  X,
  Calendar,
  Layers,
  Award,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  getDivisions,
  getSubjects,
  getTeachers,
  assignClass,
  getAssignedTeachers,
  deleteAssignedTeacher,
} from "@/lib/clerk";
import type {
  AssignClassPayload,
  AssignedTeacher,
  Division,
  Subject,
  Teacher,
} from "@/types/clerk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssignTeacherPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<AssignedTeacher[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssignedTeacher | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Table selection state
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Form State
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  // Directory Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassDivision, setFilterClassDivision] = useState<string>("ALL");
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [filterTeacher, setFilterTeacher] = useState<string>("ALL");
  const [filterRole, setFilterRole] = useState<"ALL" | "CLASS_TEACHER" | "SUBJECT_TEACHER">("ALL");

  // ── Fetch all data on mount ─────────────────────────────────────────────────

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [divisionsData, subjectsData, teachersData, assignedData] =
        await Promise.all([
          getDivisions(),
          getSubjects(),
          getTeachers(),
          getAssignedTeachers(),
        ]);
      setDivisions(divisionsData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
      setAssignedTeachers(assignedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast.error("Could not load required data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Derived: Combined "Class 5 - A" options for form ─────────────────────────
  const classDivisionOptions = useMemo(() => {
    return [...divisions]
      .filter((d) => d.class_name && d.division)
      .sort((a, b) => {
        const classCompare = (a.class_name ?? "").localeCompare(
          b.class_name ?? "",
          undefined,
          { numeric: true },
        );
        if (classCompare !== 0) return classCompare;
        return a.division.localeCompare(b.division);
      });
  }, [divisions]);

  // ── Derived: Helper for extracting division ID from Subject ─────────────────
  const getSubjectDivisionId = (sub: Subject): string | null => {
    if (!sub || sub.division === null || sub.division === undefined) return null;
    if (typeof sub.division === "object" && sub.division !== null) {
      return (sub.division as { id?: number }).id ? (sub.division as { id?: number }).id!.toString() : null;
    }
    return sub.division.toString();
  };

  // ── Derived: Subjects filtered by selected division in form ──────────────────
  const relevantSubjects = subjects.filter(
    (s) => getSubjectDivisionId(s) === selectedDivisionId
  );

  // ── Label helpers ───────────────────────────────────────────────────────────

  const getClassDivisionLabel = (divId: string | number) => {
    const div = divisions.find((d) => d.id?.toString() === divId.toString());
    if (!div) return `Division #${divId}`;
    return `${div.class_name} - ${div.division}`;
  };

  const getSubjectLabel = (subId: string | number) =>
    subjects.find((s) => s.id?.toString() === subId.toString())?.name ?? `Subject #${subId}`;

  const getTeacherLabel = (teachId: string | number) =>
    teachers.find((t) => t.id.toString() === teachId.toString())?.name ?? `Teacher #${teachId}`;

  // ── Capitalization & Presentation Helpers ────────────────────────────────────

  const formatClassName = (name?: string) => {
    if (!name) return "Class N/A";
    const clean = name.trim();
    if (clean.toLowerCase().startsWith("class")) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return `Class ${clean.charAt(0).toUpperCase() + clean.slice(1)}`;
  };

  const formatDivisionName = (div?: string) => {
    if (!div) return "";
    return div.trim().toUpperCase();
  };

  const formatSubjectName = (sub?: string) => {
    if (!sub) return "Subject N/A";
    return sub.charAt(0).toUpperCase() + sub.slice(1);
  };

  // Distinct avatar background color based on teacher id or name
  const getTeacherColor = (idOrName: string | number) => {
    const colors = [
      "bg-blue-600 text-white",
      "bg-indigo-600 text-white",
      "bg-violet-600 text-white",
      "bg-emerald-600 text-white",
      "bg-amber-600 text-white",
      "bg-rose-600 text-white",
      "bg-teal-600 text-white",
      "bg-cyan-600 text-white",
    ];
    let num = 0;
    if (typeof idOrName === "number") {
      num = idOrName;
    } else {
      const s = String(idOrName || "");
      for (let i = 0; i < s.length; i++) {
        num = (num * 31 + s.charCodeAt(i)) >>> 0;
      }
    }
    return colors[num % colors.length];
  };

  // ── Derived Options for Filters ─────────────────────────────────────────────

  const uniqueClassDivisionFilterOptions = useMemo(() => {
    const map = new Map<string, string>();

    // First, populate all school classes and divisions so all classes show in the filter
    [...divisions]
      .filter((d) => d && d.id)
      .sort((a, b) => {
        const classCompare = (a.class_name ?? "").localeCompare(
          b.class_name ?? "",
          undefined,
          { numeric: true },
        );
        if (classCompare !== 0) return classCompare;
        return (a.division ?? "").localeCompare(b.division ?? "");
      })
      .forEach((d) => {
        const key = String(d.id);
        const cName = formatClassName(d.class_name);
        const dName = formatDivisionName(d.division);
        const label =
          d.class_name && d.division
            ? `${cName} - Div ${dName}`
            : (d.class_name ? cName : `Division #${d.id}`);
        map.set(key, label);
      });

    // Also include any assigned teacher divisions if not already covered
    assignedTeachers.forEach((item) => {
      const key = item.division ? String(item.division) : "";
      if (key && !map.has(key)) {
        const cName = formatClassName(item.class_name);
        const dName = formatDivisionName(item.division_name);
        const label =
          item.class_name && item.division_name
            ? `${cName} - Div ${dName}`
            : getClassDivisionLabel(item.division ?? "");
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [assignedTeachers, divisions]);

  const uniqueSubjectFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    assignedTeachers.forEach((item) => {
      const key = item.subject ? String(item.subject) : "";
      if (key && !map.has(key)) {
        const label = formatSubjectName(item.subject_name || getSubjectLabel(item.subject));
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [assignedTeachers, subjects]);

  const uniqueTeacherFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    assignedTeachers.forEach((item) => {
      const key = item.teacher ? String(item.teacher) : "";
      if (key && !map.has(key)) {
        const label = item.teacher_name || getTeacherLabel(item.teacher);
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [assignedTeachers, teachers]);

  // Summary Metrics
  const totalAssignmentsCount = assignedTeachers.length;
  const classTeachersCount = useMemo(() => assignedTeachers.filter((a) => a.is_class_teacher).length, [assignedTeachers]);
  const subjectTeachersCount = totalAssignmentsCount - classTeachersCount;
  const uniqueTeachersCount = uniqueTeacherFilterOptions.length;

  const isFilterActive =
    searchQuery.trim() !== "" ||
    filterClassDivision !== "ALL" ||
    filterSubject !== "ALL" ||
    filterTeacher !== "ALL" ||
    filterRole !== "ALL";

  const resetAllFilters = () => {
    setSearchQuery("");
    setFilterClassDivision("ALL");
    setFilterSubject("ALL");
    setFilterTeacher("ALL");
    setFilterRole("ALL");
  };

  // ── Filtered List ───────────────────────────────────────────────────────────

  const filteredAssignedTeachers = useMemo(() => {
    return assignedTeachers.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const tName = (item.teacher_name || getTeacherLabel(item.teacher)).toLowerCase();
        const sName = (item.subject_name || getSubjectLabel(item.subject)).toLowerCase();
        const cName = (item.class_name || "").toLowerCase();
        const dName = (item.division_name || "").toLowerCase();
        const fullDiv = `${cName} ${dName}`;
        if (!tName.includes(q) && !sName.includes(q) && !cName.includes(q) && !dName.includes(q) && !fullDiv.includes(q)) {
          return false;
        }
      }

      // 2. Class & Division Filter
      if (filterClassDivision !== "ALL") {
        if (String(item.division) !== filterClassDivision) return false;
      }

      // 3. Subject Filter
      if (filterSubject !== "ALL") {
        if (String(item.subject) !== filterSubject) return false;
      }

      // 4. Teacher Filter
      if (filterTeacher !== "ALL") {
        if (String(item.teacher) !== filterTeacher) return false;
      }

      // 5. Role Filter
      if (filterRole === "CLASS_TEACHER" && !item.is_class_teacher) return false;
      if (filterRole === "SUBJECT_TEACHER" && item.is_class_teacher) return false;

      return true;
    });
  }, [
    assignedTeachers,
    searchQuery,
    filterClassDivision,
    filterSubject,
    filterTeacher,
    filterRole,
    divisions,
    subjects,
    teachers,
  ]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDivisionId || !selectedSubjectId || !selectedTeacherId) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const payload: AssignClassPayload = {
        is_class_teacher: isClassTeacher,
        teacher: parseInt(selectedTeacherId),
        subject: parseInt(selectedSubjectId),
        division: parseInt(selectedDivisionId),
      };

      await assignClass(payload);
      toast.success("Teacher assigned successfully");

      // Partial reset
      setSelectedTeacherId("");
      setIsClassTeacher(false);

      // Refresh list
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign teacher",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      await deleteAssignedTeacher(deleteTarget.id);
      toast.success("Teacher assignment removed");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove assignment",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Table Selection & Bulk Delete ───────────────────────────────────────────

  const toggleTableSelect = (id: number) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const visibleTableIds = filteredAssignedTeachers.map((item) => item.id!).filter(Boolean);
  const isAllTableSelected =
    visibleTableIds.length > 0 &&
    visibleTableIds.every((id) => selectedTableIds.includes(id));

  const toggleSelectAllTable = () => {
    if (isAllTableSelected) {
      setSelectedTableIds((prev) =>
        prev.filter((id) => !visibleTableIds.includes(id))
      );
    } else {
      setSelectedTableIds((prev) =>
        Array.from(new Set([...prev, ...visibleTableIds]))
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTableIds.length === 0) return;

    setIsDeleting(true);
    try {
      await Promise.allSettled(
        selectedTableIds.map((id) => deleteAssignedTeacher(id))
      );
      toast.success(
        `Successfully deleted ${selectedTableIds.length} assignment(s)`
      );
      setSelectedTableIds([]);
      setIsBulkDeleteOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete selected assignments"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Format Date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Active";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Active";
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Active";
    }
  };

  // Selected Form Preview helpers
  const formSelectedDivLabel = selectedDivisionId ? getClassDivisionLabel(selectedDivisionId) : "";
  const formSelectedSubLabel = selectedSubjectId ? getSubjectLabel(selectedSubjectId) : "";
  const formSelectedTeacherLabel = selectedTeacherId ? getTeacherLabel(selectedTeacherId) : "";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-6 overflow-x-hidden p-1 sm:p-2">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
            <Backpack className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              Teacher Assignments
            </h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              Manage academic workloads by mapping teachers to divisions and subjects.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={isLoading}
          className="border-slate-200 cursor-pointer shadow-xs hover:bg-slate-50 font-semibold text-slate-700"
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          Refresh Data
        </Button>
      </div>

      <Separator className="bg-slate-100" />

      {/* ── Error Alert ── */}
      {error && (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 text-red-800"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Fetch Error</AlertTitle>
          <AlertDescription className="text-sm opacity-90">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Top: Assign New Teacher Card (Full-Width) ── */}
      <Card className="w-full shadow-md border-slate-200/80 overflow-hidden rounded-2xl bg-white">
        <CardHeader className="pb-3 pt-4 px-5 sm:px-6 bg-slate-50/70 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900 font-bold">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Assign New Teacher
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs font-medium mt-0.5">
                Map faculty to class sections and academic subjects
              </CardDescription>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-lg shadow-2xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Select class, subject &amp; teacher to assign</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 px-5 sm:px-6 pb-5">
          <form onSubmit={handleAssignTeacher} className="space-y-4">
            {/* 3 Main Dropdown Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Class & Division */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Class &amp; Division <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedDivisionId}
                  onValueChange={async (val) => {
                    const selId = val ?? "";
                    setSelectedDivisionId(selId);
                    setSelectedSubjectId("");
                    setSelectedTeacherId("");
                    if (selId) {
                      try {
                        const freshSubjects = await getSubjects();
                        setSubjects(freshSubjects);
                      } catch {}
                    }
                  }}
                  disabled={isLoading || classDivisionOptions.length === 0}
                >
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-10 text-xs sm:text-sm shadow-2xs font-medium">
                    <SelectValue placeholder="Pick Class & Division">
                      {selectedDivisionId
                        ? getClassDivisionLabel(selectedDivisionId)
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-60">
                    {classDivisionOptions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        No classes found
                      </div>
                    ) : (
                      classDivisionOptions.map((div) => (
                        <SelectItem
                          key={div.id}
                          value={div.id!.toString()}
                          className="rounded-lg my-0.5 text-xs sm:text-sm font-medium"
                        >
                          {div.class_name} - {div.division}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Subject <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={(val) => setSelectedSubjectId(val ?? "")}
                  disabled={isLoading || !selectedDivisionId}
                >
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-10 text-xs sm:text-sm shadow-2xs font-medium">
                    <SelectValue
                      placeholder={
                        selectedDivisionId
                          ? "Pick Subject"
                          : "Select Class first"
                      }
                    >
                      {selectedSubjectId
                        ? getSubjectLabel(selectedSubjectId)
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-60">
                    {relevantSubjects.length > 0 ? (
                      relevantSubjects.map((sub) => (
                        <SelectItem
                          key={sub.id}
                          value={sub.id!.toString()}
                          className="rounded-lg my-0.5 text-xs sm:text-sm font-medium"
                        >
                          {sub.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        {selectedDivisionId
                          ? "No subjects for this division"
                          : "Select Class & Division first"}
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {selectedDivisionId && relevantSubjects.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No subjects linked to{" "}
                    <span className="font-semibold">
                      {getClassDivisionLabel(selectedDivisionId)}
                    </span>
                    .
                  </p>
                )}
              </div>

              {/* Staff Member (Teacher) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Staff Member (Teacher) <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedTeacherId}
                  onValueChange={(val) => setSelectedTeacherId(val ?? "")}
                  disabled={isLoading || teachers.length === 0}
                >
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-10 text-xs sm:text-sm shadow-2xs font-medium">
                    <SelectValue placeholder="Pick Teacher">
                      {selectedTeacherId
                        ? getTeacherLabel(selectedTeacherId)
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-60">
                    {teachers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        No teachers found
                      </div>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id.toString()}
                          className="rounded-lg my-0.5 text-xs sm:text-sm font-medium"
                        >
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bottom Controls Row: Checkbox, Preview & Submit Button */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                {/* Make Class Teacher Checkbox Toggle */}
                <div
                  onClick={() => setIsClassTeacher((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2 rounded-xl border cursor-pointer select-none transition-all",
                    isClassTeacher
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  <Checkbox
                    id="is_class_teacher"
                    checked={isClassTeacher}
                    onCheckedChange={(checked) => setIsClassTeacher(!!checked)}
                    className="h-4 w-4 border-slate-300 pointer-events-none"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="is_class_teacher"
                      className="text-xs font-bold cursor-pointer select-none"
                    >
                      Make Class Teacher
                    </label>
                    {isClassTeacher && (
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded-md">
                        Primary In-Charge ⭐
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Assignment Summary Preview */}
                {(formSelectedTeacherLabel || formSelectedDivLabel || formSelectedSubLabel) && (
                  <div className="px-3.5 py-2 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-slate-700 flex items-center gap-2 animate-in fade-in duration-200 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                      Preview:
                    </span>
                    <span className="font-medium">
                      Assigning <strong className="text-blue-900 font-bold">{formSelectedTeacherLabel || "Teacher"}</strong> to{" "}
                      <strong className="text-slate-900 font-bold">{formSelectedDivLabel || "Class Section"}</strong> for{" "}
                      <strong className="text-slate-900 font-bold">{formSelectedSubLabel || "Subject"}</strong>
                      {isClassTeacher && (
                        <span className="ml-1 text-emerald-700 font-bold">
                          as Class Teacher ⭐
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full lg:w-auto min-w-[200px] h-10 px-6 text-sm font-bold shadow-md rounded-xl active:scale-[0.98] transition-all bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shrink-0"
                disabled={
                  isSaving ||
                  !selectedDivisionId ||
                  !selectedSubjectId ||
                  !selectedTeacherId
                }
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finalize Assignment
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Bottom: Assigned Teachers Directory (Full-Width) ── */}
      <Card className="w-full shadow-md border-slate-200/80 overflow-hidden rounded-2xl bg-white">
        {/* Header with Title and Search/Bulk Action */}
        <CardHeader className="pb-3 px-5 sm:px-6 pt-5 bg-white border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900 font-bold">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Assigned Teachers Directory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                View, filter and manage active faculty class mappings
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedTableIds.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="h-9 px-3 text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete Selected ({selectedTableIds.length})
                </Button>
              )}
              {isFilterActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAllFilters}
                  className="h-9 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200 cursor-pointer shadow-xs"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stat Counter Pills & Counts */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterRole("ALL")}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                  filterRole === "ALL"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All ({totalAssignmentsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterRole("CLASS_TEACHER")}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                  filterRole === "CLASS_TEACHER"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Class Teachers ({classTeachersCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterRole("SUBJECT_TEACHER")}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                  filterRole === "SUBJECT_TEACHER"
                    ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                <span>Subject Teachers ({subjectTeachersCount})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
              <span>Teachers: <strong className="text-slate-800 font-bold">{uniqueTeachersCount}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Sections: <strong className="text-slate-800 font-bold">{uniqueClassDivisionFilterOptions.length}</strong></span>
            </div>
          </div>

          {/* Comprehensive Filter Bar (Grid of 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search teacher, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 h-9 text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Class & Division Filter */}
            <div>
              <select
                value={filterClassDivision}
                onChange={(e) => setFilterClassDivision(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer shadow-2xs"
                title="Filter by Class & Division"
              >
                <option value="ALL">All Classes &amp; Divs</option>
                {uniqueClassDivisionFilterOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer shadow-2xs"
                title="Filter by Subject"
              >
                <option value="ALL">All Subjects</option>
                {uniqueSubjectFilterOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Filter */}
            <div>
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer shadow-2xs"
                title="Filter by Teacher"
              >
                <option value="ALL">All Teachers</option>
                {uniqueTeacherFilterOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result Count Status */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-medium">
            <span>
              Showing <strong className="text-slate-800 font-bold">{filteredAssignedTeachers.length}</strong> of{" "}
              <strong className="text-slate-800 font-bold">{assignedTeachers.length}</strong> records
            </span>
            {isFilterActive && (
              <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Active Filters
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <ScrollArea className="h-[520px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 py-20 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500" />
                <p className="text-sm font-medium">Loading teacher assignments...</p>
              </div>
            ) : filteredAssignedTeachers.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold">
                    <tr>
                      <th className="w-10 px-4 py-3.5 text-center">
                        <Checkbox
                          checked={isAllTableSelected}
                          onCheckedChange={toggleSelectAllTable}
                          title="Select all"
                        />
                      </th>
                      <th className="px-5 py-3.5 min-w-[200px]">
                        Teacher Info
                      </th>
                      <th className="px-5 py-3.5 min-w-[150px]">
                        Class &amp; Division
                      </th>
                      <th className="px-5 py-3.5 min-w-[140px]">
                        Subject
                      </th>
                      <th className="px-5 py-3.5 min-w-[170px]">
                        Role / Leadership
                      </th>
                      <th className="px-5 py-3.5 min-w-[130px]">
                        Assigned On
                      </th>
                      <th className="px-4 py-3.5 text-center min-w-[80px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssignedTeachers.map((item, index) => {
                      const isRowSelected = item.id ? selectedTableIds.includes(item.id) : false;
                      const tName = item.teacher_name || getTeacherLabel(item.teacher);
                      const sName = formatSubjectName(item.subject_name || getSubjectLabel(item.subject));
                      const className = formatClassName(item.class_name);
                      const divName = formatDivisionName(item.division_name);
                      const assignedDate = formatDate(item.created_at);
                      const avatarColor = getTeacherColor(item.teacher || tName);

                      return (
                        <tr
                          key={item.id || index}
                          onClick={() => item.id && toggleTableSelect(item.id)}
                          className={cn(
                            "transition-colors cursor-pointer group text-xs sm:text-sm",
                            isRowSelected
                              ? "bg-blue-50/70 hover:bg-blue-50/90"
                              : "hover:bg-slate-50/80"
                          )}
                        >
                          {/* Checkbox */}
                          <td className="w-10 px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isRowSelected}
                              onCheckedChange={() => item.id && toggleTableSelect(item.id)}
                            />
                          </td>

                          {/* Teacher Info */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs", avatarColor)}>
                                {tName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 capitalize text-sm">
                                  {tName}
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium">
                                  Staff ID #{item.teacher}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Class & Division */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs px-2.5 py-0.5"
                              >
                                {className}
                              </Badge>
                              {divName && (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-xs px-2 py-0.5"
                                >
                                  Div {divName}
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Subject */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
                              <span>{sName}</span>
                            </div>
                          </td>

                          {/* Role / Leadership */}
                          <td className="px-5 py-3.5">
                            {item.is_class_teacher ? (
                              <div className="flex flex-col items-start gap-0.5">
                                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs py-0.5 px-2.5 font-bold flex items-center gap-1 shadow-2xs">
                                  <Sparkles className="h-3 w-3 text-emerald-600" />
                                  Class Teacher
                                </Badge>
                                <span className="text-[10px] text-emerald-600 font-semibold pl-1">
                                  Primary In-Charge
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs font-semibold py-0.5 px-2.5">
                                Subject Faculty
                              </Badge>
                            )}
                          </td>

                          {/* Assigned Date */}
                          <td className="px-5 py-3.5 text-slate-500 text-xs font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>{assignedDate}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(item)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title="Remove assignment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="bg-slate-50 p-4 rounded-full mb-3 border border-slate-100">
                  <GraduationCap className="h-10 w-10 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {isFilterActive
                    ? "No assignments match your filters"
                    : "No teacher assignments created yet"}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
                  {isFilterActive
                    ? "Try resetting the filters or searching with a different term."
                    : "Use the form above to assign teachers to class divisions and subjects."}
                </p>
                {isFilterActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAllFilters}
                    className="mt-4 text-xs font-semibold border-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" /> Reset Filters
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Single Delete Confirmation Dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove Teacher Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the assignment for{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget ? deleteTarget.teacher_name || getTeacherLabel(deleteTarget.teacher) : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Confirmation Dialog ── */}
      <Dialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
      >
        <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Selected Assignments</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-900">
                {selectedTableIds.length} teacher assignment(s)
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedTableIds.length} Assignments`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
