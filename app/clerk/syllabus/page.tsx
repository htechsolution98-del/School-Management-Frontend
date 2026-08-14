"use client";

import { useEffect, useState } from "react";
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

  // Table selection state
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Form State
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

      setSchoolClasses(classesData);
      setDivisions(divisionsData);
      setSubjects(subjectsData);
      setSyllabuses(syllabusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast.error("Could not load syllabus records");
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
    const visibleDivs =
      classFilter === "all"
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDivisionIds.length === 0) {
      toast.error("Please select at least one division");
      return;
    }

    if (!selectedSubjectName) {
      toast.error("Please select a subject");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a syllabus file");
      return;
    }

    setIsSaving(true);
    try {
      const uploadsToMake: { division: number; subject: number }[] = [];
      const missingDivisions: string[] = [];

      for (const divId of selectedDivisionIds) {
        const matchingSub = subjects.find(
          (s) =>
            s.division === divId &&
            s.name.trim().toLowerCase() === selectedSubjectName.trim().toLowerCase()
        );

        if (matchingSub?.id) {
          uploadsToMake.push({ division: divId, subject: matchingSub.id });
        } else {
          missingDivisions.push(getDivisionLabel(divId));
        }
      }

      if (uploadsToMake.length === 0) {
        toast.error(
          `Subject '${selectedSubjectName}' is not assigned to any of the selected divisions.`
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
          `Syllabus updated for ${uploadsToMake.length} division(s) (replaced ${replacedCount} previous file${replacedCount > 1 ? "s" : ""})`
        );
      } else if (missingDivisions.length > 0) {
        toast.success(
          `Uploaded for ${uploadsToMake.length} division(s). (${missingDivisions.length} division(s) didn't have subject '${selectedSubjectName}')`
        );
      } else {
        toast.success(
          `Syllabus uploaded successfully for ${uploadsToMake.length} division(s)!`
        );
      }

      // Reset form
      setSelectedFile(null);
      setSelectedSubjectName("");
      setSelectedDivisionIds([]);

      // Refresh list
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload syllabus",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      await deleteSyllabus(deleteTarget.id);
      toast.success("Syllabus record deleted");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete syllabus",
      );
    } finally {
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

  const getSubjectLabel = (subjectId: number | null) => {
    if (subjectId === null) return "Unknown Subject";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : `Subject #${subjectId}`;
  };

  const filteredSyllabuses = syllabuses.filter((s) => {
    const subName = getSubjectLabel(s.subject).toLowerCase();
    const divLabel = getDivisionLabel(s.division).toLowerCase();
    const query = searchQuery.toLowerCase();
    return subName.includes(query) || divLabel.includes(query);
  });

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

  // Unique subject names across selected divisions (or all divisions)
  const availableSubjectNames = Array.from(
    new Set(
      subjects
        .filter(
          (s) =>
            s.division !== null &&
            (selectedDivisionIds.length === 0 ||
              selectedDivisionIds.includes(s.division))
        )
        .map((s) => s.name.trim())
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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
            Syllabus Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Upload and organize curriculum documents for each subject.
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
        {/* Upload Form */}
        <div className="xl:col-span-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Upload Syllabus
              </CardTitle>
              <CardDescription>
                Attach a syllabus file to single or multiple divisions at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleAddSyllabus} className="space-y-4">
                {/* Division Multi-Selection */}
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

                  {/* Filter by Class */}
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

                  {/* Quick Class Badges */}
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

                  {/* Scrollable division checklist */}
                  <ScrollArea className="h-44 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
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

                {/* Subject Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedSubjectName}
                    onValueChange={(val) => setSelectedSubjectName(val || "")}
                    disabled={
                      isLoading ||
                      selectedDivisionIds.length === 0 ||
                      availableSubjectNames.length === 0
                    }
                  >
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                      <SelectValue
                        placeholder={
                          selectedDivisionIds.length === 0
                            ? "Select division(s) first"
                            : availableSubjectNames.length === 0
                            ? "No subjects in selected division(s)"
                            : "Select a subject"
                        }
                      >
                        {selectedSubjectName || undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjectNames.map((subName) => (
                        <SelectItem key={subName} value={subName}>
                          {subName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Syllabus File */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Syllabus File <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-4 transition-colors text-center cursor-pointer",
                      selectedFile
                        ? "border-primary/50 bg-primary/5"
                        : "border-slate-200 hover:border-primary/30",
                    )}
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                  >
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.png"
                    />
                    {selectedFile ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2">
                        <div className="flex items-center gap-2 overflow-hidden w-full">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm font-medium truncate text-slate-700">
                            {selectedFile.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="py-2">
                        <FileDown className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">
                          Click to browse or drag & drop
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          PDF, DOC, PNG, JPG (Max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={
                    isSaving ||
                    selectedDivisionIds.length === 0 ||
                    !selectedSubjectName ||
                    !selectedFile
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload Record ${selectedDivisionIds.length > 0 ? `(${selectedDivisionIds.length} Divisions)` : ""}`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Syllabus List */}
        <div className="xl:col-span-8">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Syllabus Directory</CardTitle>
                  <CardDescription>
                    Browse curriculum files by class and subject
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
                      placeholder="Search file directory..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ScrollArea className="h-[450px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 py-20 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary/40" />
                    <p>Loading directory...</p>
                  </div>
                ) : filteredSyllabuses.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">
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
                            Division
                          </th>
                          <th className="px-6 py-3 text-left font-semibold">
                            File
                          </th>
                          <th className="px-6 py-3 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSyllabuses.map((item, index) => {
                          const isRowSelected = item.id ? selectedTableIds.includes(item.id) : false;
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
                                <div className="font-semibold text-slate-900 capitalize">
                                  {getSubjectLabel(item.subject)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-600 border-slate-200 whitespace-nowrap"
                                >
                                  {getDivisionLabel(item.division)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                {item.syllabus_file &&
                                typeof item.syllabus_file === "string" ? (
                                  <a
                                    href={item.syllabus_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-primary hover:underline font-medium"
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span>View Document</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    No file attached
                                  </span>
                                )}
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
                      <FileText className="h-10 w-10 text-slate-200" />
                    </div>
                    <p className="text-sm text-slate-400 max-w-[200px]">
                      {searchQuery
                        ? "No matching records found"
                        : "No syllabus files uploaded yet"}
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
            <DialogTitle>Remove Syllabus</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the syllabus for{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget ? getSubjectLabel(deleteTarget.subject) : ""}
              </span>
              ? This file will be permanently deleted.
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
                "Delete Record"
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
            <DialogTitle>Delete Selected Syllabus Records</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {selectedTableIds.length} syllabus record(s)
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
                `Delete ${selectedTableIds.length} Record(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
