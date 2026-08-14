"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
  FileText,
  Paperclip,
  Download,
  Eye,
  CheckCircle,
  Clock,
  ClipboardList,
  Filter,
  X,
  Check,
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
import { getStudentsForAttendance } from "@/lib/teacher/student-attendance";
import type { HomeworkItem, HomeworkSubmission } from "@/types/teacher";

// ─── Color Helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b",
  "#8b5cf6", "#10b981", "#ef4444", "#3b82f6",
];

function getInitials(name: string): string {
  if (!name) return "?";
  const words = name.trim().split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

function formatToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split(/[-/]/);
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Active: { bg: "#dcfce7", color: "#16a34a" },
    Inactive: { bg: "#f1f5f9", color: "#64748b" },
    submitted: { bg: "#dbeafe", color: "#2563eb" },
    Submitted: { bg: "#dbeafe", color: "#2563eb" },
    late: { bg: "#fee2e2", color: "#dc2626" },
    Late: { bg: "#fee2e2", color: "#dc2626" },
    pending: { bg: "#fef9c3", color: "#ca8a04" },
    Pending: { bg: "#fef9c3", color: "#ca8a04" },
    checked: { bg: "#dcfce7", color: "#16a34a" },
    Checked: { bg: "#dcfce7", color: "#16a34a" },
  };
  const key = status ? status.toLowerCase() : "pending";
  const s = styles[status] || styles[key] || { bg: "#f1f5f9", color: "#64748b" };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

// ─── Homework Card ────────────────────────────────────────────────────────────

