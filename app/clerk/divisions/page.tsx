"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
  Pencil,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import {
  getClasses,
  getDivisions,
  saveDivision,
  updateDivision,
  deleteDivision,
} from "@/lib/clerk";
import type { Division, SchoolClass } from "@/types/clerk";
import { SCHOOL_CLASS_OPTIONS } from "@/lib/form-builder-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Division | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editTarget, setEditTarget] = useState<Division | null>(null);
  const [editCapacity, setEditCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [divisionName, setDivisionName] = useState("");
  const [capacity, setCapacity] = useState("");

  // Table Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getClassLabel = (
    classId: number | null | undefined,
    classes: SchoolClass[] = schoolClasses
  ) => {
    if (classId === null || classId === undefined) return "Unknown";
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return `Class #${classId}`;
    return (
      SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
      cls.school_class
    );
  };

  const getDivisionClassName = (
    div: Division,
    classes: SchoolClass[] = schoolClasses
  ) => {
    if (div.class_name) return div.class_name;
    return getClassLabel(div.SchoolClass, classes);
  };

  // Two-Level Table Sorting logic
  // Primary Sort: Group by Class Name (alphabetical / alphanumeric)
  // Secondary Sort: Within the same Class, sort alphabetically by Division Name (A, B, C, etc.)
  const sortDivisionsList = (
    items: Division[],
    classes: SchoolClass[] = schoolClasses
  ) => {
    return [...items].sort((a, b) => {
      const classA = getDivisionClassName(a, classes);
      const classB = getDivisionClassName(b, classes);

      const classComp = classA.localeCompare(classB, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      if (classComp !== 0) {
        return classComp;
      }

      const divA = (a.division ?? "").trim();
      const divB = (b.division ?? "").trim();
      return divA.localeCompare(divB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesData, divisionsData] = await Promise.all([
        getClasses(),
        getDivisions(),
      ]);

      const sortedClasses = [...classesData].sort((a, b) => {
        const indexA = SCHOOL_CLASS_OPTIONS.findIndex(
          (opt) => opt.value === a.school_class
        );
        const indexB = SCHOOL_CLASS_OPTIONS.findIndex(
          (opt) => opt.value === b.school_class
        );
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        return a.school_class.localeCompare(b.school_class, undefined, {
          numeric: true,
        });
      });
      setSchoolClasses(sortedClasses);

      // Pre-sort divisions state before setting
      const sortedDivisions = sortDivisionsList(divisionsData, sortedClasses);
      setDivisions(sortedDivisions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast.error("Could not load divisions or classes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    const trimmedDivision = divisionName.trim();
    if (!trimmedDivision) {
      toast.error("Please enter a division name");
      return;
    }

    const numCapacity = parseInt(capacity, 10);
    if (isNaN(numCapacity) || numCapacity <= 0 || !Number.isInteger(parseFloat(capacity))) {
      toast.error("Capacity must be a positive integer");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Division = {
        SchoolClass: parseInt(selectedClassId),
        division: trimmedDivision,
        capacity: numCapacity,
      };

      await saveDivision(payload);
      toast.success("Division created successfully");

      // Reset form
      setDivisionName("");
      setCapacity("");

      // Refresh list
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create division"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      await deleteDivision(deleteTarget.id);
      toast.success("Division deleted successfully");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete division"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (div: Division) => {
    setEditTarget(div);
    setEditCapacity(
      div.capacity !== undefined && div.capacity !== null
        ? String(div.capacity)
        : ""
    );
  };

  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget?.id) return;

    const num = parseInt(editCapacity, 10);
    if (isNaN(num) || num <= 0 || !Number.isInteger(parseFloat(editCapacity))) {
      toast.error("Capacity must be a positive integer");
      return;
    }

    setIsUpdating(true);
    try {
      await updateDivision(editTarget.id, {
        capacity: num,
        SchoolClass: editTarget.SchoolClass,
        division: editTarget.division,
      });
      toast.success(
        `Capacity for Division ${editTarget.division} updated successfully`
      );
      setEditTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update division capacity"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Ensure divisions are sorted before rendering
  const sortedDivisions = useMemo(() => {
    return sortDivisionsList(divisions, schoolClasses);
  }, [divisions, schoolClasses]);

  // Filtered divisions by search and class selection
  const filteredDivisions = useMemo(() => {
    return sortedDivisions.filter((div) => {
      const className = getDivisionClassName(div);
      const matchesClass =
        filterClassId === "all" || String(div.SchoolClass) === filterClassId;
      if (!matchesClass) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const divLabel = (div.division ?? "").toLowerCase();
      const classLabel = className.toLowerCase();
      const capLabel = String(div.capacity ?? "");

      return (
        classLabel.includes(query) ||
        divLabel.includes(query) ||
        capLabel.includes(query)
      );
    });
  }, [sortedDivisions, filterClassId, searchQuery, schoolClasses]);

  // Pagination calculation
  const totalItems = filteredDivisions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedDivisions = filteredDivisions.slice(startIndex, endIndex);

  return (
    <div className="flex-1 space-y-6 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            Division Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define, group, and manage section capacities across school classes.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={isLoading}
          className="rounded-xl shadow-xs"
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <Separator />

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Form Panel: Add New Division */}
        <div className="xl:col-span-4">
          <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                Add New Division
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Create a new section for an existing class.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
              <form onSubmit={handleAddDivision} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    School Class
                  </label>
                  <Select
                    value={selectedClassId}
                    onValueChange={(val) => setSelectedClassId(val || "")}
                    disabled={isLoading || schoolClasses.length === 0}
                  >
                    <SelectTrigger className="w-full h-10 bg-slate-50/70 border-slate-200 text-sm rounded-xl focus:bg-white transition-colors">
                      <SelectValue placeholder="Select a class">
                        {selectedClassId
                          ? getClassLabel(parseInt(selectedClassId))
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {schoolClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {SCHOOL_CLASS_OPTIONS.find(
                            (o) => o.value === cls.school_class
                          )?.label || cls.school_class}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Division Name / Section
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. A, B, C or 1, 2, 3"
                    value={divisionName}
                    onChange={(e) => setDivisionName(e.target.value)}
                    className="h-10 bg-slate-50/70 border-slate-200 text-sm rounded-xl focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Student Capacity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 40"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="h-10 bg-slate-50/70 border-slate-200 text-sm rounded-xl focus:bg-white transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    isSaving || !selectedClassId || !divisionName || !capacity
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Division...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Division
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Existing Divisions Table */}
        <div className="xl:col-span-8">
          <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Existing Divisions
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="font-semibold text-xs bg-slate-100 text-slate-700"
                    >
                      {sortedDivisions.length} Total
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Grouped by class and sorted alphabetically by division
                  </CardDescription>
                </div>

                {/* Filter and Search Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search class or division..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setCurrentPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Select
                    value={filterClassId}
                    onValueChange={(val) => {
                      setFilterClassId(val || "all");
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[140px] text-xs bg-slate-50 border-slate-200 rounded-xl">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Classes</SelectItem>
                      {schoolClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {SCHOOL_CLASS_OPTIONS.find(
                            (o) => o.value === cls.school_class
                          )?.label || cls.school_class}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 border-b border-gray-200">
                    <TableRow className="border-b border-gray-200 hover:bg-transparent">
                      <TableHead className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
                        School Class
                      </TableHead>
                      <TableHead className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
                        Division
                      </TableHead>
                      <TableHead className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
                        Student Capacity
                      </TableHead>
                      <TableHead className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-14 text-center text-slate-500 align-middle"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                            <span className="text-xs font-medium">
                              Loading divisions...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedDivisions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-14 text-center text-slate-500 align-middle"
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <p className="font-semibold text-slate-700 text-sm">
                              {divisions.length === 0
                                ? "No divisions created yet"
                                : "No divisions match your search"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {divisions.length === 0
                                ? "Use the form on the left to add a division."
                                : "Try clearing your filters or search query."}
                            </p>
                            {searchQuery || filterClassId !== "all" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearchQuery("");
                                  setFilterClassId("all");
                                  setCurrentPage(1);
                                }}
                                className="mt-2 h-8 text-xs rounded-lg"
                              >
                                Clear Filters
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDivisions.map((div) => (
                        <TableRow
                          key={div.id ?? `${div.SchoolClass}-${div.division}`}
                          className="border-b border-gray-100 hover:bg-slate-50/70 transition-colors"
                        >
                          <TableCell className="py-4 px-6 border-b border-gray-100 align-middle font-medium text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                              <span className="font-semibold">
                                {getDivisionClassName(div)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-b border-gray-100 align-middle">
                            <span className="inline-flex items-center justify-center font-semibold text-slate-800 bg-slate-100 border border-slate-200/60 rounded-md px-2.5 py-1 text-xs">
                              Division {div.division}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-6 border-b border-gray-100 align-middle text-slate-600 font-medium">
                            {div.capacity ?? "—"} students
                          </TableCell>
                          <TableCell className="py-4 px-6 border-b border-gray-100 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(div)}
                                title={`Edit Capacity for Division ${div.division}`}
                                aria-label={`Edit Capacity for Division ${div.division} for ${getDivisionClassName(div)}`}
                                disabled={isDeleting || isUpdating}
                                className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(div)}
                                title={`Delete Division ${div.division}`}
                                aria-label={`Delete Division ${div.division} for ${getDivisionClassName(div)}`}
                                disabled={isDeleting || isUpdating}
                                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Table Footer with Pagination & Count */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3.5 border-t border-slate-100 text-xs text-slate-500 bg-white">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing {startIndex + 1}–{endIndex} of {totalItems} divisions
                    </span>
                    {totalItems > 10 && (
                      <label className="flex items-center gap-1.5 ml-2">
                        <span>Per page:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </label>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage <= 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="h-7 w-7 p-0 rounded-md cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="px-2">
                        Page {safeCurrentPage} of {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="h-7 w-7 p-0 rounded-md cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Division</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Division{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.division}
              </span>{" "}
              for{" "}
              {deleteTarget ? getDivisionClassName(deleteTarget) : ""}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4 flex flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-xl"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Division"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Capacity Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && !isUpdating && setEditTarget(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Division Capacity</DialogTitle>
            <DialogDescription>
              Update student capacity for Division{" "}
              <span className="font-semibold text-slate-900">
                {editTarget?.division}
              </span>{" "}
              ({editTarget ? getDivisionClassName(editTarget) : ""}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCapacity} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Student Capacity
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Enter new capacity"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                autoFocus
                className="h-10 bg-slate-50 border-slate-200 rounded-xl"
                disabled={isUpdating}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-4 flex flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={isUpdating}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !editCapacity}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Capacity"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
