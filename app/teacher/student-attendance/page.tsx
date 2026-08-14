"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  ChevronDown,
  ArrowLeft,
  Calendar,
  Save,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ClipboardList,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  getStudentsForAttendance,
  submitStudentAttendance,
  getStudentAttendanceRecords,
} from "@/lib/teacher";
import type { StudentAttendanceListResponse } from "@/types/teacher";

// ─── Font ─────────────────────────────────────────────────────────────────────

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | null;
type View = "list" | "mark";

interface Student {
  id: string;
  grNo: string;
  name: string;
  initials: string;
  color: string;
  todayStatus: "present" | "absent" | "unmarked";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#a78bfa", "#f472b6", "#34d399", "#60a5fa",
  "#fbbf24", "#fb923c", "#818cf8", "#2dd4bf",
  "#f87171", "#4ade80",
];

function getInitials(name: string, surname?: string | null): string {
  const parts = [name, surname].filter(Boolean) as string[];
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const words = parts[0].trim().split(" ");
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : words[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizeDate(dStr: string): string {
  if (!dStr) return "";
  const parts = dStr.split("T")[0].split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return dStr;
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const S = {
  card: {
    background: "#fff",
    border: "1px solid #ede9fe",
    borderRadius: 16,
    boxShadow: "0 2px 14px rgba(124,58,237,0.06)",
    overflow: "hidden" as const,
  },
  th: {
    padding: "11px 18px",
    textAlign: "left" as const,
    fontSize: 11,
    fontWeight: 700,
    color: "#7c3aed",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid #ede9fe",
    background: "#faf9ff",
  },
  tdBase: {
    padding: "13px 18px",
    fontSize: 13,
    fontFamily: "inherit",
  },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  initials,
  color,
  size = 34,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color + "22",
        border: `2px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        color,
        flexShrink: 0,
        letterSpacing: "0.02em",
        fontFamily: "inherit",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div
      style={{
        ...S.card,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flex: 1,
        minWidth: 140,
        overflow: "visible",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={19} color={iconColor} />
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "#9ca3af",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 5,
            marginTop: 2,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#1e1b4b",
              lineHeight: 1,
            }}
          >
            {value}
          </span>
          {sub && (
            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          padding: "7px 30px 7px 12px",
          borderRadius: 8,
          border: "1px solid #ede9fe",
          background: "#f8f7ff",
          fontSize: 13,
          color: "#4b5563",
          fontFamily: "inherit",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {children}
      </select>
      <ChevronDown
        size={12}
        color="#9ca3af"
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ─── PagBtn ───────────────────────────────────────────────────────────────────

function PagBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        border: active ? "none" : "1px solid #ede9fe",
        background: active
          ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
          : "#fff",
        color: active ? "#fff" : "#6b7280",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
        boxShadow: active ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
        fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: "present" | "absent" | "unmarked";
}) {
  const config = {
    present: { bg: "#d1fae5", color: "#059669", dot: "#10b981", label: "Present" },
    absent:  { bg: "#fee2e2", color: "#dc2626", dot: "#ef4444", label: "Absent"  },
    unmarked:{ bg: "#f3f4f6", color: "#9ca3af", dot: "#d1d5db", label: "—"       },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: config.dot,
        }}
      />
      {config.label}
    </span>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ padding: "24px", fontFamily: "'Sora', sans-serif" }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ width: 220, height: 28, background: "#ede9fe", borderRadius: 8, marginBottom: 8 }} />
          <div style={{ width: 160, height: 16, background: "#f5f3ff", borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 180, height: 36, background: "#f5f3ff", borderRadius: 10 }} />
          <div style={{ width: 140, height: 36, background: "#ede9fe", borderRadius: 10 }} />
        </div>
      </div>
      {/* Stat cards skeleton */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 80,
              background: "#fff",
              border: "1px solid #ede9fe",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "18px 20px",
            }}
          >
            <div style={{ width: 42, height: 42, background: "#f5f3ff", borderRadius: 11 }} />
            <div>
              <div style={{ width: 70, height: 10, background: "#f5f3ff", borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: 40, height: 24, background: "#ede9fe", borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div style={{ ...S.card }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f5f3ff" }}>
          <div style={{ width: 120, height: 16, background: "#ede9fe", borderRadius: 6 }} />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #f8f7ff",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ width: 60, height: 14, background: "#f5f3ff", borderRadius: 4 }} />
            <div style={{ width: 34, height: 34, background: "#f5f3ff", borderRadius: "50%" }} />
            <div style={{ width: 140, height: 14, background: "#f5f3ff", borderRadius: 4 }} />
            <div style={{ marginLeft: "auto", width: 80, height: 24, background: "#f5f3ff", borderRadius: 20 }} />
            <div style={{ width: 60, height: 28, background: "#f5f3ff", borderRadius: 7 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error / Not Assigned State ───────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const isNotAssigned = message.toLowerCase().includes("not assigned");

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "'Sora', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div
        style={{
          ...S.card,
          padding: "48px 40px",
          textAlign: "center",
          maxWidth: 440,
          width: "100%",
          overflow: "visible",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: isNotAssigned ? "#fef3c7" : "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <AlertTriangle
            size={32}
            color={isNotAssigned ? "#d97706" : "#dc2626"}
          />
        </div>

        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#1e1b4b",
            margin: "0 0 10px",
          }}
        >
          {isNotAssigned ? "Not Assigned as Class Teacher" : "Something went wrong"}
        </h2>

        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            margin: "0 0 28px",
            lineHeight: 1.7,
          }}
        >
          {isNotAssigned
            ? "You are not assigned as a class teacher for any division. Please contact your school administrator to get assigned."
            : message}
        </p>

        {!isNotAssigned && (
          <button
            onClick={onRetry}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
            }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  presentCount,
  absentCount,
  totalStudents,
  divisionName,
  onConfirm,
  onCancel,
  saving,
}: {
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  divisionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const unmarked = totalStudents - presentCount - absentCount;
  const today    = formatDate(new Date());

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 10, 40, 0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow:
            "0 24px 64px rgba(124,58,237,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
          fontFamily: "'Sora', sans-serif",
          animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <style>{`
          @keyframes popIn {
            from { opacity:0; transform:scale(0.92) translateY(12px); }
            to   { opacity:1; transform:scale(1)    translateY(0);     }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
            padding: "24px 24px 20px",
            borderBottom: "1px solid #ede9fe",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              flexShrink: 0,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
            }}
          >
            <Save size={20} color="#fff" />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 800,
                color: "#1e1b4b",
              }}
            >
              Save Attendance?
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "#9ca3af",
                lineHeight: 1.5,
              }}
            >
              Please review the summary before confirming.
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Date + Class */}
          <div
            style={{
              background: "#f8f7ff",
              borderRadius: 10,
              border: "1px solid #ede9fe",
              padding: "10px 14px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
              📅 {today}
            </span>
            <span
              style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}
            >
              {divisionName}
            </span>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              { label: "Present",  value: presentCount, bg: "#d1fae5", color: "#059669" },
              { label: "Absent",   value: absentCount,  bg: "#fee2e2", color: "#dc2626" },
              { label: "Unmarked", value: unmarked,     bg: "#fef9c3", color: "#92400e" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: item.bg,
                  borderRadius: 10,
                  padding: "12px 14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: item.color,
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: item.color,
                    marginTop: 4,
                    opacity: 0.8,
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Warning if unmarked */}
          {unmarked > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 9,
                padding: "10px 12px",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#92400e",
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {unmarked} student{unmarked > 1 ? "s are" : " is"} not yet
                marked. They will be skipped.
              </p>
            </div>
          )}

          <p
            style={{
              margin: "0 0 16px",
              fontSize: 12,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            By confirming, you acknowledge that the attendance for{" "}
            <strong style={{ color: "#1e1b4b" }}>{divisionName}</strong> on{" "}
            <strong style={{ color: "#1e1b4b" }}>{today}</strong> is correct
            and final.
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onCancel}
              disabled={saving}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: 10,
                border: "1.5px solid #ede9fe",
                background: "#fff",
                color: "#6b7280",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Go Back & Edit
            </button>
            <button
              onClick={onConfirm}
              disabled={saving}
              style={{
                flex: 2,
                padding: "11px",
                borderRadius: 10,
                border: "none",
                background: saving
                  ? "linear-gradient(135deg,#10b981,#059669)"
                  : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                transition: "background 0.3s",
              }}
            >
              {saving ? (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{ animation: "spin 0.9s linear infinite" }}
                  >
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <circle
                      cx="7"
                      cy="7"
                      r="5.5"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="2"
                    />
                    <path
                      d="M7 1.5A5.5 5.5 0 0112.5 7"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Yes, Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student List View ────────────────────────────────────────────────────────

function StudentListView({
  students,
  divisionName,
  onMarkAttendance,
  isAlreadyMarkedToday,
  assignedDivisions,
  selectedDivisionId,
  onSelectDivision,
  onViewStudent,
}: {
  students: Student[];
  divisionName: string;
  onMarkAttendance: () => void;
  isAlreadyMarkedToday: boolean;
  assignedDivisions?: { division_id: number; division_name: string }[];
  selectedDivisionId?: number | null;
  onSelectDivision?: (divId: number) => void;
  onViewStudent?: (student: Student) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const PER_PAGE = 8;
  const today = formatDate(new Date());

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.grNo.toLowerCase().includes(q)
        );
      }),
    [search, students],
  );

  const totalPages   = Math.ceil(filtered.length / PER_PAGE);
  const paginated    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const presentCount = students.filter((s) => s.todayStatus === "present").length;
  const absentCount  = students.filter((s) => s.todayStatus === "absent").length;
  const pct          = students.length > 0
    ? Math.round((presentCount / students.length) * 100)
    : 0;
  const absentPct    = students.length > 0
    ? Math.round((absentCount / students.length) * 100)
    : 0;

  return (
    <div
      style={{
        padding: "24px",
        background: "#f8f7ff",
        minHeight: "100%",
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {isAlreadyMarkedToday && (
        <div
          style={{
            background: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 20,
            color: "#059669",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span>Attendance for today has already been submitted successfully.</span>
        </div>
      )}
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 22,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#1e1b4b",
                margin: 0,
                fontFamily: "inherit",
              }}
            >
              Student Attendance
            </h1>
            {assignedDivisions && assignedDivisions.length > 1 && (
              <select
                value={selectedDivisionId ?? ""}
                onChange={(e) => onSelectDivision?.(Number(e.target.value))}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid #ede9fe",
                  background: "#fff",
                  color: "#7c3aed",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  outline: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {assignedDivisions.map((ad) => (
                  <option key={ad.division_id} value={ad.division_id}>
                    {ad.division_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 3 }}>
            {divisionName} · {today}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #ede9fe",
              background: "#fff",
              color: "#6b7280",
              fontSize: 13,
              cursor: "default",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            <Calendar size={13} color="#7c3aed" />
            {today}
          </button>
          <button
            onClick={isAlreadyMarkedToday ? undefined : onMarkAttendance}
            disabled={isAlreadyMarkedToday}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: isAlreadyMarkedToday
                ? "#9ca3af"
                : "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "#fff",
              fontSize: 13,
              cursor: isAlreadyMarkedToday ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontFamily: "inherit",
              boxShadow: isAlreadyMarkedToday
                ? "none"
                : "0 4px 14px rgba(124,58,237,0.32)",
              opacity: isAlreadyMarkedToday ? 0.7 : 1,
            }}
          >
            <CheckCircle2 size={14} />
            {isAlreadyMarkedToday ? "Attendance Submitted" : "Mark Attendance"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}
      >
        <StatCard
          label="Total Students"
          value={String(students.length)}
          icon={Users}
          iconBg="#ede9fe"
          iconColor="#7c3aed"
        />
        <StatCard
          label="Present Today"
          value={String(presentCount)}
          sub={students.length > 0 ? `(${pct}%)` : ""}
          icon={CheckCircle2}
          iconBg="#d1fae5"
          iconColor="#10b981"
        />
        <StatCard
          label="Absent Today"
          value={String(absentCount)}
          sub={students.length > 0 ? `(${absentPct}%)` : ""}
          icon={XCircle}
          iconBg="#fee2e2"
          iconColor="#ef4444"
        />
        <StatCard
          label="Attendance %"
          value={students.length > 0 ? `${pct}%` : "—"}
          icon={TrendingUp}
          iconBg="#fef3c7"
          iconColor="#f59e0b"
        />
      </div>

      {/* Table card */}
      <div style={S.card}>
        {/* Toolbar */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f5f3ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1e1b4b" }}>
              Student List
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {divisionName} — all students
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#f8f7ff",
              border: "1px solid #ede9fe",
              borderRadius: 8,
              padding: "6px 12px",
            }}
          >
            <Search size={13} color="#9ca3af" />
            <input
              placeholder="Search students..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 13,
                color: "#4b5563",
                outline: "none",
                width: 150,
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 500,
            }}
          >
            <thead>
              <tr>
                {["GR No.", "Student Name", "Today's Status", "Action"].map(
                  (h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: "1px solid #f8f7ff",
                    background: i % 2 === 0 ? "#fff" : "#fefcff",
                  }}
                >
                  <td
                    style={{
                      ...S.tdBase,
                      fontWeight: 600,
                      color: "#6b7280",
                    }}
                  >
                    {s.grNo}
                  </td>
                  <td style={S.tdBase}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Avatar initials={s.initials} color={s.color} />
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#1e1b4b",
                        }}
                      >
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td style={S.tdBase}>
                    <StatusBadge status={s.todayStatus} />
                  </td>
                  <td style={S.tdBase}>
                    <button
                      onClick={() => onViewStudent?.(s)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 14px",
                        borderRadius: 7,
                        border: "1px solid #ede9fe",
                        background: "#f8f7ff",
                        color: "#7c3aed",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: 13,
                    }}
                  >
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #ede9fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Showing{" "}
            {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–
            {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}{" "}
            students
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <PagBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={13} color="#7c3aed" />
            </PagBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PagBtn
                key={p}
                onClick={() => setPage(p)}
                active={p === page}
              >
                {p}
              </PagBtn>
            ))}
            <PagBtn
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages || totalPages === 0}
            >
              <ChevronRight size={13} color="#7c3aed" />
            </PagBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Attendance View ─────────────────────────────────────────────────────

