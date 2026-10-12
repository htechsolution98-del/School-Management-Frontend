// app/student/homework/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Upload,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Paperclip,
  Send,
  Eye,
  EyeOff,
  FileType2,
  Award,
  MessageSquare,
  CheckSquare,
  Search,
  Filter,
  Check,
} from "lucide-react";
import {
  getStudentHomework,
  getMySubmissions,
  submitHomework,
  type HomeworkItem,
  type HomeworkSubmission,
} from "@/lib/student";

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterTab = "all" | "pending" | "submitted" | "checked";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
}

function isPastDue(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split("T")[0];
  return dateStr < today;
}

function formatDueDate(dateStr: string): string {
  if (!dateStr) return "No due date";
  if (isToday(dateStr)) return "Due Today";
  if (isPastDue(dateStr)) return "Overdue";
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  if (diff === 1) return "Due Tomorrow";
  return `Due in ${diff} days`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(isoStr: string): string {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function getDueBadgeStyle(dateStr: string): { bg: string; text: string; border: string } {
  if (isPastDue(dateStr)) return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  if (isToday(dateStr)) return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" };
  return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" };
}

function getStatusConfig(status?: string | null) {
  const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending:   { label: "Pending",   bg: "bg-amber-50 text-amber-800 border-amber-200", text: "#92400e", dot: "#f59e0b" },
    submitted: { label: "Submitted", bg: "bg-sky-50 text-sky-800 border-sky-200",     text: "#075985", dot: "#0284c7" },
    late:      { label: "Submitted Late", bg: "bg-rose-50 text-rose-800 border-rose-200", text: "#9f1239", dot: "#f43f5e" },
    checked:   { label: "Evaluated", bg: "bg-emerald-50 text-emerald-800 border-emerald-200", text: "#065f46", dot: "#10b981" },
  };
  const key = String(status || "").toLowerCase();
  return configs[key] || { label: "Not Submitted", bg: "bg-slate-50 text-slate-700 border-slate-200", text: "#334155", dot: "#94a3b8" };
}

// Subject color palette
const SUBJECT_PALETTES = [
  { color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
  { color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" },
  { color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { color: "#DB2777", bg: "#FDF2F8", border: "#FBCFE8" },
  { color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" },
];

function getPalette(index: number) {
  return SUBJECT_PALETTES[index % SUBJECT_PALETTES.length];
}

function getSubjectInitial(title: string): string {
  if (!title) return "HW";
  return title.trim().slice(0, 2).toUpperCase();
}

// ─── Quick Submit Modal ───────────────────────────────────────────────────────
function QuickSubmitModal({
  hw,
  existingSubmission,
  onClose,
  onSubmitted,
}: {
  hw: HomeworkItem;
  existingSubmission?: HomeworkSubmission;
  onClose: () => void;
  onSubmitted: (sub: HomeworkSubmission) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAlreadySubmitted = !!existingSubmission;
  const isChecked = existingSubmission?.status === "checked";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
    e.target.value = "";
  };

  const handleModalSubmit = async () => {
    if (!selectedFile && !isAlreadySubmitted) {
      setError("Please attach your homework document or image before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitHomework(hw.id, selectedFile ?? undefined);
      onSubmitted(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit homework. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
              {hw.school_class_name} · {hw.division_name}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              {isAlreadySubmitted ? "Re-submit Homework" : "Submit Homework"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
            <h4 className="text-sm font-bold text-slate-800">{hw.title}</h4>
            {hw.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                {hw.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mt-3 pt-3 border-t border-slate-200/50">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-indigo-500" />
                Due: <strong>{formatDisplayDate(hw.due_date)}</strong>
              </span>
              <span>Teacher: <strong>{hw.teacher_name}</strong></span>
            </div>
          </div>

          {isChecked && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
              <Award size={15} className="text-emerald-600 shrink-0" />
              <span>This assignment has already been evaluated by your teacher.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Attach Completed Assignment (PDF / Image) *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-colors">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-700">
                  {selectedFile ? "Click to choose a different file" : "Click to browse & upload file"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF, PNG, JPG, JPEG documents</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected File Card */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon size={16} />
                ) : (
                  <FileType2 size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="w-7 h-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {isAlreadySubmitted && !selectedFile && existingSubmission?.attachment && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
              <span className="text-slate-600 font-medium truncate">Previously submitted file attached</span>
              <a
                href={existingSubmission.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-bold hover:underline shrink-0"
              >
                View File
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleModalSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send size={14} />
                {isAlreadySubmitted ? "Re-submit Assignment" : "Submit Assignment"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Homework Card ────────────────────────────────────────────────────────────
function HomeworkCard({
  hw,
  palette,
  submission,
  onSelect,
  onQuickSubmit,
}: {
  hw: HomeworkItem;
  palette: ReturnType<typeof getPalette>;
  submission?: HomeworkSubmission;
  onSelect: () => void;
  onQuickSubmit: (e: React.MouseEvent) => void;
}) {
  const dueLabel = formatDueDate(hw.due_date);
  const dueBadge = getDueBadgeStyle(hw.due_date);
  const isSubmitted = !!submission;
  const isChecked = submission?.status === "checked";

  return (
    <div
      onClick={onSelect}
      className="w-full bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col justify-between gap-4"
    >
      <div className="flex items-start gap-4">
        {/* Subject Avatar */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-sm font-extrabold border shadow-2xs"
          style={{
            backgroundColor: palette.bg,
            borderColor: palette.border,
            color: palette.color,
          }}
        >
          {getSubjectInitial(hw.title)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors">
              {hw.title}
            </h3>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${dueBadge.bg} ${dueBadge.text} ${dueBadge.border}`}
            >
              {dueLabel}
            </span>
          </div>

          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">
            {hw.description || "No specific instructions provided."}
          </p>

          <div className="flex items-center gap-3 flex-wrap text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700">
              <BookOpen size={12} className="text-indigo-500" />
              {hw.school_class_name} · {hw.division_name}
            </span>

            <span>Teacher: <strong className="text-slate-800">{hw.teacher_name}</strong></span>

            {hw.attachment && (
              <span className="inline-flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                <Paperclip size={11} />
                Attachment
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer Bar with EXPLICIT SUBMIT BUTTON */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isSubmitted && submission ? (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${getStatusConfig(submission.status).bg}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusConfig(submission.status).dot }}
              />
              {getStatusConfig(submission.status).label}
              {isChecked && submission.marks !== null && (
                <span className="ml-1 font-extrabold text-emerald-700">
                  ({submission.marks} Marks)
                </span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Pending Submission
            </span>
          )}
        </div>

        {/* Dedicated Submit / View Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={onQuickSubmit}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              isSubmitted
                ? "bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200"
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-200"
            }`}
          >
            {isSubmitted ? (
              <>
                <RefreshCw size={13} />
                Re-submit Assignment
              </>
            ) : (
              <>
                <Send size={13} />
                Submit Assignment
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSelect}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
            title="View Details"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({
  total,
  pending,
  submitted,
  checked,
}: {
  total: number;
  pending: number;
  submitted: number;
  checked: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { label: "Total Assignments", value: total,     bg: "bg-indigo-50/70",  text: "text-indigo-700",  border: "border-indigo-100",  badge: "All" },
        { label: "Pending",           value: pending,   bg: "bg-amber-50/70",   text: "text-amber-800",   border: "border-amber-200/70", badge: "To Do" },
        { label: "Submitted",         value: submitted, bg: "bg-sky-50/70",     text: "text-sky-700",     border: "border-sky-100",     badge: "Submitted" },
        { label: "Evaluated & Marked", value: checked,   bg: "bg-emerald-50/70", text: "text-emerald-700", border: "border-emerald-100", badge: "Marked" },
      ].map((s) => (
        <div
          key={s.label}
          className={`${s.bg} ${s.border} border rounded-3xl p-5 shadow-xs flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 border ${s.border} ${s.text}`}>
              {s.badge}
            </span>
          </div>
          <p className={`text-3xl font-black tracking-tight ${s.text}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Homework List View ───────────────────────────────────────────────────────
function HomeworkListView({
  homeworkList,
  submissions,
  loading,
  error,
  onRefresh,
  onSelect,
  onQuickSubmit,
}: {
  homeworkList: HomeworkItem[];
  submissions: HomeworkSubmission[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelect: (hw: HomeworkItem) => void;
  onQuickSubmit: (hw: HomeworkItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const submissionMap = useMemo(() => {
    const map = new Map<number, HomeworkSubmission>();
    submissions.forEach((s) => map.set(s.homework, s));
    return map;
  }, [submissions]);

  const stats = useMemo(() => {
    const submitted = submissions.filter((s) => s.status !== "pending").length;
    const checked   = submissions.filter((s) => s.status === "checked").length;
    const pending   = Math.max(0, homeworkList.length - submitted);
    return { total: homeworkList.length, submitted, pending, checked };
  }, [homeworkList, submissions]);

  // Filter homework list based on tab & search
  const filteredList = useMemo(() => {
    let list = homeworkList;

    if (activeTab === "pending") {
      list = list.filter((hw) => !submissionMap.has(hw.id));
    } else if (activeTab === "submitted") {
      list = list.filter((hw) => {
        const sub = submissionMap.get(hw.id);
        return sub && sub.status !== "checked";
      });
    } else if (activeTab === "checked") {
      list = list.filter((hw) => {
        const sub = submissionMap.get(hw.id);
        return sub && sub.status === "checked";
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (hw) =>
          hw.title.toLowerCase().includes(q) ||
          hw.description?.toLowerCase().includes(q) ||
          hw.teacher_name?.toLowerCase().includes(q) ||
          hw.school_class_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [homeworkList, activeTab, searchQuery, submissionMap]);

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Student Homework Portal</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              {homeworkList.length} Total
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-500" />
            {todayStr}
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} />
          Refresh Homework
        </button>
      </div>

      {/* Summary Metrics */}
      {!loading && !error && (
        <StatsBar
          total={stats.total}
          pending={stats.pending}
          submitted={stats.submitted}
          checked={stats.checked}
        />
      )}

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Navigation & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto">
            {[
              { id: "all",       label: "All Assignments", count: homeworkList.length },
              { id: "pending",   label: "Pending",         count: stats.pending },
              { id: "submitted", label: "Submitted",       count: stats.submitted },
              { id: "checked",   label: "Evaluated",       count: stats.checked },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as FilterTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeTab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search homework..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-indigo-600" />
              <p className="text-xs font-bold text-slate-600">Loading assignments & submissions…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800">Failed to load homework</p>
              <p className="text-xs text-slate-400 max-w-sm">{error}</p>
              <button
                onClick={onRefresh}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredList.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                <BookOpen size={26} />
              </div>
              <p className="text-sm font-bold text-slate-800">No homework found</p>
              <p className="text-xs text-slate-400 max-w-xs">
                {searchQuery
                  ? "No assignments matching your search query."
                  : activeTab === "pending"
                  ? "Great job! You have completed and submitted all assigned homework."
                  : "No homework currently available in this category."}
              </p>
            </div>
          )}

          {/* List of Cards */}
          {!loading &&
            !error &&
            filteredList.map((hw, idx) => (
              <HomeworkCard
                key={hw.id}
                hw={hw}
                palette={getPalette(idx)}
                submission={submissionMap.get(hw.id)}
                onSelect={() => onSelect(hw)}
                onQuickSubmit={(e) => {
                  e.stopPropagation();
                  onQuickSubmit(hw);
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Homework Detail View ─────────────────────────────────────────────────────
function HomeworkDetailView({
  hw,
  palette,
  existingSubmission,
  onBack,
  onSubmitted,
}: {
  hw: HomeworkItem;
  palette: ReturnType<typeof getPalette>;
  existingSubmission?: HomeworkSubmission;
  onBack: () => void;
  onSubmitted: (sub: HomeworkSubmission) => void;
}) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [showSuccess, setShowSuccess]   = useState(false);
  const [submission, setSubmission]     = useState<HomeworkSubmission | undefined>(existingSubmission);

  const dueLabel = formatDueDate(hw.due_date);
  const dueBadge = getDueBadgeStyle(hw.due_date);
  const isAlreadySubmitted = !!submission;
  const isChecked = submission?.status === "checked";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSubmitError(null);
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile && !isAlreadySubmitted) {
      setSubmitError("Please select/attach your completed homework file (PDF or Image) before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitHomework(hw.id, selectedFile ?? undefined);
      setSubmission(result);
      onSubmitted(result);
      setShowSuccess(true);
      setSelectedFile(null);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Navigation Breadcrumb ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200/80 px-3.5 py-2 rounded-2xl shadow-2xs transition-all group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Homework List
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-bold text-slate-800 truncate max-w-sm">
          {hw.title}
        </span>
      </div>

      {/* ── Success Toast ── */}
      {showSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-4 rounded-2xl shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>Homework submitted successfully! Your teacher can now review and grade it. 🎉</span>
        </div>
      )}

      {/* ── Error Toast ── */}
      {submitError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-2xl shadow-xs">
          <AlertCircle size={18} className="text-rose-500 shrink-0" />
          <span className="flex-1">{submitError}</span>
          <button onClick={() => setSubmitError(null)} className="text-rose-400 hover:text-rose-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── 2-Column Responsive Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: Assignment Details (7 cols) ── */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Assignment Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-base font-black border"
                style={{
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                  color: palette.color,
                }}
              >
                {getSubjectInitial(hw.title)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-slate-900 leading-snug">
                  {hw.title}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-0.5 rounded-full border ${dueBadge.bg} ${dueBadge.text} ${dueBadge.border}`}
                  >
                    <Clock size={11} />
                    {dueLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-0.5 rounded-full">
                    <BookOpen size={11} className="text-indigo-500" />
                    {hw.school_class_name} · {hw.division_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Dates Bar */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned On</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{formatDisplayDate(hw.assigned_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{formatDisplayDate(hw.due_date)}</p>
              </div>
            </div>

            {/* Description / Instructions */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-500" />
                Assignment Instructions
              </h3>
              <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {hw.description || "No specific instructions provided for this homework."}
              </div>
            </div>

            {/* Teacher's Attachment */}
            {hw.attachment && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip size={14} className="text-indigo-500" />
                  Attachment from Teacher
                </h3>
                <a
                  href={hw.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl border border-indigo-100 hover:border-indigo-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <FileType2 size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                      View / Download Teacher Attachment
                    </p>
                    <p className="text-[11px] text-slate-400">Click to preview document</p>
                  </div>
                  <Download size={16} className="text-slate-400 group-hover:text-indigo-600 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Teacher's Feedback Card (If evaluated) */}
          {isChecked && submission && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-3xl p-6 border border-emerald-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-emerald-900">Teacher's Evaluation & Feedback</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {submission.marks !== null && (
                  <div className="bg-white rounded-2xl p-4 border border-emerald-100 text-center shadow-2xs">
                    <p className="text-2xl font-black text-emerald-600">{submission.marks}</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">Marks Awarded</p>
                  </div>
                )}
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 text-center shadow-2xs">
                  <p className="text-sm font-black text-emerald-700 capitalize mt-1">
                    {submission.status}
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Status</p>
                </div>
              </div>

              {submission.teacher_remark && (
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 space-y-1">
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <MessageSquare size={13} /> Remark
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {submission.teacher_remark}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Submit Panel (5 cols) ── */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
          {/* Submission Status Indicator */}
          {isAlreadySubmitted && submission && (
            <div
              className={`rounded-3xl p-5 border shadow-xs space-y-3 ${
                getStatusConfig(submission.status).bg
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare size={14} /> Submission Status
                </span>
                <span className="text-xs font-extrabold capitalize px-2.5 py-0.5 rounded-full bg-white/80 border">
                  {getStatusConfig(submission.status).label}
                </span>
              </div>

              <p className="text-xs font-medium opacity-80">
                Submitted on {formatDateTime(submission.submitted_at)}
              </p>

              {submission.attachment && (
                <a
                  href={submission.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold underline hover:opacity-80"
                >
                  <Paperclip size={12} />
                  View your submitted file
                </a>
              )}
            </div>
          )}

          {/* Upload & Submit Card (Always visible!) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Upload size={16} className="text-indigo-600" />
                {isAlreadySubmitted ? "Re-submit Assignment" : "Submit Assignment"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAlreadySubmitted
                  ? "Upload a revised document to update your previous submission."
                  : "Upload your completed homework document or image to submit."}
              </p>
            </div>

            {/* Upload Area Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-colors">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-700">
                  {selectedFile ? "Click to change selected file" : "Select Document (PDF / Image)"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">PDF, PNG, JPG accepted</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Selected File Details */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  {selectedFile.type.startsWith("image/") ? (
                    <ImageIcon size={16} />
                  ) : (
                    <FileType2 size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="w-7 h-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* PROMINENT SUBMIT BUTTON */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
                submitting
                  ? "bg-indigo-400 cursor-wait text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-95"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Submitting Assignment…
                </>
              ) : (
                <>
                  <Send size={15} />
                  {isAlreadySubmitted ? "Re-submit Assignment" : "Submit Assignment"}
                </>
              )}
            </button>

            {!selectedFile && !isAlreadySubmitted && (
              <p className="text-center text-[11px] text-amber-700/90 font-medium bg-amber-50 p-2 rounded-xl border border-amber-100">
                📎 Please attach your assignment file above to submit.
              </p>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Summary Information
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Assigned By</span>
                <span className="font-bold text-slate-800">{hw.teacher_name}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Class / Division</span>
                <span className="font-bold text-slate-800">{hw.school_class_name} ({hw.division_name})</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Due Date</span>
                <span className="font-bold text-slate-800">{formatDisplayDate(hw.due_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function HomeworkPageInner() {
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [submissions, setSubmissions]   = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const [selectedHw, setSelectedHw]     = useState<HomeworkItem | null>(null);
  const [selectedIdx, setSelectedIdx]   = useState<number>(0);
  const [quickSubmitHw, setQuickSubmitHw] = useState<HomeworkItem | null>(null);
  const searchParams = useSearchParams();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hw, subs] = await Promise.all([
        getStudentHomework(),
        getMySubmissions().catch(() => []),
      ]);
      setHomeworkList(hw);
      setSubmissions(subs);

      // Check URL search parameter id
      const targetId = searchParams.get("id");
      if (targetId) {
        const foundIdx = hw.findIndex((item) => String(item.id) === String(targetId));
        if (foundIdx >= 0) {
          setSelectedIdx(foundIdx);
          setSelectedHw(hw[foundIdx]);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load homework assignments.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const submissionMap = useMemo(() => {
    const map = new Map<number, HomeworkSubmission>();
    submissions.forEach((s) => map.set(s.homework, s));
    return map;
  }, [submissions]);

  const handleSelect = (hw: HomeworkItem) => {
    const idx = homeworkList.findIndex((h) => h.id === hw.id);
    setSelectedIdx(idx >= 0 ? idx : 0);
    setSelectedHw(hw);
  };

  const handleSubmitted = (sub: HomeworkSubmission) => {
    setSubmissions((prev) => {
      const filtered = prev.filter((s) => s.homework !== sub.homework);
      return [...filtered, sub];
    });
  };

  return (
    <div className="max-w-7xl mx-auto overflow-x-hidden p-2 sm:p-4">
      {selectedHw ? (
        <HomeworkDetailView
          hw={selectedHw}
          palette={getPalette(selectedIdx)}
          existingSubmission={submissionMap.get(selectedHw.id)}
          onBack={() => setSelectedHw(null)}
          onSubmitted={handleSubmitted}
        />
      ) : (
        <HomeworkListView
          homeworkList={homeworkList}
          submissions={submissions}
          loading={loading}
          error={error}
          onRefresh={loadAll}
          onSelect={handleSelect}
          onQuickSubmit={(hw) => setQuickSubmitHw(hw)}
        />
      )}

      {/* Quick Submit Modal from list view */}
      {quickSubmitHw && (
        <QuickSubmitModal
          hw={quickSubmitHw}
          existingSubmission={submissionMap.get(quickSubmitHw.id)}
          onClose={() => setQuickSubmitHw(null)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}

export default function HomeworkPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex items-center justify-center text-slate-400">
        <Loader2 size={28} className="animate-spin text-indigo-600" />
      </div>
    }>
      <HomeworkPageInner />
    </Suspense>
  );
}
