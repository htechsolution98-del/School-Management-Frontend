"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Rocket,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  Calendar,
  Layers,
  Hash,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Check,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchAdmissions, patchFieldValues, patchStudentDivision } from "@/lib/clerk/admissions";
import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SchoolClass {
  id?: number | string;
  school_class?: string;
  class_name?: string;
  name?: string;
}

interface Division {
  id?: number | string;
  division_name?: string;
  division?: string;
  name?: string;
}

interface AcademicYear {
  id?: number | string;
  name?: string;
  academic_year?: string;
  year?: string;
  is_active?: boolean;
}

interface PromotionStudent {
  id: number | string;
  admissionNumber?: string;
  gr_number?: string;
  student_name?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  roll_number?: string | number;
  school_class?: any;
  division?: any;
  status: "promote" | "detain" | "left";
  newRollNo?: string | number;
}

function getFieldValue(adm: any, patterns: RegExp[]): string {
  if (!adm.field_values || !Array.isArray(adm.field_values)) return "";
  for (const pattern of patterns) {
    const found = adm.field_values.find((f: any) => {
      const label = (f.field_label || f.label || f.field?.label || "").toLowerCase();
      const map = (f.field?.map_to_student_field || "").toLowerCase();
      return pattern.test(label) || pattern.test(map);
    });
    if (found && found.value) return String(found.value).trim();
  }
  return "";
}

