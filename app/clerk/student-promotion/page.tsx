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
  Search,
  X,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchAdmissions, patchFieldValues, patchStudentDivision } from "@/lib/clerk/admissions";
import { getClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import { getStudentProfiles, updateStudentProfile } from "@/lib/clerk/student-profiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { capitalizeWords } from "@/lib/utils";

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

function resolveStudentDivision(student: any, divisionsList?: Division[]): string {
  if (!student || typeof student !== "object") return "";

  if (typeof student.division === "string" && student.division.trim()) {
    const raw = student.division.trim();
    return raw.replace(/^division\s*/i, "").replace(/^div\s*/i, "").trim();
  }

  if (student.division && typeof student.division === "object") {
    const nested = student.division.name || student.division.division || student.division.division_name;
    if (typeof nested === "string" && nested.trim()) {
      return nested.trim().replace(/^division\s*/i, "").replace(/^div\s*/i, "").trim();
    }
  }

  const divId = typeof student.division === "number" ? student.division : typeof student.division_id === "number" ? student.division_id : null;
  if (divId && divisionsList && divisionsList.length > 0) {
    const matched = divisionsList.find((d) => String(d.id) === String(divId));
    if (matched) {
      const matchedName = matched.division || (matched as any).name || (matched as any).division_name;
      if (typeof matchedName === "string" && matchedName.trim()) {
        return matchedName.trim().replace(/^division\s*/i, "").replace(/^div\s*/i, "").trim();
      }
    }
  }

  return "";
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

  // Particular / Checkbox Student Selection
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleSelectStudent = (id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePromoteSelectedOnly = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one student using the checkboxes.");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: selectedIds.has(s.id) ? "promote" : "detain",
      }))
    );
    toast.success(`Marked ${selectedIds.size} selected student(s) for promotion. Others set to Detain.`);
  };

  const handleMarkSelectedStatus = (status: "promote" | "detain" | "left") => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one student using the checkboxes.");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => (selectedIds.has(s.id) ? { ...s, status } : s))
    );
    toast.success(`Marked ${selectedIds.size} student(s) as ${status.toUpperCase()}.`);
  };

  // Roll Number Strategy
  const [rollNoStrategy, setRollNoStrategy] = useState<"alpha_first" | "alpha_last" | "gr_num" | "keep">("alpha_first");

  // Student list
  const [students, setStudents] = useState<PromotionStudent[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "promote" | "detain" | "left">("all");
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

  // Filter divisions according to selected source class
  const sourceDivisions = useMemo(() => {
    if (!sourceClass || divisions.length === 0) return divisions;
    const currentClassObj = classes.find(
      (c: SchoolClass) =>
        normalize(c.id) === normalize(sourceClass) ||
        normalize(c.school_class) === normalize(sourceClass) ||
        normalize(c.name) === normalize(sourceClass)
    );
    const targetId = currentClassObj ? String(currentClassObj.id) : String(sourceClass);
    const targetName = currentClassObj?.school_class || currentClassObj?.name || String(sourceClass);

    const filtered = divisions.filter((d: any) => {
      const dClassId = d.SchoolClass ? (typeof d.SchoolClass === "object" ? String(d.SchoolClass.id) : String(d.SchoolClass)) : "";
      const dClassName = d.class_name || (typeof d.SchoolClass === "object" ? d.SchoolClass.school_class : "") || "";
      if (dClassId && (dClassId === targetId || normalize(dClassId) === normalize(targetId))) return true;
      if (dClassName && (normalize(dClassName) === normalize(targetName) || normalize(dClassName) === normalize(sourceClass))) return true;
      return false;
    });

    return filtered.length > 0 ? filtered : divisions;
  }, [sourceClass, classes, divisions]);

  // Filter divisions according to selected target class
  const targetDivisions = useMemo(() => {
    if (!targetClass || divisions.length === 0) return divisions;
    const currentClassObj = classes.find(
      (c: SchoolClass) =>
        normalize(c.id) === normalize(targetClass) ||
        normalize(c.school_class) === normalize(targetClass) ||
        normalize(c.name) === normalize(targetClass)
    );
    const targetId = currentClassObj ? String(currentClassObj.id) : String(targetClass);
    const targetName = currentClassObj?.school_class || currentClassObj?.name || String(targetClass);

    const filtered = divisions.filter((d: any) => {
      const dClassId = d.SchoolClass ? (typeof d.SchoolClass === "object" ? String(d.SchoolClass.id) : String(d.SchoolClass)) : "";
      const dClassName = d.class_name || (typeof d.SchoolClass === "object" ? d.SchoolClass.school_class : "") || "";
      if (dClassId && (dClassId === targetId || normalize(dClassId) === normalize(targetId))) return true;
      if (dClassName && (normalize(dClassName) === normalize(targetName) || normalize(dClassName) === normalize(targetClass))) return true;
      return false;
    });

    return filtered.length > 0 ? filtered : divisions;
  }, [targetClass, classes, divisions]);

  // Sync division selections when class changes
  useEffect(() => {
    if (sourceClass && sourceDivisions.length > 0) {
      if (sourceDivision !== "") {
        const match = sourceDivisions.some((d) => getDivVal(d).toLowerCase() === sourceDivision.toLowerCase());
        if (!match) {
          setSourceDivision("");
        }
      }
    }
  }, [sourceClass, sourceDivisions]);

  useEffect(() => {
    if (targetClass && targetDivisions.length > 0) {
      const match = targetDivisions.some((d) => getDivVal(d).toLowerCase() === targetDivision.toLowerCase());
      if (!match) {
        setTargetDivision(getDivVal(targetDivisions[0]));
      }
    }
  }, [targetClass, targetDivisions]);

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
      const [profilesData, admissionsData] = await Promise.all([
        getStudentProfiles().catch(() => []),
        fetchAdmissions().catch(() => []),
      ]);

      const matchingStudents: PromotionStudent[] = [];
      const seenIds = new Set<string>();
      const seenAdmNos = new Set<string>();
      const seenGrs = new Set<string>();

      const currentClassObj = classes.find(
        (c: SchoolClass) =>
          normalize(c.id) === normalize(sourceClass) ||
          normalize(c.school_class) === normalize(sourceClass) ||
          normalize(c.name) === normalize(sourceClass)
      );
      const currentClassName = (currentClassObj?.school_class || currentClassObj?.name || String(sourceClass)).trim();
      const currentClassId = currentClassObj ? String(currentClassObj.id) : "";
      const normTargetClass = normalize(currentClassName);
      const cleanSourceDiv = String(sourceDivision || "").replace(/^division\s*/i, "").replace(/^div\s*/i, "").trim().toLowerCase();

      // 1. Process Enrolled Students from Student Profiles (Primary Source)
      if (Array.isArray(profilesData)) {
        profilesData.forEach((st: any, idx: number) => {
          const rawClass = String(st.class_name || st.school_class || "").trim();
          const matchedClass = classes.find(
            (c: SchoolClass) =>
              String(c.id) === rawClass ||
              normalize(c.school_class) === normalize(rawClass) ||
              normalize(c.name) === normalize(rawClass)
          );
          const studentClassName = matchedClass ? (matchedClass.school_class || matchedClass.name || String(matchedClass.id)) : rawClass;
          const normStudentClass = normalize(studentClassName);

          const matchClass =
            !sourceClass ||
            normStudentClass === normTargetClass ||
            (currentClassId && (rawClass === currentClassId || normStudentClass === normalize(currentClassId))) ||
            (normTargetClass && normStudentClass.includes(normTargetClass)) ||
            (normTargetClass && normTargetClass.includes(normStudentClass));

          const resolvedDiv = resolveStudentDivision(st, divisions) || "A";
          const cleanDiv = resolvedDiv.replace(/^division\s*/i, "").replace(/^div\s*/i, "").trim();

          const matchDiv =
            !cleanSourceDiv ||
            cleanDiv.toLowerCase() === cleanSourceDiv ||
            cleanDiv.toLowerCase().includes(cleanSourceDiv) ||
            cleanSourceDiv.includes(cleanDiv.toLowerCase());

          if (matchClass && matchDiv) {
            const sName = st.full_name || st.name || (st.first_name ? `${st.first_name} ${st.last_name || ""}`.trim() : `Student #${st.id}`);
            seenIds.add(String(st.id));
            if (st.admission_number) seenAdmNos.add(String(st.admission_number));
            if (st.gr_no) seenGrs.add(String(st.gr_no));

            matchingStudents.push({
              id: st.id,
              admissionNumber: st.admission_number || undefined,
              gr_number: st.gr_no || undefined,
              student_name: sName,
              first_name: st.first_name || sName.split(" ")[0] || sName,
              last_name: st.last_name || sName.split(" ").slice(1).join(" ") || "",
              name: sName,
              roll_number: st.roll_no || idx + 1,
              school_class: studentClassName || currentClassName,
              division: cleanDiv || "A",
              status: "promote",
            });
          }
        });
      }

      // 2. Process Admissions Data
      if (Array.isArray(admissionsData)) {
        admissionsData.forEach((adm: any, idx: number) => {
          const admNo = String(adm.admission_number || "");
          const gr = adm.gr_number || adm.gr_no || "";
          if (admNo && seenAdmNos.has(admNo)) return;
          if (gr && seenGrs.has(String(gr))) return;
          if (adm.id && seenIds.has(String(adm.id))) return;

          let rawClass = String(adm.school_class || getFieldValue(adm, [/(applying\s*(for)?\s*)?class/i, /standard/i, /grade/i, /std/i]) || "").trim();
          const matchedClass = classes.find(
            (c: SchoolClass) =>
              String(c.id) === rawClass ||
              normalize(c.school_class) === normalize(rawClass) ||
              normalize(c.name) === normalize(rawClass)
          );
          const studentClassName = matchedClass ? (matchedClass.school_class || matchedClass.name || String(matchedClass.id)) : rawClass;
          const normStudentClass = normalize(studentClassName);

          let rawDiv = String(adm.division || getFieldValue(adm, [/division/i, /section/i, /sec/i]) || "A").trim();
          const cleanDiv = rawDiv.replace(/^division\s*/i, "").replace(/^div\s*/i, "").trim() || "A";

          const matchClass =
            !sourceClass ||
            normStudentClass === normTargetClass ||
            (currentClassId && (rawClass === currentClassId || normStudentClass === normalize(currentClassId))) ||
            (normTargetClass && normStudentClass.includes(normTargetClass)) ||
            (normTargetClass && normTargetClass.includes(normStudentClass));

          const matchDiv =
            !cleanSourceDiv ||
            cleanDiv.toLowerCase() === cleanSourceDiv ||
            cleanDiv.toLowerCase().includes(cleanSourceDiv) ||
            cleanSourceDiv.includes(cleanDiv.toLowerCase());

          if (matchClass && matchDiv) {
            const sName =
              getFieldValue(adm, [/student.*name/i, /full.*name/i, /first.*name/i, /candidate.*name/i]) ||
              `Student #${adm.admission_number || adm.id}`;

            matchingStudents.push({
              id: adm.id || adm.admission_number,
              admissionNumber: adm.admission_number,
              gr_number: gr || undefined,
              student_name: sName,
              first_name: sName.split(" ")[0] || sName,
              last_name: sName.split(" ").slice(1).join(" ") || "",
              name: sName,
              roll_number: adm.roll_number || matchingStudents.length + 1,
              school_class: studentClassName || currentClassName,
              division: cleanDiv,
              status: "promote",
            });
          }
        });
      }

      setStudents(matchingStudents);
      if (matchingStudents.length === 0) {
        toast.info(`No students found in ${currentClassName || "this class"}.`);
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

  // Search & Filter students
  const filteredStudents = useMemo(() => {
    return computedStudentsWithRoll.filter((stu) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (stu.student_name || stu.name || [stu.first_name, stu.last_name].filter(Boolean).join(" ")).toLowerCase().trim();
        const admNo = String(stu.admissionNumber || "").toLowerCase();
        const grNo = String(stu.gr_number || "").toLowerCase();
        if (!name.includes(q) && !admNo.includes(q) && !grNo.includes(q)) {
          return false;
        }
      }
      // 2. Status Filter
      if (statusFilter !== "all" && stu.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [computedStudentsWithRoll, searchQuery, statusFilter]);

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
    const errors: string[] = [];

    try {
      const admissionsData = await fetchAdmissions().catch(() => []);

      const targetClsObj = classes.find(
        (c: SchoolClass) =>
          normalize(c.id) === normalize(targetClass) ||
          normalize(c.school_class) === normalize(targetClass) ||
          normalize(c.name) === normalize(targetClass)
      );
      const targetClassId =
        targetClsObj?.id != null
          ? Number(targetClsObj.id)
          : !isNaN(Number(targetClass))
          ? Number(targetClass)
          : null;
      const cleanTargetDiv =
        (targetDivision || "A").replace(/^division\s*/i, "").replace(/^div\s*/i, "").trim() || "A";

      if (!isAlumniMode && !targetClassId) {
        toast.error("Could not find target class record. Please re-select the target class.");
        setExecuting(false);
        return;
      }

      for (const stu of computedStudentsWithRoll) {
        if (stu.status === "promote") {
          try {
            // 1. Update Student record in database (/api/students/<id>/)
            const stuIdNum = Number(stu.id);
            if (!isNaN(stuIdNum) && stuIdNum > 0) {
              const studentPayload: Record<string, any> = {
                division: cleanTargetDiv,
                roll_no: String(stu.newRollNo != null ? stu.newRollNo : stu.roll_number || ""),
              };
              if (!isAlumniMode && targetClassId != null) {
                studentPayload.school_class = targetClassId;
              }
              await updateStudentProfile(stuIdNum, studentPayload);
            }

            // 2. Sync Admission record if admissionNumber exists
            if (stu.admissionNumber) {
              if (cleanTargetDiv) {
                await patchStudentDivision(stu.admissionNumber, cleanTargetDiv).catch(() => {});
              }

              if (!isAlumniMode && targetClass) {
                const adm = admissionsData.find(
                  (a: any) => String(a.admission_number) === String(stu.admissionNumber)
                );
                if (adm?.field_values && Array.isArray(adm.field_values)) {
                  const classField = adm.field_values.find((f: any) => {
                    const lbl = (f.field_label || f.label || f.field?.label || "").toLowerCase();
                    const map = (f.field?.map_to_student_field || "").toLowerCase();
                    return map === "school_class" || /class|standard|grade/i.test(lbl);
                  });
                  if (classField) {
                    const rawField = (classField as any).field;
                    const fId =
                      typeof rawField === "object" && rawField
                        ? rawField.id
                        : rawField || (classField as any).field_id;
                    const newClassVal =
                      targetClsObj?.school_class ||
                      targetClsObj?.name ||
                      (targetClsObj?.id ? String(targetClsObj.id) : targetClass);
                    if (fId) {
                      await patchFieldValues(stu.admissionNumber, [
                        { field_id: Number(fId), value: String(newClassVal) },
                      ]).catch(() => {});
                    }
                  }
                }
              }
            }
            promoted++;
          } catch (studentErr: any) {
            console.error(`Error promoting student ${stu.student_name || stu.id}:`, studentErr);
            errors.push(`${stu.student_name || `Student #${stu.id}`}: ${studentErr.message || "Failed"}`);
          }
        } else if (stu.status === "detain") {
          detained++;
        } else if (stu.status === "left") {
          left++;
        }
      }

      setSuccessReport({ promotedCount: promoted, detainedCount: detained, leftCount: left });
      if (errors.length > 0) {
        toast.warning(`Promoted ${promoted} student(s), but ${errors.length} failed: ${errors[0]}`);
      } else {
        toast.success(`Promotion completed! ${promoted} student(s) successfully promoted.`);
      }
      setSelectedIds(new Set());
      await fetchStudentsForPromotion();
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
    <div className="space-y-6 max-w-7xl mx-auto">
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
              <Sparkles className="h-4 w-4" /> Execute Roll-Over Promotion ({students.filter((s) => s.status === "promote").length} to Promote)
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
                {sourceDivisions.map((d: Division) => (
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
                    {targetDivisions.map((d: Division) => (
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
              Student Promotion List ({filteredStudents.length}{filteredStudents.length !== students.length ? ` of ${students.length}` : ""} Students in {sourceClassName})
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

        {/* Search & Filtration Bar */}
        <div className="p-4 px-6 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by student name, G.R. number, or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs h-9 rounded-xl border-gray-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
            >
              All ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("promote")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                statusFilter === "promote"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              Promote ({students.filter((s) => s.status === "promote").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("detain")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                statusFilter === "detain"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
              }`}
            >
              Detain ({students.filter((s) => s.status === "detain").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("left")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                statusFilter === "left"
                  ? "bg-red-600 text-white shadow-2xs"
                  : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100"
              }`}
            >
              Left ({students.filter((s) => s.status === "left").length})
            </button>
          </div>
        </div>

        {/* Selected Particular Students Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-900/50 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600 text-white font-mono text-xs px-2.5">
                {selectedIds.size} Selected
              </Badge>
              <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                Action for selected students:
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                onClick={() => handleMarkSelectedStatus("promote")}
                className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs"
              >
                Mark Selected as Promote ({selectedIds.size})
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePromoteSelectedOnly}
                className="text-xs h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-2xs"
              >
                Promote Only Selected (Detain Others)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleMarkSelectedStatus("detain")}
                className="text-xs h-7 px-3 text-amber-700 border-amber-300 hover:bg-amber-50 rounded-lg font-semibold"
              >
                Detain Selected ({selectedIds.size})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs h-7 px-2 text-slate-500 hover:text-slate-800"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-bold border-b border-gray-200 dark:border-zinc-700 text-[11px] uppercase tracking-wider">
                <th className="p-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all students"
                    checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer align-middle"
                  />
                </th>
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
                  <td colSpan={7} className="p-10 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading students for {sourceClassName}...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <img
                      src="/images/empty-folder.png"
                      alt="No students found"
                      className="mx-auto mb-3 h-24 w-24 object-contain"
                    />
                    <div className="font-semibold text-slate-700 text-sm">No students found</div>
                    <p className="text-xs text-slate-400 mt-1">
                      No active students with assigned G.R. numbers found in this class.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const name = (stu.student_name || stu.name || [stu.first_name, stu.last_name].filter(Boolean).join(" ")).trim();
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
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${stu.student_name || stu.name}`}
                          checked={selectedIds.has(stu.id)}
                          onChange={() => toggleSelectStudent(stu.id)}
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer align-middle"
                        />
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-500">
                        {stu.roll_number || "—"}
                      </td>
                      <td className="p-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {stu.gr_number || "—"}
                      </td>
                      <td className="p-3 font-bold text-gray-900 dark:text-zinc-100">
                        {capitalizeWords(name) || "Student"}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-zinc-400">
                        {capitalizeWords(stu.school_class || sourceClassName)} - Div {(stu.division || "A").toUpperCase()}
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
                        <button
                          type="button"
                          title="Promote only this student and detain others"
                          onClick={() => {
                            setStudents((prev) =>
                              prev.map((s) => ({
                                ...s,
                                status: s.id === stu.id ? "promote" : "detain",
                              }))
                            );
                            toast.success(`Promoting only "${stu.student_name || stu.name}". All others set to Detain.`);
                          }}
                          className="ml-2 text-[10px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-800 transition-colors"
                        >
                          Only
                        </button>
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
