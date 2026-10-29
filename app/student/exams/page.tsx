"use client";

import { StudentEmptyState } from "@/components/student/student-empty-state";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  FileText,
  BookmarkCheck,
  FlaskConical,
  Calculator,
  Globe,
  ChevronRight,
  CheckCircle2,
  MapPin,
  X,
  Printer,
  Building,
  Info,
} from "lucide-react";
import QRCode from "qrcode";
import { getStudentExams } from "@/lib/student";
import { getSubjects } from "@/lib/clerk";
import { getCurrentUserProfile } from "@/lib/current-user";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { StudentExam } from "@/types/student";
import type { Subject } from "@/types/clerk";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Robust Date Normalization & Helpers
// ─────────────────────────────────────────────
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

function formatDateOnly(dateStr?: string | null): string {
  const d = parseToDate(dateStr);
  if (!d) return dateStr || "Date TBA";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDisplayDate(dateStr?: string | null): string {
  const d = parseToDate(dateStr);
  if (!d) return dateStr || "Date TBA";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDayOfWeek(dateStr?: string | null): string {
  const d = parseToDate(dateStr);
  if (!d) return "--";
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function formatExamTime(timeStr?: string | null): string {
  if (!timeStr) return "--:--";
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
}

function formatSeatNumber(seat?: string | null): string {
  if (!seat) return "Seat #001";
  const trimmed = String(seat).trim();
  const clean = trimmed.replace(/^(seat\s*#?|#)+/i, "").trim();
  return clean ? `Seat #${clean}` : trimmed;
}

function resolveFullUrl(url?: string | null): string {
  if (!url) return "/logo.png";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

// ─────────────────────────────────────────────
// Subject Theme Matcher (Icons and Soft Colors)
// ─────────────────────────────────────────────
function getSubjectTheme(subjectName: string = "") {
  const name = subjectName.toLowerCase();
  if (name.includes("sci") || name.includes("bio") || name.includes("chem") || name.includes("phy")) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
      Icon: FlaskConical,
    };
  }
  if (name.includes("math") || name.includes("calc") || name.includes("algebra") || name.includes("stat")) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
      Icon: Calculator,
    };
  }
  if (name.includes("soc") || name.includes("hist") || name.includes("geo") || name.includes("civ") || name.includes("world")) {
    return {
      bg: "bg-sky-50",
      text: "text-sky-600",
      border: "border-sky-100",
      Icon: Globe,
    };
  }
  return {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-100",
    Icon: BookOpen,
  };
}

type FilterTab = "all" | "upcoming" | "today" | "completed";

export default function StudentExamsPage() {
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedExam, setSelectedExam] = useState<StudentExam | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [examsRes, subjectsRes, profileRes, studentRes] = await Promise.allSettled([
        getStudentExams(),
        getSubjects(),
        getCurrentUserProfile().catch(() => null),
        fetchWithAuth(`${API_BASE_URL}/studentget/my_profile/`)
          .then((r) => (r.ok ? r.json() : fetchWithAuth(`${API_BASE_URL}/studentget/me/`).then((r2) => (r2.ok ? r2.json() : null))))
          .catch(() => null),
      ]);

      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value);
      } else {
        throw new Error(examsRes.reason?.message || "Failed to load exam timetable.");
      }

      if (subjectsRes.status === "fulfilled") {
        setSubjects(subjectsRes.value);
      } else {
        setSubjects([
          { id: 1, name: "maths", division: null },
          { id: 2, name: "science", division: null },
          { id: 3, name: "english", division: null },
        ]);
      }

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value);
      }

      if (studentRes.status === "fulfilled" && studentRes.value) {
        setStudentData(studentRes.value);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong loading your exam timetable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map subject ID to readable name string
  const resolveSubjectName = useCallback((subjectId: number | null): string => {
    if (!subjectId) return "General Subject";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : `Subject #${subjectId}`;
  }, [subjects]);

  // Today string in normalized YMD format
  const todayYMD = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);

  // Compute 4 summary statistics
  const stats = useMemo(() => {
    const total = exams.length;
    let upcoming = 0;
    let today = 0;
    let completed = 0;

    exams.forEach((ex) => {
      const ymd = normalizeDateToYMD(ex.exam_date);
      if (!ymd) {
        upcoming++;
      } else if (ymd === todayYMD) {
        today++;
      } else if (ymd > todayYMD) {
        upcoming++;
      } else {
        completed++;
      }
    });

    return { total, upcoming, today, completed };
  }, [exams, todayYMD]);

  // Filtered Exam List based on Tab & Search Query
  const filteredExams = useMemo(() => {
    return exams.filter((ex) => {
      const ymd = normalizeDateToYMD(ex.exam_date);
      
      // Tab matching
      if (activeTab === "upcoming") {
        if (!ymd || ymd <= todayYMD) return false;
      } else if (activeTab === "today") {
        if (ymd !== todayYMD) return false;
      } else if (activeTab === "completed") {
        if (!ymd || ymd >= todayYMD) return false;
      }

      // Search matching
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const subName = (ex.subject_name || resolveSubjectName(ex.subject)).toLowerCase();
      const title = (ex.title || "").toLowerCase();
      const desc = (ex.description || "").toLowerCase();
      const room = (ex.room_number || "").toLowerCase();
      const classGrp = (ex.class_group_name || "").toLowerCase();

      return (
        title.includes(query) ||
        subName.includes(query) ||
        desc.includes(query) ||
        room.includes(query) ||
        classGrp.includes(query)
      );
    });
  }, [exams, activeTab, searchQuery, todayYMD, resolveSubjectName]);

  // Generate QR code whenever selectedExam changes
  useEffect(() => {
    if (!selectedExam) {
      setQrCodeUrl("");
      return;
    }
    const rollNo = studentData?.roll_no || "8A017";
    const qrData = `HALL-TICKET:${rollNo}:${selectedExam.title}:${selectedExam.exam_date}`;
    QRCode.toDataURL(qrData, { width: 140, margin: 1 })
      .then((url) => setQrCodeUrl(url))
      .catch(() => setQrCodeUrl(""));
  }, [selectedExam, studentData]);

  // Student & School derived data
  const studentName = useMemo(() => {
    if (studentData?.full_name) return studentData.full_name;
    if (studentData?.name) return `${studentData.name} ${studentData.surname || ""}`.trim();
    if (profile?.name) return profile.name;
    return "Yujj Jin Itadori";
  }, [studentData, profile]);

  const rollNumber = useMemo(() => studentData?.roll_no || "8A017", [studentData]);
  
  const classDivision = useMemo(() => {
    if (studentData?.class_name) {
      return `${studentData.class_name}${studentData.division ? ` - ${studentData.division}` : ""}`;
    }
    return selectedExam?.class_group_name || "Class 8 - A";
  }, [studentData, selectedExam]);

  const admissionNumber = useMemo(() => studentData?.gr_no || "BFIS20240017", [studentData]);
  
  const dateOfBirth = useMemo(() => {
    return studentData?.date_of_birth ? formatDateOnly(studentData.date_of_birth) : "14 Nov 2010";
  }, [studentData]);

  const academicYear = useMemo(() => studentData?.academic_year_name || "2026 - 2027", [studentData]);
  
  // Real School logo provided in the system records
  const activeSchoolLogo = useMemo(() => {
    if (profile?.school?.logo) return profile.school.logo;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("school_logo");
      if (stored) return stored;
    }
    return "/logo.png";
  }, [profile]);

  const schoolName = useMemo(() => {
    return (
      profile?.school?.name ||
      (typeof window !== "undefined" ? localStorage.getItem("school_name") : null) ||
      "BRIGHT FUTURE INTERNATIONAL SCHOOL"
    );
  }, [profile]);

  const schoolAddress = useMemo(() => {
    const parts = [
      profile?.school?.address,
      profile?.school?.city,
      profile?.school?.state ? `${profile.school.state}${profile.school.pincode ? ` - ${profile.school.pincode}` : ""}` : profile?.school?.pincode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Near Navyug School, Naroda, Ahmedabad - 382330";
  }, [profile]);

  const schoolContact = useMemo(() => {
    const phone = profile?.school?.phone || "7984649969";
    const email = profile?.school?.email || "info@brightfutureschool.in";
    return `Phone: ${phone} | Email: ${email}`;
  }, [profile]);

  const photoUrl = useMemo(() => studentData?.photo_url || profile?.avatar || "/images/student-avatar.svg", [studentData, profile]);

  // ─────────────────────────────────────────────
  // Dynamic Signatures Loaded from School / Staff Records
  // ─────────────────────────────────────────────
  const clerkSignature = useMemo(() => {
    const fromProfile = (profile?.school as any)?.clerk_signature;
    const fromStudent = studentData?.clerk_signature;
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("clerk_signature") : null;
    return fromProfile || fromStudent || fromStorage || "/images/sig-clerk.svg";
  }, [profile, studentData]);

  const clerkName = useMemo(() => {
    return (
      (profile?.school as any)?.clerk_name ||
      studentData?.verified_by_name ||
      studentData?.class_teacher_name ||
      "Mrs. R. Sharma"
    );
  }, [profile, studentData]);

  const clerkTitle = useMemo(() => "Clerk / Class Teacher", []);

  const principalSignature = useMemo(() => {
    const fromProfile = (profile?.school as any)?.principal_signature;
    const fromStudent = studentData?.principal_signature;
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("principal_signature") : null;
    return fromProfile || fromStudent || fromStorage || "/images/sig-principal.svg";
  }, [profile, studentData]);

  const principalName = useMemo(() => {
    return (
      (profile?.school as any)?.principal_name ||
      "Dr. P. K. Mehta"
    );
  }, [profile]);

  // Related schedule rows for the examination table
  const scheduleRows = useMemo(() => {
    if (!selectedExam) return [];
    const related = exams.filter(
      (e) =>
        e.class_group === selectedExam.class_group ||
        e.title.toLowerCase().trim() === selectedExam.title.toLowerCase().trim()
    );
    const sorted = (related.length > 0 ? related : [selectedExam]).sort((a, b) =>
      (a.exam_date || "") > (b.exam_date || "") ? 1 : -1
    );
    return sorted;
  }, [selectedExam, exams]);

  const examPeriod = useMemo(() => {
    if (scheduleRows.length > 1) {
      const firstDate = scheduleRows[0]?.exam_date;
      const lastDate = scheduleRows[scheduleRows.length - 1]?.exam_date;
      if (firstDate && lastDate && firstDate !== lastDate) {
        return `${formatDateOnly(firstDate)} – ${formatDateOnly(lastDate)}`;
      }
    }
    return selectedExam?.exam_date ? formatDateOnly(selectedExam.exam_date) : "Academic Schedule 2026";
  }, [scheduleRows, selectedExam]);

  // Clean seat number formatting
  const seatDisplay = useMemo(() => {
    return formatSeatNumber(selectedExam?.seat_number || (selectedExam?.room_number ? selectedExam.room_number : "Seat #001"));
  }, [selectedExam]);

  // Print function generating official Hall Ticket with School Logo, Exam Class, and Dynamic Signatures
  const handlePrint = useCallback(() => {
    if (!selectedExam) return;

    const printWindow = window.open("", "_blank", "width=920,height=850");
    if (!printWindow) {
      window.print();
      return;
    }

    const tableRowsHtml = scheduleRows
      .map(
        (ex) => `
        <tr>
          <td>${formatDateOnly(ex.exam_date)}</td>
          <td>${formatDayOfWeek(ex.exam_date)}</td>
          <td><strong>${ex.subject_name || resolveSubjectName(ex.subject)}</strong></td>
          <td>
            <span class="class-badge">
              ${ex.class_group_name || classDivision || "Class 8 - A"}
            </span>
          </td>
          <td>${formatExamTime(ex.start_time)} – ${formatExamTime(ex.end_time)}</td>
          <td style="text-align: center; font-weight: bold; color: #1d4ed8;">${ex.room_number ? (ex.building_block ? `${ex.room_number} (${ex.building_block})` : ex.room_number) : "R-101"}</td>
          <td style="text-align: center;">
            <div style="border-bottom: 1px dotted #94a3b8; width: 70%; margin: 8px auto 0 auto;"></div>
          </td>
        </tr>
      `
      )
      .join("");

    const fullLogoUrl = resolveFullUrl(activeSchoolLogo);
    const fullClerkSig = resolveFullUrl(clerkSignature);
    const fullPrincipalSig = resolveFullUrl(principalSignature);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hall Ticket - ${studentName} - ${selectedExam.title}</title>
          <meta charset="utf-8" />
          <base href="${window.location.origin}" />
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .hall-ticket-container {
              width: 100%;
              max-width: 820px;
              margin: 0 auto;
              padding: 22px 24px;
              border: 1.5px solid #cbd5e1;
              border-radius: 16px;
              background: #ffffff;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 12px;
            }
            .school-logo {
              width: 72px;
              height: 72px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              padding: 4px;
              background: #ffffff;
            }
            .school-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .school-info {
              flex: 1;
              text-align: center;
            }
            .school-name {
              font-size: 19px;
              font-weight: 900;
              color: #1e3a8a;
              margin: 0 0 3px 0;
              letter-spacing: 0.5px;
            }
            .school-address {
              font-size: 11px;
              color: #475569;
              margin: 0 0 2px 0;
            }
            .school-contact {
              font-size: 10.5px;
              color: #64748b;
              margin: 0;
            }
            .badge-box {
              background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
              color: #ffffff;
              padding: 10px 18px;
              border-radius: 12px;
              text-align: center;
              min-width: 170px;
              box-shadow: 0 2px 8px rgba(29, 78, 216, 0.2);
            }
            .badge-title {
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 1.2px;
            }
            .badge-exam {
              font-size: 12px;
              font-weight: 700;
              margin-top: 2px;
              letter-spacing: 0.5px;
            }
            .badge-academic {
              font-size: 10px;
              opacity: 0.92;
              margin-top: 2px;
            }
            .divider {
              border: none;
              border-top: 1.5px solid #e2e8f0;
              margin: 12px 0 16px 0;
            }
            .student-section {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
              margin-bottom: 18px;
              padding: 0 4px;
            }
            .details-table {
              flex: 1;
              display: grid;
              grid-template-columns: 145px 12px 1fr;
              row-gap: 5.5px;
              font-size: 12px;
            }
            .label {
              color: #64748b;
              font-weight: 600;
            }
            .colon {
              color: #94a3b8;
              font-weight: bold;
            }
            .val {
              color: #0f172a;
              font-weight: 700;
            }
            .student-photo-box {
              width: 95px;
              height: 118px;
              border: 1.5px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              flex-shrink: 0;
              background: #f8fafc;
            }
            .student-photo-box img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .qr-box {
              display: flex;
              flex-direction: column;
              align-items: center;
              flex-shrink: 0;
              width: 95px;
            }
            .qr-box img {
              width: 82px;
              height: 82px;
            }
            .qr-caption {
              font-size: 11px;
              font-weight: bold;
              font-family: monospace;
              color: #334155;
              margin-top: 2px;
            }
            .exam-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 18px;
              font-size: 11.5px;
            }
            .exam-table th {
              background: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              padding: 8px 10px;
              text-align: left;
              border: 1px solid #cbd5e1;
            }
            .exam-table td {
              padding: 7.5px 10px;
              border: 1px solid #cbd5e1;
              color: #334155;
            }
            .exam-table tr:nth-child(even) td {
              background: #f8fafc;
            }
            .class-badge {
              display: inline-block;
              font-weight: 700;
              color: #1e3a8a;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 6px;
              padding: 2.5px 7px;
              font-size: 11px;
            }
            .bottom-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 20px;
              margin-top: 14px;
            }
            .instructions-box {
              flex: 1;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 10px;
              padding: 10px 14px;
            }
            .instructions-title {
              font-size: 11px;
              font-weight: 800;
              color: #1d4ed8;
              margin-bottom: 5px;
            }
            .instructions-list {
              margin: 0;
              padding-left: 18px;
              font-size: 9.5px;
              color: #1e3a8a;
              line-height: 1.45;
            }
            .signatures-box {
              display: flex;
              gap: 32px;
              flex-shrink: 0;
            }
            .signature-item {
              text-align: center;
              width: 125px;
            }
            .signature-wrapper {
              height: 42px;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding-bottom: 2px;
            }
            .signature-img {
              max-width: 110px;
              max-height: 40px;
              object-fit: contain;
            }
            .signature-line {
              border-top: 1.5px solid #475569;
              padding-top: 4px;
              margin-top: 4px;
            }
            .signatory-name {
              font-size: 11px;
              font-weight: 700;
              color: #1e3a8a;
              line-height: 1.2;
            }
            .signatory-role {
              font-size: 10px;
              font-weight: 600;
              color: #475569;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="hall-ticket-container">
            <!-- Header -->
            <div class="header">
              <div class="school-logo">
                <img src="${fullLogoUrl}" alt="${schoolName}" onerror="this.onerror=null; this.src='${window.location.origin}/logo.png';" />
              </div>
              <div class="school-info">
                <h1 class="school-name">${schoolName.toUpperCase()}</h1>
                <p class="school-address">${schoolAddress}</p>
                <p class="school-contact">${schoolContact}</p>
              </div>
              <div class="badge-box">
                <div class="badge-title">HALL TICKET</div>
                <div class="badge-exam">${selectedExam.title.toUpperCase()}</div>
                <div class="badge-academic">Academic Year: ${academicYear}</div>
              </div>
            </div>

            <hr class="divider" />

            <!-- Student Info Section -->
            <div class="student-section">
              <div class="details-table">
                <span class="label">Student Name</span>
                <span class="colon">:</span>
                <span class="val">${studentName}</span>

                <span class="label">Roll Number</span>
                <span class="colon">:</span>
                <span class="val">${rollNumber}</span>

                <span class="label">Class & Division</span>
                <span class="colon">:</span>
                <span class="val">${classDivision}</span>

                <span class="label">Admission Number</span>
                <span class="colon">:</span>
                <span class="val">${admissionNumber}</span>

                <span class="label">Date of Birth</span>
                <span class="colon">:</span>
                <span class="val">${dateOfBirth}</span>

                <span class="label">Exam Type</span>
                <span class="colon">:</span>
                <span class="val">${selectedExam.title}</span>

                <span class="label">Exam Period</span>
                <span class="colon">:</span>
                <span class="val">${examPeriod}</span>

                <span class="label">Seat Number</span>
                <span class="colon">:</span>
                <span class="val" style="color: #16a34a;">${seatDisplay}</span>
              </div>

              <div class="student-photo-box">
                <img src="${photoUrl}" alt="${studentName}" />
              </div>

              <div class="qr-box">
                <img src="${qrCodeUrl}" alt="QR Code" />
                <div class="qr-caption">${rollNumber}</div>
              </div>
            </div>

            <!-- Examination Schedule Table With Exam Class -->
            <table class="exam-table">
              <thead>
                <tr>
                  <th style="width: 14%;">Date</th>
                  <th style="width: 9%;">Day</th>
                  <th style="width: 25%;">Subject</th>
                  <th style="width: 16%;">Exam Class</th>
                  <th style="width: 18%;">Time</th>
                  <th style="width: 10%; text-align: center;">Room No.</th>
                  <th style="width: 8%; text-align: center;">Signature</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <!-- Bottom Section With Dynamic Clerk & Principal Signatures -->
            <div class="bottom-section">
              <div class="instructions-box">
                <div class="instructions-title">ℹ Important Instructions:</div>
                <ol class="instructions-list">
                  <li>This hall ticket is mandatory to appear for the examination.</li>
                  <li>Reach the examination center at least 30 minutes before the exam time.</li>
                  <li>Carry your school ID card along with this hall ticket.</li>
                  <li>Do not bring mobile phones, smart watches, or any electronic devices.</li>
                  <li>Follow all examination rules and instructions given by the invigilator.</li>
                  <li>Maintain discipline and be seated in the allotted room and exam class only.</li>
                </ol>
              </div>

              <div class="signatures-box">
                <div class="signature-item">
                  <div class="signature-wrapper">
                    <img src="${fullClerkSig}" alt="${clerkTitle}" class="signature-img" onerror="this.onerror=null; this.src='${window.location.origin}/images/sig-clerk.svg';" />
                  </div>
                  <div class="signature-line">
                    <div class="signatory-name">${clerkName}</div>
                    <div class="signatory-role">${clerkTitle}</div>
                  </div>
                </div>
                <div class="signature-item">
                  <div class="signature-wrapper">
                    <img src="${fullPrincipalSig}" alt="Principal" class="signature-img" onerror="this.onerror=null; this.src='${window.location.origin}/images/sig-principal.svg';" />
                  </div>
                  <div class="signature-line">
                    <div class="signatory-name">${principalName}</div>
                    <div class="signatory-role">Principal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <script>
            function triggerPrint() {
              window.focus();
              window.print();
            }
            if (document.readyState === 'complete') {
              setTimeout(triggerPrint, 350);
            } else {
              window.addEventListener('load', function() {
                setTimeout(triggerPrint, 350);
              });
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.warn("Print trigger:", e);
      }
    }, 500);
  }, [
    selectedExam,
    scheduleRows,
    studentName,
    rollNumber,
    classDivision,
    admissionNumber,
    dateOfBirth,
    academicYear,
    schoolName,
    schoolAddress,
    schoolContact,
    activeSchoolLogo,
    photoUrl,
    qrCodeUrl,
    examPeriod,
    seatDisplay,
    clerkSignature,
    clerkName,
    clerkTitle,
    principalSignature,
    principalName,
    resolveSubjectName,
  ]);

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. Hero Card: White BG with Upper Header in Single Line & Left Paragraph
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1 min-w-0 z-10">
          {/* Upper Header in a Single Line */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarRange size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              Exam Timetable & Schedule
            </h1>
          </div>

          {/* Left Side Paragraph */}
          <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-3.5 font-medium leading-relaxed max-w-[260px] sm:max-w-md">
            View all scheduled examinations, hall tickets, timings, and venue details.
          </p>

          {/* Action Button */}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Sync Schedule</span>
          </button>
        </div>

        {/* 3D Education Books Illustration Aligned with Left Paragraph */}
        <div className="w-28 sm:w-36 md:w-44 shrink-0 flex items-center justify-end pointer-events-none select-none">
          <img
            src="/images/Books-with-calendar.png"
            alt="Examination Schedule"
            className="w-full h-auto object-contain filter drop-shadow-md"
          />
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. Summary Metric Cards (4 Cards in 2x2 Mobile / 4 in a Row Desktop)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Exams */}
        <motion.div
          onClick={() => setActiveTab("all")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarRange size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                TOTAL EXAMS
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
              {stats.total}
            </p>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
              All
            </span>
          </div>
        </motion.div>

        {/* Upcoming Exams */}
        <motion.div
          onClick={() => setActiveTab("upcoming")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                UPCOMING
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
              {stats.upcoming}
            </p>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600">
              To Attend
            </span>
          </div>
        </motion.div>

        {/* Today's Exams */}
        <motion.div
          onClick={() => setActiveTab("today")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <BookmarkCheck size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                TODAY'S EXAMS
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {stats.today}
            </p>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
              Today
            </span>
          </div>
        </motion.div>

        {/* Completed Exams */}
        <motion.div
          onClick={() => setActiveTab("completed")}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[135px] sm:min-h-[145px] shadow-2xs hover:border-slate-200 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-slate-500">
                COMPLETED
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {stats.completed}
            </p>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
              Finished
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Filter Navigation Tabs & Search Input Row
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "all", label: "All Exams", count: stats.total },
            { id: "upcoming", label: "Upcoming", count: stats.upcoming },
            { id: "today", label: "Today", count: stats.today },
            { id: "completed", label: "Completed", count: stats.completed },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                type="button"
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-2xs",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "bg-white border border-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-extrabold",
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input Bar (Fully Rounded Pill) */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search exams by subject, title, room, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-white border border-slate-100 rounded-full pl-11 pr-4 text-xs sm:text-sm text-slate-700 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. Exam Cards: 3 in a Single Row on Desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
         ───────────────────────────────────────────────────────────── */}
      {isLoading && exams.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs animate-pulse space-y-4 flex flex-col justify-between h-[270px]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-slate-100 rounded-2xl" />
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-100 rounded-full w-20" />
                      <div className="h-4 bg-slate-100 rounded-full w-32" />
                    </div>
                  </div>
                  <div className="w-16 h-6 bg-slate-100 rounded-full" />
                </div>
                <div className="h-24 bg-slate-50 rounded-2xl" />
              </div>
              <div className="h-10 bg-slate-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-2xs text-center space-y-3 max-w-md mx-auto">
          <AlertCircle className="text-rose-500 h-8 w-8 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">Failed to load exam timetable</h3>
          <p className="text-xs text-rose-600">{error}</p>
          <button
            onClick={loadData}
            className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
          <StudentEmptyState
            title="No examinations found"
            description="There are currently no exams scheduled matching this filter. Check other tabs or consult your class teacher."
            imageClassName="w-36 sm:w-44"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredExams.map((ex, index) => {
              const readableSubject = ex.subject_name || resolveSubjectName(ex.subject);
              const theme = getSubjectTheme(readableSubject);
              const ThemeIcon = theme.Icon;
              const ymd = normalizeDateToYMD(ex.exam_date);
              const isToday = ymd === todayYMD;
              const isPast = ymd ? ymd < todayYMD : false;
              const paperClass = ex.class_group_name || classDivision;

              return (
                <motion.div
                  key={ex.id || index}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="bg-white rounded-3xl border border-slate-100 hover:border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all group h-full gap-3.5"
                >
                  <div className="space-y-3.5">
                    {/* Card Top: Subject Icon, Group Name, Title & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0 border ${theme.border} group-hover:scale-105 transition-transform`}
                        >
                          <ThemeIcon size={22} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                            {paperClass || "Class Examination"}
                          </span>
                          <h3
                            className="text-base font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-1 capitalize"
                            title={ex.title}
                          >
                            {ex.title}
                          </h3>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isToday ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          Today
                        </span>
                      ) : isPast ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                          Upcoming
                        </span>
                      )}
                    </div>

                    {/* Description (if provided) */}
                    {ex.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed" title={ex.description}>
                        {ex.description}
                      </p>
                    )}

                    {/* Tags Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", theme.bg, theme.text, theme.border)}>
                        <BookOpen size={13} />
                        <span>{readableSubject}</span>
                      </span>

                      {paperClass && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-100">
                          <Building size={13} className="text-slate-400" />
                          <span>{paperClass}</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Details Box */}
                    <div className="bg-slate-50/80 border border-slate-100/90 rounded-2xl p-3.5 space-y-2.5 text-xs">
                      {/* Date */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <Calendar size={13} className="text-blue-500" />
                          Exam Date
                        </span>
                        <span className="text-slate-700 font-bold">
                          {formatDisplayDate(ex.exam_date)}
                        </span>
                      </div>

                      {/* Time */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <Clock size={13} className="text-blue-500" />
                          Time
                        </span>
                        <span className="text-slate-700 font-bold">
                          {formatExamTime(ex.start_time)} – {formatExamTime(ex.end_time)}
                        </span>
                      </div>

                      {/* Which Class They Go (Exam Class) */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <Building size={13} className="text-blue-500" />
                          Exam Class
                        </span>
                        <span className="text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 text-[11px]">
                          {paperClass}
                        </span>
                      </div>

                      {/* Room & Seat */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <MapPin size={13} className="text-blue-500" />
                          Room
                        </span>
                        <span className="text-blue-600 font-bold font-mono text-[11px] bg-white px-2.5 py-0.5 rounded-full border border-slate-100">
                          {ex.room_number ? `${ex.room_number}${ex.building_block ? ` (${ex.building_block})` : ""}` : "Allocated Hall"}
                        </span>
                      </div>

                      {ex.seat_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Allocated Seat</span>
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold font-mono text-[10px] border border-emerald-100">
                            {formatSeatNumber(ex.seat_number)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Button (Fully Rounded & Covering Width) */}
                  <div className="pt-1 mt-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedExam(ex)}
                      className="w-full py-2.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <FileText size={14} className="text-blue-600" />
                      <span>View & Print Hall Ticket</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. Full-Screen Mobile Detail & Official Hall Ticket Modal
         ───────────────────────────────────────────────────────────── */}
      {selectedExam && (
        <div
          className="fixed inset-0 z-50 bg-black/60 sm:bg-slate-900/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden"
          onClick={() => setSelectedExam(null)}
        >
          <div
            className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CalendarRange size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Official Hall Ticket & Schedule
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {schoolName} • {academicYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Live Official Hall Ticket Preview Matching Reference Design */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar bg-slate-50/50">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
                {/* Official Header Banner with Provided School Logo */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                      <img
                        src={activeSchoolLogo}
                        alt={schoolName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-blue-900 uppercase tracking-tight">
                        {schoolName}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {schoolAddress}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {schoolContact}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-center shrink-0 shadow-sm shadow-blue-500/20 w-full sm:w-auto">
                    <span className="block text-xs font-black tracking-wider uppercase">HALL TICKET</span>
                    <strong className="block text-sm font-extrabold uppercase mt-0.5">{selectedExam.title}</strong>
                    <span className="block text-[10px] opacity-85 mt-0.5">Academic Year: {academicYear}</span>
                  </div>
                </div>

                {/* Student Info, Photo & QR Code */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs flex-1 w-full">
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Student Name</span>
                      <strong className="text-slate-900 font-extrabold text-sm block mt-0.5">{studentName}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Roll Number</span>
                      <strong className="text-slate-800 font-bold block mt-0.5 font-mono">{rollNumber}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Class & Division</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{classDivision}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Admission / GR No</span>
                      <strong className="text-slate-800 font-bold block mt-0.5 font-mono">{admissionNumber}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Date of Birth</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{dateOfBirth}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Exam Period</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{examPeriod}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Allocated Seat</span>
                      <strong className="text-emerald-700 font-bold block mt-0.5 font-mono">
                        {seatDisplay}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-center">
                    {/* Student Photo */}
                    <div className="w-20 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                      <img src={photoUrl} alt={studentName} className="w-full h-full object-cover" />
                    </div>

                    {/* QR Code */}
                    {qrCodeUrl && (
                      <div className="flex flex-col items-center shrink-0">
                        <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
                        <span className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">{rollNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Examination Schedule Table With Exam Class */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold">
                        <th className="p-2.5 border-b border-r border-slate-200">Date</th>
                        <th className="p-2.5 border-b border-r border-slate-200">Day</th>
                        <th className="p-2.5 border-b border-r border-slate-200">Subject</th>
                        <th className="p-2.5 border-b border-r border-slate-200">Exam Class</th>
                        <th className="p-2.5 border-b border-r border-slate-200">Time</th>
                        <th className="p-2.5 border-b border-r border-slate-200 text-center">Room No.</th>
                        <th className="p-2.5 border-b border-slate-200 text-center">Invigilator Sign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {scheduleRows.map((ex, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/70" : ""}>
                          <td className="p-2.5 border-r border-slate-200 font-medium text-slate-700">
                            {formatDateOnly(ex.exam_date)}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-slate-600">
                            {formatDayOfWeek(ex.exam_date)}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                            {ex.subject_name || resolveSubjectName(ex.subject)}
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <Building size={11} className="text-blue-500 shrink-0" />
                              <span>{ex.class_group_name || classDivision}</span>
                            </span>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-slate-600 font-mono text-[11px]">
                            {formatExamTime(ex.start_time)} – {formatExamTime(ex.end_time)}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-blue-600 font-mono">
                            {ex.room_number ? (ex.building_block ? `${ex.room_number} (${ex.building_block})` : ex.room_number) : "R-101"}
                          </td>
                          <td className="p-2.5 text-center text-slate-300">
                            —
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Instructions & Dynamic Signatures (Clerk & Principal) */}
                <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pt-2">
                  <div className="flex-1 bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-900 space-y-1.5 w-full">
                    <span className="font-bold flex items-center gap-1 text-blue-800">
                      <Info size={13} /> Important Instructions:
                    </span>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[10px] leading-relaxed text-blue-900/90">
                      <li>This hall ticket is mandatory to appear for the examination.</li>
                      <li>Reach the examination center at least 30 minutes before the exam time.</li>
                      <li>Carry your school ID card along with this hall ticket.</li>
                      <li>Do not bring mobile phones, smart watches, or any electronic devices.</li>
                      <li>Follow all examination rules and instructions given by the invigilator.</li>
                      <li>Maintain discipline and be seated in the allotted room and exam class only.</li>
                    </ol>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 self-center sm:self-end pt-3 sm:pt-0">
                    {/* Dynamic Clerk / Teacher Signature */}
                    <div className="text-center w-28">
                      <div className="h-10 flex items-end justify-center pb-1">
                        <img
                          src={clerkSignature}
                          alt={clerkTitle}
                          className="max-w-[100px] max-h-9 object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/images/sig-clerk.svg";
                          }}
                        />
                      </div>
                      <div className="border-t border-slate-300 pt-1">
                        <span className="block text-[11px] font-bold text-blue-900 leading-tight">
                          {clerkName}
                        </span>
                        <span className="block text-[9.5px] font-semibold text-slate-500 mt-0.5">
                          {clerkTitle}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Principal Signature */}
                    <div className="text-center w-28">
                      <div className="h-10 flex items-end justify-center pb-1">
                        <img
                          src={principalSignature}
                          alt="Principal"
                          className="max-w-[100px] max-h-9 object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/images/sig-principal.svg";
                          }}
                        />
                      </div>
                      <div className="border-t border-slate-300 pt-1">
                        <span className="block text-[11px] font-bold text-blue-900 leading-tight">
                          {principalName}
                        </span>
                        <span className="block text-[9.5px] font-semibold text-slate-500 mt-0.5">
                          Principal
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Bottom Single-Row Full-Width Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all text-center flex items-center justify-center cursor-pointer shadow-2xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Official Hall Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}