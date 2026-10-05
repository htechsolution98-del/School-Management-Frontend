"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Hash,
  School,
  Users,
  Loader2,
  RefreshCw,
  Sparkles,
  Search,
  CheckCircle2,
  Download,
  Filter,
  ArrowUpDown,
  Save,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import {
  fetchStudentsByClassAndDivision,
  bulkSaveRollNumbers,
  type StudentRollRecord,
} from "@/lib/clerk/roll-numbers";
import type { SchoolClass, Division } from "@/types/clerk";

type SortMode = "NAME_ASC" | "GR_ASC";

interface EditableRollItem extends StudentRollRecord {
  tempRollNo: string;
  isModified?: boolean;
}

export default function AssignRollNoPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [students, setStudents] = useState<EditableRollItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("NAME_ASC");

  // Fetch initial classes & divisions
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [classesData, divisionsData] = await Promise.all([
        getClasses(),
        getDivisions(),
      ]);

      setClasses(classesData || []);
      setDivisions(divisionsData || []);

      if (classesData && classesData.length > 0 && !selectedClassId) {
        setSelectedClassId(String(classesData[0].id));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load class and division data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch Students whenever Class or Division selection changes
  const loadStudents = async () => {
    if (!selectedClassId) return;
    setIsLoading(true);
    try {
      const data = await fetchStudentsByClassAndDivision(selectedClassId, selectedDivFilter);
      const editableData: EditableRollItem[] = (data || []).map((s) => ({
        ...s,
        tempRollNo: s.roll_no || "",
        isModified: false,
      }));
      setStudents(editableData);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load students.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      loadStudents();
    }
  }, [selectedClassId, selectedDivFilter]);

  // Current class details
  const currentClassObj = classes.find((c) => String(c.id) === selectedClassId);

  // Available divisions for selected class
  const classCreatedDivisions = divisions.filter(
    (d) => String(d.SchoolClass) === selectedClassId
  );
  const divNames = Array.from(
    new Set(classCreatedDivisions.map((d) => d.division).filter(Boolean))
  ).sort();

  // Helper for full student name (Surname + Student Name + Father Name)
  const getFullName = (s: StudentRollRecord): string => {
    if (s.full_name) return s.full_name;
    const sn = (s.surname || "").trim();
    const fn = (s.name || "").trim();
    const fth = (s.father_name || "").trim();
    const parts = [sn, fn, fth].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
    return fn || sn || `Student #${s.id}`;
  };

  // Real-time Duplicate Roll Numbers Detection (per division)
  const duplicateRollNos = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((s) => {
      const val = s.tempRollNo.trim();
      if (val) {
        const key = `${s.division || "ALL"}_${val}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    const dupes = new Set<string>();
    counts.forEach((cnt, key) => {
      if (cnt > 1) {
        dupes.add(key);
      }
    });
    return dupes;
  }, [students]);

  const hasDuplicates = duplicateRollNos.size > 0;

  // Filtered & Sorted Student List
  const processedStudents = useMemo(() => {
    let result = [...students];

    // Filter search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const name = getFullName(s).toLowerCase();
        const gr = (s.gr_no || "").toLowerCase();
        const adm = (s.admission_number || "").toLowerCase();
        const roll = (s.tempRollNo || "").toLowerCase();
        return name.includes(q) || gr.includes(q) || adm.includes(q) || roll.includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortMode === "NAME_ASC") {
        return getFullName(a).localeCompare(getFullName(b));
      } else {
        const grA = parseInt(a.gr_no || "0", 10) || 0;
        const grB = parseInt(b.gr_no || "0", 10) || 0;
        if (grA !== grB) return grA - grB;
        return getFullName(a).localeCompare(getFullName(b));
      }
    });

    return result;
  }, [students, searchQuery, sortMode]);

  // Handle individual Roll No input change
  const handleRollChange = (studentId: number, val: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            tempRollNo: val,
            isModified: val !== (s.roll_no || ""),
          };
        }
        return s;
      })
    );
  };

  // ⚡ Auto-Generate Unique Roll Numbers (1 to N per division) based on current sort order
  const handleAutoGenerate = () => {
    if (processedStudents.length === 0) {
      toast.error("No students found to generate roll numbers.");
      return;
    }

    // Create a map of student ID to assigned sequential roll number per division
    const rollMap = new Map<number, string>();
    const divCounters = new Map<string, number>();

    processedStudents.forEach((st) => {
      const divKey = (st.division || "ALL").trim().toUpperCase();
      const current = (divCounters.get(divKey) || 0) + 1;
      divCounters.set(divKey, current);
      rollMap.set(st.id, String(current));
    });

    setStudents((prev) =>
      prev.map((s) => {
        if (rollMap.has(s.id)) {
          const newRoll = rollMap.get(s.id)!;
          return {
            ...s,
            tempRollNo: newRoll,
            isModified: newRoll !== (s.roll_no || ""),
          };
        }
        return s;
      })
    );

    toast.success(
      `⚡ Auto-generated sequential Roll Numbers (starting from 1 per division) based on ${
        sortMode === "NAME_ASC" ? "Alphabetical Order" : "GR Number"
      }!`
    );
  };

  // Reset all temporary edits
  const handleReset = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        tempRollNo: s.roll_no || "",
        isModified: false,
      }))
    );
    toast.info("Roll number edits reset to saved values.");
  };

  // Save all modified roll numbers to backend
  const handleSave = async () => {
    if (hasDuplicates) {
      toast.error(
        `Duplicate Roll Number(s) detected in the same division! Each student in the same division must have a unique Roll Number.`
      );
      return;
    }

    const modifiedItems = students.filter((s) => s.isModified);
    if (modifiedItems.length === 0) {
      toast.info("No roll number changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = modifiedItems.map((s) => ({
        student_id: s.id,
        admission_number: s.admission_number,
        roll_no: s.tempRollNo.trim() ? s.tempRollNo.trim() : null,
      }));

      const res = await bulkSaveRollNumbers(payload);
      toast.success(`🎉 ${res.message || "Roll numbers saved successfully!"}`);

      // Refresh student list from server
      await loadStudents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save roll numbers.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export CSV Roster
  const handleExportCSV = () => {
    if (processedStudents.length === 0) {
      toast.error("No student records to export.");
      return;
    }

    const classNameStr = currentClassObj?.school_class || "Class";
    const divStr = selectedDivFilter === "ALL" ? "All_Divisions" : `Div_${selectedDivFilter}`;

    const headers = ["Roll No", "GR Number", "Student Name", "Class", "Division", "Mobile"];
    const rows = processedStudents.map((s) => [
      `"${s.tempRollNo || "Unassigned"}"`,
      `"${s.gr_no || "N/A"}"`,
      `"${getFullName(s)}"`,
      `"${classNameStr}"`,
      `"${s.division || "Unassigned"}"`,
      `"${s.mobile || "N/A"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${classNameStr}_${divStr}_Roll_Call_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`📥 Exported Roll Call Roster (${processedStudents.length} students) to CSV!`);
  };

  const modifiedCount = students.filter((s) => s.isModified).length;
  const assignedCount = students.filter((s) => s.tempRollNo.trim() !== "").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Hash className="h-6 w-6 text-indigo-600" />
              Assign Division Roll Numbers
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              Clerk Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-generate or manually edit unique sequential roll numbers (1, 2, 3...) per division.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadStudents}
            disabled={isLoading || !selectedClassId}
            className="rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || modifiedCount === 0 || hasDuplicates}
            className={`rounded-xl text-xs gap-1.5 font-bold shadow-xs ${
              hasDuplicates
                ? "bg-zinc-300 text-zinc-600 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes {modifiedCount > 0 ? `(${modifiedCount})` : ""}
          </Button>
        </div>
      </div>

      {/* Duplicate Warning Banner */}
      {hasDuplicates && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 flex items-start gap-3.5 shadow-2xs">
          <div className="h-8 w-8 rounded-xl bg-red-100 dark:bg-red-900/60 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-red-900 dark:text-red-200 uppercase tracking-wider">
              Duplicate Roll Numbers Detected!
            </h4>
            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
              Roll Number(s){" "}
              <strong className="font-mono font-extrabold text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/80 px-1.5 py-0.5 rounded">
                [{Array.from(duplicateRollNos).join(", ")}]
              </strong>{" "}
              are assigned to multiple students. Each student in a class must have a <strong>unique</strong> Roll Number. Please fix duplicate numbers before saving.
            </p>
          </div>
        </div>
      )}

      {/* Control Card: Filters & Auto-Generation Options */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-indigo-600" /> Selection & Roll Number Generator
          </CardTitle>
          <CardDescription className="text-xs">
            Select Class & Division, then auto-number students sequentially or customize manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1: Select Class */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <School className="h-3.5 w-3.5 text-indigo-600" /> Class:
              </label>
              <Select
                value={selectedClassId}
                onValueChange={(val) => {
                  if (val) setSelectedClassId(val);
                }}
              >
                <SelectTrigger className="w-full h-9 rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium text-xs">
                  <SelectValue placeholder="Select Class...">
                    {currentClassObj ? currentClassObj.school_class : "Select Class..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.school_class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Division */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-purple-600" /> Division:
              </label>
              <Select value={selectedDivFilter} onValueChange={(val) => setSelectedDivFilter(val || "ALL")}>
                <SelectTrigger className="w-full h-9 rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium text-xs">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Divisions</SelectItem>
                  {divNames.map((d) => (
                    <SelectItem key={d} value={d}>
                      Division {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Sort Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-amber-600" /> Auto-Sequence Order:
              </label>
              <Select value={sortMode} onValueChange={(val) => { if (val) setSortMode(val as SortMode); }}>
                <SelectTrigger className="w-full h-9 rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NAME_ASC">Alphabetical (Student Name A-Z)</SelectItem>
                  <SelectItem value="GR_ASC">GR Number Order (Ascending)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action: Auto Generate */}
            <div className="flex items-end gap-2">
              <Button
                onClick={handleAutoGenerate}
                disabled={isLoading || students.length === 0}
                className="w-full h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Generate Roll Nos
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-4 text-slate-600 dark:text-zinc-400 font-medium">
              <span>Total Students: <strong className="text-slate-900 dark:text-zinc-100">{students.length}</strong></span>
              <span>Assigned Roll Nos: <strong className="text-emerald-600">{assignedCount}</strong></span>
              <span>Unassigned: <strong className="text-amber-600">{students.length - assignedCount}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              {modifiedCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="rounded-xl text-xs gap-1 text-slate-500 hover:text-slate-900 h-8"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Edits
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                disabled={processedStudents.length === 0}
                className="rounded-xl text-xs gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 h-8"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export Roster CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Student Roster & Roll Number Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              Student Roster — {currentClassObj?.school_class || "Class"}{" "}
              {selectedDivFilter !== "ALL" ? `(Div ${selectedDivFilter})` : "(All Divisions)"}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Type directly in the Roll No box or click Auto-Generate above.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, GR no, roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              Loading student roster...
            </div>
          ) : processedStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              No students found for the selected Class/Division filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-zinc-800/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                    <TableHead className="w-36 font-bold text-xs">Roll No.</TableHead>
                    <TableHead className="w-32 font-bold text-xs">GR Number</TableHead>
                    <TableHead className="font-bold text-xs">Student Name</TableHead>
                    <TableHead className="w-32 font-bold text-xs">Division</TableHead>
                    <TableHead className="w-36 font-bold text-xs">Mobile</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {processedStudents.map((st, idx) => {
                    const fullName = getFullName(st);
                    const dupKey = `${st.division || "ALL"}_${st.tempRollNo.trim()}`;
                    const isDup = Boolean(st.tempRollNo.trim() && duplicateRollNos.has(dupKey));

                    return (
                      <TableRow
                        key={st.id}
                        className={
                          isDup
                            ? "bg-red-50/50 dark:bg-red-950/30"
                            : st.isModified
                            ? "bg-amber-50/40 dark:bg-amber-950/20"
                            : ""
                        }
                      >
                        <TableCell className="text-center text-xs font-medium text-slate-500 font-mono">
                          {idx + 1}
                        </TableCell>

                        {/* Roll Number Input */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="text"
                              value={st.tempRollNo}
                              placeholder="e.g. 1"
                              onChange={(e) => handleRollChange(st.id, e.target.value)}
                              className={`h-8 w-24 text-xs font-bold rounded-lg text-center ${
                                isDup
                                  ? "border-red-500 bg-red-50 text-red-950 focus:ring-red-500 dark:bg-red-950 dark:text-red-100"
                                  : st.isModified
                                  ? "border-amber-400 bg-amber-50 text-amber-950 focus:ring-amber-400"
                                  : "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                              }`}
                            />
                            {isDup ? (
                              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                            ) : st.tempRollNo && !st.isModified ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs font-mono font-semibold text-slate-700 dark:text-zinc-300">
                          {st.gr_no || <span className="text-slate-400 italic">Unassigned</span>}
                        </TableCell>

                        <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                          {fullName}
                        </TableCell>

                        <TableCell className="text-xs">
                          <Badge variant="outline" className="font-mono bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                            Div {st.division || "N/A"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600 dark:text-zinc-400">
                          {st.mobile || "—"}
                        </TableCell>

                        <TableCell className="text-center">
                          {isDup ? (
                            <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] uppercase font-bold">
                              Duplicate
                            </Badge>
                          ) : st.isModified ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] uppercase">
                              Modified
                            </Badge>
                          ) : st.roll_no ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase">
                              Saved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] uppercase">
                              Empty
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
