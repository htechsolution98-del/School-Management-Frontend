"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  FileType2,
  Award,
  Search,
  Hourglass,
  Check,
} from "lucide-react";
import {
  getStudentHomework,
  getMySubmissions,
  submitHomework,
  type HomeworkItem,
  type HomeworkSubmission,
} from "@/lib/student";
import { cn } from "@/lib/utils";
import { StudentEmptyState } from "@/components/student/student-empty-state";

// ─────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.04,
      duration: 0.3,
      ease: "easeOut" as const,
    },
  }),
};

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterTab = "all" | "pending" | "submitted" | "checked";

// ─── Helpers with Robust Date Normalization ──────────────────────────────────
function normalizeDateToYMD(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  const clean = raw.includes("T") ? raw.split("T")[0] : raw;
  const parts = clean.split("-");
  if (parts.length === 3) {
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let d = parseInt(parts[2], 10);

    // If DD-MM-YYYY format
    if (parts[2].length === 4) {
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    }

    if (y < 100) y += 2000;
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

function parseToDate(dateStr?: string | null): Date | null {
  const ymd = normalizeDateToYMD(dateStr);
  if (!ymd) return null;
  const parts = ymd.split("-");
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

function isToday(dateStr: string): boolean {
  const ymd = normalizeDateToYMD(dateStr);
  if (!ymd) return false;
  const today = new Date();
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return ymd === todayYMD;
}

function isPastDue(dateStr: string): boolean {
  const ymd = normalizeDateToYMD(dateStr);
  if (!ymd) return false;
  const today = new Date();
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return ymd < todayYMD;
}

function formatDueDate(dateStr: string): string {
  if (!dateStr) return "No due date";
  const ymd = normalizeDateToYMD(dateStr);
  if (!ymd) return "No due date";
  if (isToday(dateStr)) return "Due Today";
  if (isPastDue(dateStr)) return "Overdue";
  const d = parseToDate(dateStr);
  if (!d) return "No due date";
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - todayMs) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "Due Tomorrow";
  if (diff > 1) return `Due in ${diff} days`;
  return "Overdue";
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = parseToDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSubjectInitial(title: string): string {
  if (!title) return "HW";
  const parts = title.trim().split(":");
  const firstPart = parts[0]?.trim() || "";
  if (firstPart.length >= 2) {
    return firstPart.slice(0, 2).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

// ─── Quick Submit Modal (Full Screen Mobile with Fixed Single-Row Bottom Buttons) ─
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
      className="fixed inset-0 z-50 bg-black/60 sm:bg-slate-900/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 shrink-0">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
              {hw.school_class_name} · {hw.division_name}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {isAlreadySubmitted ? "Re-submit Homework" : "Submit Homework"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 no-scrollbar">
          <div className="bg-[#F8F9FE] rounded-2xl p-4 border border-slate-200/70">
            <h4 className="text-sm font-bold text-slate-800">{hw.title}</h4>
            {hw.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                {hw.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600 mt-3 pt-2.5 border-t border-slate-200/50">
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
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Attach Completed Assignment (PDF / Image) *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-colors">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-700">
                  {selectedFile ? "Click to change selected file" : "Click to browse & upload file"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, PNG, JPG documents</p>
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
            <div className="flex items-center gap-2.5 p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon size={15} />
                ) : (
                  <FileType2 size={15} />
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
                className="w-6 h-6 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {isAlreadySubmitted && !selectedFile && existingSubmission?.attachment && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs flex items-center justify-between">
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

        {/* Fixed Bottom Single-Row Full-Width Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all text-center flex items-center justify-center cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleModalSubmit}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send size={14} />
                {isAlreadySubmitted ? "Re-submit" : "Submit"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Homework Page View ──────────────────────────────────────────────────
function HomeworkPageInner() {
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickSubmitHw, setQuickSubmitHw] = useState<HomeworkItem | null>(null);
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);

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

      const targetId = searchParams.get("id");
      if (targetId) {
        const found = hw.find((item) => String(item.id) === String(targetId));
        if (found) setSelectedHw(found);
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

  const stats = useMemo(() => {
    const submitted = submissions.filter((s) => s.status !== "pending").length;
    const checked = submissions.filter((s) => s.status === "checked").length;
    const pending = Math.max(0, homeworkList.length - submitted);
    return { total: homeworkList.length, submitted, pending, checked };
  }, [homeworkList, submissions]);

  // Filter homework list
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

  const handleSubmitted = (sub: HomeworkSubmission) => {
    setSubmissions((prev) => {
      const filtered = prev.filter((s) => s.homework !== sub.homework);
      return [...filtered, sub];
    });
  };

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 max-w-5xl mx-auto w-full min-w-0 overflow-x-hidden pb-4 sm:pb-8">
      {/* ─────────────────────────────────────────────────────────────
          1. Student Homework Portal Welcome Card (Matches Reference UI)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex-1 min-w-0 z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Student Homework Portal
            </h1>
          </div>

          <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-500" />
            {todayStr}
          </p>

          <p className="text-slate-400 text-xs mt-1 mb-3.5 font-medium leading-relaxed max-w-[260px] sm:max-w-md">
            Track, submit, and manage all your homework assignments in one place.
          </p>

          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh homework"
            aria-label="Refresh homework"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>

        {/* Right side: Pill Badge & 3D Illustration */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 pointer-events-none select-none z-0">
          <span className="text-xs font-extrabold text-slate-700 bg-slate-100/90 border border-slate-200/60 px-3 py-1 rounded-full shadow-2xs">
            {homeworkList.length} Total
          </span>
          <div className="w-24 sm:w-32 md:w-40 mt-1">
            <img
              src="/homework-hero.png"
              alt="Homework Illustration"
              className="w-full h-auto object-contain filter drop-shadow-md"
              onError={(e) => {
                // Fallback to existing public 3D book image if not found
                (e.target as HTMLImageElement).src = "/images/Books-with-calendar.png";
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. Summary Cards (Clean White Cards, No Jarring Rings)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assignments */}
        <motion.div
          onClick={() => setActiveTab("all")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                TOTAL ASSIGNMENTS
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">
              {stats.total}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-600">
              All
            </span>
          </div>
        </motion.div>

        {/* Pending */}
        <motion.div
          onClick={() => setActiveTab("pending")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Hourglass size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                PENDING
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tight">
              {stats.pending}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-amber-700">
              To Do
            </span>
          </div>
        </motion.div>

        {/* Submitted */}
        <motion.div
          onClick={() => setActiveTab("submitted")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Send size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                SUBMITTED
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
              {stats.submitted}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-600">
              Submitted
            </span>
          </div>
        </motion.div>

        {/* Evaluated & Marked */}
        <motion.div
          onClick={() => setActiveTab("checked")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          custom={4}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                EVALUATED & MARKED
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {stats.checked}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600">
              Marked
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Filter Navigation Tabs & Search Input
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-col gap-2.5"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={5}
      >
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: "All Assignments", count: homeworkList.length },
            { id: "pending", label: "Pending", count: stats.pending },
            { id: "submitted", label: "Submitted", count: stats.submitted },
            { id: "checked", label: "Evaluated", count: stats.checked },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as FilterTab)}
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                  isActive
                    ? "bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200/80 shadow-2xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60 shadow-2xs"
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-black",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rounded Search Bar */}
        <div className="relative w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search homework..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-400 shadow-2xs transition-all"
          />
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          4. Homework List Cards
         ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
          <p className="text-xs font-bold text-slate-600">Loading assignments & submissions…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-2xs flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">Failed to load homework</p>
          <p className="text-xs text-slate-400 max-w-sm">{error}</p>
          <button
            onClick={loadAll}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <StudentEmptyState
          title="No homework available"
          description={
            searchQuery
              ? "No assignments matching your search query."
              : activeTab === "pending"
              ? "Great job! You have completed and submitted all assigned homework."
              : "No homework currently available in this category."
          }
        />
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {filteredList.map((hw, idx) => {
            const submission = submissionMap.get(hw.id);
            const isSubmitted = !!submission;
            const isChecked = submission?.status === "checked";
            const dueLabel = formatDueDate(hw.due_date);
            const isOverdue = isPastDue(hw.due_date);
            const isDueToday = isToday(hw.due_date);

            return (
              <motion.div
                key={hw.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={idx}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3.5 hover:border-indigo-200 transition-all cursor-pointer group"
                onClick={() => setQuickSubmitHw(hw)}
              >
                {/* Top Section */}
                <div className="flex items-start gap-3 sm:gap-3.5">
                  {/* Initials Avatar */}
                  <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] font-black text-sm flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs">
                    {getSubjectInitial(hw.title)}
                  </div>

                  {/* Header & Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-indigo-600 transition-colors truncate">
                        {hw.title}
                      </h3>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                    </div>

                    {/* Status Pill Badge */}
                    <div className="mt-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          isOverdue
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : isDueToday
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        )}
                      >
                        <Clock size={10} />
                        <span>{dueLabel}</span>
                      </span>
                    </div>

                    {/* Description */}
                    {hw.description && (
                      <p className="text-xs text-slate-500 font-normal leading-relaxed line-clamp-2 mt-1.5">
                        {hw.description}
                      </p>
                    )}

                    {/* Pills Row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs mt-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/80 text-slate-700 font-semibold text-[11px]">
                        <BookOpen size={11} className="text-indigo-500" />
                        <span>{hw.school_class_name} · {hw.division_name}</span>
                      </span>

                      <span className="text-[11px] text-slate-500 font-medium">
                        Teacher: <strong className="text-slate-800">{hw.teacher_name}</strong>
                      </span>

                      {hw.attachment && (
                        <a
                          href={hw.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Paperclip size={11} />
                          <span>Attachment</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evaluated Pill Banner (if marked) */}
                {isChecked && (
                  <div className="w-full bg-emerald-50/80 border border-emerald-200/70 text-emerald-800 rounded-2xl px-3.5 py-2 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Evaluated {submission?.marks !== null ? `(${submission?.marks} Marks)` : ""}</span>
                    </span>
                    {submission?.teacher_remark && (
                      <span className="text-[11px] text-emerald-700 font-normal truncate max-w-[180px] sm:max-w-xs">
                        {submission.teacher_remark}
                      </span>
                    )}
                  </div>
                )}

                {/* Full-width Action Button */}
                <div className="pt-1">
                  {isSubmitted ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickSubmitHw(hw);
                      }}
                      className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 bg-[#FAFAFE] hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw size={13} className="text-slate-500" />
                        <span>Re-submit Assignment</span>
                      </span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickSubmitHw(hw);
                      }}
                      className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Send size={13} />
                        <span>Submit Assignment</span>
                      </span>
                      <ChevronRight size={14} className="text-white/80" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick Submit Modal */}
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
    <Suspense
      fallback={
        <div className="py-20 flex items-center justify-center text-slate-400">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      }
    >
      <HomeworkPageInner />
    </Suspense>
  );
}