function MarkAttendanceView({
  students,
  divisionName,
  onBack,
  localStorageKey,
  onMarkedSuccess,
}: {
  students: Student[];
  divisionName: string;
  onBack: () => void;
  localStorageKey: string;
  onMarkedSuccess: () => void;
}) {
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [search, setSearch]             = useState("");
  const [saved, setSaved]               = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [apiError, setApiError]         = useState<string | null>(null);
  const today = formatDate(new Date());

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.grNo.toLowerCase().includes(search.toLowerCase()),
  );

  const presentCount = Object.values(attendance).filter(
    (v) => v === "present",
  ).length;
  const absentCount  = Object.values(attendance).filter(
    (v) => v === "absent",
  ).length;
  const markedCount  = presentCount + absentCount;
  const pct =
    students.length > 0
      ? Math.round((presentCount / students.length) * 100)
      : 0;

  // SVG donut
  const r = 28, cx = 36, cy = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const markAll = (status: "present" | "absent") => {
    const upd: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      upd[s.id] = status;
    });
    setAttendance((prev) => ({ ...prev, ...upd }));
  };

  // ── Step 1: open confirm modal ────────────────────────────────────────────
  const handleSaveClick = () => {
    setApiError(null);
    setShowConfirm(true);
  };

  // ── Step 2: submit to API ─────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setSaving(true);
    setApiError(null);

    try {
      // Build payload — only include marked students
      const records = students
        .filter((s) => attendance[s.id] !== null && attendance[s.id] !== undefined)
        .map((s) => ({
          student:    Number(s.id),
          is_present: attendance[s.id] === "present",
          is_absent:  attendance[s.id] === "absent",
        }));

      await submitStudentAttendance(records);

      if (typeof window !== "undefined" && localStorageKey) {
        localStorage.setItem(localStorageKey, "true");
      }
      onMarkedSuccess();

      setSaving(false);
      setShowConfirm(false);
      setSaved(true);

      // Navigate back after short delay
      setTimeout(() => {
        setSaved(false);
        onBack();
      }, 1000);
    } catch (err: any) {
      setSaving(false);
      setShowConfirm(false);
      const isAlreadyMarked = err?.message?.toLowerCase().includes("already") || 
                              err?.message?.toLowerCase().includes("unique") ||
                              err?.message?.toLowerCase().includes("exist");
      if (isAlreadyMarked) {
        if (typeof window !== "undefined" && localStorageKey) {
          localStorage.setItem(localStorageKey, "true");
        }
        onMarkedSuccess();
        setApiError("Attendance for this class has already been marked today.");
      } else {
        setApiError(err?.message || "Failed to save attendance. Please try again.");
      }
    }
  }, [students, attendance, onBack, localStorageKey, onMarkedSuccess]);

  return (
    <div
      style={{
        padding: "24px",
        background: "#f8f7ff",
        minHeight: "100%",
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {/* Confirm modal */}
      {showConfirm && (
        <ConfirmModal
          presentCount={presentCount}
          absentCount={absentCount}
          totalStudents={students.length}
          divisionName={divisionName}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          saving={saving}
        />
      )}

      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 22,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#1e1b4b",
              margin: 0,
              fontFamily: "inherit",
            }}
          >
            Mark Attendance
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 3 }}>
            {divisionName} · {today}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #ede9fe",
              background: "#fff",
              color: "#6b7280",
              fontSize: 13,
              cursor: "default",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            <Calendar size={13} color="#7c3aed" />
            {today}
          </button>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #ede9fe",
              background: "#fff",
              color: "#6b7280",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={13} /> Back to List
          </button>
        </div>
      </div>

      {/* API Error banner */}
      {apiError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={16} color="#dc2626" />
          <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            {apiError}
          </span>
          <button
            onClick={() => setApiError(null)}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#dc2626",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Class info bar */}
      <div
        style={{
          ...S.card,
          padding: "18px 24px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 28,
          flexWrap: "wrap",
          overflow: "visible",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            background: "linear-gradient(135deg,#ede9fe,#ddd6fe)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ClipboardList size={20} color="#7c3aed" />
        </div>

        {[
          { label: "Division",       value: divisionName },
          { label: "Total Students", value: String(students.length) },
          {
            label: "Present",
            value: presentCount > 0 ? String(presentCount) : "—",
          },
          {
            label: "Absent",
            value: absentCount > 0 ? String(absentCount) : "—",
          },
        ].map((item) => (
          <div key={item.label}>
            <div
              style={{
                fontSize: 9,
                color: "#9ca3af",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#1e1b4b",
                marginTop: 2,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}

        {/* Live donut */}
        <div style={{ marginLeft: "auto" }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#f0eeff"
              strokeWidth={8}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={pct > 0 ? "#7c3aed" : "#e9e4ff"}
              strokeWidth={8}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "36px 36px",
                transition: "stroke-dasharray 0.4s",
              }}
            />
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={800}
              fill="#1e1b4b"
              fontFamily="Sora,sans-serif"
            >
              {pct}%
            </text>
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fill="#9ca3af"
              fontFamily="Sora,sans-serif"
            >
              Present
            </text>
          </svg>
        </div>
      </div>

      {/* Table card */}
      <div style={S.card}>
        {/* Controls */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #f5f3ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f8f7ff",
              border: "1px solid #ede9fe",
              borderRadius: 8,
              padding: "6px 12px",
              minWidth: 200,
            }}
          >
            <Search size={13} color="#9ca3af" />
            <input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 13,
                color: "#4b5563",
                outline: "none",
                width: "100%",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => markAll("present")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1.5px solid #10b981",
                background: "#f0fdf4",
                color: "#059669",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <CheckCircle2 size={13} /> Mark All Present
            </button>
            <button
              onClick={() => markAll("absent")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1.5px solid #ef4444",
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <XCircle size={13} /> Mark All Absent
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 480,
            }}
          >
            <thead>
              <tr>
                {["GR No.", "Student Name", "Mark Attendance"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const status = attendance[s.id];
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid #f8f7ff",
                      background:
                        status === "present"
                          ? "#f0fdf4"
                          : status === "absent"
                            ? "#fef2f2"
                            : i % 2 === 0
                              ? "#fff"
                              : "#fefcff",
                      transition: "background 0.2s",
                    }}
                  >
                    <td
                      style={{
                        ...S.tdBase,
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      {s.grNo}
                    </td>
                    <td style={S.tdBase}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Avatar initials={s.initials} color={s.color} />
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1e1b4b",
                          }}
                        >
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td style={S.tdBase}>
                      <div style={{ display: "flex", gap: 7 }}>
                        {/* Present */}
                        <button
                          onClick={() =>
                            setAttendance((prev) => ({
                              ...prev,
                              [s.id]: prev[s.id] === "present" ? null : "present",
                            }))
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 14px",
                            borderRadius: 7,
                            cursor: "pointer",
                            border:
                              status === "present"
                                ? "2px solid #10b981"
                                : "1.5px solid #d1fae5",
                            background:
                              status === "present" ? "#d1fae5" : "#f8f7ff",
                            color:
                              status === "present" ? "#059669" : "#9ca3af",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                            boxShadow:
                              status === "present"
                                ? "0 2px 8px rgba(16,185,129,0.18)"
                                : "none",
                          }}
                        >
                          <CheckCircle2 size={12} /> Present
                        </button>
                        {/* Absent */}
                        <button
                          onClick={() =>
                            setAttendance((prev) => ({
                              ...prev,
                              [s.id]: prev[s.id] === "absent" ? null : "absent",
                            }))
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 14px",
                            borderRadius: 7,
                            cursor: "pointer",
                            border:
                              status === "absent"
                                ? "2px solid #ef4444"
                                : "1.5px solid #fee2e2",
                            background:
                              status === "absent" ? "#fee2e2" : "#f8f7ff",
                            color:
                              status === "absent" ? "#dc2626" : "#9ca3af",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                            boxShadow:
                              status === "absent"
                                ? "0 2px 8px rgba(239,68,68,0.18)"
                                : "none",
                          }}
                        >
                          <XCircle size={12} /> Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #ede9fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Showing 1–{filtered.length} of {students.length} students
            {markedCount > 0 && (
              <span
                style={{ marginLeft: 10, color: "#7c3aed", fontWeight: 700 }}
              >
                • {markedCount}/{students.length} marked
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onBack}
              style={{
                padding: "8px 20px",
                borderRadius: 9,
                border: "1px solid #ede9fe",
                background: "#fff",
                color: "#6b7280",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              disabled={markedCount === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 22px",
                borderRadius: 9,
                border: "none",
                background: saved
                  ? "linear-gradient(135deg,#10b981,#059669)"
                  : markedCount === 0
                    ? "linear-gradient(135deg,#d1d5db,#9ca3af)"
                    : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                color: "#fff",
                fontSize: 13,
                cursor: markedCount === 0 ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontFamily: "inherit",
                boxShadow:
                  markedCount > 0
                    ? "0 4px 14px rgba(124,58,237,0.3)"
                    : "none",
                transition: "background 0.3s",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={13} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={13} />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── StudentViewModal ─────────────────────────────────────────────────────────

function StudentViewModal({
  student,
  attendanceRecords,
  divisionName,
  onClose,
}: {
  student: Student;
  attendanceRecords: any[];
  divisionName: string;
  onClose: () => void;
}) {
  const studentHistory = useMemo(() => {
    return attendanceRecords.filter(
      (r) => String(r.student) === String(student.id)
    );
  }, [attendanceRecords, student.id]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: 520,
          overflow: "hidden",
          border: "1px solid #ede9fe",
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={student.initials} color="#7c3aed" size={42} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {student.name}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.9 }}>
                GR No: {student.grNo} · {divisionName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              width: 30,
              height: 30,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Today's Status */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#faf9ff",
              border: "1px solid #ede9fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
              Today's Status
            </span>
            <StatusBadge status={student.todayStatus} />
          </div>

          {/* Attendance History */}
          <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
            Attendance History ({studentHistory.length})
          </h4>

          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              border: "1px solid #ede9fe",
              borderRadius: 12,
            }}
          >
            {studentHistory.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No past attendance records found.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentHistory.map((rec, i) => (
                    <tr key={rec.id || i} style={{ borderBottom: "1px solid #f5f3ff" }}>
                      <td style={{ ...S.tdBase, fontSize: 12, color: "#4b5563" }}>
                        {rec.attendance_date}
                      </td>
                      <td style={S.tdBase}>
                        <StatusBadge
                          status={
                            rec.is_present ? "present" : rec.is_absent ? "absent" : "unmarked"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #f5f3ff",
            display: "flex",
            justifyContent: "flex-end",
            background: "#faf9ff",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 9,
              border: "1px solid #ede9fe",
              background: "#fff",
              color: "#6b7280",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Entry Point ─────────────────────────────────────────────────────────

export default function StudentAttendancePage() {
  const [view, setView]             = useState<View>("list");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [apiData, setApiData]       = useState<StudentAttendanceListResponse | null>(null);
  const [students, setStudents]     = useState<Student[]>([]);
  const [divisionName, setDivisionName] = useState("—");
  const [selectedDivId, setSelectedDivId] = useState<number | null>(null);
  const [rawAttendanceRecords, setRawAttendanceRecords] = useState<any[]>([]);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const [isAlreadyMarkedToday, setIsAlreadyMarkedToday] = useState(false);
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const localStorageKey = useMemo(() => {
    const divId = apiData?.division_id || "";
    return divId ? `attendance_marked_${divId}_${todayDateStr}` : "";
  }, [apiData, todayDateStr]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorageKey) {
      const marked = localStorage.getItem(localStorageKey);
      if (marked === "true") {
        setIsAlreadyMarkedToday(true);
      } else {
        setIsAlreadyMarkedToday(false);
      }
    }
  }, [localStorageKey]);

  // ── Fetch students ──────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async (targetDivId?: number) => {
    setLoading(true);
    setError(null);

    try {
      const [data, attendanceRecords] = await Promise.all([
        getStudentsForAttendance(targetDivId),
        getStudentAttendanceRecords(),
      ]);
      setApiData(data);
      setRawAttendanceRecords(attendanceRecords);
      setDivisionName(data.division_name);
      if (data.division_id) {
        setSelectedDivId(data.division_id);
      }

      const todayNorm = normalizeDate(new Date().toISOString().split("T")[0]);
      let hasMarkedToday = false;

      // Map API shape → internal Student shape
      const mapped: Student[] = data.students.map((s, idx) => {
        const match = attendanceRecords.find(
          (r) => String(r.student) === String(s.id) && normalizeDate(r.attendance_date) === todayNorm
        );

        let todayStatus: "present" | "absent" | "unmarked" = "unmarked";
        if (match) {
          hasMarkedToday = true;
          if (match.is_present) {
            todayStatus = "present";
          } else if (match.is_absent) {
            todayStatus = "absent";
          }
        }

        return {
          id:          String(s.id),
          grNo:        s.gr_no,
          name:        [s.name, s.surname].filter(Boolean).join(" "),
          initials:    getInitials(s.name, s.surname),
          color:       AVATAR_COLORS[idx % AVATAR_COLORS.length],
          todayStatus,
        };
      });

      setStudents(mapped);

      if (hasMarkedToday) {
        setIsAlreadyMarkedToday(true);
      } else {
        setIsAlreadyMarkedToday(false);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSelectDivision = (divId: number) => {
    setSelectedDivId(divId);
    fetchStudents(divId);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('${FONT_URL}');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchStudents(selectedDivId ?? undefined)} />
      ) : view === "list" ? (
        <>
          <StudentListView
            students={students}
            divisionName={divisionName}
            onMarkAttendance={() => setView("mark")}
            isAlreadyMarkedToday={isAlreadyMarkedToday}
            assignedDivisions={apiData?.assigned_divisions}
            selectedDivisionId={selectedDivId}
            onSelectDivision={handleSelectDivision}
            onViewStudent={(st) => setViewingStudent(st)}
          />
          {viewingStudent && (
            <StudentViewModal
              student={viewingStudent}
              attendanceRecords={rawAttendanceRecords}
              divisionName={divisionName}
              onClose={() => setViewingStudent(null)}
            />
          )}
        </>
      ) : (
        <MarkAttendanceView
          students={students}
          divisionName={divisionName}
          onBack={() => setView("list")}
          localStorageKey={localStorageKey}
          onMarkedSuccess={() => setIsAlreadyMarkedToday(true)}
        />
      )}
    </>
  );
}