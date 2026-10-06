"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
  BookMarked,
  Layers,
  CheckCircle2,
  X,
  GraduationCap,
  LayoutGrid,
  List,
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

interface GroupedSubjectItem {
  name: string;
  classId: number;
  className: string;
  divisions: {
    divisionId: number;
    divisionName: string;
    subjectId: number;
  }[];
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleteGroupedTarget, setDeleteGroupedTarget] = useState<GroupedSubjectItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Cascading Form State (Class -> Divisions)
  const [subjectName, setSubjectName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);

  // 2. Existing Subjects Panel State
  const [tableClassFilter, setTableClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesRes, divisionsRes, subjectsRes] = await Promise.allSettled([
        getClasses(),
        getDivisions(),
        getSubjects(),
      ]);

      const classesData: SchoolClass[] =
        classesRes.status === "fulfilled" && Array.isArray(classesRes.value)
          ? classesRes.value
          : [];

      const divisionsData: Division[] =
        divisionsRes.status === "fulfilled" && Array.isArray(divisionsRes.value)
          ? divisionsRes.value
          : [];

      const subjectsData: Subject[] =
        subjectsRes.status === "fulfilled" && Array.isArray(subjectsRes.value)
          ? subjectsRes.value
          : [];

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
        return (a.name || "").localeCompare(b.name || "", undefined, {
          numeric: true,
        });
      });

      setSubjects(sortedSubjects);
    } catch (err) {
      console.error("fetchData error:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast.error("Could not load subjects, divisions or classes");
    } finally {
      setIsLoading(false);
    }
  };

  const getClassNameById = (id: string | number | null | undefined): string => {
    if (!id || id === "all") return "";
    const cls = schoolClasses.find((c) => String(c.id) === String(id));
    if (!cls) return "";
    return (
      SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
      cls.school_class ||
      String(cls.id)
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sorted list of all divisions
  const sortedDivisionsForSelect = useMemo(() => {
    return [...divisions].sort((a, b) => {
      const classA = schoolClasses.find((c) => c.id === a.SchoolClass);
      const classB = schoolClasses.find((c) => c.id === b.SchoolClass);
      const indexA = classA
        ? SCHOOL_CLASS_OPTIONS.findIndex((opt) => opt.value === classA.school_class)
        : 999;
      const indexB = classB
        ? SCHOOL_CLASS_OPTIONS.findIndex((opt) => opt.value === classB.school_class)
        : 999;
      if (indexA !== indexB) return indexA - indexB;
      return a.division.localeCompare(b.division, undefined, { numeric: true });
    });
  }, [divisions, schoolClasses]);

  // Selected Class info
  const selectedClass = useMemo(
    () => schoolClasses.find((c) => c.id.toString() === selectedClassId),
    [schoolClasses, selectedClassId]
  );

  const selectedClassName = useMemo(() => {
    if (!selectedClass) return "";
    return (
      SCHOOL_CLASS_OPTIONS.find((o) => o.value === selectedClass.school_class)?.label ||
      selectedClass.school_class
    );
  }, [selectedClass]);

  // Requirement 1: When a Class is chosen, clear previously selected divisions
  const handleClassChange = (classId: string | null) => {
    setSelectedClassId(classId || "");
    setSelectedDivisionIds([]);
  };

  // Requirement 1: Filter divisions to ONLY display divisions belonging to that specific class
  const classDivisions = useMemo(() => {
    if (!selectedClassId) return [];
    return sortedDivisionsForSelect.filter(
      (d) => d.SchoolClass?.toString() === selectedClassId
    );
  }, [sortedDivisionsForSelect, selectedClassId]);

  const classDivisionIds = useMemo(() => {
    return classDivisions.map((d) => d.id!).filter(Boolean);
  }, [classDivisions]);

  const isAllClassDivisionsSelected =
    classDivisions.length > 0 &&
    classDivisionIds.every((id) => selectedDivisionIds.includes(id));

  // Requirement 1: One-click select all divisions in the selected class
  const selectAllClassDivisions = () => {
    setSelectedDivisionIds(classDivisionIds);
  };

  const clearAllDivisions = () => {
    setSelectedDivisionIds([]);
  };

  const toggleSelectAllClassDivisions = () => {
    if (isAllClassDivisionsSelected) {
      setSelectedDivisionIds([]);
    } else {
      setSelectedDivisionIds(classDivisionIds);
    }
  };

  const toggleDivision = (id: number) => {
    setSelectedDivisionIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const getDivisionSelectTriggerLabel = () => {
    if (selectedDivisionIds.length === 0) {
      return "Select divisions...";
    }
    return `${selectedDivisionIds.length} selected`;
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

    const divSuffix = div.division?.toLowerCase().includes("div")
      ? div.division
      : `Div ${div.division}`;

    return `${classLabel} - ${divSuffix}`;
  };

  // Requirement 2: Ensure creation payload includes selected school_class ID and division IDs
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectName.trim()) {
      toast.error("Please enter a subject name");
      return;
    }

    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    if (selectedDivisionIds.length === 0) {
      toast.error(`Please select at least one division for ${selectedClassName}`);
      return;
    }

    const classIdNum = Number(selectedClassId);
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
      toast.error(
        `This subject is already created for all selected divisions of ${selectedClassName}`
      );
      return;
    }

    setIsSaving(true);
    let creationSuccess = false;
    try {
      // Send selected school_class ID along with division ID
      await Promise.all(
        toCreateIds.map((divId) =>
          saveSubject({
            name: subjectName.trim(),
            division: divId,
            school_class: classIdNum,
            SchoolClass: classIdNum,
          })
        )
      );

      creationSuccess = true;
      if (skippedLabels.length > 0) {
        toast.success(
          `Created subject '${subjectName.trim()}' for ${toCreateIds.length} division(s) of ${selectedClassName}. (${skippedLabels.length} already existed)`
        );
      } else {
        toast.success(
          `Subject '${subjectName.trim()}' created successfully for ${toCreateIds.length} division(s) of ${selectedClassName}!`
        );
      }

      setSubjectName("");
      setSelectedDivisionIds([]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create subject",
      );
    } finally {
      setIsSaving(false);
    }

    if (creationSuccess) {
      fetchData();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    let deleteSuccess = false;
    try {
      await deleteSubject(deleteTarget.id);
      deleteSuccess = true;
      toast.success("Subject deleted successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete subject";
      if (msg.toLowerCase().includes("no subject matches") || msg.toLowerCase().includes("not found")) {
        deleteSuccess = true;
        toast.info("Subject was already deleted");
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleteTarget(null);
      setIsDeleting(false);
    }

    if (deleteSuccess) {
      fetchData();
    }
  };

  const confirmDeleteGrouped = async () => {
    if (!deleteGroupedTarget) return;

    setIsDeleting(true);
    let deleteSuccess = false;
    try {
      await Promise.allSettled(
        deleteGroupedTarget.divisions.map((d) => deleteSubject(d.subjectId))
      );
      deleteSuccess = true;
      toast.success(
        `Deleted '${deleteGroupedTarget.name}' across ${deleteGroupedTarget.divisions.length} division(s)`
      );
      setDeleteGroupedTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete subject"
      );
    } finally {
      setIsDeleting(false);
    }

    if (deleteSuccess) {
      fetchData();
    }
  };

  // Requirement 3: Filter subjects by Class in Existing Subjects panel
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (tableClassFilter !== "all") {
        const div = divisions.find((d) => d.id === s.division);
        if (div?.SchoolClass?.toString() !== tableClassFilter) {
          return false;
        }
      }

      const name = s.name.toLowerCase();
      const divLabel = getDivisionLabel(s.division).toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || divLabel.includes(query);
    });
  }, [subjects, tableClassFilter, searchQuery, divisions, schoolClasses]);

  // Requirement 3: Organize subjects into Grouped Cards per Class
  const groupedSubjectsByClass = useMemo(() => {
    const targetClasses =
      tableClassFilter === "all"
        ? schoolClasses
        : schoolClasses.filter((c) => c.id.toString() === tableClassFilter);

    const groups: {
      classId: number;
      className: string;
      classDivisionsCount: number;
      subjects: GroupedSubjectItem[];
    }[] = [];

    for (const cls of targetClasses) {
      const clsDivs = divisions.filter((d) => d.SchoolClass === cls.id);
      const clsDivIds = clsDivs.map((d) => d.id!).filter(Boolean);
      const clsName =
        SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
        cls.school_class;

      // Filter subjects for this class
      const classSubjectRecords = subjects.filter((s) => {
        if (!s.division || !clsDivIds.includes(s.division)) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          getDivisionLabel(s.division).toLowerCase().includes(q)
        );
      });

      if (classSubjectRecords.length === 0 && searchQuery.trim()) {
        continue;
      }

      // Group records by subject name
      const subjectMap = new Map<string, GroupedSubjectItem>();

      for (const s of classSubjectRecords) {
        const key = s.name.trim().toLowerCase();
        const divObj = clsDivs.find((d) => d.id === s.division);
        const divName = divObj
          ? (divObj.division?.toLowerCase().includes("div")
            ? divObj.division
            : `Div ${divObj.division}`)
          : "Unknown";

        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            name: s.name.trim(),
            classId: cls.id,
            className: clsName,
            divisions: [],
          });
        }

        const group = subjectMap.get(key)!;
        if (s.id && s.division) {
          group.divisions.push({
            divisionId: s.division,
            divisionName: divName,
            subjectId: s.id,
          });
        }
      }

      const sortedSubjectList = Array.from(subjectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );

      groups.push({
        classId: cls.id,
        className: clsName,
        classDivisionsCount: clsDivs.length,
        subjects: sortedSubjectList,
      });
    }

    return groups;
  }, [subjects, divisions, schoolClasses, tableClassFilter, searchQuery]);

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
    let deleteSuccess = false;
    try {
      await Promise.allSettled(
        selectedTableIds.map((id) => deleteSubject(id))
      );
      deleteSuccess = true;
      toast.success(
        `Successfully deleted ${selectedTableIds.length} subject(s)`
      );
      setSelectedTableIds([]);
      setIsBulkDeleteOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete selected subjects"
      );
    } finally {
      setIsDeleting(false);
    }

    if (deleteSuccess) {
      fetchData();
    }
  };

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
        {/* Creation Form with Cascading Selection */}
        <div className="xl:col-span-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add New Subject
              </CardTitle>
              <CardDescription>
                Select a class and assign subjects to one or all of its divisions.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleAddSubject} className="space-y-4">
                {/* 1. Subject Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <BookMarked className="h-4 w-4 text-slate-500" />
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Mathematics, English, Science..."
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                {/* 2. Cascading Step 1: Select Class */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-slate-500" />
                    Select Class <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedClassId}
                    onValueChange={handleClassChange}
                  >
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs h-9 cursor-pointer">
                      <SelectValue placeholder="Choose a class...">
                        {selectedClassId
                          ? getClassNameById(selectedClassId) || "Choose a class..."
                          : "Choose a class..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {schoolClasses.map((cls) => {
                        const classDivsCount = divisions.filter((d) => d.SchoolClass === cls.id).length;
                        const label =
                          SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
                          cls.school_class;
                        return (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="font-medium">{label}</span>
                              <span className="text-[11px] text-muted-foreground">
                                ({classDivsCount} division{classDivsCount !== 1 ? "s" : ""})
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Cascading Step 2: Select Divisions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-slate-500" />
                      Select Divisions <span className="text-red-500">*</span>
                    </label>
                    {selectedClassId && classDivisions.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={selectAllClassDivisions}
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
                    )}
                  </div>

                  {!selectedClassId ? (
                    <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 text-center">
                      <GraduationCap className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-600 font-medium">Please select a class first</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Divisions belonging to that class will appear here for selection.
                      </p>
                    </div>
                  ) : classDivisions.length === 0 ? (
                    <div className="p-4 rounded-lg border border-slate-200 bg-amber-50/50 text-center">
                      <p className="text-xs text-amber-800 font-medium">
                        No divisions found for {selectedClassName}
                      </p>
                      <p className="text-[11px] text-amber-600 mt-0.5">
                        Please create divisions for this class first under Division Management.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* One-Click Select All Divisions in [ClassName] Banner */}
                      <button
                        type="button"
                        onClick={toggleSelectAllClassDivisions}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all text-left font-medium cursor-pointer",
                          isAllClassDivisionsSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={cn(
                              "h-4 w-4",
                              isAllClassDivisionsSelected ? "text-white" : "text-slate-400"
                            )}
                          />
                          <span>Select All Divisions in {selectedClassName}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0.2",
                            isAllClassDivisionsSelected
                              ? "bg-white/20 text-white border-transparent"
                              : "bg-white text-slate-600 border-slate-200"
                          )}
                        >
                          {classDivisions.length} division{classDivisions.length !== 1 ? "s" : ""}
                        </Badge>
                      </button>

                      {/* Multi-Select Dropdown for Divisions */}
                      <Select
                        multiple
                        value={selectedDivisionIds.map(String)}
                        onValueChange={(val: string[]) => {
                          const ids = Array.isArray(val)
                            ? val.map((v) => Number(v)).filter((n) => !isNaN(n))
                            : [];
                          setSelectedDivisionIds(ids);
                        }}
                      >
                        <SelectTrigger
                          className="w-full bg-slate-50 border-slate-200 text-xs h-9 cursor-pointer"
                          title={selectedDivisionIds.map((id) => getDivisionLabel(id)).join(", ")}
                        >
                          <SelectValue placeholder="Select divisions...">
                            {getDivisionSelectTriggerLabel()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {classDivisions.map((div) => {
                            const isSelected = selectedDivisionIds.includes(div.id!);
                            return (
                              <SelectItem key={div.id} value={div.id!.toString()}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors shrink-0",
                                      isSelected
                                        ? "bg-primary border-primary text-white"
                                        : "border-slate-300 bg-white"
                                    )}
                                  >
                                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                  </div>
                                  <span className="truncate">{getDivisionLabel(div.id!)}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {/* Removable Division Badge Pills */}
                      {selectedDivisionIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {selectedDivisionIds.map((id) => {
                            const label = getDivisionLabel(id);
                            return (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 flex items-center gap-1 font-medium select-none hover:bg-primary/15 transition-colors"
                              >
                                <span>{label}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDivision(id);
                                  }}
                                  className="hover:text-red-600 text-primary/70 transition-colors ml-0.5 focus:outline-none"
                                  title={`Remove ${label}`}
                                  aria-label={`Remove ${label}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {/* Division Checkbox List for quick individual toggle */}
                      <ScrollArea className="h-36 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                        <div className="space-y-1">
                          {classDivisions.map((div) => {
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
                                <span className="flex-1 font-medium">{getDivisionLabel(div.id!)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      {selectedDivisionIds.length > 0 && (
                        <p className="text-xs text-primary font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {selectedDivisionIds.length} division{selectedDivisionIds.length > 1 ? "s" : ""} of {selectedClassName} selected
                        </p>
                      )}
                    </>
                  )}

                  {/* Hidden inputs to sync form state */}
                  {selectedClassId && (
                    <input type="hidden" name="school_class" value={selectedClassId} />
                  )}
                  {selectedDivisionIds.map((id) => (
                    <input key={id} type="hidden" name="divisions" value={id} />
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={
                    isSaving ||
                    !subjectName.trim() ||
                    !selectedClassId ||
                    selectedDivisionIds.length === 0
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Create Subject ${
                      selectedDivisionIds.length > 0 && selectedClassName
                        ? `(${selectedDivisionIds.length} Divisions of ${selectedClassName})`
                        : ""
                    }`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 3. Existing Subjects Panel Organized by Class */}
        <div className="xl:col-span-8">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Existing Subjects</CardTitle>
                  <CardDescription>
                    Organized by class showing assigned divisions
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("grouped")}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all",
                        viewMode === "grouped"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Grouped
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all",
                        viewMode === "table"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                      Table
                    </button>
                  </div>

                  {/* Filter by Class in Existing Subjects */}
                  <Select
                    value={tableClassFilter}
                    onValueChange={(val) => setTableClassFilter(val || "all")}
                  >
                    <SelectTrigger className="w-36 sm:w-40 bg-slate-50 border-slate-200 text-xs h-9 cursor-pointer">
                      <SelectValue placeholder="All Classes">
                        {tableClassFilter === "all"
                          ? "All Classes"
                          : getClassNameById(tableClassFilter) || "All Classes"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {schoolClasses.map((cls) => {
                        const classSubjCount = subjects.filter((s) => {
                          const d = divisions.find((div) => div.id === s.division);
                          return d?.SchoolClass === cls.id;
                        }).length;
                        const label =
                          SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
                          cls.school_class;
                        return (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {label} ({classSubjCount})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Search input */}
                  <div className="relative flex-1 sm:w-52">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search subjects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
                    />
                  </div>

                  {viewMode === "table" && selectedTableIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsBulkDeleteOpen(true)}
                      className="h-9 px-3 text-xs font-medium shrink-0 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete ({selectedTableIds.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6 pt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 py-20 text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary/40" />
                  <p>Loading subjects...</p>
                </div>
              ) : viewMode === "grouped" ? (
                /* Grouped Cards per Class */
                <ScrollArea className="h-[520px] pr-3">
                  {groupedSubjectsByClass.length === 0 ||
                  groupedSubjectsByClass.every((g) => g.subjects.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <BookOpen className="h-10 w-10 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 max-w-[240px]">
                        {searchQuery || tableClassFilter !== "all"
                          ? "No subjects match your filter"
                          : "No subjects created yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 pt-2">
                      {groupedSubjectsByClass.map((classGroup) => {
                        if (classGroup.subjects.length === 0) return null;
                        return (
                          <div
                            key={classGroup.classId}
                            className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3"
                          >
                            {/* Class Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                <h3 className="font-bold text-base text-slate-900">
                                  {classGroup.className}
                                </h3>
                                <Badge variant="secondary" className="text-xs bg-slate-100">
                                  {classGroup.subjects.length} subject{classGroup.subjects.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {classGroup.classDivisionsCount} total division{classGroup.classDivisionsCount !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Subjects Grid for this Class */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {classGroup.subjects.map((group) => (
                                <div
                                  key={group.name}
                                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <BookMarked className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-slate-900 text-sm capitalize">
                                          {group.name}
                                        </h4>
                                        <span className="text-[11px] text-slate-400">
                                          Assigned to {group.divisions.length} of{" "}
                                          {classGroup.classDivisionsCount} division
                                          {classGroup.classDivisionsCount !== 1 ? "s" : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                                      title={`Delete '${group.name}' from all divisions in ${classGroup.className}`}
                                      onClick={() => setDeleteGroupedTarget(group)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  {/* Assigned Divisions Badges */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400 mr-0.5">
                                      Divisions:
                                    </span>
                                    {group.divisions.map((div) => (
                                      <Badge
                                        key={div.subjectId}
                                        variant="outline"
                                        className="text-[11px] bg-slate-50 text-slate-700 border-slate-200 py-0.5 px-1.5 flex items-center gap-1 group/badge"
                                      >
                                        <span>{div.divisionName}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const subj = subjects.find(
                                              (s) => s.id === div.subjectId
                                            );
                                            if (subj) setDeleteTarget(subj);
                                          }}
                                          className="text-slate-400 hover:text-red-600 transition-colors focus:outline-none"
                                          title={`Remove from ${div.divisionName}`}
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              ) : (
                /* Detailed Table View */
                <ScrollArea className="h-[520px]">
                  {filteredSubjects.length > 0 ? (
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
                            const isRowSelected = subject.id
                              ? selectedTableIds.includes(subject.id)
                              : false;
                            return (
                              <tr
                                key={subject.id || index}
                                onClick={() =>
                                  subject.id && toggleTableSelect(subject.id)
                                }
                                className={cn(
                                  "transition-colors cursor-pointer group",
                                  isRowSelected
                                    ? "bg-red-50/30 hover:bg-red-50/50"
                                    : "hover:bg-primary/5"
                                )}
                              >
                                <td
                                  className="w-10 px-4 py-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isRowSelected}
                                    onCheckedChange={() =>
                                      subject.id && toggleTableSelect(subject.id)
                                    }
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
                                <td
                                  className="px-6 py-4 text-right"
                                  onClick={(e) => e.stopPropagation()}
                                >
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
                        {searchQuery || tableClassFilter !== "all"
                          ? "No subjects match your search"
                          : "No subjects created yet"}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Single Subject Delete Confirmation Dialog */}
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
              </span>{" "}
              for{" "}
              <span className="font-semibold text-slate-900">
                {getDivisionLabel(deleteTarget?.division ?? null)}
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

      {/* Grouped Subject Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteGroupedTarget}
        onOpenChange={(open) => !open && setDeleteGroupedTarget(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Subject Across Divisions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete subject{" "}
              <span className="font-semibold text-slate-900">
                '{deleteGroupedTarget?.name}'
              </span>{" "}
              from all {deleteGroupedTarget?.divisions.length} division(s) of{" "}
              <span className="font-semibold text-slate-900">
                {deleteGroupedTarget?.className}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4 flex flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteGroupedTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteGrouped}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete from ${deleteGroupedTarget?.divisions.length} Division(s)`
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
