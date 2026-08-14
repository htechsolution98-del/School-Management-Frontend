"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
  BookMarked,
  CheckSquare,
  Square,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import {
  getClasses,
  getDivisions,
  getSubjects,
  saveSubject,
  deleteSubject,
} from "@/lib/clerk";
import type { Division, SchoolClass, Subject } from "@/types/clerk";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SCHOOL_CLASS_OPTIONS } from "@/lib/form-builder-config";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Table selection state
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Form State
  const [subjectName, setSubjectName] = useState("");
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesData, divisionsData, subjectsData] = await Promise.all([
        getClasses(),
        getDivisions(),
        getSubjects(),
      ]);

      setSchoolClasses(classesData);
      setDivisions(divisionsData);

      const sortedSubjects = [...subjectsData].sort((a, b) => {
        const divA = divisionsData.find((d) => d.id === a.division);
        const divB = divisionsData.find((d) => d.id === b.division);

        const classA = classesData.find(
          (c) => c.id === divA?.SchoolClass
        );

        const classB = classesData.find(
          (c) => c.id === divB?.SchoolClass
        );

        // Sort by class order
        const classIndexA = classA
          ? SCHOOL_CLASS_OPTIONS.findIndex(
            (opt) => opt.value === classA.school_class
          )
          : 999;

        const classIndexB = classB
          ? SCHOOL_CLASS_OPTIONS.findIndex(
            (opt) => opt.value === classB.school_class
          )
          : 999;

        if (classIndexA !== classIndexB) {
          return classIndexA - classIndexB;
        }

        // Sort by division
        const divisionCompare = (divA?.division || "").localeCompare(
          divB?.division || "",
          undefined,
          { numeric: true }
        );

        if (divisionCompare !== 0) {
          return divisionCompare;
        }

        // Sort by subject name
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
        });
      });

      setSubjects(sortedSubjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast.error("Could not load subjects, divisions or classes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleDivision = (id: number) => {
    setSelectedDivisionIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const selectAllDivisions = () => {
    const visibleDivs = classFilter === "all"
      ? divisions
      : divisions.filter((div) => div.SchoolClass?.toString() === classFilter);
    
    const visibleIds = visibleDivs.map((d) => d.id!).filter(Boolean);
    setSelectedDivisionIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearAllDivisions = () => {
    setSelectedDivisionIds([]);
  };

  const toggleClassDivisions = (classId: number) => {
    const classDivIds = divisions
      .filter((d) => d.SchoolClass === classId)
      .map((d) => d.id!)
      .filter(Boolean);

    const allSelected = classDivIds.every((id) => selectedDivisionIds.includes(id));

    if (allSelected) {
      setSelectedDivisionIds((prev) => prev.filter((id) => !classDivIds.includes(id)));
    } else {
      setSelectedDivisionIds((prev) => Array.from(new Set([...prev, ...classDivIds])));
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectName.trim()) {
      toast.error("Please enter a subject name");
      return;
    }

    if (selectedDivisionIds.length === 0) {
      toast.error("Please select at least one division");
      return;
    }

    const normalizedSubject = subjectName.trim().toLowerCase();
    const toCreateIds: number[] = [];
    const skippedLabels: string[] = [];

    for (const divId of selectedDivisionIds) {
      const alreadyExists = subjects.some(
        (s) =>
          s.division === divId &&
          s.name.trim().toLowerCase() === normalizedSubject
      );

      if (alreadyExists) {
        skippedLabels.push(getDivisionLabel(divId));
      } else {
        toCreateIds.push(divId);
      }
    }

    if (toCreateIds.length === 0) {
      toast.error("This subject is already created for all selected divisions");
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        toCreateIds.map((divId) =>
          saveSubject({
            name: subjectName.trim(),
            division: divId,
          })
        )
      );

      if (skippedLabels.length > 0) {
        toast.success(
          `Created subject '${subjectName.trim()}' for ${toCreateIds.length} division(s). (${skippedLabels.length} division(s) already existed)`
        );
      } else {
        toast.success(
          `Subject '${subjectName.trim()}' created successfully for ${toCreateIds.length} division(s)!`
        );
      }

      setSubjectName("");
      setSelectedDivisionIds([]);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create subject",
      );
    } finally {
      setIsSaving(false);
    }
  };


  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      await deleteSubject(deleteTarget.id);
      toast.success("Subject deleted successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete subject";
      if (msg.toLowerCase().includes("no subject matches") || msg.toLowerCase().includes("not found")) {
        toast.info("Subject was already deleted");
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleteTarget(null);
      await fetchData();
      setIsDeleting(false);
    }
  };

  const getDivisionLabel = (divisionId: number | null) => {
    if (divisionId === null) return "Unknown Division";
    const div = divisions.find((d) => d.id === divisionId);
    if (!div) return `Division #${divisionId}`;

    const cls = schoolClasses.find((c) => c.id === div.SchoolClass);
    const classLabel = cls
      ? SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
      cls.school_class
      : "Unknown Class";

    return `${classLabel} - Div ${div.division}`;
  };

  const filteredSubjects = subjects.filter((s) => {
    const name = s.name.toLowerCase();
    const divLabel = getDivisionLabel(s.division).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || divLabel.includes(query);
  });

  const toggleTableSelect = (id: number) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const visibleTableIds = filteredSubjects.map((s) => s.id!).filter(Boolean);
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
        selectedTableIds.map((id) => deleteSubject(id))
      );
      toast.success(
        `Successfully deleted ${selectedTableIds.length} subject(s)`
      );
      setSelectedTableIds([]);
      setIsBulkDeleteOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete selected subjects"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Group divisions by class for the select dropdown
  const sortedDivisionsForSelect = [...divisions].sort((a, b) => {
    const classA = schoolClasses.find((c) => c.id === a.SchoolClass);
    const classB = schoolClasses.find((c) => c.id === b.SchoolClass);
    const indexA = classA
      ? SCHOOL_CLASS_OPTIONS.findIndex(
        (opt) => opt.value === classA.school_class,
      )
      : 999;
    const indexB = classB
      ? SCHOOL_CLASS_OPTIONS.findIndex(
        (opt) => opt.value === classB.school_class,
      )
      : 999;
    if (indexA !== indexB) return indexA - indexB;
    return a.division.localeCompare(b.division, undefined, { numeric: true });
  });

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white min-h-screen overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            Subject Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Assign and manage subjects for each class division.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <Separator />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Creation Form */}
        <div className="xl:col-span-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add New Subject
              </CardTitle>
              <CardDescription>
                Create and link a subject to single or multiple divisions at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Mathematics, English, Science..."
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                {/* Class / Division Multi Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-slate-500" />
                      Select Divisions <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllDivisions}
                        className="text-primary hover:underline font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllDivisions}
                        className="text-slate-500 hover:text-slate-800 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Filter by class */}
                  <Select
                    value={classFilter}
                    onValueChange={(val) => setClassFilter(val || "all")}
                  >
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs h-8">
                      <SelectValue placeholder="Filter by Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {schoolClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label || cls.school_class}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Class Quick Selection Badges */}
                  {schoolClasses.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 pb-1">
                      {schoolClasses.map((cls) => {
                        const classDivs = divisions.filter((d) => d.SchoolClass === cls.id);
                        if (classDivs.length === 0) return null;
                        const classDivIds = classDivs.map((d) => d.id!).filter(Boolean);
                        const isFullySelected = classDivIds.every((id) => selectedDivisionIds.includes(id));
                        const isPartiallySelected = classDivIds.some((id) => selectedDivisionIds.includes(id));
                        const label = SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label || cls.school_class;

                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleClassDivisions(cls.id)}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-md border transition-all font-medium flex items-center gap-1",
                              isFullySelected
                                ? "bg-primary text-white border-primary"
                                : isPartiallySelected
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            )}
                          >
                            {isFullySelected ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Division Checkbox List */}
                  <ScrollArea className="h-48 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                    {sortedDivisionsForSelect.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3 text-center">
                        No divisions found. Create divisions first.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {sortedDivisionsForSelect
                          .filter((div) => classFilter === "all" || div.SchoolClass?.toString() === classFilter)
                          .map((div) => {
                            const isSelected = selectedDivisionIds.includes(div.id!);
                            return (
                              <div
                                key={div.id}
                                onClick={() => toggleDivision(div.id!)}
                                className={cn(
                                  "flex items-center space-x-2 p-2 rounded-md border text-xs cursor-pointer transition-all select-none",
                                  isSelected
                                    ? "bg-white border-primary/40 shadow-2xs font-medium text-slate-900"
                                    : "bg-white/50 border-slate-200/60 text-slate-600 hover:bg-white hover:border-slate-300"
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleDivision(div.id!)}
                                />
                                <span className="flex-1">{getDivisionLabel(div.id!)}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </ScrollArea>

                  {selectedDivisionIds.length > 0 && (
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {selectedDivisionIds.length} division{selectedDivisionIds.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={
                    isSaving || !subjectName.trim() || selectedDivisionIds.length === 0
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Create Subject ${selectedDivisionIds.length > 0 ? `(${selectedDivisionIds.length} Divisions)` : ""}`
                  )}
                </Button>
              </form>
            </CardContent>

          </Card>
        </div>

        {/* Subjects List */}
        <div className="xl:col-span-8">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Existing Subjects</CardTitle>
                  <CardDescription>
                    All subjects assigned to divisions
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
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search subjects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 py-20 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary/40" />
                    <p>Loading subjects...</p>
                  </div>
                ) : filteredSubjects.length > 0 ? (
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
                            Subject
                          </th>
                          <th className="px-6 py-3 text-left font-semibold">
                            Class & Division
                          </th>
                          <th className="px-6 py-3 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSubjects.map((subject, index) => {
                          const isRowSelected = subject.id ? selectedTableIds.includes(subject.id) : false;
                          return (
                            <tr
                              key={subject.id || index}
                              onClick={() => subject.id && toggleTableSelect(subject.id)}
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
                                  onCheckedChange={() => subject.id && toggleTableSelect(subject.id)}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <BookMarked className="h-4 w-4" />
                                  </div>
                                  <div className="font-semibold text-slate-900 capitalize">
                                    {subject.name}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-600 border-slate-200"
                                >
                                  {getDivisionLabel(subject.division)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(subject)}
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
                      <BookOpen className="h-10 w-10 text-slate-200" />
                    </div>
                    <p className="text-sm text-slate-400 max-w-[200px]">
                      {searchQuery
                        ? "No subjects match your search"
                        : "No subjects created yet"}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Single Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the subject{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4 flex flex-col sm:flex-row">
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
                  Deleting...
                </>
              ) : (
                "Delete Subject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
      >
        <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Selected Subjects</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {selectedTableIds.length} subject(s)
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4 flex flex-col sm:flex-row">
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
                `Delete ${selectedTableIds.length} Subject(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