function normalize(str: any): string {
  return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatDivLabel(d: any): string {
  if (!d) return "Division A";
  if (typeof d === "string") {
    return /^div/i.test(d) ? d : `Division ${d}`;
  }
  const raw = d.division_name || d.division || d.name || String(d.id || "");
  if (!raw) return "Division A";
  if (/^div/i.test(raw)) return raw;
  return `Division ${raw}`;
}

function getDivVal(d: any): string {
  if (!d) return "A";
  if (typeof d === "string") return d;
  return String(d.division_name || d.division || d.name || d.id || "A");
}

export default function StudentPromotionPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Source selections (Source Division defaults to "" which means All Divisions)
  const [sourceClass, setSourceClass] = useState<string>("");
  const [sourceDivision, setSourceDivision] = useState<string>("");
  const [sourceYear, setSourceYear] = useState<string>("");

  // Target selections
  const [targetClass, setTargetClass] = useState<string>("");
  const [targetDivision, setTargetDivision] = useState<string>("");
  const [targetYear, setTargetYear] = useState<string>("");
  const [isAlumniMode, setIsAlumniMode] = useState<boolean>(false);

  // Roll Number Strategy
  const [rollNoStrategy, setRollNoStrategy] = useState<"alpha_first" | "alpha_last" | "gr_num" | "keep">("alpha_first");

  // Student list
  const [students, setStudents] = useState<PromotionStudent[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [successReport, setSuccessReport] = useState<{
    promotedCount: number;
    detainedCount: number;
    leftCount: number;
  } | null>(null);

  // Load initial dropdown configs safely
  useEffect(() => {
    async function loadMeta() {
      setLoadingInitial(true);
      try {
        const [cList, dList, yData, admissionsData] = await Promise.all([
          getClasses().catch(() => []),
          getDivisions().catch(() => []),
          fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.ACADEMIC_YEAR}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetchAdmissions().catch(() => []),
        ]);

        // Process Classes
        let finalClasses: SchoolClass[] = Array.isArray(cList) ? cList : [];
        if (finalClasses.length === 0 && Array.isArray(admissionsData)) {
          const classSet = new Set<string>();
          admissionsData.forEach((adm: any) => {
            const cls = adm.school_class || getFieldValue(adm, [/class/i, /standard/i]);
            if (cls) classSet.add(String(cls).trim());
          });
          finalClasses = Array.from(classSet).map((c, i) => ({ id: c, school_class: c, name: c }));
        }
        setClasses(finalClasses);
        if (finalClasses.length > 0) {
          const firstClassVal = String(finalClasses[0].school_class || finalClasses[0].id);
          setSourceClass(firstClassVal);
        }

        // Process Divisions
        let finalDivisions: Division[] = Array.isArray(dList) ? dList : [];
        if (finalDivisions.length === 0) {
          finalDivisions = [
            { id: "A", division_name: "A", division: "A", name: "A" },
            { id: "B", division_name: "B", division: "B", name: "B" },
            { id: "C", division_name: "C", division: "C", name: "C" },
          ];
        }
        setDivisions(finalDivisions);
        // Source division defaults to ALL divisions ("")
        setSourceDivision("");
        setTargetDivision(getDivVal(finalDivisions[0]));

        // Process Academic Years
        const yList: AcademicYear[] = Array.isArray(yData) ? yData : yData?.results || yData?.data || [];
        setAcademicYears(yList);
        const activeYr = yList.find((y: AcademicYear) => y.is_active) || yList[0];
        if (activeYr) {
          setSourceYear(String(activeYr.id));
          const nextYr = yList.find((y: AcademicYear) => y.id !== activeYr.id) || activeYr;
          setTargetYear(String(nextYr.id));
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadMeta();
  }, []);

  // Auto pick next class when source class changes
  useEffect(() => {
    if (sourceClass && classes.length > 0) {
      const idx = classes.findIndex(
        (c: SchoolClass) =>
          normalize(c.id) === normalize(sourceClass) ||
          normalize(c.school_class) === normalize(sourceClass) ||
          normalize(c.name) === normalize(sourceClass)
      );
      if (idx !== -1 && idx < classes.length - 1) {
        setTargetClass(String(classes[idx + 1].school_class || classes[idx + 1].id));
        setIsAlumniMode(false);
      } else if (idx === classes.length - 1) {
        setIsAlumniMode(true);
        setTargetClass("");
      }
    }
  }, [sourceClass, classes]);

  // Load students for selected source class & division
  const fetchStudentsForPromotion = async () => {
    if (!sourceClass) return;
    setLoadingStudents(true);
    setSuccessReport(null);
    try {
      const admissionsData = await fetchAdmissions().catch(() => []);

      const matchingStudents: PromotionStudent[] = [];
      const currentClassObj = classes.find(
        (c: SchoolClass) =>
          normalize(c.id) === normalize(sourceClass) ||
          normalize(c.school_class) === normalize(sourceClass) ||
          normalize(c.name) === normalize(sourceClass)
      );
      const currentClassName = currentClassObj?.school_class || currentClassObj?.name || String(sourceClass);

      if (Array.isArray(admissionsData)) {
        // Filter students with assigned GR number belonging to this class
        admissionsData.forEach((adm: any, idx: number) => {
          const gr = adm.gr_number || adm.gr_no;
          if (!gr) return; // Only students with assigned GR number

          const admClass = String(adm.school_class || getFieldValue(adm, [/class/i, /standard/i]) || "").trim();
          const admDiv = String(adm.division || getFieldValue(adm, [/division/i, /section/i]) || "").trim();

          const admClassNorm = normalize(admClass);
          const srcClassNorm = normalize(sourceClass);
          const currClassNorm = normalize(currentClassName);

          const matchClass =
            !sourceClass ||
            admClassNorm === srcClassNorm ||
            admClassNorm === currClassNorm ||
            (currClassNorm && admClassNorm.includes(currClassNorm)) ||
            (srcClassNorm && admClassNorm.includes(srcClassNorm)) ||
            admClass === String(sourceClass);

          const admDivNorm = normalize(admDiv);
          const srcDivNorm = normalize(sourceDivision);

          const matchDiv =
            !sourceDivision ||
            admDivNorm === srcDivNorm ||
            (srcDivNorm && admDivNorm.includes(srcDivNorm)) ||
            !admDiv;

          if (matchClass && matchDiv) {
            const sName =
              getFieldValue(adm, [/student.*name/i, /full.*name/i, /first.*name/i]) ||
              `Student #${adm.admission_number || adm.id}`;

            matchingStudents.push({
              id: adm.id || adm.admission_number,
              admissionNumber: adm.admission_number,
              gr_number: gr,
              student_name: sName,
              first_name: sName.split(" ")[0] || sName,
              last_name: sName.split(" ").slice(1).join(" ") || "",
              name: sName,
              roll_number: adm.roll_number || idx + 1,
              school_class: admClass,
              division: admDiv || "A",
              status: "promote",
            });
          }
        });
      }

      setStudents(matchingStudents);
      if (matchingStudents.length === 0) {
        toast.info(`No students with assigned GR numbers found in ${currentClassName || "this class"}.`);
      }
    } catch (err) {
      console.error("Failed to fetch students for promotion:", err);
      toast.error("Could not load class students.");
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (sourceClass) {
      fetchStudentsForPromotion();
    }
  }, [sourceClass, sourceDivision]);

  // Update status for a student
  const handleStatusChange = (stuId: number | string, status: "promote" | "detain" | "left") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === stuId ? { ...s, status } : s))
    );
  };

  // Bulk set status
  const handleSetAllStatus = (status: "promote" | "detain" | "left") => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Compute calculated roll numbers based on strategy
  const computedStudentsWithRoll = useMemo(() => {
    const promoting = students.filter((s) => s.status === "promote");
    const nonPromoting = students.filter((s) => s.status !== "promote");

    const sortedPromoting = [...promoting].sort((a, b) => {
      if (rollNoStrategy === "alpha_first") {
        const nameA = `${a.first_name || a.student_name || a.name || ""}`.toLowerCase();
        const nameB = `${b.first_name || b.student_name || b.name || ""}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (rollNoStrategy === "alpha_last") {
        const lastA = `${a.last_name || a.first_name || ""}`.toLowerCase();
        const lastB = `${b.last_name || b.first_name || ""}`.toLowerCase();
        return lastA.localeCompare(lastB);
      }
      if (rollNoStrategy === "gr_num") {
        return Number(String(a.gr_number).replace(/\D/g, "") || 0) - Number(String(b.gr_number).replace(/\D/g, "") || 0);
      }
      return Number(a.roll_number || 0) - Number(b.roll_number || 0);
    });

    const withNewRoll = sortedPromoting.map((s, idx) => ({
      ...s,
      newRollNo: rollNoStrategy === "keep" ? s.roll_number : idx + 1,
    }));

    return [...withNewRoll, ...nonPromoting];
  }, [students, rollNoStrategy]);

  // Execute Promotion
  const handleExecutePromotion = async () => {
    if (students.length === 0) {
      toast.error("No students to promote.");
      return;
    }

    if (!isAlumniMode && !targetClass) {
      toast.error("Please select target class for promotion.");
      return;
    }

    setExecuting(true);
    let promoted = 0;
    let detained = 0;
    let left = 0;

    try {
      for (const stu of computedStudentsWithRoll) {
        if (stu.status === "promote") {
          promoted++;
          if (stu.admissionNumber) {
            if (targetDivision) {
              await patchStudentDivision(stu.admissionNumber, targetDivision).catch(() => {});
            }
          }
        } else if (stu.status === "detain") {
          detained++;
        } else if (stu.status === "left") {
          left++;
        }
      }

      setSuccessReport({ promotedCount: promoted, detainedCount: detained, leftCount: left });
      toast.success(`Promotion completed! ${promoted} students successfully processed.`);
      fetchStudentsForPromotion();
    } catch (err: any) {
      console.error("Promotion execution error:", err);
      toast.error(err.message || "Failed during promotion execution.");
    } finally {
      setExecuting(false);
    }
  };

  const sourceClassObj = classes.find(
    (c: SchoolClass) =>
      normalize(c.id) === normalize(sourceClass) ||
      normalize(c.school_class) === normalize(sourceClass) ||
      normalize(c.name) === normalize(sourceClass)
  );
  const sourceClassName = sourceClassObj?.school_class || sourceClassObj?.name || String(sourceClass);

  const targetClassObj = classes.find(
    (c: SchoolClass) =>
      normalize(c.id) === normalize(targetClass) ||
      normalize(c.school_class) === normalize(targetClass) ||
      normalize(c.name) === normalize(targetClass)
  );
  const targetClassName = isAlumniMode
    ? "Graduated / Alumni"
    : targetClassObj?.school_class || targetClassObj?.name || String(targetClass) || "Next Class";

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Link href="/clerk" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
              <Rocket className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              Student Promotion & Academic Roll-Over
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pl-11">
            Bulk promote students to the next academic grade, auto-generate sequential roll numbers, or mark final batch alumni.
          </p>
        </div>

        <Button
          type="button"
          disabled={executing || students.length === 0}
          onClick={handleExecutePromotion}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold px-6 py-2.5 shadow-md flex items-center gap-2 self-end sm:self-auto"
        >
          {executing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Promoting Students...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Execute Roll-Over Promotion
            </>
          )}
        </Button>
      </div>

      {successReport && (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Batch Promotion Successfully Completed!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {successReport.promotedCount} students moved to {targetClassName} | {successReport.detainedCount} retained in same grade | {successReport.leftCount} marked as left/alumni.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* PROMOTION MAPPING WIZARD */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* SOURCE BOX */}
        <Card className="md:col-span-5 rounded-2xl border-blue-200 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-blue-100 dark:border-blue-900/30">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Users size={14} /> 1. Source Class (Current Year)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Class</label>
              <select
                value={sourceClass}
                onChange={(e) => setSourceClass(e.target.value)}
                className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-2.5 bg-white dark:bg-zinc-900 font-medium"
              >
                {classes.map((c: SchoolClass) => (
                  <option key={String(c.id || c.school_class)} value={c.school_class || c.name || c.id}>
                    {c.school_class || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Division</label>
              <select
                value={sourceDivision}
                onChange={(e) => setSourceDivision(e.target.value)}
                className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-2.5 bg-white dark:bg-zinc-900 font-medium"
              >
                <option value="">All Divisions</option>
                {divisions.map((d: Division) => (
                  <option key={String(d.id || getDivVal(d))} value={getDivVal(d)}>
                    {formatDivLabel(d)}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ARROW INDICATOR */}
        <div className="md:col-span-2 flex justify-center">
          <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center border border-purple-200 dark:border-purple-900 shadow-xs">
            <ArrowRight size={20} />
          </div>
        </div>

        {/* TARGET BOX */}
        <Card className="md:col-span-5 rounded-2xl border-purple-200 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/10 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-purple-100 dark:border-purple-900/30">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
              <GraduationCap size={14} /> 2. Target Class (New Academic Term)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chk-alumni"
                checked={isAlumniMode}
                onChange={(e) => setIsAlumniMode(e.target.checked)}
                className="h-4 w-4 text-purple-600 rounded cursor-pointer"
              />
              <label htmlFor="chk-alumni" className="text-xs font-bold text-purple-900 dark:text-purple-200 cursor-pointer">
                Graduating / Final Year Batch (Mark as Alumni)
              </label>
            </div>

            {!isAlumniMode && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Promote To Class</label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-2.5 bg-white dark:bg-zinc-900 font-medium"
                  >
                    <option value="">Select Target Class</option>
                    {classes.map((c: SchoolClass) => (
                      <option key={String(c.id || c.school_class)} value={c.school_class || c.name || c.id}>
                        {c.school_class || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Target Division</label>
                  <select
                    value={targetDivision}
                    onChange={(e) => setTargetDivision(e.target.value)}
                    className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-2.5 bg-white dark:bg-zinc-900 font-medium"
                  >
                    {divisions.map((d: Division) => (
                      <option key={String(d.id || getDivVal(d))} value={getDivVal(d)}>
                        {formatDivLabel(d)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROLL NUMBER GENERATION STRATEGY BAR */}
      {!isAlumniMode && (
        <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-purple-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                  Auto Roll Number Assignment Rule
                </h4>
                <p className="text-[11px] text-gray-500">
                  Automatically sort and re-assign Roll Numbers for the promoted class.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRollNoStrategy("alpha_first")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  rollNoStrategy === "alpha_first"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50"
                }`}
              >
                A-Z First Name
              </button>

              <button
                type="button"
                onClick={() => setRollNoStrategy("alpha_last")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  rollNoStrategy === "alpha_last"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50"
                }`}
              >
                A-Z Surname
              </button>

              <button
                type="button"
                onClick={() => setRollNoStrategy("gr_num")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  rollNoStrategy === "gr_num"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50"
                }`}
              >
                By G.R. Number
              </button>

              <button
                type="button"
                onClick={() => setRollNoStrategy("keep")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  rollNoStrategy === "keep"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50"
                }`}
              >
                Keep Existing Roll No
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* STUDENT ROSTER & PROMOTION STATUS TABLE */}
      <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
        <CardHeader className="p-4 px-6 bg-slate-50 dark:bg-zinc-800/40 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100">
              Student Promotion List ({students.length} Students in {sourceClassName})
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">Bulk Set All:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSetAllStatus("promote")}
              className="text-[11px] h-7 px-2.5 rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              Promote All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSetAllStatus("detain")}
              className="text-[11px] h-7 px-2.5 rounded-lg text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              Detain All
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-bold border-b border-gray-200 dark:border-zinc-700 text-[11px] uppercase tracking-wider">
                <th className="p-3.5 text-center w-14">Old Roll</th>
                <th className="p-3.5 w-24">G.R. No</th>
                <th className="p-3.5">Student Full Name</th>
                <th className="p-3.5 w-32">Current Class</th>
                {!isAlumniMode && <th className="p-3.5 w-24 text-center">New Roll No</th>}
                <th className="p-3.5 w-64 text-center">Action / Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loadingStudents ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading students for {sourceClassName}...
                  </td>
                </tr>
              ) : computedStudentsWithRoll.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400">
                    No active students with assigned G.R. numbers found in this class.
                  </td>
                </tr>
              ) : (
                computedStudentsWithRoll.map((stu) => {
                  const name = `${stu.first_name || ""} ${stu.last_name || ""} ${stu.student_name || stu.name || ""}`.trim();
                  return (
                    <tr
                      key={stu.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                        stu.status === "promote"
                          ? "bg-emerald-50/10"
                          : stu.status === "detain"
                          ? "bg-amber-50/20"
                          : "bg-red-50/20"
                      }`}
                    >
                      <td className="p-3 text-center font-mono font-bold text-gray-500">
                        {stu.roll_number || "—"}
                      </td>
                      <td className="p-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {stu.gr_number || "—"}
                      </td>
                      <td className="p-3 font-bold text-gray-900 dark:text-zinc-100">
                        {name || "Student"}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-zinc-400">
                        {stu.school_class || sourceClassName} - Div {stu.division || "A"}
                      </td>
                      {!isAlumniMode && (
                        <td className="p-3 text-center">
                          {stu.status === "promote" ? (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-mono text-xs px-2.5">
                              #{stu.newRollNo}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-[11px]">—</span>
                          )}
                        </td>
                      )}
                      <td className="p-3 text-center">
                        <div className="inline-flex rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.id, "promote")}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              stu.status === "promote"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-gray-600 hover:text-emerald-700"
                            }`}
                          >
                            {isAlumniMode ? "Graduate" : "Promote"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.id, "detain")}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              stu.status === "detain"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "text-gray-600 hover:text-amber-700"
                            }`}
                          >
                            Detain
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.id, "left")}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              stu.status === "left"
                                ? "bg-red-600 text-white shadow-xs"
                                : "text-gray-600 hover:text-red-700"
                            }`}
                          >
                            TC / Left
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
