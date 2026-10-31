"use client";


import ResponsiveSelect from "@/components/ui/responsive-select";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Paperclip,
  Clock,
  ClipboardList,
  Filter,
  X,
  Calendar,
  Users,
  Loader2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Sparkles,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import {
  getTeacherHomework,
  getHomeworkSubmissions,
  createHomework,
  deleteHomework,
  gradeSubmission,
} from "@/lib/teacher/homework";
import type { HomeworkItem, HomeworkSubmission } from "@/types/teacher";
import { cn } from "@/lib/utils";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap";

// ─── Avatar Color Palette ─────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#1E40AF", "#2563EB", "#0BAA78", "#F59E0B", "#0284C7",
  "#EC4899", "#0284C7", "#F43F5E", "#10B981",
];

function getInitials(name: string): string {
  if (!name) return "?";
  const words = name.trim().split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

// ─── Date Parsing & Formatting Helpers ────────────────────────────────────────

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("T")[0].split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split(/[-/]/);
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

function isDueToday(dateStr: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

function isOverdue(dateStr: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function formatClassDisplay(className?: string, divName?: string): string {
  const c = (className || "").trim().replace(/^class\s+/i, "") || "8";
  const d = (divName || "").trim().replace(/^div(ision)?\s+/i, "") || "A";
  return `Class ${c} - ${d.toUpperCase()}`;
}

// ─── Create Homework Modal Component ──────────────────────────────────────────

interface TeacherAssignment {
  divisionId: number;
  divisionName: string;
  subjectName: string;
}

interface CreateModalProps {
  divisions: { id: number; name: string }[];
  assignments: TeacherAssignment[];
  onClose: () => void;
  onSubmit: (data: {
    divisionId: number;
    subjectName: string;
    title: string;
    dueDate: string;
    description: string;
    file: File | null;
  }) => void;
  isSubmitting: boolean;
}

function CreateHomeworkModal({
  divisions,
  assignments,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateModalProps) {
  const [divisionId, setDivisionId] = useState<number>(
    divisions[0]?.id ?? assignments[0]?.divisionId ?? 0
  );
  const [subjectName, setSubjectName] = useState<string>("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Derive unique divisions
  const uniqueDivisions = useMemo(() => {
    if (divisions.length > 0) return divisions;
    const map = new Map<number, string>();
    assignments.forEach((a) => {
      if (a.divisionId && !map.has(a.divisionId)) {
        map.set(a.divisionId, a.divisionName || `Division ${a.divisionId}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [divisions, assignments]);

  // Derived subjects for chosen division
  const availableSubjects = useMemo(() => {
    if (!divisionId) return [];
    const matched = assignments.filter(
      (a) => String(a.divisionId) === String(divisionId)
    );
    const subNames = matched.map((a) => a.subjectName).filter(Boolean);
    return Array.from(new Set(subNames));
  }, [assignments, divisionId]);

  useEffect(() => {
    if (availableSubjects.length > 0) {
      setSubjectName(availableSubjects[0]);
    } else {
      setSubjectName("");
    }
  }, [availableSubjects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) {
      toast.error("Please enter a homework title.");
      return;
    }
    if (!divisionId) {
      toast.error("Please select a division.");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date.");
      return;
    }
    if (dueDate < todayStr) {
      toast.error("Due date cannot be in the past.");
      return;
    }
    onSubmit({ divisionId, subjectName, title: title.trim(), dueDate, description, file });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#172447]/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto font-['Sora',sans-serif]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none p-5 sm:p-7 w-full h-[100dvh] max-w-none border-0 shadow-2xl relative my-auto max-h-[100dvh] overflow-y-auto animate-in fade-in duration-150 sm:h-auto sm:max-w-lg sm:rounded-3xl sm:border sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E9F5]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <span>CREATE HOMEWORK</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#172447] tracking-tight">
              Assign New Homework
            </h3>
            <p className="text-xs text-[#7180A1] mt-0.5">
              Fill details to publish learning assignments for your students
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-[#172447] hover:bg-[#F4F6FD] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
              Assignment Title <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Chapter 4 — Quadratic Equations Exercise"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] placeholder-[#7180A1] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
              />
              <FileText className="w-3.5 h-3.5 text-[#2563EB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Division & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                Class & Division <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <ResponsiveSelect
                  value={divisionId}
                  onChange={(e) => setDivisionId(Number(e.target.value))}
                  className="w-full h-10 pl-8 pr-7 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  {uniqueDivisions.length === 0 ? (
                    <option value={0}>Select Division…</option>
                  ) : (
                    uniqueDivisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))
                  )}
                </ResponsiveSelect>
                <Users className="w-3.5 h-3.5 text-[#2563EB] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-[#7180A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <ResponsiveSelect
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full h-10 pl-8 pr-7 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  {availableSubjects.length === 0 ? (
                    <option value="">General Subject</option>
                  ) : (
                    availableSubjects.map((sName) => (
                      <option key={sName} value={sName}>
                        {sName}
                      </option>
                    ))
                  )}
                </ResponsiveSelect>
                <BookOpen className="w-3.5 h-3.5 text-[#2563EB] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-[#7180A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                min={todayStr}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] outline-none focus:border-[#2563EB] cursor-pointer"
              />
              <Calendar className="w-3.5 h-3.5 text-[#2563EB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
              Instructions & Guidelines <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Provide instructions, textbook questions, or guidelines for students…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-semibold text-[#172447] placeholder-[#7180A1] outline-none focus:border-[#2563EB] resize-none leading-relaxed"
            />
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
              Attach Reference Document <span className="text-slate-400 font-normal">(PDF / Image / Docx)</span>
            </label>
            <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <Paperclip size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#172447] truncate">
                    {file ? file.name : "Attach supplementary worksheet or PDF"}
                  </p>
                  <p className="text-[10px] text-[#7180A1]">
                    {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Optional attachment"}
                  </p>
                </div>
              </div>
              <label className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0">
                <span>{file ? "Change" : "Browse"}</span>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E4E9F5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#7180A1] hover:text-[#172447] hover:bg-[#F4F6FD] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Publish Homework</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mark Modal Component ─────────────────────────────────────────────────────

function MarkModal({
  submission,
  onClose,
  onSave,
  isSaving,
}: {
  submission: HomeworkSubmission;
  onClose: () => void;
  onSave: (marks: number, remark: string) => void;
  isSaving: boolean;
}) {
  const [marks, setMarks] = useState<number>(submission.marks ?? 0);
  const [remark, setRemark] = useState<string>(submission.teacher_remark ?? "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (marks < 0 || marks > 100) {
      toast.error("Marks must be between 0 and 100.");
      return;
    }
    onSave(marks, remark.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#172447]/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto font-['Sora',sans-serif]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none p-5 sm:p-6 w-full h-[100dvh] max-w-none border-0 shadow-2xl relative my-auto overflow-y-auto animate-in fade-in duration-150 sm:h-auto sm:max-w-md sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E4E9F5]">
          <div>
            <h3 className="text-base font-black text-[#172447]">
              Grade Submission
            </h3>
            <p className="text-xs text-[#7180A1] mt-0.5">
              Review and grade work for {submission.student_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-[#172447] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1">
              Score (Out of 100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              required
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-sm font-bold text-[#172447] outline-none focus:border-[#2563EB] transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1">
              Teacher Feedback / Remark
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Well researched, neat diagrams. Keep it up!"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-semibold text-[#172447] outline-none focus:border-[#2563EB] resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E9F5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#7180A1] hover:text-[#172447] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Grade</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal Component ───────────────────────────────────────────────────

function DeleteModal({
  title,
  onClose,
  onConfirm,
  isDeleting,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#172447]/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto font-['Sora',sans-serif]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none p-5 sm:p-6 w-full h-[100dvh] max-w-none border-0 shadow-2xl relative my-auto flex flex-col justify-center overflow-y-auto animate-in fade-in duration-150 text-center space-y-3 sm:h-auto sm:max-w-sm sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <Trash2 size={22} />
        </div>
        <h3 className="text-base font-black text-[#172447]">Delete Homework</h3>
        <p className="text-xs text-[#7180A1] leading-relaxed">
          Are you sure you want to delete <strong className="text-[#172447]">&quot;{title}&quot;</strong>? This will permanently remove all student submissions for this assignment.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-10 rounded-xl border border-[#E4E9F5] text-xs font-bold text-[#7180A1] hover:text-[#172447] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              <span>Yes, Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Homework Page Component ─────────────────────────────────────────────

export default function AllHomeworkPage() {
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loadingHw, setLoadingHw] = useState(true);
  const [loadingSub, setLoadingSub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [divisions, setDivisions] = useState<{ id: number; name: string }[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

  // Search & Filtering
  const [searchHW, setSearchHW] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"ALL" | "ACTIVE" | "OVERDUE" | "DRAFT">("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [selectedStatusDropdown, setSelectedStatusDropdown] = useState("ALL");

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [markModal, setMarkModal] = useState<HomeworkSubmission | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomeworkItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch homework list
  const fetchHomeworkList = useCallback(async () => {
    setLoadingHw(true);
    setError(null);
    try {
      const data = await getTeacherHomework();
      setHomeworks(data);
      if (data.length > 0) {
        setSelectedHw((prev) => {
          if (prev) {
            const found = data.find((h) => h.id === prev.id);
            return found || data[0];
          }
          return data[0];
        });
      } else {
        setSelectedHw(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load homework assignments.");
    } finally {
      setLoadingHw(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeworkList();
  }, [fetchHomeworkList]);

  // Load teacher assigned divisions and classes
  useEffect(() => {
    async function loadTeacherData() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/divisionlist/`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.data ?? data.results ?? []);
          const mapped = list.map((item: any) => {
            const className =
              item.class_name ||
              item.school_class_name ||
              (typeof item.SchoolClass === "object" ? item.SchoolClass?.school_class : "") ||
              "";
            const divName = item.division || "";
            const fullName =
              className && divName
                ? `${className} - ${divName}`
                : divName
                ? `Div ${divName}`
                : className || `Division ${item.id}`;
            return { id: item.id, name: fullName };
          });
          if (mapped.length > 0) {
            setDivisions(mapped);
          }
        }
      } catch {}
    }

    loadTeacherData();
  }, []);

  // Fetch submissions when selected homework changes
  const fetchSubmissions = useCallback(async (hwId: number) => {
    setLoadingSub(true);
    try {
      const data = await getHomeworkSubmissions(hwId);
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSub(false);
    }
  }, []);

  useEffect(() => {
    if (selectedHw) {
      fetchSubmissions(selectedHw.id);
    } else {
      setSubmissions([]);
    }
  }, [selectedHw, fetchSubmissions]);

  // Create Homework
  const handleCreateSubmit = async (data: {
    divisionId: number;
    subjectName: string;
    title: string;
    dueDate: string;
    description: string;
    file: File | null;
  }) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const formattedDueDate = formatToDDMMYYYY(data.dueDate);
      const fullTitle =
        data.subjectName && !data.title.toLowerCase().includes(data.subjectName.toLowerCase())
          ? `${data.subjectName}: ${data.title}`
          : data.title;

      const fd = new FormData();
      fd.append("division", String(data.divisionId));
      fd.append("title", fullTitle);
      fd.append("description", data.description.trim());
      fd.append("due_date", formattedDueDate);
      fd.append("is_active", "true");
      if (data.file) {
        fd.append("attachment", data.file);
      }

      await createHomework(fd);
      toast.success(`Homework "${fullTitle}" created successfully!`);
      setCreateModal(false);
      await fetchHomeworkList();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create homework.");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete Homework with Confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteHomework(deleteTarget.id);
      toast.success("Homework deleted successfully.");
      setDeleteTarget(null);
      await fetchHomeworkList();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete homework.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Grade Submission
  const handleGrade = async (marks: number, remark: string) => {
    if (!markModal) return;
    setIsGrading(true);
    try {
      await gradeSubmission(markModal.id, marks, remark);
      toast.success("Submission graded successfully!");
      setMarkModal(null);
      if (selectedHw) {
        await fetchSubmissions(selectedHw.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to grade submission.");
    } finally {
      setIsGrading(false);
    }
  };

  // ─── Summary Statistics (Computed from real API data) ─────────────────────────

  const stats = useMemo(() => {
    let dueTodayCount = 0;
    let assignedCount = 0;
    let activeCount = 0;
    let overdueCount = 0;
    let draftCount = 0;
    let totalSubmissionsCount = 0;

    homeworks.forEach((h) => {
      if (isDueToday(h.due_date)) dueTodayCount++;
      if (h.is_active) assignedCount++;
      if (isOverdue(h.due_date)) {
        overdueCount++;
      } else if (h.is_active) {
        activeCount++;
      } else {
        draftCount++;
      }
      totalSubmissionsCount += h.submission_count || 0;
    });

    return {
      dueToday: dueTodayCount,
      assigned: assignedCount,
      active: activeCount,
      overdue: overdueCount,
      draft: draftCount,
      totalSubmissions: totalSubmissionsCount,
    };
  }, [homeworks]);

  // Unique Classes for Filter
  const uniqueClassOptions = useMemo(() => {
    const set = new Set<string>();
    homeworks.forEach((h) => {
      if (h.school_class_name) set.add(h.school_class_name);
    });
    return Array.from(set);
  }, [homeworks]);

  // Filtered Homework
  const filteredHW = useMemo(() => {
    return homeworks.filter((h) => {
      // Search Filter
      if (searchHW.trim()) {
        const q = searchHW.toLowerCase();
        const matchTitle = h.title?.toLowerCase().includes(q);
        const matchClass = h.school_class_name?.toLowerCase().includes(q);
        const matchDiv = h.division_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchClass && !matchDiv) return false;
      }

      // Class Filter
      if (selectedClassFilter !== "ALL" && h.school_class_name !== selectedClassFilter) {
        return false;
      }

      // Status Pill Filter
      if (selectedStatusFilter === "ACTIVE" && (!h.is_active || isOverdue(h.due_date))) {
        return false;
      }
      if (selectedStatusFilter === "OVERDUE" && !isOverdue(h.due_date)) {
        return false;
      }
      if (selectedStatusFilter === "DRAFT" && h.is_active) {
        return false;
      }

      // Status Dropdown Filter
      if (selectedStatusDropdown === "ACTIVE" && (!h.is_active || isOverdue(h.due_date))) {
        return false;
      }
      if (selectedStatusDropdown === "OVERDUE" && !isOverdue(h.due_date)) {
        return false;
      }
      if (selectedStatusDropdown === "DRAFT" && h.is_active) {
        return false;
      }

      return true;
    });
  }, [homeworks, searchHW, selectedClassFilter, selectedStatusFilter, selectedStatusDropdown]);

  return (
    <div className="relative font-['Sora',sans-serif] text-[#172447] px-3.5 sm:px-6 py-3.5 sm:py-5 pb-4 lg:pb-8 max-w-7xl mx-auto box-border min-w-0 overflow-x-hidden">
      <link rel="stylesheet" href={FONT_URL} />

      {/* ── Ambient Background Artwork (Exact Reference Formulation) ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse at 5% 0%, rgba(139, 92, 246, 0.18), transparent 40%),
            radial-gradient(ellipse at 95% 15%, rgba(167, 139, 250, 0.22), transparent 45%),
            radial-gradient(ellipse at 95% 95%, rgba(192, 132, 252, 0.22), transparent 50%),
            radial-gradient(ellipse at 5% 95%, rgba(167, 139, 250, 0.15), transparent 45%),
            linear-gradient(160deg, #F8F9FE 0%, #F1F4FD 50%, #F8F7FF 100%)
          `,
        }}
      />
      {/* Soft curved decorative ambient shapes */}
      <div className="fixed -top-20 -left-20 w-80 h-80 rounded-full bg-blue-600/8 blur-3xl pointer-events-none z-0" />
      <div className="fixed top-48 -right-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none z-0" />
      <div className="fixed -bottom-10 -right-20 w-80 h-80 rounded-full bg-blue-500/12 blur-3xl pointer-events-none z-0" />

      {/* Content Container (Layered above ambient background) */}
      <div className="relative z-10 space-y-3.5 sm:space-y-4">
        {/* ── 1. Hero Introduction & 3D Artwork in Background (Exact Reference Matching) ── */}
        <div className="relative pt-3 sm:pt-4">
          {/* 3D Notepad Artwork positioned in Background */}
          <div className="absolute -top-2 right-0 sm:right-4 w-32 h-36 sm:w-40 sm:h-44 pointer-events-none select-none z-0">
            {/* Soft ambient royal blue cloud behind notepad matching reference screenshot */}
            <div className="absolute inset-0 -m-2 rounded-full bg-gradient-to-br from-[#DBEAFE]/80 to-[#BFDBFE]/50 blur-xl -z-10" />
            <Image
              src="/homework-hero.png"
              alt="Homework Illustration"
              fill
              sizes="(max-width: 640px) 130px, 160px"
              priority
              className="object-contain drop-shadow-md select-none pointer-events-none"
            />
          </div>

          {/* Foreground Text Content */}
          <div className="relative z-10 max-w-[240px] sm:max-w-md">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md border border-[#BFDBFE]/60 text-[#2563EB] text-[10.5px] font-black uppercase tracking-wider shadow-2xs">
              <BookOpen size={12} className="text-[#2563EB]" />
              <span>HOMEWORK & ASSIGNMENTS</span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-[25px] sm:text-3xl font-black text-[#172447] tracking-tight leading-tight mt-1.5">
              Homework &amp; Assignments
            </h1>
            <p className="text-xs text-[#7180A1] font-normal leading-relaxed mt-1">
              Manage daily class assignments, reviews, and student submissions.
            </p>
          </div>

          {/* Action Row: Create Homework + Search Field (White Widget) */}
          <div className="relative z-10 flex items-center gap-2.5 mt-3 pt-0.5">
            <button
              type="button"
              onClick={() => setCreateModal(true)}
              className="h-11 px-5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Homework</span>
            </button>

            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search homework..."
                value={searchHW}
                onChange={(e) => setSearchHW(e.target.value)}
                className="w-full h-11 pl-9 pr-7 rounded-full bg-white border border-white/90 shadow-xs text-xs font-semibold text-[#172447] placeholder-[#94A3B8] outline-none focus:border-[#2563EB] transition-all"
              />
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchHW && (
                <button
                  type="button"
                  onClick={() => setSearchHW("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. Statistics Cards (Exact 3-Card Formulation) ── */}
        <div className="grid grid-cols-3 gap-2">
          {/* Due Today (Pink / Red Accent) */}
          <div className="bg-white rounded-2xl px-2 py-2 sm:px-3 sm:py-2.5 border border-white/90 shadow-xs flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FDF2F4] flex items-center justify-center text-[#E11D48] shrink-0">
              <Calendar size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] sm:text-[9.5px] font-bold text-[#E11D48] tracking-tight uppercase leading-none whitespace-nowrap">
                DUE TODAY
              </p>
              <p className="text-lg sm:text-xl font-black text-[#1A1D2F] leading-none mt-1">
                {stats.dueToday}
              </p>
            </div>
          </div>

          {/* Assigned (Blue Accent) */}
          <div className="bg-white rounded-2xl px-2 py-2 sm:px-3 sm:py-2.5 border border-white/90 shadow-xs flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#2563EB] shrink-0">
              <Clock size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] sm:text-[9.5px] font-bold text-[#556987] tracking-tight uppercase leading-none whitespace-nowrap">
                ASSIGNED
              </p>
              <p className="text-lg sm:text-xl font-black text-[#1A1D2F] leading-none mt-1">
                {stats.assigned}
              </p>
            </div>
          </div>

          {/* Total Submissions (Sky Accent) */}
          <div className="bg-white rounded-2xl px-2 py-2 sm:px-3 sm:py-2.5 border border-white/90 shadow-xs flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F0F9FF] flex items-center justify-center text-[#0284C7] shrink-0">
              <Users size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[7.5px] sm:text-[9px] font-bold text-[#0284C7] uppercase leading-[1.05] tracking-tight">
                TOTAL<br className="block sm:hidden" /> SUBMISSIONS
              </p>
              <p className="text-lg sm:text-xl font-black text-[#1A1D2F] leading-none mt-0.5">
                {stats.totalSubmissions}
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. Status Filters & Dropdown Controls ── */}
        <div className="space-y-2.5">
          {/* Horizontal Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {/* All */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("ALL")}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedStatusFilter === "ALL"
                  ? "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/25"
                  : "bg-white/80 hover:bg-white text-[#7180A1] border border-white shadow-2xs"
              )}
            >
              <FileText size={13} className={selectedStatusFilter === "ALL" ? "text-white" : "text-[#7180A1]"} />
              <span>All ({homeworks.length})</span>
            </button>

            {/* Active */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("ACTIVE")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedStatusFilter === "ACTIVE"
                  ? "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/25"
                  : "bg-white/80 hover:bg-white text-[#172447] border border-white shadow-2xs"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Active ({stats.active})</span>
            </button>

            {/* Draft */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("DRAFT")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedStatusFilter === "DRAFT"
                  ? "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/25"
                  : "bg-white/80 hover:bg-white text-[#7180A1] border border-white shadow-2xs"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span>Draft ({stats.draft})</span>
            </button>

            {/* Overdue */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("OVERDUE")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedStatusFilter === "OVERDUE"
                  ? "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/25"
                  : "bg-white/80 hover:bg-white text-[#7180A1] border border-white shadow-2xs"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Overdue ({stats.overdue})</span>
            </button>
          </div>

          {/* Class and Status Secondary Controls */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* All Classes Dropdown */}
            <div className="relative">
              <ResponsiveSelect
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full h-11 pl-9 pr-8 rounded-2xl bg-white border border-white/80 shadow-xs text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#2563EB] cursor-pointer"
              >
                <option value="ALL">All Classes</option>
                {uniqueClassOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </ResponsiveSelect>
              <GraduationCap className="w-4 h-4 text-[#2563EB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-[#7180A1] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* All Status Dropdown */}
            <div className="relative">
              <ResponsiveSelect
                value={selectedStatusDropdown}
                onChange={(e) => setSelectedStatusDropdown(e.target.value)}
                className="w-full h-11 pl-9 pr-8 rounded-2xl bg-white border border-white/80 shadow-xs text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#2563EB] cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="OVERDUE">Overdue</option>
              </ResponsiveSelect>
              <Filter className="w-3.5 h-3.5 text-[#2563EB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-[#7180A1] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── 4. Main Body: Assignment Cards & Second Detailed Card ── */}
        {loadingHw ? (
          <div className="bg-white rounded-3xl border border-[#E4E9F5] p-12 text-center shadow-xs">
            <Loader2 size={28} className="animate-spin text-[#2563EB] mx-auto mb-2" />
            <p className="text-xs font-bold text-[#172447]">Loading homework assignments…</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : homeworks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E4E9F5] p-8 sm:p-12 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto shadow-2xs">
              <ClipboardList size={26} />
            </div>
            <h3 className="text-base font-extrabold text-[#172447]">
              No Homework Assigned Yet
            </h3>
            <p className="text-xs text-[#7180A1] max-w-sm mx-auto leading-relaxed">
              You haven&apos;t assigned any homework yet. Click the button above to assign your first homework to your class.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 sm:gap-5 items-start">
            {/* ── Assignment Cards Column ── */}
            <div className="space-y-3 min-w-0 w-full">
              {filteredHW.length === 0 ? (
                <div className="p-8 bg-white rounded-2xl border border-dashed border-[#E4E9F5] text-center text-xs text-[#7180A1]">
                  No homework matches your filters.
                </div>
              ) : (
                filteredHW.map((hw) => {
                  const isSelected = selectedHw?.id === hw.id;
                  const overdue = isOverdue(hw.due_date);

                  return (
                    <div
                      key={hw.id}
                      onClick={() => setSelectedHw(hw)}
                      className="p-4 sm:p-5 rounded-[26px] border border-white/90 transition-all cursor-pointer relative shadow-xs hover:shadow-sm block text-left bg-white"
                    >
                      {/* Top Row: Blue Document Tile, Title & Status */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
                            <FileText size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-bold text-[#1A1D2F] leading-snug line-clamp-1">
                              {hw.title}
                            </h3>

                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#8E95A9] font-medium whitespace-nowrap">
                              <span>{formatClassDisplay(hw.school_class_name, hw.division_name)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Three-Dot Menu */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHw(hw);
                          }}
                          className="w-7 h-7 rounded-xl text-[#8E95A9] hover:text-[#2563EB] hover:bg-[#EFF6FF] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {/* Bottom Row: Status Badge, Due Date, Submission Count */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mt-3 pt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          {/* Active / Overdue / Draft Badge */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                              overdue
                                ? "bg-[#FFF0F2] text-[#F43F5E]"
                                : hw.is_active
                                ? "bg-[#E8F8F0] text-[#10B981]"
                                : "bg-[#F1F3FE] text-[#7180A1]"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                overdue ? "bg-[#F43F5E]" : hw.is_active ? "bg-[#10B981]" : "bg-slate-400"
                              )}
                            />
                            <span>{overdue ? "Overdue" : hw.is_active ? "Active" : "Draft"}</span>
                          </span>

                          {/* Due Date Badge */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF0F2] text-[#F43F5E] text-[11px] font-semibold">
                            <Calendar size={11} />
                            <span>Due: {formatToDDMMYYYY(hw.due_date)}</span>
                          </span>
                        </div>

                        {/* Submissions Count Pill */}
                        <div className="inline-flex items-center gap-1 text-[#2563EB] text-[11px] font-bold bg-[#EFF6FF] px-2.5 py-0.5 rounded-full">
                          <Users size={11} />
                          <span>{hw.submission_count ?? 0} Submissions</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Second Detailed Card: Assignment Details & Submissions (Exact Reference) ── */}
            {selectedHw && (
              <div className="bg-white rounded-[26px] p-3.5 sm:p-5 border border-white/90 shadow-xs space-y-3.5 min-w-0 w-full">
                {/* Header: Tile, Title, Class, Status & Red-Outlined Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm sm:text-base font-bold text-[#1A1D2F] leading-snug whitespace-nowrap overflow-hidden text-ellipsis">
                        {selectedHw.title}
                      </h2>
                      <p className="text-xs text-[#8E95A9] font-medium mt-0.5 whitespace-nowrap">
                        {formatClassDisplay(selectedHw.school_class_name, selectedHw.division_name)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold",
                        isOverdue(selectedHw.due_date)
                          ? "bg-[#FFF0F2] text-[#F43F5E]"
                          : selectedHw.is_active
                          ? "bg-[#E8F8F0] text-[#10B981]"
                          : "bg-[#F1F3FE] text-[#7180A1]"
                      )}
                    >
                      {isOverdue(selectedHw.due_date) ? "Overdue" : selectedHw.is_active ? "Active" : "Draft"}
                    </span>

                    {/* Red Outlined Delete Action */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selectedHw)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFF0F2] hover:bg-[#FFE4E6] text-[#F43F5E] text-[10.5px] font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Instructions Box Inside Soft Grey-Blue Panel */}
                <div className="p-3.5 rounded-2xl bg-[#F6F8FC] space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8E95A9]">
                    INSTRUCTIONS
                  </p>
                  <p className="text-xs sm:text-sm text-[#1A1D2F] leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedHw.description || "No specific instructions provided for this assignment."}
                  </p>
                </div>

                {/* Full-width View Attached Material Action */}
                <div>
                  {selectedHw.attachment ? (
                    <a
                      href={selectedHw.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#2563EB] text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Paperclip size={14} />
                        <span>View Attached Material</span>
                      </span>
                      <ChevronRight size={14} className="text-[#2563EB]" />
                    </a>
                  ) : (
                    <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-bold opacity-80">
                      <span className="flex items-center gap-2">
                        <Paperclip size={14} />
                        <span>View Attached Material</span>
                      </span>
                      <ChevronRight size={14} className="text-[#2563EB]" />
                    </div>
                  )}
                </div>

                {/* Student Submissions Section */}
                <div className="pt-2 border-t border-[#F0F2F8] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#2563EB]" />
                      <h3 className="text-xs font-bold text-[#1A1D2F]">
                        Student Submissions{" "}
                        {loadingSub
                          ? selectedHw?.submission_count !== undefined
                            ? `(${selectedHw.submission_count})`
                            : ""
                          : `(${submissions.length})`}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {}}
                      className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  {/* Submissions List: Compact Stacked Mobile Rows */}
                  {loadingSub ? (
                    <div className="py-6 text-center text-xs text-[#8E95A9] space-y-1.5">
                      <Loader2 size={16} className="animate-spin text-[#2563EB] mx-auto" />
                      <p>Loading student submissions…</p>
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="py-6 rounded-2xl bg-[#F6F8FC] border border-dashed border-[#E4E9F5] text-center space-y-1">
                      <p className="text-xs font-bold text-[#1A1D2F]">
                        No submissions yet
                      </p>
                      <p className="text-[11px] text-[#8E95A9]">
                        Students have not submitted their work for this assignment yet.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F0F2F8]">
                      {submissions.map((sub) => {
                        const hasFile = Boolean(sub.file || sub.attachment);

                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between py-2 text-xs gap-1.5 sm:gap-2"
                          >
                            {/* Left: Avatar + Name + Identifier */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div
                                className="w-8 h-8 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ background: "#2563EB" }}
                              >
                                {getInitials(sub.student_name)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[11.5px] font-bold text-[#1A1D2F] truncate leading-tight">
                                  {sub.student_name}
                                </h4>
                                <p className="text-[10px] text-[#8E95A9] truncate leading-tight mt-0.5">
                                  {(sub as any).parent_name
                                    ? `Parent: ${(sub as any).parent_name}`
                                    : (sub as any).roll_no
                                    ? `Roll No: ${(sub as any).roll_no}`
                                    : sub.status === "checked"
                                    ? `Graded (${sub.marks ?? 0} marks)`
                                    : "Submitted"}
                                </p>
                              </div>
                            </div>

                            {/* Middle: Submitted At */}
                            <div className="w-[72px] sm:w-[80px] text-left shrink-0">
                              <p className="text-[8.5px] font-medium text-[#8E95A9] uppercase tracking-tight leading-none">
                                Submitted At
                              </p>
                              <p className="text-[11px] font-semibold text-[#1A1D2F] mt-1 leading-none">
                                {formatToDDMMYYYY(sub.submitted_at || sub.submission_date) || "—"}
                              </p>
                            </div>

                            {/* Right: File View */}
                            <div className="w-[74px] sm:w-[80px] text-left shrink-0">
                              <p className="text-[8.5px] font-medium text-[#8E95A9] uppercase tracking-tight leading-none">
                                File
                              </p>
                              {hasFile ? (
                                <a
                                  href={sub.file || sub.attachment || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] text-[10.5px] font-bold transition-colors mt-0.5"
                                >
                                  <FileText size={11} />
                                  <span>View File</span>
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[10.5px] font-bold mt-0.5">
                                  <FileText size={11} />
                                  <span>View File</span>
                                </span>
                              )}
                            </div>

                            {/* Far Right: Menu button */}
                            <button
                              type="button"
                              onClick={() => setMarkModal(sub)}
                              className="w-6 h-6 rounded-lg text-[#8E95A9] hover:text-[#2563EB] hover:bg-[#EFF6FF] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Modals ── */}
      {createModal && (
        <CreateHomeworkModal
          divisions={divisions}
          assignments={teacherAssignments}
          onClose={() => setCreateModal(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={isCreating}
        />
      )}

      {markModal && (
        <MarkModal
          submission={markModal}
          onClose={() => setMarkModal(null)}
          onSave={handleGrade}
          isSaving={isGrading}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
