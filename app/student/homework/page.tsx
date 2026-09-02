// app/student/homework/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  BookMarked,
} from "lucide-react";
import {
  getStudentHomework,
  getMySubmissions,
  submitHomework,
  type HomeworkItem,
  type HomeworkSubmission,
} from "@/lib/student";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType = "today" | "all";
type ViewType = "list" | "detail";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
}

function isPastDue(dateStr: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateStr < today;
}

function formatDueDate(dateStr: string): string {
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
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getDueBadgeStyle(dateStr: string): { bg: string; text: string } {
  if (isPastDue(dateStr)) return { bg: "#fee2e2", text: "#dc2626" };
  if (isToday(dateStr)) return { bg: "#fef3c7", text: "#d97706" };
  return { bg: "#dbeafe", text: "#2563eb" };
}

function getStatusConfig(status?: string | null) {
  const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending:   { label: "Pending",   bg: "#fef9c3", text: "#854d0e", dot: "#f59e0b" },
    submitted: { label: "Submitted", bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
    late:      { label: "Late",      bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
    checked:   { label: "Checked",   bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
  };
  const key = String(status || "").toLowerCase();
  return configs[key] || { label: "Submitted", bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" };
}

// Subject color palette — cycles through for variety
const SUBJECT_PALETTES = [
  { color: "#6C63FF", bg: "#EEF0FF", border: "#D4D0FF" },
  { color: "#10b981", bg: "#F0FDF4", border: "#A7F3D0" },
  { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { color: "#EC4899", bg: "#FDF2F8", border: "#FBCFE8" },
  { color: "#06B6D4", bg: "#ECFEFF", border: "#A5F3FC" },
  { color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE" },
  { color: "#ef4444", bg: "#FEF2F2", border: "#FECACA" },
  { color: "#14b8a6", bg: "#F0FDFA", border: "#99F6E4" },
];

function getPalette(index: number) {
  return SUBJECT_PALETTES[index % SUBJECT_PALETTES.length];
}

function getSubjectInitial(title: string): string {
  return title.trim().slice(0, 2).toUpperCase();
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-100 rounded w-32" />
            <div className="h-5 bg-gray-100 rounded-full w-20" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-4/5" />
          <div className="h-3 bg-gray-100 rounded w-3/5" />
          <div className="h-5 bg-gray-100 rounded w-12" />
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
  onClick,
}: {
  hw: HomeworkItem;
  palette: ReturnType<typeof getPalette>;
  submission?: HomeworkSubmission;
  onClick: () => void;
}) {
  const dueLabel = formatDueDate(hw.due_date);
  const dueBadge = getDueBadgeStyle(hw.due_date);
  const isSubmitted = !!submission;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        {/* Subject Avatar */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold border"
          style={{
            backgroundColor: palette.bg,
            borderColor: palette.border,
            color: palette.color,
          }}
        >
          {getSubjectInitial(hw.title)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + Due Badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">
              {hw.title}
            </h3>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: dueBadge.bg, color: dueBadge.text }}
            >
              {dueLabel}
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-2.5">
            {hw.description}
          </p>

          {/* Footer meta */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Class */}
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
              <BookOpen size={10} />
              {hw.school_class_name} · {hw.division_name}
            </span>

            {/* Attachment indicator */}
            {hw.attachment && (
              <span className="inline-flex items-center gap-1 text-xs text-indigo-500 font-medium">
                <Paperclip size={10} />
                Attachment
              </span>
            )}

            {/* Submission status badge */}
            {isSubmitted && submission && (
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ml-auto"
                style={(() => {
                  const cfg = getStatusConfig(submission.status);
                  return { backgroundColor: cfg.bg, color: cfg.text };
                })()}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getStatusConfig(submission.status).dot }}
                />
                {getStatusConfig(submission.status).label}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          size={16}
          className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
        />
      </div>
    </button>
  );
}

// ─── Summary Stats Bar ────────────────────────────────────────────────────────
function StatsBar({
  total,
  submitted,
  pending,
  checked,
}: {
  total: number;
  submitted: number;
  pending: number;
  checked: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total",     value: total,     bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-100" },
        { label: "Pending",   value: pending,   bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100"  },
        { label: "Submitted", value: submitted, bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100"   },
        { label: "Checked",   value: checked,   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100"},
      ].map((s) => (
        <div
          key={s.label}
          className={`${s.bg} ${s.border} border rounded-2xl p-3 text-center`}
        >
          <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
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
}: {
  homeworkList: HomeworkItem[];
  submissions: HomeworkSubmission[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelect: (hw: HomeworkItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("today");

  const submissionMap = useMemo(() => {
    const map = new Map<number, HomeworkSubmission>();
    submissions.forEach((s) => map.set(s.homework, s));
    return map;
  }, [submissions]);

  const todayList = homeworkList.filter((hw) => isToday(hw.due_date));
  const allList   = homeworkList;
  const displayList = activeTab === "today" ? todayList : allList;

  const stats = useMemo(() => {
    const submitted = submissions.filter((s) => s.status !== "pending").length;
    const checked   = submissions.filter((s) => s.status === "checked").length;
    const pending   = homeworkList.length - submitted;
    return { total: homeworkList.length, submitted, pending, checked };
  }, [homeworkList, submissions]);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Calendar size={13} />
            {today}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-indigo-400" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      {!loading && !error && (
        <StatsBar
          total={stats.total}
          submitted={stats.submitted}
          pending={stats.pending}
          checked={stats.checked}
        />
      )}

      {/* ── Tab Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["today", "all"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-semibold relative transition-colors ${
                activeTab === tab ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "today" ? "Today's Homework" : "All Homework"}
              {/* Count badge */}
              <span
                className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                {tab === "today" ? todayList.length : allList.length}
              </span>
              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab sub-header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            {activeTab === "today" ? "Due Today" : "All Assignments"}
          </p>
          <div className="flex items-center gap-1.5 text-indigo-500 text-xs font-semibold">
            <Calendar size={12} />
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Loading */}
          {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={22} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">Failed to load</p>
                <p className="text-xs text-gray-400 mt-1">{error}</p>
              </div>
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw size={13} /> Try Again
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && displayList.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <BookOpen size={24} className="text-indigo-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-600">
                  {activeTab === "today" ? "No homework due today!" : "No homework assigned yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeTab === "today"
                    ? "Enjoy your day 🎉"
                    : "Check back later"}
                </p>
              </div>
            </div>
          )}

          {/* Homework Cards */}
          {!loading && !error && displayList.map((hw, idx) => (
            <HomeworkCard
              key={hw.id}
              hw={hw}
              palette={getPalette(idx)}
              submission={submissionMap.get(hw.id)}
              onClick={() => onSelect(hw)}
            />
          ))}
        </div>

        {/* View All Footer */}
        {!loading && !error && activeTab === "today" && todayList.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setActiveTab("all")}
              className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 transition-all rounded-xl px-5 py-3.5 border border-indigo-100 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <BookOpen size={15} className="text-indigo-600" />
                </div>
                <span className="text-sm font-semibold text-indigo-700">
                  View All Homework ({allList.length})
                </span>
              </div>
              <ChevronRight size={16} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
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
  const [viewDesc, setViewDesc]         = useState(false);
  const [submission, setSubmission]     = useState<HomeworkSubmission | undefined>(existingSubmission);

  const dueLabel = formatDueDate(hw.due_date);
  const dueBadge = getDueBadgeStyle(hw.due_date);
  const isAlreadySubmitted = !!submission;
  const isChecked = submission?.status === "checked";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile && !isAlreadySubmitted) {
      setSubmitError("Please select/attach a completed homework file (PDF or Image) before submitting.");
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
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Back Nav ── */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors group"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 group-hover:border-indigo-300 shadow-sm transition-all">
            <ArrowLeft size={15} />
          </div>
          Back
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700 truncate max-w-xs">
          {hw.title}
        </span>
      </div>

      {/* ── Success Toast ── */}
      {showSuccess && (
        <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-3 rounded-xl">
          <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0" />
          Homework submitted successfully! 🎉
        </div>
      )}

      {/* ── Error Toast ── */}
      {submitError && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-xl">
          <AlertCircle size={17} className="text-red-400 flex-shrink-0" />
          <span className="flex-1">{submitError}</span>
          <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* ── LEFT: Details ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Hero Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold border-2"
                style={{
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                  color: palette.color,
                }}
              >
                {getSubjectInitial(hw.title)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 leading-snug mb-2">
                  {hw.title}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ backgroundColor: dueBadge.bg, color: dueBadge.text }}
                  >
                    <Clock size={11} />
                    {dueLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    <BookOpen size={11} />
                    {hw.school_class_name} · {hw.division_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Due date row */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  Due Date
                </p>
                <p className="text-sm font-bold text-gray-800">
                  {formatDisplayDate(hw.due_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  Assigned
                </p>
                <p className="text-sm font-bold text-gray-800">
                  {formatDisplayDate(hw.assigned_date)}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={15} className="text-indigo-500" />
              Description
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {hw.description}
            </p>
            <button
              onClick={() => setViewDesc(!viewDesc)}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100"
            >
              {viewDesc ? <EyeOff size={12} /> : <Eye size={12} />}
              {viewDesc ? "Hide Details" : "View More Details"}
            </button>
            {viewDesc && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 leading-relaxed">
                <p className="font-semibold text-gray-700 mb-2">📋 Full Assignment Details</p>
                <p>{hw.description}</p>
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-gray-500">Teacher:</span>{" "}
                    {hw.teacher_name}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Class:</span>{" "}
                    {hw.school_class_name}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Teacher's Attachment */}
          {hw.attachment && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Paperclip size={15} className="text-indigo-500" />
                Attachment from Teacher
              </h3>
              <a
                href={hw.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-9 h-9 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileType2 size={17} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 truncate">
                    Download Attachment
                  </p>
                  <p className="text-xs text-gray-400">Tap to open / download</p>
                </div>
                <Download size={15} className="text-gray-400 group-hover:text-indigo-500" />
              </a>
            </div>
          )}

          {/* Feedback (if checked) */}
          {isChecked && submission && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-700 mb-4 flex items-center gap-2">
                <Award size={15} className="text-emerald-600" />
                Teacher's Feedback
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {submission.marks !== null && (
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{submission.marks}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Marks</p>
                  </div>
                )}
                <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                  <p className="text-sm font-bold text-gray-700">
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Status</p>
                </div>
              </div>
              {submission.teacher_remark && (
                <div className="bg-white rounded-xl p-3 border border-emerald-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MessageSquare size={12} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700">Remark</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {submission.teacher_remark}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Submit Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Submission Status */}
          {isAlreadySubmitted && submission && (
            <div
              className="rounded-2xl p-5 border shadow-sm"
              style={{
                backgroundColor: getStatusConfig(submission.status).bg + "80",
                borderColor: getStatusConfig(submission.status).dot + "40",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare size={16} style={{ color: getStatusConfig(submission.status).dot }} />
                <h3 className="text-sm font-bold" style={{ color: getStatusConfig(submission.status).text }}>
                  Submission Status
                </h3>
              </div>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-3"
                style={{
                  backgroundColor: "white",
                  color: getStatusConfig(submission.status).text,
                  border: `1.5px solid ${getStatusConfig(submission.status).dot}40`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getStatusConfig(submission.status).dot }}
                />
                {getStatusConfig(submission.status).label}
              </span>
              <p className="text-xs text-gray-500 font-medium">
                Submitted on {formatDateTime(submission.submitted_at)}
              </p>
              {submission.attachment && (
                <a
                  href={submission.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Paperclip size={11} />
                  View submitted file
                </a>
              )}
            </div>
          )}

          {/* Upload & Submit Card */}
          {!isChecked && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                <Upload size={15} className="text-indigo-500" />
                {isAlreadySubmitted ? "Re-submit Homework" : "Submit Homework"}
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                {isAlreadySubmitted
                  ? "You can update your submission with a new file."
                  : "Upload your completed homework as a file (optional)"}
              </p>

              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-indigo-700 text-sm font-semibold mb-3"
              >
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Paperclip size={14} className="text-indigo-600" />
                </div>
                {selectedFile ? "Change File" : "Attach File (PDF / Image)"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Selected File Preview */}
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 mb-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {selectedFile.type.startsWith("image/") ? (
                      <ImageIcon size={14} className="text-indigo-600" />
                    ) : (
                      <FileType2 size={14} className="text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
                  >
                    <X size={13} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                  submitting
                    ? "bg-indigo-400 cursor-wait text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    {isAlreadySubmitted ? "Re-submit Homework" : "Submit Homework"}
                  </>
                )}
              </button>

              {!selectedFile && !isAlreadySubmitted && (
                <p className="text-center text-xs text-amber-600/90 font-medium mt-2">
                  📎 Please attach your completed assignment file (PDF/Image) to submit.
                </p>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Assignment Info
            </h4>
            <div className="space-y-2.5">
              {[
                { label: "Teacher",  value: hw.teacher_name },
                { label: "Class",    value: `${hw.school_class_name} – ${hw.division_name}` },
                { label: "Assigned", value: formatDisplayDate(hw.assigned_date) },
                { label: "Due",      value: formatDisplayDate(hw.due_date) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">{label}</span>
                  <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomeworkPage() {
  const [homeworkList, setHomeworkList]   = useState<HomeworkItem[]>([]);
  const [submissions, setSubmissions]     = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [selectedHw, setSelectedHw]       = useState<HomeworkItem | null>(null);
  const [selectedIdx, setSelectedIdx]     = useState<number>(0);

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
    } catch (err: any) {
      setError(err?.message || "Failed to load homework.");
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden">
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
        />
      )}
    </div>
  );
}
