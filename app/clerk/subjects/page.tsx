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
  Sparkles,
  Filter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  // 1. Multiple Subject Creation State
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectList, setSubjectList] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);
  const [formDivisionSearch, setFormDivisionSearch] = useState("");

  // 2. Existing Subjects Panel State & Filters
  const [tableClassFilter, setTableClassFilter] = useState<string>("all");
  const [tableDivisionFilter, setTableDivisionFilter] = useState<string>("all");
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

        const classA = classesData.find((c) => c.id === divA?.SchoolClass);
        const classB = classesData.find((c) => c.id === divB?.SchoolClass);

        const classIndexA = classA
          ? SCHOOL_CLASS_OPTIONS.findIndex((opt) => opt.value === classA.school_class)
          : 999;

        const classIndexB = classB
          ? SCHOOL_CLASS_OPTIONS.findIndex((opt) => opt.value === classB.school_class)
          : 999;

        if (classIndexA !== classIndexB) {
          return classIndexA - classIndexB;
        }

        const divNameA = divA?.division || "";
        const divNameB = divB?.division || "";
        if (divNameA !== divNameB) {
          return divNameA.localeCompare(divNameB, undefined, { numeric: true });
        }

        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });

      setSubjects(sortedSubjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subjects data");
      toast.error("Could not load subjects records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getClassNameById = (classId: string | number) => {
    const cls = schoolClasses.find((c) => c.id.toString() === classId.toString());
    if (!cls) return "";
    return (
      SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
      cls.school_class
    );
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

  const getDivisionShortName = (divisionId: number | null) => {
    if (divisionId === null) return "N/A";
    const div = divisions.find((d) => d.id === divisionId);
    if (!div) return `#${divisionId}`;
    return div.division?.toLowerCase().includes("div")
      ? div.division
      : `Div ${div.division}`;
  };

  // Divisions available for the selected Class in the creation form
  const classDivisions = useMemo(() => {
    if (!selectedClassId) return [];
    return divisions
      .filter((d) => d.SchoolClass?.toString() === selectedClassId)
      .sort((a, b) => a.division.localeCompare(b.division, undefined, { numeric: true }));
  }, [divisions, selectedClassId]);

  const filteredClassDivisions = useMemo(() => {
    if (!formDivisionSearch.trim()) return classDivisions;
    const q = formDivisionSearch.toLowerCase().trim();
    return classDivisions.filter((div) => {
      const fullLabel = getDivisionLabel(div.id!).toLowerCase();
      const divName = (div.division || "").toLowerCase();
      return fullLabel.includes(q) || divName.includes(q);
    });
  }, [classDivisions, formDivisionSearch]);

  const classDivisionIds = useMemo(() => {
    return classDivisions.map((d) => d.id!).filter(Boolean);
  }, [classDivisions]);

  const isAllClassDivisionsSelected =
    classDivisions.length > 0 &&
    classDivisionIds.every((id) => selectedDivisionIds.includes(id));

  const handleClassChange = (classId: string | null) => {
    setSelectedClassId(classId || "");
    setSelectedDivisionIds([]);
    setFormDivisionSearch("");
  };

  const toggleSelectAllClassDivisions = () => {
    const targetDivs = formDivisionSearch.trim() ? filteredClassDivisions : classDivisions;
    const targetIds = targetDivs.map((d) => d.id!).filter(Boolean);
    const allSelected = targetIds.length > 0 && targetIds.every((id) => selectedDivisionIds.includes(id));
    if (allSelected) {
      setSelectedDivisionIds((prev) => prev.filter((id) => !targetIds.includes(id)));
    } else {
      setSelectedDivisionIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  const toggleDivision = (id: number) => {
    setSelectedDivisionIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

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

  // Multiple Subjects Handlers
  const handleAddSubjectTag = () => {
    if (!subjectInput.trim()) return;
    const splitNames = subjectInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setSubjectList((prev) => {
      const combined = [...prev];
      for (const name of splitNames) {
        if (!combined.some((item) => item.toLowerCase() === name.toLowerCase())) {
          combined.push(name);
        }
      }
      return combined;
    });
    setSubjectInput("");
  };

  const handleRemoveSubjectTag = (nameToRemove: string) => {
    setSubjectList((prev) => prev.filter((s) => s !== nameToRemove));
  };

  // Submit Multiple Subject Creation
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();

    // Collect all subjects (both in subjectList tags and any pending text in input)
    const pendingNames = subjectInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const allSubjectNames = Array.from(
      new Set([...subjectList, ...pendingNames])
    );

    if (allSubjectNames.length === 0) {
      toast.error("Please enter at least one subject name");
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
    const toCreatePayloads: { name: string; division: number }[] = [];
    let skippedCount = 0;

    for (const subName of allSubjectNames) {
      const normalized = subName.trim().toLowerCase();
      for (const divId of selectedDivisionIds) {
        const alreadyExists = subjects.some(
          (s) =>
            s.division === divId &&
            s.name.trim().toLowerCase() === normalized
        );

        if (alreadyExists) {
          skippedCount++;
        } else {
          toCreatePayloads.push({
            name: subName.trim(),
            division: divId,
          });
        }
      }
    }

    if (toCreatePayloads.length === 0) {
      toast.error(
        `All specified subjects already exist for the selected division(s) of ${selectedClassName}`
      );
      return;
    }

    setIsSaving(true);
    let creationSuccess = false;
    try {
      await Promise.all(
        toCreatePayloads.map((payload) =>
          saveSubject({
            name: payload.name,
            division: payload.division,
            school_class: classIdNum,
            SchoolClass: classIdNum,
          })
        )
      );

      creationSuccess = true;
      if (skippedCount > 0) {
        toast.success(
          `🎉 Created ${toCreatePayloads.length} subject allocation(s) for ${selectedClassName}. (${skippedCount} duplicate(s) skipped)`
        );
      } else {
        toast.success(
          `🎉 Created ${allSubjectNames.length} subject(s) across ${selectedDivisionIds.length} division(s) of ${selectedClassName}!`
        );
      }

      setSubjectInput("");
      setSubjectList([]);
      setSelectedDivisionIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create subject(s)");
    } finally {
      setIsSaving(false);
    }

    if (creationSuccess) {
      fetchData();
    }
  };

  // Divisions available for Filter dropdown in Existing Subjects
  const filterAvailableDivisions = useMemo(() => {
    if (tableClassFilter === "all") {
      return divisions.sort((a, b) =>
        a.division.localeCompare(b.division, undefined, { numeric: true })
      );
    }
    return divisions
      .filter((d) => d.SchoolClass?.toString() === tableClassFilter)
      .sort((a, b) =>
        a.division.localeCompare(b.division, undefined, { numeric: true })
      );
  }, [divisions, tableClassFilter]);

  // Handle class filter change: reset division filter if incompatible
  const handleTableClassFilterChange = (val: string | null) => {
    setTableClassFilter(val || "all");
    setTableDivisionFilter("all");
  };

  // ─── Filtered Subjects for Table & Grouped Views ──────────────────────────────
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const div = divisions.find((d) => d.id === subject.division);
      const cls = schoolClasses.find((c) => c.id === div?.SchoolClass);

      // 1. Class filter
      if (tableClassFilter !== "all") {
        if (!cls || cls.id.toString() !== tableClassFilter) return false;
      }

      // 2. Division filter
      if (tableDivisionFilter !== "all") {
        if (!div || div.id?.toString() !== tableDivisionFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const subjectMatch = subject.name.toLowerCase().includes(query);
        const classMatch = cls?.school_class?.toLowerCase().includes(query) || false;
        const divMatch = div?.division?.toLowerCase().includes(query) || false;
        if (!subjectMatch && !classMatch && !divMatch) return false;
      }

      return true;
    });
  }, [subjects, divisions, schoolClasses, tableClassFilter, tableDivisionFilter, searchQuery]);

  // ─── Grouped Subjects by Class ────────────────────────────────────────────────
  const groupedSubjectsByClass = useMemo(() => {
    const classGroups: {
      classId: number;
      className: string;
      classDivisionsCount: number;
      subjects: GroupedSubjectItem[];
    }[] = [];

    // Filter classes according to tableClassFilter
    const targetClasses =
      tableClassFilter === "all"
        ? schoolClasses
        : schoolClasses.filter((c) => c.id.toString() === tableClassFilter);

    for (const cls of targetClasses) {
      const clsName =
        SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
        cls.school_class;

      const clsDivs = divisions.filter((d) => d.SchoolClass === cls.id);
      const clsDivIds = clsDivs.map((d) => d.id!);

      // Find subjects in this class that also match tableDivisionFilter and searchQuery
      const relevantSubjects = filteredSubjects.filter((s) =>
        clsDivIds.includes(s.division ?? -1)
      );

      if (relevantSubjects.length === 0 && (searchQuery || tableClassFilter !== "all" || tableDivisionFilter !== "all")) {
        continue;
      }

      const subjectMap = new Map<string, GroupedSubjectItem>();

      for (const s of relevantSubjects) {
        const divObj = divisions.find((d) => d.id === s.division);
        const divName = divObj?.division
          ? divObj.division.toLowerCase().includes("div")
            ? divObj.division
            : `Div ${divObj.division}`
          : "Unassigned";

        const key = s.name.trim().toLowerCase();
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
          // Avoid duplicate division badges for the same subject
          if (!group.divisions.some((d) => d.divisionId === s.division)) {
            group.divisions.push({
              divisionId: s.division,
              divisionName: divName,
              subjectId: s.id,
            });
          }
        }
      }

      const sortedSubjectList = Array.from(subjectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );

      classGroups.push({
        classId: cls.id,
        className: clsName,
        classDivisionsCount: clsDivs.length,
        subjects: sortedSubjectList,
      });
    }

    return classGroups;
  }, [filteredSubjects, schoolClasses, divisions, tableClassFilter, tableDivisionFilter, searchQuery]);

  // Bulk Selection Handlers
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
        `Successfully deleted ${selectedTableIds.length} subject allocation(s)`
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

  const confirmSingleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await deleteSubject(deleteTarget.id);
      toast.success(`Removed subject '${deleteTarget.name}'`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete subject");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmGroupedDelete = async () => {
    if (!deleteGroupedTarget) return;
    setIsDeleting(true);
    try {
      const idsToDelete = deleteGroupedTarget.divisions.map((d) => d.subjectId);
      await Promise.allSettled(idsToDelete.map((id) => deleteSubject(id)));
      toast.success(
        `Deleted '${deleteGroupedTarget.name}' across ${idsToDelete.length} division(s) of ${deleteGroupedTarget.className}`
      );
      setDeleteGroupedTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete subject group");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              Subject Management
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              Clerk Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create, assign, and organize subjects across school classes and divisions.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchData}
          disabled={isLoading}
          className="rounded-xl text-xs gap-1.5 h-9"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          Refresh Records
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Multi-Subject Creation Form */}
        <div className="xl:col-span-5">
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
            <CardHeader className="pb-3 border-b dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-indigo-600" /> Add Subjects in Bulk
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
                  Multiple Creation
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Enter single or multiple subjects and assign them to one or all divisions at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleAddSubject} className="space-y-4">
                {/* 1. Multiple Subject Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BookMarked className="h-4 w-4 text-indigo-600" /> Subject Names:
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Comma-separated or press Add
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Mathematics, English, Science..."
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubjectTag();
                        }
                      }}
                      className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddSubjectTag}
                      disabled={!subjectInput.trim()}
                      className="h-10 px-3 text-xs font-semibold rounded-xl shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>

                  {/* Subject Badges / Tag Pills */}
                  {subjectList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {subjectList.map((name) => (
                        <Badge
                          key={name}
                          className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 text-xs px-2.5 py-0.5 flex items-center gap-1 font-bold"
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubjectTag(name)}
                            className="hover:text-red-600 transition-colors ml-0.5"
                            title={`Remove ${name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Select Class */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-indigo-600" /> Select Target Class:
                  </label>
                  <Select
                    value={selectedClassId}
                    onValueChange={handleClassChange}
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium text-xs">
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
                            <div className="flex items-center justify-between w-full gap-3">
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

                {/* 3. Select Divisions */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600" /> Target Divisions:
                    </label>
                    {selectedClassId && classDivisions.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedDivisionIds(classDivisionIds)}
                          className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300 dark:text-zinc-700">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDivisionIds([])}
                          className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {!selectedClassId ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 text-center space-y-1">
                      <GraduationCap className="h-6 w-6 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">Please select a class first</p>
                      <p className="text-[11px] text-slate-400">
                        Divisions belonging to that class will appear here for selection.
                      </p>
                    </div>
                  ) : classDivisions.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-center space-y-1">
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">
                        No divisions found for {selectedClassName}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Please create divisions under Class Management first.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* One-Click Select All Divisions Banner */}
                      <button
                        type="button"
                        onClick={toggleSelectAllClassDivisions}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all font-semibold cursor-pointer",
                          isAllClassDivisionsSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
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
                            "text-[10px] px-2 py-0.5 font-bold",
                            isAllClassDivisionsSelected
                              ? "bg-white/20 text-white border-transparent"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200"
                          )}
                        >
                          {classDivisions.length} division{classDivisions.length !== 1 ? "s" : ""}
                        </Badge>
                      </button>

                      {/* Unified division checklist container */}
                      <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 max-h-60 overflow-y-auto">
                        {classDivisions.length > 2 && (
                          <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search divisions..."
                              value={formDivisionSearch}
                              onChange={(e) => setFormDivisionSearch(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md text-sm pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-colors"
                            />
                            {formDivisionSearch && (
                              <button
                                type="button"
                                onClick={() => setFormDivisionSearch("")}
                                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                                title="Clear search"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}

                        {filteredClassDivisions.length === 0 ? (
                          <p className="text-xs text-slate-400 p-3 text-center">
                            No divisions matching "{formDivisionSearch}"
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {filteredClassDivisions.map((div) => {
                              const isSelected = selectedDivisionIds.includes(div.id!);
                              return (
                                <div
                                  key={div.id}
                                  onClick={() => toggleDivision(div.id!)}
                                  className={cn(
                                    "flex items-center space-x-2 py-2 px-3 rounded-md transition-colors cursor-pointer select-none text-xs",
                                    isSelected
                                      ? "bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-semibold"
                                      : "hover:bg-gray-100 dark:hover:bg-zinc-800/60 text-gray-700 dark:text-zinc-300"
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleDivision(div.id!)}
                                  />
                                  <span className="flex-1 truncate">{getDivisionLabel(div.id!)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {selectedDivisionIds.length > 0 && (
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {selectedDivisionIds.length} division{selectedDivisionIds.length > 1 ? "s" : ""} of {selectedClassName} selected
                        </p>
                      )}
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={
                    isSaving ||
                    (subjectList.length === 0 && !subjectInput.trim()) ||
                    !selectedClassId ||
                    selectedDivisionIds.length === 0
                  }
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm gap-2 mt-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Subjects...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      Apply &amp; Create Subjects
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Existing Subjects Directory (Grouped & Table) */}
        <div className="xl:col-span-7">
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b dark:border-zinc-800">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-600" /> Existing Subjects Directory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Showing {filteredSubjects.length} subject allocation(s) across classes
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {viewMode === "table" && selectedTableIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsBulkDeleteOpen(true)}
                      className="h-8 px-2.5 text-xs font-bold rounded-xl gap-1 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete ({selectedTableIds.length})
                    </Button>
                  )}

                  {/* Segmented View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("grouped")}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                        viewMode === "grouped"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Grouped
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                        viewMode === "table"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                      Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                {/* Filter by Class */}
                <Select
                  value={tableClassFilter}
                  onValueChange={handleTableClassFilterChange}
                >
                  <SelectTrigger className="w-full sm:w-40 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800/60 font-semibold border-slate-200 dark:border-zinc-700 shrink-0">
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

                {/* Filter by Division */}
                <Select
                  value={tableDivisionFilter}
                  onValueChange={(val) => setTableDivisionFilter(val || "all")}
                >
                  <SelectTrigger className="w-full sm:w-44 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800/60 font-semibold border-slate-200 dark:border-zinc-700 shrink-0">
                    <SelectValue placeholder="All Divisions">
                      {tableDivisionFilter === "all"
                        ? "All Divisions"
                        : tableClassFilter !== "all"
                        ? getDivisionShortName(Number(tableDivisionFilter))
                        : getDivisionLabel(Number(tableDivisionFilter)) || "All Divisions"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {filterAvailableDivisions.map((div) => (
                      <SelectItem key={div.id} value={div.id!.toString()}>
                        {tableClassFilter !== "all"
                          ? getDivisionShortName(div.id!)
                          : getDivisionLabel(div.id!)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Search input */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 w-full"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">Loading subjects directory...</p>
                </div>
              ) : viewMode === "grouped" ? (
                /* Grouped Cards per Class */
                <ScrollArea className="h-[540px] p-4 sm:p-5">
                  {groupedSubjectsByClass.length === 0 ||
                  groupedSubjectsByClass.every((g) => g.subjects.length === 0) ? (
                    <div className="py-20 text-center space-y-2">
                      <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        {searchQuery || tableClassFilter !== "all" || tableDivisionFilter !== "all"
                          ? "No subjects match your active filters"
                          : "No subjects created yet"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Use the panel on the left to add subjects to class divisions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {groupedSubjectsByClass.map((classGroup) => {
                        if (classGroup.subjects.length === 0) return null;
                        return (
                          <div
                            key={classGroup.classId}
                            className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 p-4 space-y-3.5"
                          >
                            {/* Class Header Banner */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-800">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4.5 w-4.5 text-indigo-600" />
                                <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                                  {classGroup.className}
                                </h3>
                                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 text-[11px] font-bold">
                                  {classGroup.subjects.length} Subject{classGroup.subjects.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground font-medium">
                                {classGroup.classDivisionsCount} total division{classGroup.classDivisionsCount !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Subjects Grid for this Class */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {classGroup.subjects.map((group) => (
                                <div
                                  key={group.name}
                                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-2xs space-y-2.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <BookMarked className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-xs capitalize">
                                          {group.name}
                                        </h4>
                                        <span className="text-[11px] text-muted-foreground">
                                          Assigned to {group.divisions.length} of {classGroup.classDivisionsCount} division(s)
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                      title={`Delete '${group.name}' from all divisions in ${classGroup.className}`}
                                      onClick={() => setDeleteGroupedTarget(group)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  {/* Assigned Divisions Badges */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                    <span className="text-[10px] font-semibold text-slate-400 mr-0.5 uppercase tracking-wider">
                                      Divisions:
                                    </span>
                                    {group.divisions.map((div) => (
                                      <Badge
                                        key={div.subjectId}
                                        variant="outline"
                                        className="text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 py-0.5 px-2 flex items-center gap-1 font-semibold group/badge"
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
                                          className="text-indigo-400 hover:text-red-600 transition-colors focus:outline-none"
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
                <ScrollArea className="h-[540px]">
                  {filteredSubjects.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800">
                        <TableRow>
                          <TableHead className="w-10 text-center py-3.5">
                            <Checkbox
                              checked={isAllTableSelected}
                              onCheckedChange={toggleSelectAllTable}
                            />
                          </TableHead>
                          <TableHead className="w-12 text-center text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5">
                            #
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5">
                            Subject Name
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5">
                            Class
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5">
                            Division
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5 text-right pr-4">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
                        {filteredSubjects.map((subject, index) => {
                          const isRowSelected = subject.id
                            ? selectedTableIds.includes(subject.id)
                            : false;

                          const divObj = divisions.find((d) => d.id === subject.division);
                          const clsObj = schoolClasses.find((c) => c.id === divObj?.SchoolClass);
                          const classNameStr = clsObj
                            ? SCHOOL_CLASS_OPTIONS.find((o) => o.value === clsObj.school_class)?.label ||
                              clsObj.school_class
                            : "Unknown Class";

                          return (
                            <TableRow
                              key={subject.id || index}
                              className={cn(
                                "hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors",
                                isRowSelected && "bg-indigo-50/40 dark:bg-indigo-950/20"
                              )}
                            >
                              <TableCell className="w-10 text-center py-3.5">
                                <Checkbox
                                  checked={isRowSelected}
                                  onCheckedChange={() => subject.id && toggleTableSelect(subject.id)}
                                />
                              </TableCell>
                              <TableCell className="w-12 text-center text-xs font-medium text-slate-400 font-mono py-3.5">
                                {index + 1}
                              </TableCell>
                              <TableCell className="py-3.5">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 capitalize">
                                    {subject.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 text-xs text-slate-700 dark:text-zinc-300 font-medium">
                                {classNameStr}
                              </TableCell>
                              <TableCell className="py-3.5">
                                <Badge
                                  variant="outline"
                                  className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 text-xs px-2 py-0.5 font-bold"
                                >
                                  {getDivisionShortName(subject.division)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3.5 text-right pr-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(subject)}
                                  className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-20 text-center space-y-2">
                      <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        No subjects match your search or filter
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Try resetting the class or division filter.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Single Subject Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Remove Subject</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove{" "}
              <strong className="text-slate-900 dark:text-zinc-100">{deleteTarget?.name}</strong> from{" "}
              <strong>{getDivisionLabel(deleteTarget?.division ?? null)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmSingleDelete}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Yes, Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Grouped Subject Dialog */}
      <Dialog
        open={!!deleteGroupedTarget}
        onOpenChange={(open) => !open && setDeleteGroupedTarget(null)}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Remove Subject from All Divisions</DialogTitle>
            <DialogDescription className="text-xs">
              This will remove{" "}
              <strong className="text-slate-900 dark:text-zinc-100">{deleteGroupedTarget?.name}</strong> from all{" "}
              <strong>{deleteGroupedTarget?.divisions.length}</strong> assigned division(s) of{" "}
              <strong>{deleteGroupedTarget?.className}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteGroupedTarget(null)}
              disabled={isDeleting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmGroupedDelete}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Delete Across All Divisions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Delete Selected Subjects</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete{" "}
              <strong>{selectedTableIds.length}</strong> selected subject allocation(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(false)}
              disabled={isDeleting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Delete Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
