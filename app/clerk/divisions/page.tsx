"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  getClasses,
  getDivisions,
  saveDivision,
  deleteDivision,
} from "@/lib/clerk";
import type { Division, SchoolClass } from "@/types/clerk";
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
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Division | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [divisionName, setDivisionName] = useState("");
  const [capacity, setCapacity] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesData, divisionsData] = await Promise.all([
        getClasses(),
        getDivisions(),
      ]);
      const sortedClasses = classesData.sort((a, b) => {
        const indexA = SCHOOL_CLASS_OPTIONS.findIndex(
          (opt) => opt.value === a.school_class,
        );
        const indexB = SCHOOL_CLASS_OPTIONS.findIndex(
          (opt) => opt.value === b.school_class,
        );
        return indexA - indexB;
      });
      setSchoolClasses(sortedClasses);

      const sortedDivisions = divisionsData.sort((a, b) => {
        const classA = classesData.find((c) => c.id === a.SchoolClass);
        const classB = classesData.find((c) => c.id === b.SchoolClass);

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

        // Same class, sort by division name (A, B, C or 1, 2, 3)
        return a.division.localeCompare(b.division, undefined, {
          numeric: true,
        });
      });

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

    const isPositiveInteger = (val: string) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0 && Number.isInteger(parseFloat(val));
    };

    if (!isPositiveInteger(divisionName)) {
      toast.error("Division must be a positive integer");
      return;
    }

    if (!isPositiveInteger(capacity)) {
      toast.error("Capacity must be a positive integer");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Division = {
        SchoolClass: parseInt(selectedClassId),
        division: divisionName,
        capacity: parseInt(capacity),
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
        err instanceof Error ? err.message : "Failed to create division",
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
        err instanceof Error ? err.message : "Failed to delete division",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getClassLabel = (classId: number | null) => {
    if (classId === null) return "Unknown";
    const cls = schoolClasses.find((c) => c.id === classId);
    if (!cls) return `Class #${classId}`;
    return (
      SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
      cls.school_class
    );
  };

  const divisionColumns = useMemo<DataTableColumn<Division>[]>(
    () => [
      {
        key: "class",
        header: "School Class",
        sticky: true,
        headClassName: "bg-slate-50",
        cellClassName: "whitespace-nowrap font-medium text-slate-700",
        search: div => [getClassLabel(div.SchoolClass)],
        render: div => getClassLabel(div.SchoolClass),
      },
      {
        key: "division",
        header: "Division",
        search: div => [div.division],
        render: div => (
          <span className="font-semibold text-slate-900">{div.division}</span>
        ),
      },
      {
        key: "capacity",
        header: "Student Capacity",
        align: "right",
        numeric: true,
        search: div => [div.capacity],
        render: div => (
          <span className="text-slate-600">{div.capacity ?? "—"}</span>
        ),
      },
    ],
    [schoolClasses],
  );

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white min-h-screen overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            Division Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Define and manage divisions for each school class.
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
                Add New Division
              </CardTitle>
              <CardDescription>
                Create a new section for an existing class.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleAddDivision} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Class
                  </label>
                  <Select
                    value={selectedClassId}
                    onValueChange={(val) => setSelectedClassId(val || "")}
                    disabled={isLoading || schoolClasses.length === 0}
                  >
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select a class">
                        {selectedClassId
                          ? getClassLabel(parseInt(selectedClassId))
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {schoolClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {SCHOOL_CLASS_OPTIONS.find(
                            (o) => o.value === cls.school_class,
                          )?.label || cls.school_class}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    No. of Division
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 1, 2, 3..."
                    value={divisionName}
                    onChange={(e) => setDivisionName(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Student Capacity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Max students"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={
                    isSaving || !selectedClassId || !divisionName || !capacity
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Division"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Divisions List */}
        <div className="xl:col-span-8">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <div>
                <CardTitle className="text-lg">Existing Divisions</CardTitle>
                <CardDescription>
                  All active divisions across classes
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <DataTable
                data={divisions}
                columns={divisionColumns}
                getRowId={(div, index) => div.id ?? index}
                createdDate
                createdDateRange
                search
                searchPlaceholder="Search classes or divisions..."
                searchAriaLabel="Search divisions"
                searchExtra={div => [getClassLabel(div.SchoolClass)]}
                loading={isLoading}
                loadingLabel="Loading divisions..."
                emptyTitle="No divisions created yet"
                emptyDescription="Create a division to get started."
                noResultsTitle="No divisions match your search"
                caption="Existing divisions"
                minWidth={700}
                filters={[
                  {
                    key: "class",
                    label: "School Class",
                    optionsFrom: rows => dynamicOptions(rows, div => getClassLabel(div.SchoolClass)),
                    match: (div, value) => getClassLabel(div.SchoolClass) === value,
                  },
                  {
                    key: "division",
                    label: "Division",
                    optionsFrom: rows => dynamicOptions(rows, div => div.division),
                    match: (div, value) => div.division === value,
                  },
                ]}
                renderActions={div => (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(div)}
                    title={`Delete Division ${div.division}`}
                    aria-label={`Delete Division ${div.division} for ${getClassLabel(div.SchoolClass)}`}
                    disabled={isDeleting}
                    className="h-10 w-10 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>

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
              for {deleteTarget ? getClassLabel(deleteTarget.SchoolClass) : ""}?
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
                "Delete Division"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
