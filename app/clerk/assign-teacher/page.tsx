"use client";

import { useEffect, useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");

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

  // ── Derived: Combined "Class 5 - A" options ─────────────────────────────────
  const classDivisionOptions = [...divisions]
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

  // ── Derived: Helper for extracting division ID from Subject ─────────────────
  const getSubjectDivisionId = (sub: Subject): string | null => {
    if (!sub || sub.division === null || sub.division === undefined) return null;
    if (typeof sub.division === "object" && sub.division !== null) {
      return (sub.division as { id?: number }).id ? (sub.division as { id?: number }).id!.toString() : null;
    }
    return sub.division.toString();
  };

  // ── Derived: Subjects filtered by selected division ─────────────────────────
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

  const filteredAssignedTeachers = assignedTeachers.filter((item) => {
    const tName = (item.teacher_name || getTeacherLabel(item.teacher)).toLowerCase();
    const sName = (item.subject_name || getSubjectLabel(item.subject)).toLowerCase();
    const dName = (
      item.division_name && item.class_name
        ? `${item.class_name} - ${item.division_name}`
        : getClassDivisionLabel(item.division ?? "")
    ).toLowerCase();
    const query = searchQuery.toLowerCase();
    return tName.includes(query) || sName.includes(query) || dName.includes(query);
  });

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white min-h-screen overflow-x-hidden">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
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
          className="border-slate-200"
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── Form Card (xl:col-span-5) ── */}
        <div className="xl:col-span-5">
          <Card className="w-full shadow-md border-slate-200/80 overflow-hidden rounded-2xl">
            <CardHeader className="pb-4 space-y-1 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xl flex items-center gap-2.5 text-slate-900">
                <UserPlus className="h-5 w-5 text-primary" />
                Assign New Teacher
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs font-medium">
                Define subject leadership and assign teachers to specific class sections.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 px-4 sm:px-6 pb-6">
              <form onSubmit={handleAssignTeacher} className="space-y-4">
                {/* Class & Division */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-11 text-sm shadow-2xs">
                      <SelectValue placeholder="Pick Class & Division">
                        {selectedDivisionId
                          ? getClassDivisionLabel(selectedDivisionId)
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {classDivisionOptions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 italic">
                          No classes found
                        </div>
                      ) : (
                        classDivisionOptions.map((div) => (
                          <SelectItem
                            key={div.id}
                            value={div.id!.toString()}
                            className="rounded-lg my-1 text-sm"
                          >
                            {div.class_name} - {div.division}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedSubjectId}
                    onValueChange={(val) => setSelectedSubjectId(val ?? "")}
                    disabled={isLoading || !selectedDivisionId}
                  >
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-11 text-sm shadow-2xs">
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
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {relevantSubjects.length > 0 ? (
                        relevantSubjects.map((sub) => (
                          <SelectItem
                            key={sub.id}
                            value={sub.id!.toString()}
                            className="rounded-lg my-1 text-sm"
                          >
                            {sub.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-slate-500 italic">
                          {selectedDivisionId
                            ? "No subjects for this division"
                            : "Select Class & Division first"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>

                  {selectedDivisionId && relevantSubjects.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No subjects linked to{" "}
                      <span className="font-semibold">
                        {getClassDivisionLabel(selectedDivisionId)}
                      </span>
                      . Add subjects via Subjects page first.
                    </p>
                  )}
                </div>

                {/* Staff Member (Teacher) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Staff Member (Teacher) <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={(val) => setSelectedTeacherId(val ?? "")}
                    disabled={isLoading || teachers.length === 0}
                  >
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-11 text-sm shadow-2xs">
                      <SelectValue placeholder="Pick Teacher">
                        {selectedTeacherId
                          ? getTeacherLabel(selectedTeacherId)
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {teachers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 italic">
                          No teachers found
                        </div>
                      ) : (
                        teachers.map((t) => (
                          <SelectItem
                            key={t.id}
                            value={t.id.toString()}
                            className="rounded-lg my-1 text-sm"
                          >
                            {t.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Make Class Teacher Checkbox */}
                <div
                  onClick={() => setIsClassTeacher((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer select-none transition-all",
                    isClassTeacher
                      ? "border-primary/40 bg-primary/5"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100",
                  )}
                >
                  <Checkbox
                    id="is_class_teacher"
                    checked={isClassTeacher}
                    onCheckedChange={(checked) => setIsClassTeacher(!!checked)}
                    className="h-4 w-4 border-slate-300 pointer-events-none"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="is_class_teacher"
                      className={cn(
                        "text-xs font-semibold cursor-pointer select-none",
                        isClassTeacher ? "text-primary" : "text-slate-700",
                      )}
                    >
                      Make Class Teacher
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Assigned as the primary class teacher for this division
                    </p>
                  </div>
                  {isClassTeacher && (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-bold shadow-md rounded-xl active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
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
        </div>

        {/* ── Assigned Teachers Directory Table (xl:col-span-7) ── */}
        <div className="xl:col-span-7">
          <Card className="shadow-md border-slate-200/80 overflow-hidden rounded-2xl">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Assigned Teachers Directory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View active teacher class and subject assignments
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {selectedTableIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsBulkDeleteOpen(true)}
                      className="h-9 px-3 text-xs font-medium shrink-0 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete Selected ({selectedTableIds.length})
                    </Button>
                  )}
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assignments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ScrollArea className="h-[460px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 py-20 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary/40" />
                    <p>Loading teacher assignments...</p>
                  </div>
                ) : filteredAssignedTeachers.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100 text-slate-600">
                        <tr>
                          <th className="w-10 px-4 py-3 text-left">
                            <Checkbox
                              checked={isAllTableSelected}
                              onCheckedChange={toggleSelectAllTable}
                            />
                          </th>
                          <th className="px-6 py-3 text-left font-semibold">
                            Teacher
                          </th>
                          <th className="px-6 py-3 text-left font-semibold">
                            Class &amp; Division
                          </th>
                          <th className="px-6 py-3 text-left font-semibold">
                            Subject / Role
                          </th>
                          <th className="px-6 py-3 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAssignedTeachers.map((item, index) => {
                          const isRowSelected = item.id ? selectedTableIds.includes(item.id) : false;
                          const tName = item.teacher_name || getTeacherLabel(item.teacher);
                          const sName = item.subject_name || getSubjectLabel(item.subject);
                          const divLabel =
                            item.class_name && item.division_name
                              ? `${item.class_name} - Div ${item.division_name}`
                              : getClassDivisionLabel(item.division ?? "");

                          return (
                            <tr
                              key={item.id || index}
                              onClick={() => item.id && toggleTableSelect(item.id)}
                              className={cn(
                                "transition-colors cursor-pointer group",
                                isRowSelected
                                  ? "bg-red-50/30 hover:bg-red-50/50"
                                  : "hover:bg-primary/5"
                              )}
                            >
                              <td className="w-10 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isRowSelected}
                                  onCheckedChange={() => item.id && toggleTableSelect(item.id)}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <GraduationCap className="h-4 w-4" />
                                  </div>
                                  <div className="font-semibold text-slate-900 capitalize">
                                    {tName}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-700 border-slate-200 font-medium whitespace-nowrap"
                                >
                                  {divLabel}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                                    {sName}
                                  </span>
                                  {item.is_class_teacher ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[10px] py-0 px-2 font-semibold flex items-center gap-1">
                                      <Sparkles className="h-3 w-3" />
                                      Class Teacher
                                    </Badge>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      Subject Teacher
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(item)}
                                  className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10"
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
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                      <GraduationCap className="h-10 w-10 text-slate-200" />
                    </div>
                    <p className="text-sm text-slate-400 max-w-[220px]">
                      {searchQuery
                        ? "No matching assignments found"
                        : "No teacher assignments created yet"}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

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
                `Delete ${selectedTableIds.length} Assignment(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
