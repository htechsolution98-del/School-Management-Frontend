"use client";


import ResponsiveSelect from "@/components/ui/responsive-select";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  FileText,
  Calendar,
  X,
  ArrowLeft,
  Save,
  Check,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTeacherExams,
  createTeacherExam,
  getExamRoster,
  bulkSaveMarks,
  publishResults,
} from "@/lib/teacher";
import { getClasses, getSchoolClassesForExam, getSubjectsByClass } from "@/lib/clerk";
import type { Exam, CreateExamPayload, RosterEntry, BulkSavePayload, BulkSaveEntry } from "@/types/teacher";
import type { SchoolClass, Subject } from "@/types/clerk";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";

function getStudentInitials(name?: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SUBJECT_COLORS = [
  { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100/80", iconBg: "bg-sky-100/50" },
  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100/80", iconBg: "bg-emerald-100/50" },
  { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100/80", iconBg: "bg-blue-100/50" },
  { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100/80", iconBg: "bg-amber-100/50" },
  { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100/80", iconBg: "bg-rose-100/50" },
  { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100/80", iconBg: "bg-teal-100/50" },
];

type ViewState = "list" | "marks";

function MetricCardSkeleton() {
  return (
    <Card className="border-slate-100/80 bg-white shadow-sm rounded-2xl overflow-hidden animate-pulse">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-24 bg-slate-100 rounded-md" />
          <div className="h-6 w-12 bg-slate-200 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function ExamCardSkeleton() {
  return (
    <Card className="border-slate-100 shadow-sm bg-white rounded-3xl p-5 flex flex-col justify-between gap-4 animate-pulse h-full min-h-[300px]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 shrink-0" />
            <div className="space-y-2">
              <div className="h-3 w-16 bg-slate-100 rounded-md" />
              <div className="h-4 w-28 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="h-5 w-16 bg-slate-100 rounded-full" />
        </div>

        <div className="space-y-2 mt-5">
          <div className="h-3.5 w-full bg-slate-100 rounded-md" />
          <div className="h-3.5 w-5/6 bg-slate-100 rounded-md" />
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100 mt-5">
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-20 bg-slate-100 rounded-md" />
            <div className="h-3.5 w-24 bg-slate-100 rounded-md" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-20 bg-slate-100 rounded-md" />
            <div className="h-3.5 w-28 bg-slate-100 rounded-md" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-20 bg-slate-100 rounded-md" />
            <div className="h-3.5 w-32 bg-slate-100 rounded-md" />
          </div>
        </div>
      </div>

      <div className="h-10 w-full bg-slate-100 rounded-xl mt-2" />
    </Card>
  );
}

function RosterRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      <td className="px-6 py-4.5">
        <div className="h-4 w-12 bg-slate-100 rounded-md" />
      </td>
      <td className="px-6 py-4.5">
        <div className="h-4 w-32 bg-slate-100 rounded-md" />
      </td>
      <td className="px-6 py-4.5 text-center">
        <div className="h-4.5 w-4.5 bg-slate-100 rounded mx-auto" />
      </td>
      <td className="px-6 py-4.5">
        <div className="h-9 w-20 bg-slate-100 rounded-xl mx-auto" />
      </td>
      <td className="px-6 py-4.5">
        <div className="h-9 w-full bg-slate-100 rounded-xl" />
      </td>
    </tr>
  );
}

export default function TeacherExamsPage() {
  const [view, setView] = useState<ViewState>("list");
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 1, name: "maths", division: null },
    { id: 2, name: "science", division: null },
    { id: 3, name: "english", division: null },
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");

  // Modal / Drawer state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New Exam Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    class_group: "",
  });

  // Marks View State
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterMeta, setRosterMeta] = useState<{ is_class_teacher: boolean; status: string; can_edit: boolean }>({
    is_class_teacher: false,
    status: "DRAFT",
    can_edit: true,
  });
  const [maxMarks, setMaxMarks] = useState<number>(50);
  const [savingMarks, setSavingMarks] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [examStatuses, setExamStatuses] = useState<Record<number, { isPublished: boolean; isDraft: boolean; hasMarks: boolean }>>({});
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [formSubjects, setFormSubjects] = useState<Subject[]>([]);
  const [formSubjectsLoading, setFormSubjectsLoading] = useState(false);
  const [marksFilter, setMarksFilter] = useState<"all" | "marks-added" | "marks-not-added">("all");

  // Fetch all exams and classes
  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [examsRes, classesRes] = await Promise.allSettled([
        getTeacherExams(),
        getSchoolClassesForExam(),
      ]);

      let examsList: Exam[] = [];

      if (examsRes.status === "fulfilled") {
        examsList = examsRes.value;
        setExams(examsList);
      } else {
        throw new Error(examsRes.reason?.message || "Failed to load scheduled exams.");
      }

      // Populate classes with API values, falling back to static lists on auth failures
      if (classesRes.status === "fulfilled") {
        setClasses(classesRes.value);
      } else {
        setClasses([
          { id: 1, school_class: "class1" },
          { id: 2, school_class: "class2" },
          { id: 3, school_class: "class3" },
        ]);
      }

      // Fetch rosters for all exams in parallel to inspect grading status
      setIsStatusLoading(true);
      if (examsList.length > 0) {
        const statusesMap: Record<number, { isPublished: boolean; isDraft: boolean; hasMarks: boolean }> = {};
        const rosterResults = await Promise.allSettled(
          examsList.map((ex) => getExamRoster(ex.id))
        );

        rosterResults.forEach((res, idx) => {
          const ex = examsList[idx];
          if (res.status === "fulfilled") {
            const rosterData = res.value.roster || [];
            const hasMarks = rosterData.some(
              (r) => (r.marks_obtained !== null && r.marks_obtained !== undefined) || r.is_absent
            );
            const isPublished = rosterData.some((r) => r.is_published);
            const isDraft = hasMarks && !isPublished;
            
            statusesMap[ex.id] = { isPublished, isDraft, hasMarks };
          } else {
            statusesMap[ex.id] = { isPublished: false, isDraft: false, hasMarks: false };
          }
        });
        setExamStatuses(statusesMap);
      } else {
        setExamStatuses({});
      }
      setIsStatusLoading(false);

    } catch (err: any) {
      setError(err?.message || "Something went wrong loading exam timetable dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Load roster for editing
  const loadExamRoster = async (exam: Exam) => {
    setSelectedExam(exam);
    setView("marks");
    setRosterLoading(true);
    setRosterError(null);

    try {
      const rosterRes = await getExamRoster(exam.id);
      const rawList = rosterRes.roster || [];

      setRosterMeta({
        is_class_teacher: rosterRes.is_class_teacher ?? false,
        status: rosterRes.status ?? "DRAFT",
        can_edit: rosterRes.can_edit ?? true,
      });

      // Normalize entry fields — API might use different field names
      const list: RosterEntry[] = rawList.map((r: any) => ({
        student: r.student ?? r.student_id ?? r.id ?? 0,
        student_name:
          r.student_name ??
          r.name ??
          r.full_name ??
          r.student_full_name ??
          `Student #${r.student ?? r.student_id ?? r.id ?? "?"}`,
        gr_no:
          r.gr_no ??
          r.roll_no ??
          r.admission_number ??
          r.gr ??
          "",
        marks_obtained:
          r.marks_obtained !== undefined ? r.marks_obtained : null,
        max_marks: r.max_marks !== undefined ? r.max_marks : null,
        is_absent: r.is_absent === true || r.is_absent === "True",
        remarks: r.remarks ?? r.comment ?? r.remark ?? null,
        status: r.status ?? "DRAFT",
        is_published: r.is_published === true || r.is_published === "True",
      }));

      setRoster(list);

      // Determine max marks from existing records if available
      const firstWithMax = list.find((r) => r.max_marks !== null && r.max_marks !== undefined);
      if (firstWithMax && firstWithMax.max_marks) {
        setMaxMarks(firstWithMax.max_marks);
      } else {
        setMaxMarks(50);
      }

    } catch (err: any) {
      setRosterError(err?.message || "Failed to load exam marks roster.");
    } finally {
      setRosterLoading(false);
    }
  };

  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateDuration = (start: string, end: string): string | null => {
    if (!start || !end) return null;
    try {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      
      if (endMin <= startMin) return null;
      
      const diffMin = endMin - startMin;
      const hours = Math.floor(diffMin / 60);
      const minutes = diffMin % 60;
      
      const parts = [];
      if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
      if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? "s" : ""}`);
      return parts.join(" ");
    } catch {
      return null;
    }
  };

  // Form submission handler
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    // Basic Validation
    if (!formData.title.trim()) return setModalError("Please enter a title.");
    if (!formData.description.trim()) return setModalError("Please enter description / instructions.");
    if (!formData.class_group) return setModalError("Please select a class group.");
    if (!formData.subject) return setModalError("Please select a subject.");
    if (!formData.exam_date) return setModalError("Please select an exam date.");
    if (!formData.start_time) return setModalError("Please select a start time.");
    if (!formData.end_time) return setModalError("Please select an end time.");

    // Date verification: must be from tomorrow onwards
    const tomorrowStr = getTomorrowDateString();
    if (formData.exam_date < tomorrowStr) {
      return setModalError("Exam date must be from tomorrow onwards.");
    }

    // Time verification
    if (formData.start_time >= formData.end_time) {
      return setModalError("End time must be after start time.");
    }

    // Duration verification: maximum of 4 hours
    const [startH, startM] = formData.start_time.split(":").map(Number);
    const [endH, endM] = formData.end_time.split(":").map(Number);
    if ((endH * 60 + endM) - (startH * 60 + startM) > 240) {
      return setModalError("Exam duration cannot exceed 4 hours.");
    }

    setSubmitting(true);

    try {
      const payload: CreateExamPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject: formData.subject ? Number(formData.subject) : null,
        exam_date: formData.exam_date,
        start_time: formData.start_time + (formData.start_time.length === 5 ? ":00" : ""),
        end_time: formData.end_time + (formData.end_time.length === 5 ? ":00" : ""),
        class_group: Number(formData.class_group),
      };

      await createTeacherExam(payload);
      toast.success("Exam scheduled successfully!");
      setShowScheduleModal(false);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        subject: "",
        exam_date: "",
        start_time: "",
        end_time: "",
        class_group: "",
      });
      setFormSubjects([]);

      // Refresh list
      loadPageData();
    } catch (err: any) {
      setModalError(err?.message || "Failed to schedule exam. Please check fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClassChange = async (classId: string) => {
    setFormData((prev) => ({ ...prev, class_group: classId, subject: "" }));
    setFormSubjects([]);

    if (classId) {
      setFormSubjectsLoading(true);
      try {
        const subs = await getSubjectsByClass(Number(classId));
        setFormSubjects(subs);
      } catch (err: any) {
        toast.error(err?.message || "Failed to fetch subjects for selected class.");
      } finally {
        setFormSubjectsLoading(false);
      }
    }
  };

  // Handle roster field updates locally
  const updateRosterRow = (studentId: number, fields: Partial<RosterEntry>) => {
    setRoster((prev) =>
      prev.map((r) => {
        if (r.student === studentId) {
          const next = { ...r, ...fields };
          
          // Auto-calculate remark when marks_obtained or is_absent changes
          if (fields.is_absent === true) {
            next.marks_obtained = 0;
            next.remarks = "Absent";
          } else if (fields.marks_obtained !== undefined) {
            const marksVal = fields.marks_obtained ?? 0;
            const pct = maxMarks > 0 ? (marksVal / maxMarks) * 100 : 0;
            let autoRemark = "Poor";
            if (pct >= 85) autoRemark = "Very Good";
            else if (pct >= 60) autoRemark = "Good";
            else if (pct >= 40) autoRemark = "Average";
            next.remarks = autoRemark;
          }
          
          return next;
        }
        return r;
      })
    );
  };

  // Save Roster Marks
  const handleSaveMarks = async (targetStatus: "DRAFT" | "SUBMITTED" = "DRAFT") => {
    if (!selectedExam) return;
    setSavingMarks(true);

    try {
      // Validate marks input against maximum limit
      for (const entry of roster) {
        if (!entry.is_absent && entry.marks_obtained !== null && entry.marks_obtained > maxMarks) {
          throw new Error(`Marks for ${entry.student_name} cannot exceed max marks of ${maxMarks}.`);
        }
      }

      const payload: BulkSavePayload = {
        exam: selectedExam.id,
        max_marks: maxMarks,
        status: targetStatus,
        entries: roster.map((r) => ({
          student: r.student,
          marks_obtained: r.is_absent ? 0 : Number(r.marks_obtained || 0),
          is_absent: r.is_absent ? "True" : "False",
          remarks: r.remarks || "",
          status: targetStatus,
        })),
      };

      await bulkSaveMarks(payload);
      toast.success(
        targetStatus === "SUBMITTED"
          ? "Marks submitted to Class Teacher successfully!"
          : "Draft marks saved successfully!"
      );
      
      // Re-load roster to sync values
      await loadExamRoster(selectedExam);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save exam marks.");
    } finally {
      setSavingMarks(false);
    }
  };

  // Publish Results (autosaves draft first, then publishes)
  const handlePublishResults = async () => {
    if (!selectedExam) return;
    setPublishing(true);

    try {
      // Validate marks input against maximum limit
      for (const entry of roster) {
        if (!entry.is_absent && entry.marks_obtained !== null && entry.marks_obtained > maxMarks) {
          throw new Error(`Marks for ${entry.student_name} cannot exceed max marks of ${maxMarks}.`);
        }
      }

      const savePayload: BulkSavePayload = {
        exam: selectedExam.id,
        max_marks: maxMarks,
        status: "VERIFIED",
        entries: roster.map((r) => ({
          student: r.student,
          marks_obtained: r.is_absent ? 0 : Number(r.marks_obtained || 0),
          is_absent: r.is_absent ? "True" : "False",
          remarks: r.remarks || "",
          status: "VERIFIED",
        })),
      };

      // Autosave verified marks
      await bulkSaveMarks(savePayload);

      // Publish results
      await publishResults(selectedExam.id);
      toast.success("Marks verified and results published successfully!");
      
      // Re-load roster to sync state
      await loadExamRoster(selectedExam);
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish exam results.");
    } finally {
      setPublishing(false);
    }
  };

  // Helper to map subject ID to its readable string name
  const resolveSubjectName = (subjectId: number | null): string => {
    if (!subjectId) return "General / Other";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : `Subject #${subjectId}`;
  };

  // Group stats calculations
  const stats = useMemo(() => {
    const total = exams.length;
    
    let marksAdded = 0;
    let marksNotAdded = 0;

    exams.forEach((ex) => {
      const status = examStatuses[ex.id];
      if (status && (status.hasMarks || status.isPublished || status.isDraft)) {
        marksAdded++;
      } else {
        marksNotAdded++;
      }
    });

    return { total, marksAdded, marksNotAdded };
  }, [exams, examStatuses]);

  // Format visual dates
  const formatExamDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Format times to 12-hour AM/PM
  const formatExamTime = (timeStr: string): string => {
    if (!timeStr) return "";
    try {
      const parts = timeStr.split(":");
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHours = h % 12 || 12;
      return `${displayHours.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
    } catch {
      return timeStr;
    }
  };
  // Helper to check current date/time relative to exam start and end times
  const getExamTimeStatus = (exam: Exam): { isFinished: boolean; label: string } => {
    try {
      const [year, month, day] = exam.exam_date.split("-").map(Number);
      const [startH, startM] = exam.start_time.split(":").map(Number);
      const [endH, endM] = exam.end_time.split(":").map(Number);
      
      const now = new Date();
      const examStart = new Date(year, month - 1, day, startH, startM, 0);
      const examEnd = new Date(year, month - 1, day, endH, endM, 0);
      
      if (now < examStart) {
        return { isFinished: false, label: "Upcoming Exam" };
      } else if (now >= examStart && now <= examEnd) {
        return { isFinished: false, label: "Exam in Progress" };
      } else {
        return { isFinished: true, label: "Finished" };
      }
    } catch {
      return { isFinished: true, label: "Finished" };
    }
  };
  // Filtered Timetable List
  const filteredExams = useMemo(() => {
    const list = exams.filter((ex) => {
      const matchesSearch =
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ex.class_group_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClass =
        selectedClassFilter === "all" ||
        String(ex.class_group) === selectedClassFilter;

      const exStatus = examStatuses[ex.id];
      const hasMarks = exStatus && (exStatus.hasMarks || exStatus.isPublished || exStatus.isDraft);
      const matchesMarksFilter =
        marksFilter === "all" ||
        (marksFilter === "marks-added" && hasMarks) ||
        (marksFilter === "marks-not-added" && !hasMarks);

      return matchesSearch && matchesClass && matchesMarksFilter;
    });

    // Sort: latest created exam first (highest id first)
    return [...list].sort((a, b) => b.id - a.id);
  }, [exams, searchQuery, selectedClassFilter, marksFilter, examStatuses]);

  // Check if any results are published in roster list
  const isRosterPublished = useMemo(() => {
    return roster.some((r) => r.is_published);
  }, [roster]);

  return (
    <div className="w-full min-h-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-6 lg:pb-8 flex flex-col gap-5 text-slate-800 dark:text-slate-100">
      {view === "list" ? (
        <>
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
                <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                  Exam Timetable
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  Schedule academic evaluations, monitor timings & record student marks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto w-full sm:w-auto">
              <Link href="/teacher/exams/class-teacher" className="flex-1 sm:flex-initial">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl shadow-2xs h-10 text-xs font-bold transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Class Teacher View</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                size="icon"
                onClick={loadPageData}
                disabled={isLoading}
                className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl shadow-2xs h-10 w-10 shrink-0 transition-all"
                title="Refresh exams"
                aria-label="Refresh exams"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                )}
              </Button>

              <Button
                onClick={() => setShowScheduleModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs shadow-blue-500/20 h-10 px-4 text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Exam</span>
              </Button>
            </div>
          </div>

          {/* Summary Metrics Filter Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {isLoading || isStatusLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                {/* Card 1: All Exams */}
                <button
                  type="button"
                  onClick={() => setMarksFilter("all")}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    marksFilter === "all"
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                      All Exams
                    </span>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <CalendarRange className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                      {stats.total}
                    </span>
                    {marksFilter === "all" && (
                      <span className="hidden xs:inline text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </button>

                {/* Card 2: Marks Added */}
                <button
                  type="button"
                  onClick={() => setMarksFilter("marks-added")}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    marksFilter === "marks-added"
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                      Marks Added
                    </span>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                      {stats.marksAdded}
                    </span>
                    {marksFilter === "marks-added" && (
                      <span className="hidden xs:inline text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </button>

                {/* Card 3: Marks Not Added */}
                <button
                  type="button"
                  onClick={() => setMarksFilter("marks-not-added")}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    marksFilter === "marks-not-added"
                      ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                      Pending
                    </span>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                      {stats.marksNotAdded}
                    </span>
                    {marksFilter === "marks-not-added" && (
                      <span className="hidden xs:inline text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/60 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Toolbar Filter Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by exam title, subject, instructions, class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-[160px]">
                <ResponsiveSelect
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Class Groups</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.school_class}
                    </option>
                  ))}
                </ResponsiveSelect>
              </div>

              {(searchQuery || selectedClassFilter !== "all" || marksFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedClassFilter("all");
                    setMarksFilter("all");
                  }}
                  className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  title="Reset filters"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Grid View */}
          {isLoading || isStatusLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <ExamCardSkeleton key={n} />
              ))}
            </div>
          ) : error ? (
            <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl p-6 text-center max-w-md mx-auto">
              <AlertCircle className="text-rose-500 h-10 w-10 mx-auto mb-3 shrink-0" />
              <h2 className="text-rose-900 text-lg font-bold">Failed to sync exams</h2>
              <p className="text-rose-600 text-sm mt-1">{error}</p>
              <Button onClick={loadPageData} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5">
                Retry Sync
              </Button>
            </Card>
          ) : filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <img src="/images/empty-folder.png" alt="No exams found" className="mb-3 h-24 w-24 object-contain" />
              <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {marksFilter === "marks-added"
                  ? "No exams with marks added yet"
                  : marksFilter === "marks-not-added"
                  ? "All exams have marks added!"
                  : "No scheduled exams found"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                {marksFilter !== "all"
                  ? "Click the \"All Exams\" card above to view all scheduled exams."
                  : "Try adjusting search queries or select filters to locate exams, or add a new scheduled timetable."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <AnimatePresence>
                {filteredExams.map((ex, index) => {
                  const colorConfig = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                  const readableSubject = resolveSubjectName(ex.subject);
                  const status = examStatuses[ex.id] || { isPublished: false, isDraft: false, hasMarks: false };
                  const timeStatus = getExamTimeStatus(ex);

                  let badgeBg = "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300";
                  let badgeText = "Result Not Updated";
                  if (status.isPublished) {
                    badgeBg = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
                    badgeText = "Result Updated";
                  } else if (status.isDraft) {
                    badgeBg = "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300";
                    badgeText = "Result Draft Saved";
                  }

                  return (
                    <motion.div
                      key={ex.id || index}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Card className="border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs hover:shadow-sm transition-all duration-300 bg-white dark:bg-slate-900 rounded-3xl h-full flex flex-col justify-between overflow-hidden group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`p-2.5 rounded-2xl ${colorConfig.bg} ${colorConfig.text} shrink-0 shadow-2xs`}>
                                <BookOpen size={20} className="group-hover:scale-110 transition-transform duration-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  {ex.class_group_name || "Class Group"}
                                </span>
                                <h3 className="text-sm sm:text-base text-slate-900 dark:text-slate-100 font-extrabold tracking-tight mt-0.5 leading-snug line-clamp-1" title={ex.title}>
                                  {ex.title}
                                </h3>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full border font-bold text-[10px] tracking-wide shrink-0 ${badgeBg}`}>
                              {badgeText}
                            </span>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0 flex flex-col gap-4 flex-1 justify-between">
                          <div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1" title={ex.description}>
                              {ex.description || "No description provided."}
                            </p>

                            <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-3 text-xs">
                              {/* Subject Tag */}
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" />
                                  Evaluation
                                </span>
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${colorConfig.bg} ${colorConfig.text}`}>
                                  {readableSubject}
                                </span>
                              </div>

                              {/* Date Tag */}
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Exam Date
                                </span>
                                <span className="text-slate-700 dark:text-slate-200 font-bold text-[11px]">
                                  {formatExamDate(ex.exam_date)}
                                </span>
                              </div>

                              {/* Time Tag */}
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  Duration
                                </span>
                                <span className="text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1">
                                  {formatExamTime(ex.start_time)} – {formatExamTime(ex.end_time)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              if (!status.isPublished && !timeStatus.isFinished) {
                                toast.error(`You can only enter marks after the exam has finished.`);
                                return;
                              }
                              loadExamRoster(ex);
                            }}
                            disabled={!status.isPublished && !timeStatus.isFinished}
                            className={`w-full mt-3 h-10 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              status.isPublished
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
                                : status.isDraft
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800"
                                : !timeStatus.isFinished
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            {status.isPublished 
                              ? "View Results" 
                              : !timeStatus.isFinished 
                              ? timeStatus.label 
                              : status.isDraft 
                              ? "Edit Marks" 
                              : "Enter Marks"}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : (
        /* ─── MARKS ENTRY VIEW ─── */
        <div className="flex flex-col gap-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setView("list")}
                className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    Class Group: {selectedExam?.class_group_name}
                  </span>
                  {rosterMeta.is_class_teacher && (
                    <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                      Class Teacher
                    </span>
                  )}
                  {rosterMeta.status === "SUBMITTED" && (
                    <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                      Submitted to Class Teacher
                    </span>
                  )}
                  {rosterMeta.status === "VERIFIED" && (
                    <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      Verified & Locked
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight mt-0.5 truncate">
                  {selectedExam?.title} — Marks Entry
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  {rosterMeta.is_class_teacher
                    ? "As Class Teacher, you have full authority to edit, save, and submit/publish class marks."
                    : "Subject teachers can edit and save draft marks until submitted to the Class Teacher."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {rosterMeta.is_class_teacher && (
                <Button
                  onClick={handlePublishResults}
                  disabled={publishing || isRosterPublished || roster.length === 0}
                  className="h-10 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {publishing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {isRosterPublished ? "Published" : "Publish Results"}
                </Button>
              )}
            </div>
          </div>

          {/* Locked Status Notice for Subject Teachers */}
          {(!rosterMeta.can_edit || (rosterMeta.status === "SUBMITTED" || rosterMeta.status === "VERIFIED")) && !rosterMeta.is_class_teacher && (
            <div className="flex items-start gap-3 p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-900 dark:text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950 dark:text-amber-100">
                  Marks Submitted to Class Teacher (Read Only)
                </p>
                <p className="text-amber-800 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                  You have submitted these subject marks to the Class Teacher. Subject teachers can only edit marks until submission. All update and verification authority is now with the Class Teacher.
                </p>
              </div>
            </div>
          )}

          {/* Config & Controls Box */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Maximum Evaluated Marks:
              </span>
              <Input
                type="number"
                value={maxMarks}
                disabled={isRosterPublished || !rosterMeta.can_edit}
                onChange={(e) => setMaxMarks(Math.max(1, Number(e.target.value)))}
                className="w-20 sm:w-24 h-9 sm:h-10 text-center font-black focus-visible:ring-blue-500/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs sm:text-sm"
              />
            </div>
            
            {isRosterPublished && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Results for this exam have been published and are locked for editing.</span>
              </div>
            )}
          </Card>

          {/* Table Container Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Student Roster
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-400">
                  {roster.length} students enrolled in {selectedExam?.class_group_name}
                </CardDescription>
              </div>
            </CardHeader>

            {rosterLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">Loading student roster…</p>
              </div>
            ) : rosterError ? (
              <div className="py-16 text-center max-w-sm mx-auto px-4">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-slate-900 dark:text-slate-100 text-sm font-bold">Failed to load roster</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{rosterError}</p>
                <Button onClick={() => loadExamRoster(selectedExam!)} className="mt-4 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-4 text-xs">
                  Retry
                </Button>
              </div>
            ) : roster.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No students registered in this class.</p>
              </div>
            ) : (
              <>
                {/* Desktop Roster Table (Hidden on Mobile) */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full min-w-[650px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-left border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-5 py-3">GR No.</th>
                        <th className="px-5 py-3">Student Name</th>
                        <th className="px-5 py-3 text-center">Is Absent</th>
                        <th className="px-5 py-3 text-center" style={{ width: "160px" }}>Marks Obtained</th>
                        <th className="px-5 py-3">Remarks / Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {roster.map((row) => {
                        const isInputDisabled = isRosterPublished || !rosterMeta.can_edit;
                        return (
                          <tr key={row.student} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                            {/* GR Number */}
                            <td className="px-5 py-3 font-mono font-bold text-slate-500">
                              {row.gr_no || "—"}
                            </td>
                            
                            {/* Student Name */}
                            <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200 capitalize">
                              {row.student_name}
                            </td>
                            
                            {/* Absent Toggle Checkbox */}
                            <td className="px-5 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.is_absent}
                                disabled={isInputDisabled}
                                onChange={(e) => updateRosterRow(row.student, { is_absent: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            
                            {/* Marks Obtained Input */}
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={maxMarks}
                                  value={row.marks_obtained !== null ? row.marks_obtained : ""}
                                  disabled={row.is_absent || isInputDisabled}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    updateRosterRow(row.student, { marks_obtained: val });
                                  }}
                                  className={`w-20 text-center font-extrabold h-9 rounded-xl focus-visible:ring-blue-500/50 ${
                                    row.marks_obtained !== null && row.marks_obtained > maxMarks
                                      ? "border-rose-300 bg-rose-50/30 text-rose-600"
                                      : "border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                  }`}
                                />
                                <span className="text-slate-400 font-bold">/ {maxMarks}</span>
                              </div>
                            </td>
                            
                            {/* Remarks Input */}
                            <td className="px-5 py-3">
                              <Input
                                placeholder="e.g. Good progress, outstanding work"
                                value={row.remarks || ""}
                                disabled={isInputDisabled}
                                onChange={(e) => updateRosterRow(row.student, { remarks: e.target.value })}
                                className="h-9 focus-visible:ring-blue-500/50 border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Roster Cards (Visible on Mobile: md:hidden) */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {roster.map((row) => {
                    const isInputDisabled = isRosterPublished || !rosterMeta.can_edit;
                    const initials = getStudentInitials(row.student_name);
                    return (
                      <div key={row.student} className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50 shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-tight truncate">
                                {row.student_name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                GR: {row.gr_no || "—"}
                              </span>
                            </div>
                          </div>

                          {/* Absent Toggle Button/Checkbox */}
                          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={row.is_absent}
                              disabled={isInputDisabled}
                              onChange={(e) => updateRosterRow(row.student, { is_absent: e.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className={row.is_absent ? "text-rose-600 font-extrabold" : "text-slate-600 dark:text-slate-400"}>
                              Absent
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Marks (Max {maxMarks})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                max={maxMarks}
                                value={row.marks_obtained !== null ? row.marks_obtained : ""}
                                disabled={row.is_absent || isInputDisabled}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  updateRosterRow(row.student, { marks_obtained: val });
                                }}
                                className={`w-full text-center font-extrabold h-9 rounded-xl ${
                                  row.marks_obtained !== null && row.marks_obtained > maxMarks
                                    ? "border-rose-300 bg-rose-50/50 text-rose-600"
                                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Remarks
                            </span>
                            <Input
                              placeholder="e.g. Good, Average"
                              value={row.remarks || ""}
                              disabled={isInputDisabled}
                              onChange={(e) => updateRosterRow(row.student, { remarks: e.target.value })}
                              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          {/* Sticky Bottom Action Bar */}
          {!isRosterPublished && roster.length > 0 && (
            <div className="sticky bottom-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex items-center justify-between gap-2 flex-wrap z-20">
              <Button
                variant="outline"
                onClick={() => setView("list")}
                className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to List
              </Button>
              
              {rosterMeta.can_edit && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleSaveMarks("DRAFT")}
                    disabled={savingMarks || rosterLoading}
                    variant="outline"
                    className="h-10 px-4 text-xs font-bold rounded-xl text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border-blue-200 dark:border-blue-800 shadow-2xs"
                  >
                    {savingMarks ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1" />
                    )}
                    Save Draft
                  </Button>

                  <Button
                    onClick={() => handleSaveMarks("SUBMITTED")}
                    disabled={savingMarks || rosterLoading}
                    className="h-10 px-4 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                  >
                    {savingMarks ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    {rosterMeta.is_class_teacher ? "Submit Marks" : "Submit to Class Teacher"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Exam Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-none max-w-none w-full h-[100dvh] max-h-[100dvh] shadow-2xl border-0 overflow-y-auto flex flex-col relative sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl sm:border"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule Examination</h3>
                <p className="text-xs text-slate-400 mt-0.5">Define exam timetable for student divisions.</p>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setModalError(null);
                  setFormData({
                    title: "",
                    description: "",
                    subject: "",
                    exam_date: "",
                    start_time: "",
                    end_time: "",
                    class_group: "",
                  });
                  setFormSubjects([]);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="px-5 pt-3 pb-0">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{modalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-3.5 overflow-y-auto max-h-[75vh]">
              {/* Title input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Exam Title</label>
                <Input
                  placeholder="e.g. Mid-Term Chemistry Evaluation"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl h-10 focus-visible:ring-blue-500/50 border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              {/* Description textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description / Instructions</label>
                <Textarea
                  placeholder="e.g. 50 Marks MCQ test covering chapters 1 to 4. Standard calculator allowed."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl min-h-[75px] resize-none focus-visible:ring-blue-500/50 border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              {/* Grid Class Group & Subject select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Class Group</label>
                  <ResponsiveSelect
                    value={formData.class_group}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.school_class}
                      </option>
                    ))}
                  </ResponsiveSelect>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subject</label>
                  <ResponsiveSelect
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    disabled={!formData.class_group || formSubjectsLoading}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer disabled:opacity-50"
                  >
                    <option value="">
                      {formSubjectsLoading
                        ? "Loading subjects..."
                        : !formData.class_group
                        ? "Select class first"
                        : "Select Subject"}
                    </option>
                    {formSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </ResponsiveSelect>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Exam Date</label>
                <Input
                  type="date"
                  min={getTomorrowDateString()}
                  value={toHTMLDate(formData.exam_date)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, exam_date: toApiDate(e.target.value) }))}
                  className="rounded-xl h-10 focus-visible:ring-blue-500/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                />
              </div>

              {/* Time Slots grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Start Time</label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData((prev) => {
                        const next = { ...prev, start_time: newStart };
                        if (prev.end_time && newStart >= prev.end_time) {
                          next.end_time = "";
                        }
                        return next;
                      });
                    }}
                    className="rounded-xl h-10 focus-visible:ring-blue-500/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">End Time</label>
                  <Input
                    type="time"
                    min={formData.start_time}
                    value={formData.end_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="rounded-xl h-10 focus-visible:ring-blue-500/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Duration Indicator */}
              {calculateDuration(formData.start_time, formData.end_time) && (() => {
                const [startH, startM] = formData.start_time.split(":").map(Number);
                const [endH, endM] = formData.end_time.split(":").map(Number);
                const isOverLimit = (endH * 60 + endM) - (startH * 60 + startM) > 240;
                
                return (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold w-fit ${
                    isOverLimit 
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400" 
                      : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300"
                  }`}>
                    {isOverLimit ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Duration exceeds 4 hours limit: {calculateDuration(formData.start_time, formData.end_time)}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Total Duration: {calculateDuration(formData.start_time, formData.end_time)}</span>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setModalError(null);
                    setFormData({
                      title: "",
                      description: "",
                      subject: "",
                      exam_date: "",
                      start_time: "",
                      end_time: "",
                      class_group: "",
                    });
                    setFormSubjects([]);
                  }}
                  className="flex-1 rounded-xl h-10 font-bold text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-bold text-xs shadow-xs shadow-blue-500/20 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white mr-1" />
                      Scheduling…
                    </>
                  ) : (
                    "Schedule"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
