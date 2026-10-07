"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
  FileDown,
  UploadCloud,
  X,
  CheckCircle2,
  Layers,
  GraduationCap,
  LayoutGrid,
  List,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

import {
  getClasses,
  getDivisions,
  getSubjects,
  getSyllabusList,
  saveSyllabus,
  deleteSyllabus,
} from "@/lib/clerk";
import { getSyllabusStreamUrl, openAuthenticatedDocument } from "@/lib/document-viewer";
import type { Division, SchoolClass, Subject, Syllabus } from "@/types/clerk";
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

interface GroupedSyllabusClass {
  classId: number;
  className: string;
  divisionsCount: number;
  items: {
    syllabus: Syllabus;
    subjectName: string;
    divisionName: string;
  }[];
}

export default function SyllabusPage() {
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Syllabus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Table selection & bulk actions
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Multiple Creation Form State
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);
  const [selectedSubjectNames, setSelectedSubjectNames] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [divisionSearchQuery, setDivisionSearchQuery] = useState("");

  // Directory Filters & View Mode
  const [classFilter, setClassFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");
  const [loadingDocId, setLoadingDocId] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesData, divisionsData, subjectsData, syllabusData] =
        await Promise.all([
          getClasses(),
          getDivisions(),
          getSubjects(),
          getSyllabusList(),
        ]);

      setSchoolClasses(classesData || []);
      setDivisions(divisionsData || []);
      setSubjects(subjectsData || []);
      setSyllabuses(syllabusData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus data");
      toast.error("Could not load syllabus records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewSyllabus = async (item: Syllabus) => {
    if (!item.id && !item.syllabus_file) return;

    const streamUrl = item.id ? getSyllabusStreamUrl(item.id) : (item.syllabus_file as string);
    const fallbackUrl = typeof item.syllabus_file === "string" ? item.syllabus_file : undefined;

    setLoadingDocId(item.id ?? null);
    try {
      await openAuthenticatedDocument(
        streamUrl,
        `Syllabus - ${getSubjectLabel(item.subject)}`,
        fallbackUrl
      );
    } finally {
      setLoadingDocId(null);
    }
  };

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

  const getSubjectLabel = (subjectId: number | null) => {
    if (subjectId === null) return "Unknown Subject";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : `Subject #${subjectId}`;
  };

  // Form Division toggles
  const toggleDivision = (id: number) => {
    setSelectedDivisionIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const selectAllDivisions = () => {
    const targetDivs = divisionSearchQuery.trim()
      ? filteredDivisionsForSelect
      : sortedDivisionsForSelect;
    const visibleIds = targetDivs.map((d) => d.id!).filter(Boolean) as number[];
    setSelectedDivisionIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearAllDivisions = () => {
    if (divisionSearchQuery.trim()) {
      const filteredIds = filteredDivisionsForSelect.map((d) => d.id!).filter(Boolean) as number[];
      setSelectedDivisionIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedDivisionIds([]);
      setSelectedSubjectNames([]);
    }
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

  // Form Subject multi-selection
  const toggleSubjectName = (name: string) => {
    setSelectedSubjectNames((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const selectAllAvailableSubjects = () => {
    setSelectedSubjectNames(availableSubjectNames);
  };

  const clearAllSubjects = () => {
    setSelectedSubjectNames([]);
  };

  // Available subjects for the selected divisions
  const availableSubjectNames = useMemo(() => {
    if (selectedDivisionIds.length === 0) return [];
    return Array.from(
      new Set(
        subjects
          .filter(
            (s) =>
              s.division !== null &&
              selectedDivisionIds.includes(s.division)
          )
          .map((s) => s.name.trim())
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [subjects, selectedDivisionIds]);

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

  const filteredDivisionsForSelect = useMemo(() => {
    if (!divisionSearchQuery.trim()) return sortedDivisionsForSelect;
    const q = divisionSearchQuery.toLowerCase().trim();
    return sortedDivisionsForSelect.filter((div) => {
      const fullLabel = getDivisionLabel(div.id!).toLowerCase();
      const divName = (div.division || "").toLowerCase();
      const cls = schoolClasses.find((c) => c.id === div.SchoolClass);
      const clsLabel = (
        cls
          ? SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
            cls.school_class
          : ""
      ).toLowerCase();
      return fullLabel.includes(q) || divName.includes(q) || clsLabel.includes(q);
    });
  }, [sortedDivisionsForSelect, divisionSearchQuery, schoolClasses, divisions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    const maxPhotoSize = 500 * 1024; // 500KB
    const maxDocSize = 2 * 1024 * 1024; // 2MB
    const limit = isImage ? maxPhotoSize : maxDocSize;

    if (file.size > limit) {
      if (isImage) {
        toast.error(`Image size exceeds 500KB limit (${(file.size / 1024).toFixed(1)}KB). Please choose a smaller photo.`);
      } else {
        toast.error(`Document size exceeds 2MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please choose a smaller file.`);
      }
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Multiple Creation: Upload syllabus to multiple subjects across multiple divisions
  const handleAddSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDivisionIds.length === 0) {
      toast.error("Please select at least one division");
      return;
    }

    if (selectedSubjectNames.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a syllabus document file");
      return;
    }

    setIsSaving(true);
    try {
      const uploadsToMake: { division: number; subject: number }[] = [];

      for (const divId of selectedDivisionIds) {
        for (const subName of selectedSubjectNames) {
          const matchingSub = subjects.find(
            (s) =>
              s.division === divId &&
              s.name.trim().toLowerCase() === subName.trim().toLowerCase()
          );

          if (matchingSub?.id) {
            uploadsToMake.push({ division: divId, subject: matchingSub.id });
          }
        }
      }

      if (uploadsToMake.length === 0) {
        toast.error(
          `None of the selected subjects exist in the selected division(s).`
        );
        return;
      }

      const replacedCount = uploadsToMake.filter((item) =>
        syllabuses.some((sy) => sy.division === item.division && sy.subject === item.subject)
      ).length;

      await Promise.all(
        uploadsToMake.map((item) =>
          saveSyllabus({
            syllabus_file: selectedFile!,
            division: item.division,
            subject: item.subject,
          })
        )
      );

      if (replacedCount > 0) {
        toast.success(
          `🎉 Uploaded syllabus for ${uploadsToMake.length} target allocation(s) (${replacedCount} previous file(s) replaced)!`
        );
      } else {
        toast.success(
          `🎉 Syllabus uploaded successfully across ${uploadsToMake.length} target allocation(s)!`
        );
      }

      // Reset form
      setSelectedFile(null);
      setSelectedSubjectNames([]);
      setSelectedDivisionIds([]);

      // Refresh list
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload syllabus");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      await deleteSyllabus(deleteTarget.id);
      toast.success("Syllabus record deleted successfully");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete syllabus");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter divisions available in the Directory Filter
  const filterAvailableDivisions = useMemo(() => {
    if (classFilter === "all") {
      return divisions.sort((a, b) =>
        a.division.localeCompare(b.division, undefined, { numeric: true })
      );
    }
    return divisions
      .filter((d) => d.SchoolClass?.toString() === classFilter)
      .sort((a, b) =>
        a.division.localeCompare(b.division, undefined, { numeric: true })
      );
  }, [divisions, classFilter]);

  const handleClassFilterChange = (val: string | null) => {
    setClassFilter(val || "all");
    setDivisionFilter("all");
  };

  // ─── Filtered Syllabuses for Directory ────────────────────────────────────────
  const filteredSyllabuses = useMemo(() => {
    return syllabuses.filter((s) => {
      const divObj = divisions.find((d) => d.id === s.division);
      const clsObj = schoolClasses.find((c) => c.id === divObj?.SchoolClass);
      const subName = getSubjectLabel(s.subject).toLowerCase();
      const divLabel = getDivisionLabel(s.division).toLowerCase();

      // 1. Class filter
      if (classFilter !== "all") {
        if (!clsObj || clsObj.id.toString() !== classFilter) return false;
      }

      // 2. Division filter
      if (divisionFilter !== "all") {
        if (!divObj || divObj.id?.toString() !== divisionFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const subMatch = subName.includes(query);
        const divMatch = divLabel.includes(query);
        const classMatch = clsObj?.school_class?.toLowerCase().includes(query) || false;
        if (!subMatch && !divMatch && !classMatch) return false;
      }

      return true;
    });
  }, [syllabuses, divisions, schoolClasses, classFilter, divisionFilter, searchQuery]);

  // ─── Grouped Syllabuses by Class ──────────────────────────────────────────────
  const groupedSyllabusesByClass = useMemo(() => {
    const classGroups: GroupedSyllabusClass[] = [];

    const targetClasses =
      classFilter === "all"
        ? schoolClasses
        : schoolClasses.filter((c) => c.id.toString() === classFilter);

    for (const cls of targetClasses) {
      const clsName =
        SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
        cls.school_class;

      const clsDivs = divisions.filter((d) => d.SchoolClass === cls.id);
      const clsDivIds = clsDivs.map((d) => d.id!);

      const classItems = filteredSyllabuses
        .filter((sy) => clsDivIds.includes(sy.division ?? -1))
        .map((sy) => ({
          syllabus: sy,
          subjectName: getSubjectLabel(sy.subject),
          divisionName: getDivisionShortName(sy.division),
        }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

      if (classItems.length === 0 && (searchQuery || classFilter !== "all" || divisionFilter !== "all")) {
        continue;
      }

      classGroups.push({
        classId: cls.id,
        className: clsName,
        divisionsCount: clsDivs.length,
        items: classItems,
      });
    }

    return classGroups;
  }, [filteredSyllabuses, schoolClasses, divisions, classFilter, divisionFilter, searchQuery]);

  // Bulk Selection Handlers
  const toggleTableSelect = (id: number) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const visibleTableIds = filteredSyllabuses.map((s) => s.id!).filter(Boolean);
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
        selectedTableIds.map((id) => deleteSyllabus(id))
      );
      toast.success(
        `Successfully deleted ${selectedTableIds.length} syllabus record(s)`
      );
      setSelectedTableIds([]);
      setIsBulkDeleteOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete selected syllabus records"
      );
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
              <FileText className="h-6 w-6 text-indigo-600" />
              Syllabus Management
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              Clerk Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Upload, organize, and attach curriculum documents to multiple class divisions.
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
        {/* Left Column: Upload Form */}
        <div className="xl:col-span-5">
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
            <CardHeader className="pb-3 border-b dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UploadCloud className="h-4 w-4 text-indigo-600" /> Upload Syllabus Document
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
                  Multiple Target
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Attach a syllabus document to multiple subjects and divisions simultaneously.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleAddSyllabus} className="space-y-4">
                {/* 1. Select Divisions */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600" /> Target Divisions:
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllDivisions}
                        className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300 dark:text-zinc-700">|</span>
                      <button
                        type="button"
                        onClick={clearAllDivisions}
                        className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Quick Class Selector Pills */}
                  {schoolClasses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {schoolClasses.map((cls) => {
                        const classDivs = divisions.filter((d) => d.SchoolClass === cls.id);
                        if (classDivs.length === 0) return null;
                        const classDivIds = classDivs.map((d) => d.id!).filter(Boolean);
                        const isFullySelected = classDivIds.every((id) => selectedDivisionIds.includes(id));
                        const label = SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label || cls.school_class;

                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleClassDivisions(cls.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                              isFullySelected
                                ? "bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 shadow-2xs"
                                : "bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                            )}
                          >
                            {isFullySelected ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5 text-indigo-500" />
                            )}
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Unified division checklist container */}
                  <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {/* Search Input at the top */}
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search divisions..."
                        value={divisionSearchQuery}
                        onChange={(e) => setDivisionSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md text-sm pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-colors"
                      />
                      {divisionSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDivisionSearchQuery("")}
                          className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {filteredDivisionsForSelect.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3 text-center">
                        {divisionSearchQuery
                          ? `No divisions matching "${divisionSearchQuery}"`
                          : "No divisions found. Create divisions first."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {filteredDivisionsForSelect.map((div) => {
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
                      {selectedDivisionIds.length} division{selectedDivisionIds.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                {/* 2. Select Multiple Subjects */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-indigo-600" /> Target Subject(s):
                    </label>
                    {availableSubjectNames.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={selectAllAvailableSubjects}
                          className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300 dark:text-zinc-700">|</span>
                        <button
                          type="button"
                          onClick={clearAllSubjects}
                          className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedDivisionIds.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 text-center">
                      <p className="text-xs text-slate-500 font-medium">Please select division(s) above first</p>
                    </div>
                  ) : availableSubjectNames.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-center">
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        No subjects found in selected divisions. Please assign subjects first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Checkbox grid for available subjects */}
                      <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="flex flex-wrap gap-2">
                          {availableSubjectNames.map((subName) => {
                            const isSelected = selectedSubjectNames.includes(subName);
                            return (
                              <button
                                key={subName}
                                type="button"
                                onClick={() => toggleSubjectName(subName)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                                  isSelected
                                    ? "bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 shadow-2xs"
                                    : "bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                                )}
                              >
                                {isSelected ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5 text-indigo-500" />
                                )}
                                <span>{subName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedSubjectNames.length > 0 && (
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {selectedSubjectNames.length} subject{selectedSubjectNames.length > 1 ? "s" : ""} selected
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Syllabus File Upload */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" /> Curriculum File:
                  </label>
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-4 transition-colors text-center cursor-pointer",
                      selectedFile
                        ? "border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20"
                        : "border-slate-200 dark:border-zinc-800 hover:border-indigo-300"
                    )}
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.png"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {selectedFile.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-destructive shrink-0 rounded-lg cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="py-2 space-y-1">
                        <FileDown className="h-7 w-7 text-indigo-600 mx-auto opacity-70" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Click to browse or drop document
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          PDF, DOC (Max 2MB) | PNG, JPG (Max 500KB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    isSaving ||
                    selectedDivisionIds.length === 0 ||
                    selectedSubjectNames.length === 0 ||
                    !selectedFile
                  }
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm gap-2 mt-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading Syllabus...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      Apply &amp; Upload Syllabus {selectedDivisionIds.length > 0 && selectedSubjectNames.length > 0 ? `(${selectedDivisionIds.length * selectedSubjectNames.length} Records)` : ""}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Syllabus Directory (Grouped & Table) */}
        <div className="xl:col-span-7">
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b dark:border-zinc-800">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" /> Syllabus Directory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Showing {filteredSyllabuses.length} curriculum file record(s)
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTableIds.length > 0 && (
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
                  value={classFilter}
                  onValueChange={handleClassFilterChange}
                >
                  <SelectTrigger className="w-full sm:w-40 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800/60 font-semibold border-slate-200 dark:border-zinc-700 shrink-0">
                    <SelectValue placeholder="All Classes">
                      {classFilter === "all"
                        ? "All Classes"
                        : getClassNameById(classFilter) || "All Classes"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {schoolClasses.map((cls) => {
                      const classDivs = divisions.filter((d) => d.SchoolClass === cls.id).map((d) => d.id!);
                      const count = syllabuses.filter((sy) => classDivs.includes(sy.division ?? -1)).length;
                      const label =
                        SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
                        cls.school_class;
                      return (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {label} ({count})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Filter by Division */}
                <Select
                  value={divisionFilter}
                  onValueChange={(val) => setDivisionFilter(val || "all")}
                >
                  <SelectTrigger className="w-full sm:w-44 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800/60 font-semibold border-slate-200 dark:border-zinc-700 shrink-0">
                    <SelectValue placeholder="All Divisions">
                      {divisionFilter === "all"
                        ? "All Divisions"
                        : classFilter !== "all"
                        ? getDivisionShortName(Number(divisionFilter))
                        : getDivisionLabel(Number(divisionFilter)) || "All Divisions"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {filterAvailableDivisions.map((div) => (
                      <SelectItem key={div.id} value={div.id!.toString()}>
                        {classFilter !== "all"
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
                    placeholder="Search files..."
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
                  <p className="text-xs text-muted-foreground font-medium">Loading syllabus directory...</p>
                </div>
              ) : viewMode === "grouped" ? (
                /* Grouped Cards per Class */
                <ScrollArea className="h-[540px] p-4 sm:p-5">
                  {groupedSyllabusesByClass.length === 0 ||
                  groupedSyllabusesByClass.every((g) => g.items.length === 0) ? (
                    <div className="py-20 text-center space-y-2">
                      <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        {searchQuery || classFilter !== "all" || divisionFilter !== "all"
                          ? "No syllabus files match your active filters"
                          : "No syllabus files uploaded yet"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Use the panel on the left to upload curriculum files.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {groupedSyllabusesByClass.map((classGroup) => {
                        if (classGroup.items.length === 0) return null;
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
                                  {classGroup.items.length} Syllabus File{classGroup.items.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground font-medium">
                                {classGroup.divisionsCount} total division{classGroup.divisionsCount !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Syllabus Items Grid for this Class */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {classGroup.items.map(({ syllabus, subjectName, divisionName }) => (
                                <div
                                  key={syllabus.id}
                                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-2xs space-y-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <FileText className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-xs capitalize">
                                          {subjectName}
                                        </h4>
                                        <Badge
                                          variant="outline"
                                          className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 text-[10px] px-1.5 py-0 mt-0.5 font-bold"
                                        >
                                          {divisionName}
                                        </Badge>
                                      </div>
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                      title="Delete this syllabus file"
                                      onClick={() => setDeleteTarget(syllabus)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  {/* View Document Button */}
                                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                                    {syllabus.syllabus_file && typeof syllabus.syllabus_file === "string" ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewSyllabus(syllabus)}
                                        disabled={loadingDocId === syllabus.id}
                                        className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 border-slate-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
                                      >
                                        {loadingDocId === syllabus.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <FileText className="h-3.5 w-3.5" />
                                        )}
                                        <span>View Document</span>
                                      </Button>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground italic">No document</span>
                                    )}
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
                  {filteredSyllabuses.length > 0 ? (
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
                            Subject
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5">
                            Class
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5">
                            Division
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5">
                            Document File
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3.5 text-right pr-4">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
                        {filteredSyllabuses.map((item, index) => {
                          const isRowSelected = item.id
                            ? selectedTableIds.includes(item.id)
                            : false;

                          const divObj = divisions.find((d) => d.id === item.division);
                          const clsObj = schoolClasses.find((c) => c.id === divObj?.SchoolClass);
                          const classNameStr = clsObj
                            ? SCHOOL_CLASS_OPTIONS.find((o) => o.value === clsObj.school_class)?.label ||
                              clsObj.school_class
                            : "Unknown Class";

                          return (
                            <TableRow
                              key={item.id || index}
                              className={cn(
                                "hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors",
                                isRowSelected && "bg-indigo-50/40 dark:bg-indigo-950/20"
                              )}
                            >
                              <TableCell className="w-10 text-center py-3.5">
                                <Checkbox
                                  checked={isRowSelected}
                                  onCheckedChange={() => item.id && toggleTableSelect(item.id)}
                                />
                              </TableCell>
                              <TableCell className="w-12 text-center text-xs font-medium text-slate-400 font-mono py-3.5">
                                {index + 1}
                              </TableCell>
                              <TableCell className="py-3.5">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 capitalize">
                                    {getSubjectLabel(item.subject)}
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
                                  {getDivisionShortName(item.division)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3.5">
                                {item.syllabus_file && typeof item.syllabus_file === "string" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewSyllabus(item)}
                                    disabled={loadingDocId === item.id}
                                    className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 border-slate-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
                                  >
                                    {loadingDocId === item.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5" />
                                    )}
                                    <span>View Document</span>
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No file attached</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 text-right pr-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(item)}
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
                      <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        No syllabus records match your search or filter
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

      {/* Delete Single Syllabus Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Remove Syllabus</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove the syllabus document for{" "}
              <strong className="text-slate-900 dark:text-zinc-100">
                {deleteTarget ? getSubjectLabel(deleteTarget.subject) : ""}
              </strong>{" "}
              in <strong>{getDivisionLabel(deleteTarget?.division ?? null)}</strong>?
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
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Yes, Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Delete Selected Syllabuses</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete{" "}
              <strong>{selectedTableIds.length}</strong> selected syllabus record(s)? This action cannot be undone.
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
