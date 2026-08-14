"use client";

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

// Premium background and visual configurations
const FONT_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";

const SUBJECT_COLORS = [
  { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100/80", iconBg: "bg-indigo-100/50" },
  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100/80", iconBg: "bg-emerald-100/50" },
  { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100/80", iconBg: "bg-blue-100/50" },
  { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100/80", iconBg: "bg-amber-100/50" },
  { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100/80", iconBg: "bg-rose-100/50" },
  { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100/80", iconBg: "bg-purple-100/50" },
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
  const handleSaveMarks = async () => {
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
        entries: roster.map((r) => ({
          student: r.student,
          marks_obtained: r.is_absent ? 0 : Number(r.marks_obtained || 0),
          is_absent: r.is_absent ? "True" : "False",
          remarks: r.remarks || "",
        })),
      };

      await bulkSaveMarks(payload);
      toast.success("Marks saved successfully!");
      
      // Re-load roster to sync values
      loadExamRoster(selectedExam);
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
        entries: roster.map((r) => ({
          student: r.student,
          marks_obtained: r.is_absent ? 0 : Number(r.marks_obtained || 0),
          is_absent: r.is_absent ? "True" : "False",
          remarks: r.remarks || "",
        })),
      };

      // Autosave draft marks
      await bulkSaveMarks(savePayload);

      // Publish results
      await publishResults(selectedExam.id);
      toast.success("Marks saved and results published successfully!");
      
      // Re-load roster to sync state
      loadExamRoster(selectedExam);
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
    <div
      className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 overflow-x-hidden relative animate-fade-in"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`
        @import url('${FONT_URL}');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 left-10 w-85 h-85 bg-violet-200/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />

      {view === "list" ? (
        <>
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
            <div>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">Timetable Manager</p>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                <CalendarRange className="text-indigo-600 h-8 w-8" />
                Exam Timetable
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Schedule new examination timetables and view scheduled academic evaluations.
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <Link href="/teacher/exams/class-teacher">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl shadow-sm px-4 h-11 font-bold transition-all duration-300"
                >
                  <Users size={16} />
                  Class Teacher View
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={loadPageData}
                disabled={isLoading}
                className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-4 h-11 transition-all duration-300 font-semibold text-slate-600"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                ) : (
                  <RefreshCw size={16} className="text-slate-500" />
                )}
                Refresh
              </Button>

              <Button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-md px-5 h-11 font-bold transition-all duration-300"
              >
                <Plus size={16} />
                Schedule Exam
              </Button>
            </div>
          </div>

          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 z-10">
            {isLoading || isStatusLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                {/* Card 1: All Exams */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMarksFilter("all")}
                  onKeyDown={(e) => e.key === "Enter" && setMarksFilter("all")}
                  style={{
                    outline: marksFilter === "all" ? "2.5px solid #6366f1" : "2.5px solid transparent",
                    boxShadow: marksFilter === "all" ? "0 0 0 4px rgba(99,102,241,0.12)" : undefined,
                    transition: "all 0.2s ease",
                    borderRadius: "1rem",
                    cursor: "pointer",
                  }}
                >
                  <Card className="border-indigo-100/60 bg-gradient-to-br from-indigo-50/40 via-white to-white rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3.5 rounded-xl bg-indigo-100/50 text-indigo-600 shrink-0">
                        <CalendarRange size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">All Exams</p>
                        <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{stats.total}</h2>
                      </div>
                      {marksFilter === "all" && (
                        <span style={{ background: "#6366f1", color: "white", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px", letterSpacing: "0.05em" }}>ACTIVE</span>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Card 2: Marks Added */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMarksFilter("marks-added")}
                  onKeyDown={(e) => e.key === "Enter" && setMarksFilter("marks-added")}
                  style={{
                    outline: marksFilter === "marks-added" ? "2.5px solid #10b981" : "2.5px solid transparent",
                    boxShadow: marksFilter === "marks-added" ? "0 0 0 4px rgba(16,185,129,0.12)" : undefined,
                    transition: "all 0.2s ease",
                    borderRadius: "1rem",
                    cursor: "pointer",
                  }}
                >
                  <Card className="border-emerald-100/60 bg-gradient-to-br from-emerald-50/40 via-white to-white rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3.5 rounded-xl bg-emerald-100/50 text-emerald-600 shrink-0">
                        <Award size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Marks Added</p>
                        <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{stats.marksAdded}</h2>
                      </div>
                      {marksFilter === "marks-added" && (
                        <span style={{ background: "#10b981", color: "white", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px", letterSpacing: "0.05em" }}>ACTIVE</span>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Card 3: Marks Not Added */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMarksFilter("marks-not-added")}
                  onKeyDown={(e) => e.key === "Enter" && setMarksFilter("marks-not-added")}
                  style={{
                    outline: marksFilter === "marks-not-added" ? "2.5px solid #f43f5e" : "2.5px solid transparent",
                    boxShadow: marksFilter === "marks-not-added" ? "0 0 0 4px rgba(244,63,94,0.12)" : undefined,
                    transition: "all 0.2s ease",
                    borderRadius: "1rem",
                    cursor: "pointer",
                  }}
                >
                  <Card className="border-rose-100/60 bg-gradient-to-br from-rose-50/40 via-white to-white rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3.5 rounded-xl bg-rose-100/50 text-rose-600 shrink-0">
                        <AlertCircle size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Marks Not Added</p>
                        <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{stats.marksNotAdded}</h2>
                      </div>
                      {marksFilter === "marks-not-added" && (
                        <span style={{ background: "#f43f5e", color: "white", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px", letterSpacing: "0.05em" }}>ACTIVE</span>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>

          {/* Toolbar Filter Section */}
          {isLoading && exams.length === 0 ? (
            <div className="h-14 w-full bg-white border border-slate-100/80 rounded-2xl animate-pulse flex items-center justify-between px-5 shadow-sm">
              <div className="h-4.5 w-1/3 bg-slate-100 rounded-md" />
              <div className="h-5 w-40 bg-slate-100 rounded-md" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm z-10">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <Input
                  placeholder="Search exams by title, details, or class name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-indigo-500/50 text-sm w-full transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="h-12 px-4 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-600 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer min-w-[160px]"
                >
                  <option value="all">All Class Groups</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.school_class}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Main Grid View */}
          {isLoading || isStatusLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <ExamCardSkeleton key={n} />
              ))}
            </div>
          ) : error ? (
            <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl z-10 p-6 text-center max-w-md mx-auto">
              <AlertCircle className="text-rose-500 h-10 w-10 mx-auto mb-3 shrink-0" />
              <h2 className="text-rose-900 text-lg font-bold">Failed to sync exams</h2>
              <p className="text-rose-600 text-sm mt-1">{error}</p>
              <Button onClick={loadPageData} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5">
                Retry Sync
              </Button>
            </Card>
          ) : filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm z-10">
              <CalendarRange className="h-14 w-14 text-slate-200 mb-3" />
              <p className="text-base font-semibold">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
              <AnimatePresence>
                {filteredExams.map((ex, index) => {
                   const colorConfig = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                  const readableSubject = resolveSubjectName(ex.subject);
                  const status = examStatuses[ex.id] || { isPublished: false, isDraft: false, hasMarks: false };
                  const timeStatus = getExamTimeStatus(ex);

                  let badgeBg = "bg-slate-50 border-slate-150 text-slate-500";
                  let badgeText = "Result Not Updated";
                  if (status.isPublished) {
                    badgeBg = "bg-emerald-50 border-emerald-100 text-emerald-600";
                    badgeText = "Result Updated";
                  } else if (status.isDraft) {
                    badgeBg = "bg-amber-50 border-amber-100 text-amber-600";
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
                      <Card className="border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-3xl h-full flex flex-col justify-between overflow-hidden group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-2xl ${colorConfig.bg} ${colorConfig.text} shrink-0`}>
                                <BookOpen size={20} className="group-hover:scale-110 transition-transform duration-300" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  {ex.class_group_name || "Class Group"}
                                </span>
                                <CardTitle className="text-lg text-slate-800 font-extrabold tracking-tight mt-0.5 leading-tight truncate max-w-[130px]" title={ex.title}>
                                  {ex.title}
                                </CardTitle>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full border font-bold text-[8px] tracking-wide uppercase shrink-0 ${badgeBg}`}>
                              {badgeText}
                            </span>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0 flex flex-col gap-4 flex-1 justify-between">
                          <div>
                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-1" title={ex.description}>
                              {ex.description || "No description provided."}
                            </p>

                            <div className="space-y-1.5 pt-2 border-t border-slate-100/80 mt-3">
                              {/* Subject Tag */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <FileText size={13} />
                                  Evaluation
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${colorConfig.bg} ${colorConfig.text}`}>
                                  {readableSubject}
                                </span>
                              </div>

                              {/* Date Tag */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Calendar size={13} />
                                  Exam Date
                                </span>
                                <span className="text-slate-700 font-bold">
                                  {formatExamDate(ex.exam_date)}
                                </span>
                              </div>

                              {/* Time Tag */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Clock size={13} />
                                  Duration
                                </span>
                                <span className="text-slate-700 font-bold flex items-center gap-1">
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
                            className="w-full mt-3 h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group-hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Award size={14} className="text-indigo-500" />
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
        <div className="flex flex-col gap-6 z-10">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setView("list")}
                className="p-3 border border-slate-200 hover:bg-slate-50 rounded-xl h-11 w-11 flex items-center justify-center"
              >
                <ArrowLeft size={16} className="text-slate-600" />
              </Button>
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">
                  Class Group: {selectedExam?.class_group_name}
                </span>
                <h1 className="text-2xl font-black text-slate-800 leading-tight">
                  {selectedExam?.title} Results
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  Enter evaluations, grade marks, and publish results to student cards.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <Button
                onClick={handlePublishResults}
                disabled={publishing || isRosterPublished || roster.length === 0}
                className="h-11 px-5 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {publishing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                {isRosterPublished ? "Published" : "Publish Results"}
              </Button>
            </div>
          </div>

          {/* Config & Controls Box */}
          <Card className="border-slate-100 shadow-sm rounded-2xl bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-600">Maximum Evaluated Marks:</span>
              <Input
                type="number"
                value={maxMarks}
                disabled={isRosterPublished}
                onChange={(e) => setMaxMarks(Math.max(1, Number(e.target.value)))}
                className="w-24 h-11 text-center font-extrabold focus-visible:ring-indigo-500/50 border-slate-200 text-slate-800 rounded-xl"
              />
            </div>
            
            {isRosterPublished && (
              <div className="flex items-center gap-2.5 px-4.5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <span>Results for this exam have been published and are locked for editing.</span>
              </div>
            )}
          </Card>

          {/* Table Container Card */}
          <Card className="border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-slate-800 font-bold">Student Roster</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-400">
                  {roster.length} students enrolled in {selectedExam?.class_group_name}
                </CardDescription>
              </div>
            </CardHeader>

            {rosterLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/40 text-left border-b border-slate-100 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      <th className="px-6 py-4.5">GR No.</th>
                      <th className="px-6 py-4.5">Student Name</th>
                      <th className="px-6 py-4.5 text-center">Is Absent</th>
                      <th className="px-6 py-4.5 text-center" style={{ width: "160px" }}>Marks Obtained</th>
                      <th className="px-6 py-4.5">Remarks / Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <RosterRowSkeleton key={n} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : rosterError ? (
              <div className="py-16 text-center max-w-sm mx-auto">
                <AlertCircle className="h-9 w-9 text-rose-500 mx-auto mb-2.5" />
                <p className="text-slate-800 text-sm font-bold">Failed to load roster</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{rosterError}</p>
                <Button onClick={() => loadExamRoster(selectedExam!)} className="mt-4 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4">
                  Retry
                </Button>
              </div>
            ) : roster.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Users className="h-10 w-10 text-slate-200 mx-auto mb-2.5" />
                <p className="text-xs font-bold">No students registered in this class.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/40 text-left border-b border-slate-100 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      <th className="px-6 py-4.5">GR No.</th>
                      <th className="px-6 py-4.5">Student Name</th>
                      <th className="px-6 py-4.5 text-center">Is Absent</th>
                      <th className="px-6 py-4.5 text-center" style={{ width: "160px" }}>Marks Obtained</th>
                      <th className="px-6 py-4.5">Remarks / Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {roster.map((row) => (
                      <tr key={row.student} className="hover:bg-slate-50/40 transition-colors">
                        {/* GR Number */}
                        <td className="px-6 py-4 font-bold text-slate-400 tracking-wider">
                          {row.gr_no || "—"}
                        </td>
                        
                        {/* Student Name */}
                        <td className="px-6 py-4 font-bold text-slate-800 capitalize">
                          {row.student_name}
                        </td>
                        
                        {/* Absent Toggle Checkbox */}
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={row.is_absent}
                            disabled={isRosterPublished}
                            onChange={(e) => updateRosterRow(row.student, { is_absent: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                        
                        {/* Marks Obtained Input */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={maxMarks}
                              value={row.marks_obtained !== null ? row.marks_obtained : ""}
                              disabled={row.is_absent || isRosterPublished}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                updateRosterRow(row.student, { marks_obtained: val });
                              }}
                              className={`w-20 text-center font-extrabold h-9 rounded-xl focus-visible:ring-indigo-500/50 ${
                                row.marks_obtained !== null && row.marks_obtained > maxMarks
                                  ? "border-rose-300 bg-rose-50/30 text-rose-600"
                                  : "border-slate-200 text-slate-800"
                              }`}
                            />
                            <span className="text-slate-400 font-bold">/ {maxMarks}</span>
                          </div>
                        </td>
                        
                        {/* Remarks Input */}
                        <td className="px-6 py-4">
                          <Input
                            placeholder="e.g. Good progress, outstanding work"
                            value={row.remarks || ""}
                            disabled={isRosterPublished}
                            onChange={(e) => updateRosterRow(row.student, { remarks: e.target.value })}
                            className="h-9 focus-visible:ring-indigo-500/50 border-slate-200 rounded-xl"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Action Row */}
          {!isRosterPublished && roster.length > 0 && (
            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setView("list")}
                className="h-11 rounded-xl px-6 font-semibold text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSaveMarks}
                disabled={savingMarks || rosterLoading}
                className="h-11 px-6 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {savingMarks ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Save Draft Marks
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Schedule Exam Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl max-w-lg w-full shadow-xl border border-slate-100 overflow-hidden flex flex-col relative"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Schedule Examination</h3>
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
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="px-6 pt-4 pb-0">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold animate-shake">
                  <AlertCircle size={15} className="shrink-0 text-rose-500" />
                  <span>{modalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Exam Title</label>
                <Input
                  placeholder="e.g. Mid-Term Chemistry Evaluation"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl h-11 focus-visible:ring-indigo-500/50 border-slate-200"
                />
              </div>

              {/* Description textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Description / Instructions</label>
                <Textarea
                  placeholder="e.g. 50 Marks MCQ test covering chapters 1 to 4. Standard calculator allowed."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl min-h-[80px] resize-none focus-visible:ring-indigo-500/50 border-slate-200 text-xs"
                />
              </div>

              {/* Grid Class Group & Subject select */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Class Group</label>
                  <select
                    value={formData.class_group}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.school_class}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    disabled={!formData.class_group || formSubjectsLoading}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer disabled:opacity-50"
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
                  </select>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Exam Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    min={getTomorrowDateString()} // getTomorrowDateString outputs YYYY-MM-DD which is correct for HTML min attribute
                    value={toHTMLDate(formData.exam_date)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, exam_date: toApiDate(e.target.value) }))}
                    className="rounded-xl h-11 focus-visible:ring-indigo-500/50 border-slate-200 text-slate-600 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Time Slots grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Start Time</label>
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
                    className="rounded-xl h-11 focus-visible:ring-indigo-500/50 border-slate-200 text-slate-600 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">End Time</label>
                  <Input
                    type="time"
                    min={formData.start_time}
                    value={formData.end_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="rounded-xl h-11 focus-visible:ring-indigo-500/50 border-slate-200 text-slate-600 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Duration Indicator */}
              {calculateDuration(formData.start_time, formData.end_time) && (() => {
                const [startH, startM] = formData.start_time.split(":").map(Number);
                const [endH, endM] = formData.end_time.split(":").map(Number);
                const isOverLimit = (endH * 60 + endM) - (startH * 60 + startM) > 240;
                
                return (
                  <div className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold w-fit animate-fade-in ${
                    isOverLimit 
                      ? "bg-rose-50 border-rose-100 text-rose-600" 
                      : "bg-indigo-50/60 border border-indigo-100 text-indigo-600"
                  }`}>
                    {isOverLimit ? (
                      <>
                        <AlertCircle size={13} className="text-rose-500 shrink-0" />
                        <span>Duration exceeds 4 hours limit: {calculateDuration(formData.start_time, formData.end_time)}</span>
                      </>
                    ) : (
                      <>
                        <Clock size={13} className="text-indigo-500 shrink-0" />
                        <span>Total Duration: {calculateDuration(formData.start_time, formData.end_time)}</span>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white">
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
                  className="flex-1 rounded-xl h-11 font-semibold text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl h-11 font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      Scheduling...
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