function HomeworkCard({
  hw,
  selected,
  onSelect,
}: {
  hw: HomeworkItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%",
        textAlign: "left",
        background: selected ? "#f5f3ff" : "#fff",
        border: selected ? "1.5px solid #818cf8" : "1.5px solid #f1f5f9",
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "#ede9fe",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FileText size={18} color="#7c3aed" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: selected ? "#6366f1" : "#1e293b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hw.title}
          </span>
          <StatusBadge status={hw.is_active ? "Active" : "Inactive"} />
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          {hw.school_class_name || "Class"} · {hw.division_name || "Div"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
          }}
        >
          <span style={{ color: "#ef4444", fontWeight: 500 }}>
            Due: {hw.due_date}
          </span>
          <span style={{ color: "#64748b", fontWeight: 600 }}>
            {hw.submission_count ?? 0} Submissions
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Mark Modal ───────────────────────────────────────────────────────────────

function MarkModal({
  submission,
  onClose,
  onSave,
}: {
  submission: HomeworkSubmission;
  onClose: () => void;
  onSave: (marks: number, remark: string) => void;
}) {
  const [marks, setMarks] = useState<string>(
    submission.marks !== null ? String(submission.marks) : ""
  );
  const [remark, setRemark] = useState(submission.teacher_remark || "");

  const handleSave = () => {
    const val = parseInt(marks, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Please enter valid marks between 0 and 100.");
      return;
    }
    onSave(val, remark);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
            Grade Submission
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            padding: "12px 14px",
            background: "#f8fafc",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {getInitials(submission.student_name)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
              {submission.student_name}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Submitted: {submission.submitted_at || submission.submission_date}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
            Marks (out of 100) *
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            placeholder="Enter marks"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
            Teacher Remark (Optional)
          </label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="e.g. Excellent work!"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save Grade
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Homework Modal ────────────────────────────────────────────────────

interface TeacherAssignment {
  id: number;
  divisionId: number;
  className: string;
  divisionName: string;
  fullDivisionLabel: string;
  subjectId: number;
  subjectName: string;
}

function CreateHomeworkModal({
  divisions,
  assignments,
  onClose,
  onSubmit,
}: {
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
}) {
  const uniqueDivisions = useMemo(() => {
    if (assignments.length > 0) {
      const map = new Map<number, { id: number; name: string }>();
      assignments.forEach((a) => {
        if (a.divisionId && !map.has(a.divisionId)) {
          map.set(a.divisionId, { id: a.divisionId, name: a.fullDivisionLabel });
        }
      });
      if (map.size > 0) return Array.from(map.values());
    }
    return divisions;
  }, [assignments, divisions]);

  const [divisionId, setDivisionId] = useState<number>(uniqueDivisions[0]?.id || 0);
  const [allSubjects, setAllSubjects] = useState<{ id: number; name: string; division: any }[]>([]);
  const [subjectName, setSubjectName] = useState<string>("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (uniqueDivisions.length > 0 && (!divisionId || !uniqueDivisions.some((d) => d.id === divisionId))) {
      setDivisionId(uniqueDivisions[0].id);
    }
  }, [uniqueDivisions, divisionId]);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/setSubject/`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.data ?? data.results ?? []);
          setAllSubjects(list);
        }
      } catch (e) {
        console.error("Failed to load subjects:", e);
      }
    }
    fetchSubjects();
  }, []);

  const availableSubjects = useMemo(() => {
    if (!divisionId) return [];

    const matchedAssignments = assignments.filter((a) => String(a.divisionId) === String(divisionId));
    if (matchedAssignments.length > 0) {
      const assignedSubs = matchedAssignments.map((a) => a.subjectName).filter(Boolean);
      const unique = Array.from(new Set(assignedSubs));
      if (unique.length > 0) return unique;
    }

    const fallback = allSubjects.filter(
      (s) =>
        String(s.division) === String(divisionId) ||
        (s.division && String(s.division.id) === String(divisionId))
    );
    const subNames = (fallback.length > 0 ? fallback : allSubjects).map((s) => s.name).filter(Boolean);
    return Array.from(new Set(subNames));
  }, [assignments, divisionId, allSubjects]);

  useEffect(() => {
    if (availableSubjects.length > 0) {
      setSubjectName(availableSubjects[0]);
    } else {
      setSubjectName("");
    }
  }, [availableSubjects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    onSubmit({ divisionId, subjectName, title, dueDate, description, file });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          boxSizing: "border-box",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              Create Homework
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Fill in details to assign homework to your students
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f8fafc",
              border: "none",
              cursor: "pointer",
              width: 30,
              height: 30,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              Homework Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 5 Exercise"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              Class / Division *
            </label>
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            >
              {uniqueDivisions.length === 0 ? (
                <option value={0}>Select Division...</option>
              ) : (
                uniqueDivisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              Subject *
            </label>
            <select
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            >
              {availableSubjects.length === 0 ? (
                <option value="">No subject assigned for this division</option>
              ) : (
                availableSubjects.map((sName) => (
                  <option key={sName} value={sName}>
                    {sName}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              Description / Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Enter instructions for students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              Attach File (Optional PDF/Image)
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{
                width: "100%",
                fontSize: 12,
                color: "#475569",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: "10px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Check size={15} /> Create Homework
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AllHomeworkPage() {
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loadingHw, setLoadingHw] = useState(true);
  const [loadingSub, setLoadingSub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<{ id: number; name: string }[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

  const [searchHW, setSearchHW] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [activeTab, setActiveTab] = useState<"submissions" | "pending">("submissions");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const [markModal, setMarkModal] = useState<HomeworkSubmission | null>(null);
  const [createModal, setCreateModal] = useState(false);

  // Fetch homework list from API
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

  // Fetch teacher assigned classes and subjects
  useEffect(() => {
    async function loadTeacherAssignments() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/assignClass/`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.data ?? data.results ?? []);
          const mapped: TeacherAssignment[] = list.map((item: any) => {
            const divId = typeof item.division === "object" ? item.division?.id : item.division;
            const className =
              item.class_name ||
              item.division?.SchoolClass?.school_class ||
              (typeof item.division?.SchoolClass === "string" ? item.division?.SchoolClass : "") ||
              "";
            const divisionName =
              item.division_name ||
              (typeof item.division === "object" ? item.division?.division : "") ||
              "";
            const fullDivisionLabel =
              className && divisionName
                ? `${className} (Div ${divisionName})`
                : divisionName
                ? `Div ${divisionName}`
                : className || `Division ${divId}`;

            const subId = typeof item.subject === "object" ? item.subject?.id : item.subject;
            const subName =
              item.subject_name ||
              (typeof item.subject === "object" ? item.subject?.name : "") ||
              "";

            return {
              id: item.id,
              divisionId: Number(divId),
              className,
              divisionName,
              fullDivisionLabel,
              subjectId: Number(subId),
              subjectName: subName,
            };
          });

          setTeacherAssignments(mapped);
        }
      } catch (e) {
        console.error("Failed to load teacher assignments:", e);
      }

      // Fallback divisions
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
                ? `${className} (Div ${divName})`
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

    loadTeacherAssignments();
  }, []);

  // Fetch submissions whenever selected homework changes
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

  // Create Homework Handler
  const handleCreateSubmit = async (data: {
    divisionId: number;
    subjectName: string;
    title: string;
    dueDate: string;
    description: string;
    file: File | null;
  }) => {
    try {
      const formattedDueDate = formatToDDMMYYYY(data.dueDate);
      const fullTitle =
        data.subjectName && !data.title.toLowerCase().includes(data.subjectName.toLowerCase())
          ? `${data.subjectName}: ${data.title.trim()}`
          : data.title.trim();

      const fd = new FormData();
      fd.append("division", String(data.divisionId));
      fd.append("title", fullTitle);
      fd.append("description", data.description.trim());
      fd.append("due_date", formattedDueDate);
      if (data.file) {
        fd.append("attachment", data.file);
      }

      await createHomework(fd);
      toast.success(`Homework "${fullTitle}" created successfully!`);
      setCreateModal(false);
      await fetchHomeworkList();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create homework.");
    }
  };

  // Delete Homework Handler
  const handleDeleteHw = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteHomework(id);
      toast.success("Homework deleted successfully.");
      await fetchHomeworkList();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete homework.");
    }
  };

  // Grade Submission Handler
  const handleGrade = async (marks: number, remark: string) => {
    if (!markModal) return;
    try {
      await gradeSubmission(markModal.id, marks, remark);
      toast.success("Submission graded successfully!");
      setMarkModal(null);
      if (selectedHw) {
        await fetchSubmissions(selectedHw.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to grade submission.");
    }
  };

  const filteredHW = useMemo(
    () =>
      homeworks.filter(
        (h) =>
          h.title.toLowerCase().includes(searchHW.toLowerCase()) ||
          (h.school_class_name && h.school_class_name.toLowerCase().includes(searchHW.toLowerCase()))
      ),
    [homeworks, searchHW]
  );

  const displayedSubs = useMemo(
    () =>
      submissions.filter((s) => {
        const matchSearch = s.student_name
          .toLowerCase()
          .includes(searchStudent.toLowerCase());
        const matchStatus =
          statusFilter === "All Status" ||
          s.status.toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
      }),
    [submissions, searchStudent, statusFilter]
  );

  const activeSubs = displayedSubs.filter((s) => s.status.toLowerCase() !== "pending");
  const pendingSubs = displayedSubs.filter((s) => s.status.toLowerCase() === "pending");
  const tabSubs = activeTab === "submissions" ? activeSubs : pendingSubs;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter', sans-serif",
        padding: "20px 16px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e293b" }}>
          All Homework
        </h1>
        <button
          onClick={() => setCreateModal(true)}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
          }}
        >
          <Plus size={16} /> Create Homework
        </button>
      </div>

      {loadingHw ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 14 }}>
          Loading homework assignments...
        </div>
      ) : error ? (
        <div style={{ padding: 30, background: "#fee2e2", borderRadius: 12, color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      ) : homeworks.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1.5px solid #e2e8f0",
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#ede9fe",
              color: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <ClipboardList size={32} />
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            No Homework Created Yet
          </h3>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13,
              color: "#64748b",
              maxWidth: 420,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            You haven't assigned any homework yet. Click the button below to create your first homework assignment for your class.
          </p>
          <button
            onClick={() => setCreateModal(true)}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} /> Create Homework
          </button>
        </div>
      ) : (
        /* Main Layout Grid */
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          {/* Left Column: Homework List */}
          <div>
            <div
              style={{
                position: "relative",
                marginBottom: 14,
              }}
            >
              <Search
                size={15}
                color="#94a3b8"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="Search homework..."
                value={searchHW}
                onChange={(e) => setSearchHW(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredHW.map((hw) => (
                <HomeworkCard
                  key={hw.id}
                  hw={hw}
                  selected={selectedHw?.id === hw.id}
                  onSelect={() => setSelectedHw(hw)}
                />
              ))}
            </div>
          </div>

          {/* Right Column: Selected Homework Detail & Submissions */}
          {selectedHw && (
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                border: "1.5px solid #f1f5f9",
                padding: 24,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
                      {selectedHw.title}
                    </h2>
                    <StatusBadge status={selectedHw.is_active ? "Active" : "Inactive"} />
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {selectedHw.school_class_name || "Class"} · {selectedHw.division_name || "Div"}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteHw(selectedHw.id, selectedHw.title)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #fee2e2",
                    background: "#fff",
                    color: "#ef4444",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              {/* Description & Attachment */}
              {selectedHw.description && (
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                  {selectedHw.description}
                </p>
              )}

              {selectedHw.attachment && (
                <div style={{ marginBottom: 16 }}>
                  <a
                    href={selectedHw.attachment}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6366f1",
                      background: "#eef2ff",
                      padding: "6px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                    }}
                  >
                    <Paperclip size={13} /> Attachment File
                  </a>
                </div>
              )}

              {/* Info Badges */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 24,
                  padding: 14,
                  background: "#f8fafc",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>DUE DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>
                    {selectedHw.due_date}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>ASSIGNED DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                    {selectedHw.assigned_date || selectedHw.created_at?.split("T")[0]}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>SUBMISSIONS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
                    {submissions.length} Total
                  </div>
                </div>
              </div>

              {/* Submissions Section */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: "flex", gap: 16 }}>
                    <button
                      onClick={() => setActiveTab("submissions")}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 14,
                        fontWeight: 700,
                        color: activeTab === "submissions" ? "#6366f1" : "#94a3b8",
                        cursor: "pointer",
                        paddingBottom: 4,
                        borderBottom: activeTab === "submissions" ? "2px solid #6366f1" : "none",
                      }}
                    >
                      Submissions ({activeSubs.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("pending")}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 14,
                        fontWeight: 700,
                        color: activeTab === "pending" ? "#6366f1" : "#94a3b8",
                        cursor: "pointer",
                        paddingBottom: 4,
                        borderBottom: activeTab === "pending" ? "2px solid #6366f1" : "none",
                      }}
                    >
                      Pending ({pendingSubs.length})
                    </button>
                  </div>
                </div>

                {loadingSub ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Loading submissions...
                  </div>
                ) : tabSubs.length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    No submissions found.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                          STUDENT
                        </th>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                          SUBMITTED AT
                        </th>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                          STATUS
                        </th>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                          MARKS
                        </th>
                        <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabSubs.map((sub, idx) => (
                        <tr key={sub.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(sub.student_name)}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                                {sub.student_name}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px", fontSize: 12, color: "#64748b" }}>
                            {sub.submitted_at || sub.submission_date || "—"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <StatusBadge status={sub.status} />
                          </td>
                          <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                            {sub.marks !== null ? `${sub.marks} / 100` : "—"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "right" }}>
                            <button
                              onClick={() => setMarkModal(sub)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 7,
                                border: "1px solid #c7d2fe",
                                background: "#eef2ff",
                                color: "#4f46e5",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Grade / Remark
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {createModal && (
        <CreateHomeworkModal
          divisions={divisions}
          assignments={teacherAssignments}
          onClose={() => setCreateModal(false)}
          onSubmit={handleCreateSubmit}
        />
      )}

      {markModal && (
        <MarkModal
          submission={markModal}
          onClose={() => setMarkModal(null)}
          onSave={handleGrade}
        />
      )}
    </div>
  );
}