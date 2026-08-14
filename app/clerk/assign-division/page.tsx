"use client";

import { useEffect, useState } from "react";
import {
  School,
  Layers,
  Users,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Search,
  ShieldCheck,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { fetchAdmissions, patchFieldValues, patchStudentDivision } from "@/lib/clerk/admissions";
import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import type { Admission, SchoolClass, Division } from "@/types/clerk";

export default function AssignDivisionPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Class ID & Division Filter
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [admissionsData, classesData, divisionsData] = await Promise.all([
        fetchAdmissions(),
        getClasses(),
        getDivisions(),
      ]);

      setAdmissions(admissionsData || []);
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
    fetchData();
  }, []);

  // Helper getters
  const getFieldValue = (adm: Admission, fieldNamePartial: string): string => {
    const fv = adm.field_values.find((f) =>
      f.field_label.toLowerCase().includes(fieldNamePartial.toLowerCase())
    );
    return fv ? fv.value : "";
  };

  const getStudentName = (adm: Admission): string => {
    const fn = getFieldValue(adm, "first name") || getFieldValue(adm, "student name") || getFieldValue(adm, "name");
    const ln = getFieldValue(adm, "last name") || getFieldValue(adm, "surname");
    if (fn || ln) return `${fn} ${ln}`.trim();
    return `Student ${adm.admission_number}`;
  };

  const getStudentClassId = (adm: Admission): number | null => {
    const val = getFieldValue(adm, "applying for class") || getFieldValue(adm, "class");
    if (!val) return null;
    const num = parseInt(val, 10);
    if (!isNaN(num)) return num;

    const matchedCls = classes.find(
      (c) => c.school_class.toLowerCase().trim() === val.toLowerCase().trim()
    );
    return matchedCls ? matchedCls.id : null;
  };

  const getStudentDivision = (adm: Admission): string => {
    if (adm.division) return adm.division;
    const val = getFieldValue(adm, "division") || getFieldValue(adm, "section") || getFieldValue(adm, "sec");
    return val || "";
  };

  // Selected Class object
  const currentClassObj = classes.find((c) => String(c.id) === selectedClassId);

  // Created Divisions for Selected Class
  const classCreatedDivisions = divisions.filter(
    (d) => String(d.SchoolClass) === selectedClassId
  );
  const createdDivNames = classCreatedDivisions
    .map((d) => d.division)
    .filter(Boolean)
    .sort();

  // Enrolled Students for Selected Class
  const classStudents = admissions.filter((adm) => {
    if (!selectedClassId) return true;
    const cId = getStudentClassId(adm);
    if (cId === Number(selectedClassId)) return true;
    if (currentClassObj) {
      const clsName = getFieldValue(adm, "applying for class") || getFieldValue(adm, "class");
      return clsName.toLowerCase().trim() === currentClassObj.school_class.toLowerCase().trim();
    }
    return false;
  });

  // Filtered by Division & Search
  const filteredStudents = classStudents.filter((adm) => {
    const sDiv = getStudentDivision(adm);
    if (selectedDivFilter !== "ALL") {
      if (selectedDivFilter === "UNASSIGNED") {
        if (sDiv) return false;
      } else {
        if (sDiv !== selectedDivFilter) return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = getStudentName(adm).toLowerCase();
    const gr = (adm.gr_no || "").toLowerCase();
    const admNo = adm.admission_number.toLowerCase();
    return name.includes(q) || gr.includes(q) || admNo.includes(q);
  });

  // 📥 Export Filtered Student List to CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error("No student records available to export.");
      return;
    }

    const classNameStr = currentClassObj?.school_class || "Class";
    const divStr = selectedDivFilter === "ALL" ? "All_Divisions" : `Division_${selectedDivFilter}`;

    const headers = ["#", "Admission Number", "GR Number", "Student Name", "Class", "Division", "Status"];
    const rows = filteredStudents.map((adm, index) => [
      index + 1,
      `"${adm.admission_number}"`,
      `"${adm.gr_no || "N/A"}"`,
      `"${getStudentName(adm)}"`,
      `"${classNameStr}"`,
      `"${getStudentDivision(adm) || "Unassigned"}"`,
      `"${adm.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${classNameStr}_${divStr}_Student_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      `📥 Exported ${filteredStudents.length} student records for ${classNameStr} (${selectedDivFilter}) to CSV!`
    );
  };

  // ⚡ Perform Automatic Round-Robin Division Assignment across CREATED divisions ONLY
  const handleAutoAssignDivisions = async () => {
    if (classStudents.length === 0) {
      toast.error("No students found in the selected class.");
      return;
    }
    if (createdDivNames.length === 0) {
      toast.error(`No divisions created for ${currentClassObj?.school_class || "selected class"}. Please create divisions first.`);
      return;
    }

    setIsAssigning(true);
    try {
      let updatedCount = 0;

      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i];
        // Strictly pick division from createdDivNames (Round Robin: index % length)
        const assignedDiv = createdDivNames[i % createdDivNames.length];

        const divFieldValue = student.field_values.find((fv) =>
          ["division", "section", "sec", "div"].some((l) => fv.field_label.toLowerCase().includes(l))
        );

        if (divFieldValue) {
          await patchFieldValues(student.admission_number, [
            { field_id: divFieldValue.field, value: assignedDiv },
          ]);
        }
        await patchStudentDivision(student.admission_number, assignedDiv);
        updatedCount++;
      }

      toast.success(
        `🎉 Successfully assigned divisions (${createdDivNames.map(d => `Div ${d}`).join(", ")}) to ${updatedCount} student(s) of ${currentClassObj?.school_class || "Class"}!`
      );
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign divisions to students.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Assign Division to a Single Student
  const handleSingleAssignDivision = async (adm: Admission, newDiv: string) => {
    try {
      const divFieldValue = adm.field_values.find((fv) =>
        ["division", "section", "sec", "div"].some((l) => fv.field_label.toLowerCase().includes(l))
      );

      if (divFieldValue) {
        await patchFieldValues(adm.admission_number, [
          { field_id: divFieldValue.field, value: newDiv },
        ]);
      }
      await patchStudentDivision(adm.admission_number, newDiv);
      toast.success(`Assigned Division ${newDiv} to ${getStudentName(adm)}`);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update student division.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="h-6 w-6 text-indigo-600" />
              Assign Class Divisions
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              Clerk Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Select a class to distribute students strictly across its created divisions.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchData}
          disabled={isLoading}
          className="rounded-xl text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Records
        </Button>
      </div>

      {/* Step 1: Class Selector & Created Divisions Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Class Selector Dropdown */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <School className="h-4 w-4 text-indigo-600" /> Step 1: Select Class
            </CardTitle>
            <CardDescription className="text-xs">
              Choose class to view students & divisions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedClassId} onValueChange={(val) => { if (val) setSelectedClassId(val); }}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold text-xs">
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

            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Total Class Enrolled:
              </p>
              <p className="text-lg font-extrabold">{classStudents.length} Students</p>
            </div>
          </CardContent>
        </Card>

        {/* Created Divisions Status Banner */}
        <Card className="lg:col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-purple-600" /> Created Divisions for {currentClassObj?.school_class || "Selected Class"}
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                {createdDivNames.length} Active Division(s)
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Students will strictly be assigned ONLY within these created divisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {createdDivNames.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {classCreatedDivisions.map((div) => (
                  <div
                    key={div.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-950 dark:text-purple-200"
                  >
                    <Badge className="bg-purple-600 text-white font-mono font-bold text-xs px-2">
                      Div {div.division}
                    </Badge>
                    <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                      Capacity: {div.capacity ?? "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">No divisions created for this class yet!</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Please go to <strong>Class Management &gt; Divisions</strong> to create divisions for {currentClassObj?.school_class || "this class"}.
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 border-t dark:border-zinc-800 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Auto Allocation will distribute all <span className="font-bold text-slate-800 dark:text-zinc-200">{classStudents.length}</span> students across {createdDivNames.length} divisions.
              </p>
              <Button
                onClick={handleAutoAssignDivisions}
                disabled={isAssigning || createdDivNames.length === 0 || classStudents.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl gap-2 h-9 px-4 shadow-sm"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning Divisions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Assign Division to All Students
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 2: Student Roster Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              Class Roster & Division Allocations
            </CardTitle>
            <CardDescription className="text-xs">
              Showing students for {currentClassObj?.school_class || "selected class"}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Division Filter Dropdown */}
            <div className="w-36">
              <Select
                value={selectedDivFilter}
                onValueChange={(val) => {
                  if (val) setSelectedDivFilter(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                  <SelectValue placeholder="All Divisions">
                    {selectedDivFilter === "ALL"
                      ? "All Divisions"
                      : selectedDivFilter === "UNASSIGNED"
                      ? "Unassigned"
                      : `Division ${selectedDivFilter}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Divisions</SelectItem>
                  {createdDivNames.map((divName) => (
                    <SelectItem key={divName} value={divName}>
                      Division {divName}
                    </SelectItem>
                  ))}
                  <SelectItem value="UNASSIGNED">Unassigned Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search student or GR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60"
              />
            </div>

            {/* Export CSV Button */}
            <Button
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredStudents.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 h-9 px-3 shadow-2xs shrink-0"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-7 w-7 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-medium">Loading student list...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-14 text-center space-y-2 p-4">
              <Users className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">No students found in this class</p>
              <p className="text-[11px] text-slate-400">
                Please select another class or adjust your search filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5">Student Name & Adm No</th>
                    <th className="px-4 py-3.5">GR Number</th>
                    <th className="px-4 py-3.5">Class</th>
                    <th className="px-4 py-3.5">Current Division</th>
                    <th className="px-4 py-3.5 text-right">Assign Division</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
                  {filteredStudents.map((adm, index) => {
                    const sName = getStudentName(adm);
                    const sDiv = getStudentDivision(adm);

                    return (
                      <tr key={adm.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-zinc-100 text-xs">{sName}</p>
                            <p className="text-[10px] font-mono text-slate-400">Adm: {adm.admission_number}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {adm.gr_no ? (
                            <Badge className="font-mono bg-emerald-500 text-white font-bold text-[11px] px-2 py-0.5">
                              GR: {adm.gr_no}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                              No GR
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="outline" className="font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
                            {currentClassObj?.school_class || "Class"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {sDiv ? (
                            <Badge className="font-bold bg-purple-600 text-white text-[11px] px-2.5 py-0.5">
                              Division {sDiv}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-normal italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {createdDivNames.length > 0 ? (
                              <Select
                                value={sDiv}
                                onValueChange={(val) => { if (val) handleSingleAssignDivision(adm, val); }}
                              >
                                <SelectTrigger className="w-28 h-7 text-[11px] font-bold rounded-lg bg-slate-50 dark:bg-zinc-800">
                                  <SelectValue placeholder="Set Div..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {createdDivNames.map((divName) => (
                                    <SelectItem key={divName} value={divName}>
                                      Div {divName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No Div Created</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
