"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CreditCard,
  Bell,
  User,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  AlertTriangle,
  BellRing,
  ArrowRight,
  Megaphone,
  CalendarDays,
  CheckSquare,
  Banknote,
  Printer,
  ShieldCheck,
  Star,
  BookOpen,
  X,
  Layers,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getWebSocketUrl, API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { registerPushSilently, listenToForegroundMessages } from "@/lib/firebase";
import {
  ChildProfile,
  getParentChildren,
  getParentExamNotifications,
  getParentMonthlyReports,
  getParentAttendanceNotifications,
  getParentChildResults,
  AttendanceNotificationItem,
} from "@/lib/parent";
import { ResultCardPreview } from "@/components/results/result-card-preview";
import { writePrintableResultCards } from "@/lib/result-report-print";
import { downloadResultPreviewPDF } from "@/lib/result-dom-pdf";
import { getSavedResultTemplate, type ResultTemplateId } from "@/lib/result-template";
import { getSchoolProfile } from "@/lib/school-profile";
import { capitalizeWords, capitalizeSentence, formatSubjectName, formatGrade } from "@/lib/utils";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNotificationTime(value?: string) {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const toneClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600 border-blue-100",
  green: "bg-emerald-100 text-emerald-600 border-emerald-100",
  purple: "bg-violet-100 text-violet-600 border-violet-100",
  sky: "bg-sky-100 text-sky-600 border-sky-100",
  amber: "bg-amber-100 text-amber-600 border-amber-100",
  rose: "bg-rose-100 text-rose-600 border-rose-100",
};

const shortcuts = [
  { label: "Child Attendance", note: "Daily punch logs", href: "/parent/attendance", icon: Clock, tone: "blue" },
  { label: "Child Marksheet", note: "Term evaluations", href: "/parent/marksheets", icon: Award, tone: "blue" },
  { label: "Fee Summary", note: "Counter & invoices", href: "#fee-summary", icon: CreditCard, tone: "amber" },
  { label: "School Notices", note: "Bulletins & alerts", href: "/parent/announcements", icon: Megaphone, tone: "sky" },
  { label: "School Calendar", note: "Holidays & events", href: "/parent/events", icon: CalendarDays, tone: "green" },
  { label: "Certificates", note: "LC & Bonafide", href: "/parent/certificates", icon: FileText, tone: "rose" },
];

function ParentHeroIllustration() {
  return (
    <svg
      viewBox="0 0 380 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full object-contain"
    >
      <defs>
        <linearGradient id="parentGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="studentGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.2" />
        </linearGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#1E3A8A" floodOpacity="0.15" />
        </filter>
      </defs>

      <circle cx="210" cy="180" r="140" fill="url(#accentGlow)" />
      <circle cx="270" cy="90" r="45" fill="#E0E7FF" fillOpacity="0.6" />

      <g transform="translate(250, 40)" filter="url(#softShadow)">
        <rect x="0" y="0" width="72" height="72" rx="20" fill="#FFFFFF" />
        <path d="M36 20L18 29L36 38L54 29L36 20Z" fill="#4F46E5" />
        <path d="M24 33.5V45C24 49 29.4 52 36 52C42.6 52 48 49 48 45V33.5L36 39.5L24 33.5Z" fill="#6366F1" />
        <path d="M54 29V44" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="54" cy="45" r="2.5" fill="#F59E0B" />
      </g>

      <path d="M100 80L103 88L111 91L103 94L100 102L97 94L89 91L97 88L100 80Z" fill="#FBBF24" />
      <path d="M70 140L72 145L77 147L72 149L70 154L68 149L63 147L68 145L70 140Z" fill="#38BDF8" />
      <circle cx="310" cy="160" r="4" fill="#A855F7" />
      <circle cx="90" cy="210" r="3" fill="#EC4899" />

      <g filter="url(#softShadow)">
        <circle cx="160" cy="115" r="32" fill="#FED7AA" />
        <path d="M132 110C132 88 144 75 162 75C180 75 192 88 192 110C184 100 174 96 160 96C146 96 138 102 132 110Z" fill="#1E293B" />
        <rect x="145" y="108" width="13" height="9" rx="3" fill="none" stroke="#0F172A" strokeWidth="2.2" />
        <rect x="163" y="108" width="13" height="9" rx="3" fill="none" stroke="#0F172A" strokeWidth="2.2" />
        <line x1="158" y1="112" x2="163" y2="112" stroke="#0F172A" strokeWidth="2" />
        <path d="M154 130C157 134 165 134 168 130" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />

        <path d="M118 280C118 200 134 155 160 155C186 155 204 200 204 280" fill="url(#parentGrad1)" />
        <path d="M152 155L160 180L168 155" fill="#FFFFFF" />
        <path d="M160 180L160 250" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M190 190C205 205 220 220 230 250" stroke="#4338CA" strokeWidth="18" strokeLinecap="round" />
      </g>

      <g filter="url(#softShadow)">
        <circle cx="240" cy="165" r="28" fill="#FFEDD5" />
        <path d="M214 160C214 138 228 128 242 128C258 128 268 138 268 160C260 152 250 148 240 148C230 148 220 153 214 160Z" fill="#334155" />
        <circle cx="232" cy="163" r="2.5" fill="#0F172A" />
        <circle cx="248" cy="163" r="2.5" fill="#0F172A" />
        <path d="M235 175C238 180 244 180 247 175" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />

        <path d="M208 300C208 240 222 200 242 200C262 200 276 240 276 300" fill="url(#studentGrad1)" />
        <polygon points="242,200 236,212 248,212" fill="#FFFFFF" />
        <polygon points="242,212 240,240 242,245 244,240" fill="#FBBF24" />
        <path d="M222 215C216 230 215 260 216 285" stroke="#047857" strokeWidth="6" strokeLinecap="round" />

        <g transform="translate(225, 235) rotate(-5)">
          <path d="M5 12C14 8 26 8 35 12V34C26 30 14 30 5 34V12Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <path d="M35 12C44 8 56 8 65 12V34C56 30 44 30 35 34V12Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <path d="M35 12V34" stroke="#94A3B8" strokeWidth="2" />
          <line x1="12" y1="18" x2="28" y2="18" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="24" x2="26" y2="24" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="42" y1="18" x2="58" y2="18" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="42" y1="24" x2="56" y2="24" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [examNotices, setExamNotices] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [attendanceAlerts, setAttendanceAlerts] = useState<AttendanceNotificationItem[]>([]);
  const [childResults, setChildResults] = useState<any[]>([]);
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [parentName, setParentName] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // School branding for official marksheet and print
  const [schoolBrand, setSchoolBrand] = useState({
    name: "School",
    shortName: "",
    logo: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    establishmentYear: "",
    boardAffiliation: "",
    schoolCode: "",
    udiseCode: "",
    principalName: "",
    teacherName: "",
    principalSignature: "",
    teacherSignature: "",
    stamp: "",
  });
  const [resultTemplate, setResultTemplate] = useState<ResultTemplateId>("classic");

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user") || localStorage.getItem("username");
      if (stored) {
        if (stored.startsWith("{")) {
          const u = JSON.parse(stored);
          const raw = u.name || u.first_name || u.username || "";
          if (raw && !/^\d+$/.test(raw.trim()) && raw.trim().toLowerCase() !== "parent") {
            setParentName(raw.trim());
          }
        } else if (!/^\d+$/.test(stored.trim()) && stored.trim().toLowerCase() !== "parent") {
          setParentName(stored.trim());
        }
      }
      setSchoolBrand((brand) => ({
        ...brand,
        name: localStorage.getItem("school_name") || brand.name,
        logo: localStorage.getItem("school_logo") || "",
      }));
      setResultTemplate(getSavedResultTemplate());
    } catch {}

    Promise.allSettled([
      getSchoolProfile(),
      fetchWithAuth(`${API_BASE_URL}/me/`).then((r) => (r.ok ? r.json() : null)),
    ]).then(([brandingResult, meResult]) => {
      const branding = brandingResult.status === "fulfilled" ? brandingResult.value : null;
      const me = meResult.status === "fulfilled" ? meResult.value : null;
      const school = me?.school || me || {};
      setSchoolBrand((brand) => ({
        ...brand,
        name: branding?.school_full_name || school.name || brand.name,
        shortName: branding?.school_short_name || brand.shortName,
        logo: branding?.print_logo_url || branding?.main_logo_url || school.logo || brand.logo,
        tagline: branding?.tagline || brand.tagline,
        address:
          branding?.full_address ||
          [school.address, school.city, school.state, school.pincode].filter(Boolean).join(", ") ||
          brand.address,
        phone:
          (Array.isArray(branding?.phone_numbers) ? branding.phone_numbers[0] : branding?.phone_numbers) ||
          school.phone ||
          brand.phone,
        email: branding?.official_emails || school.email || brand.email,
        establishmentYear: branding?.establishment_year || brand.establishmentYear,
        boardAffiliation:
          (Array.isArray(branding?.board_affiliation)
            ? branding.board_affiliation.join(", ")
            : branding?.board_affiliation) || brand.boardAffiliation,
        schoolCode: branding?.school_code || school.school_code || school.index_no || brand.schoolCode,
        udiseCode: branding?.udise_code || school.udise_code || brand.udiseCode,
        principalName: school.principal_name || brand.principalName,
        teacherName: school.teacher_name || brand.teacherName,
        principalSignature: branding?.principal_signature_url || school.principal_signature || brand.principalSignature,
        teacherSignature: branding?.class_teacher_signature_url || school.teacher_signature || brand.teacherSignature,
        stamp: branding?.official_seal_url || school.stamp || brand.stamp,
      }));
    });
  }, []);

  const activeChild: ChildProfile | undefined = children[selectedChildIndex];

  // Resolve proper greeting name: if parent has a name, use it; otherwise use student's name + Parent
  const displayName = useMemo(() => {
    const cleanParent = parentName && !/^\d+$/.test(parentName.trim()) ? parentName.trim() : "";
    if (cleanParent && cleanParent.toLowerCase() !== "parent") {
      return cleanParent;
    }
    if (activeChild?.name) {
      const studentFullName = capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim());
      return `Parent of ${studentFullName}`;
    }
    return "Parent";
  }, [parentName, activeChild]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kids, exams, reports, attAlerts] = await Promise.all([
        getParentChildren().catch(() => []),
        getParentExamNotifications().catch(() => []),
        getParentMonthlyReports().catch(() => []),
        getParentAttendanceNotifications().catch(() => []),
      ]);

      setChildren(kids);
      setExamNotices(exams);
      setMonthlyReports(reports);
      setAttendanceAlerts(attAlerts);

      const currentKid = kids[selectedChildIndex] || kids[0];
      if (currentKid?.id) {
        const results = await getParentChildResults(currentKid.id).catch(() => []);
        setChildResults(results);
        if (results.length > 0) {
          const titles = Array.from(new Set(results.map((r: any) => r.exam_title || r.exam?.title))).filter(Boolean);
          if (titles.length > 0) {
            setSelectedExamTitle(String(titles[0]));
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedChildIndex]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // When changing child, reload child-specific results
  useEffect(() => {
    if (activeChild?.id) {
      getParentChildResults(activeChild.id)
        .then((res) => {
          setChildResults(res);
          const titles = Array.from(new Set(res.map((r: any) => r.exam_title || r.exam?.title))).filter(Boolean);
          if (titles.length > 0) {
            setSelectedExamTitle(String(titles[0]));
          } else {
            setSelectedExamTitle("");
          }
        })
        .catch(() => setChildResults([]));
    }
  }, [activeChild?.id]);

  // Connect to live attendance WebSocket
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    let socket: WebSocket | null = null;
    try {
      const wsUrl = getWebSocketUrl("ws/attendance/");
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.title || data.message) {
            const isAbsent =
              data.is_absent || (data.message || "").toLowerCase().includes("absent");
            if (isAbsent) {
              toast.error(`⚠️ Attendance Alert: ${data.message || "Student marked absent"}`, {
                description: data.title ? data.title.toUpperCase() : "Attendance Notice",
                duration: 10000,
              });
            } else {
              toast.info(`📋 Attendance Update: ${data.message}`, {
                description: data.title ? data.title.toUpperCase() : "Attendance Notice",
                duration: 6000,
              });
            }
            void loadData();
          }
        } catch (err) {
          console.warn("Failed to parse attendance ws packet:", err);
        }
      };
    } catch (wsErr) {
      console.warn("Attendance WS setup error:", wsErr);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [loadData]);

  // Automatically listen for real-time absence alerts
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("Notification" in window && Notification.permission === "granted") {
      registerPushSilently().catch(() => {});
    }

    const unsub = listenToForegroundMessages(() => {
      void loadData();
    });

    return () => {
      if (unsub) unsub();
    };
  }, [loadData]);

  // Check if active child has any recent absence notifications
  const latestAbsentNotice = useMemo(() => {
    if (!activeChild) return null;
    const notices = activeChild.notices || [];
    const fromChildNotices = notices.find(
      (n) =>
        n.is_absent ||
        (n.description || "").toLowerCase().includes("absent") ||
        (n.title || "").toLowerCase().includes("absent")
    );
    if (fromChildNotices) return fromChildNotices;

    const fromAttAlerts = attendanceAlerts.find(
      (a) =>
        (a.message || "").toLowerCase().includes("absent") ||
        (a.title || "").toLowerCase().includes("absent")
    );
    if (fromAttAlerts) {
      return {
        id: fromAttAlerts.id || "att_alert",
        title: fromAttAlerts.title,
        description: fromAttAlerts.message,
        created_at: fromAttAlerts.created_at,
        is_absent: true,
      };
    }
    return null;
  }, [activeChild, attendanceAlerts]);

  // Group real student exam results by exam title
  const examsGrouped = useMemo(() => {
    const map = new Map<string, any[]>();
    childResults.forEach((r: any) => {
      const title = r.exam_title || r.exam?.title || "Exam";
      if (!map.has(title)) map.set(title, []);
      map.get(title)!.push(r);
    });
    return map;
  }, [childResults]);

  const examTitles = useMemo(() => Array.from(examsGrouped.keys()), [examsGrouped]);

  const activeExamResults = useMemo(() => {
    if (!selectedExamTitle && examTitles.length > 0) {
      return examsGrouped.get(examTitles[0]) || [];
    }
    return examsGrouped.get(selectedExamTitle) || [];
  }, [examsGrouped, selectedExamTitle, examTitles]);

  // Current selected exam metrics
  const activeExamMetrics = useMemo(() => {
    if (activeExamResults.length === 0) {
      return { totalMax: 0, totalObtained: 0, percentage: 0, overallGrade: "—" };
    }
    const totalMax = activeExamResults.reduce(
      (s, r) => s + parseFloat(r.max_marks || r.exam?.max_marks || "0"),
      0
    );
    const totalObtained = activeExamResults.reduce(
      (s, r) => s + (r.is_absent ? 0 : parseFloat(r.marks_obtained || "0")),
      0
    );
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0.00";
    const numP = Number(percentage);
    const overallGrade =
      numP >= 90 ? "A+" : numP >= 75 ? "A" : numP >= 60 ? "B" : numP >= 40 ? "C" : "F";

    return { totalMax, totalObtained, percentage, overallGrade };
  }, [activeExamResults]);

  // Format subjects array for the official ResultCardPreview component
  const marksheetSubjects = useMemo(() => {
    return activeExamResults.map((r: any, idx: number) => {
      const rawSubj = r.subject_name || r.subject || r.exam?.subject?.name || `Subject #${idx + 1}`;
      return {
        subject: formatSubjectName(rawSubj),
        maximum: r.max_marks || r.exam?.max_marks || 100,
        obtained: r.is_absent ? "Absent" : (r.marks_obtained ?? 0),
        grade: formatGrade(r.grade) || (r.is_absent ? "F" : "—"),
        remarks: r.remarks ? capitalizeSentence(r.remarks) : "—",
        absent: r.is_absent,
      };
    });
  }, [activeExamResults]);

  // Print official marksheet using the Principal's exact writePrintableResultCards
  const handlePrintOfficialMarksheet = async () => {
    if (!activeChild || activeExamResults.length === 0) {
      toast.error("No published marksheet available to print.");
      return;
    }

    const printWindow = window.open("", "_blank", "popup,width=1100,height=850");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print marksheet.");
      return;
    }
    printWindow.document.write(
      "<!doctype html><html><body style='font:14px Arial;padding:32px;color:#334155'>Preparing official marksheet report card...</body></html>"
    );

    const activeTemplate =
      (activeExamResults[0]?.report_template as ResultTemplateId) || resultTemplate || "classic";

    await writePrintableResultCards({
      printWindow,
      students: [
        {
          studentId: activeChild.id,
          name: capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim()) || "Student",
          rollNumber: activeChild.roll_no,
          admissionNumber: activeChild.gr_no,
          className: capitalizeWords(activeChild.school_class_name || ""),
          division: (activeChild.division || "").toUpperCase(),
          dateOfBirth: activeChild.date_of_birth,
          photo: (activeChild as any).photo || (activeChild as any).profile_photo,
          subjects: marksheetSubjects,
          totalMaximum: activeExamMetrics.totalMax,
          totalObtained: activeExamMetrics.totalObtained,
          percentage: activeExamMetrics.percentage,
          overallGrade: activeExamMetrics.overallGrade,
          remarks: "Keep up the excellent academic performance.",
        },
      ],
      school: {
        name: schoolBrand.name,
        logo: schoolBrand.logo,
        address: schoolBrand.address,
        phone: schoolBrand.phone,
        email: schoolBrand.email,
        principalName: schoolBrand.principalName,
        teacherName: schoolBrand.teacherName,
        principalSignature: schoolBrand.principalSignature,
        teacherSignature: schoolBrand.teacherSignature,
        stamp: schoolBrand.stamp,
      },
      title: selectedExamTitle || "Examination Result",
      academicYear: "2026-27",
      template: activeTemplate,
    });
  };

  // Download PDF using the Principal's downloadResultPreviewPDF
  const handleDownloadPDF = async () => {
    if (!activeChild) return;
    setIsDownloadingPDF(true);
    try {
      const studentName = `${activeChild.name} ${activeChild.surname || ""}`.trim() || "Student";
      const card = document.querySelector<HTMLElement>("[data-result-card-preview='true']");
      if (!card) throw new Error("The result preview is not ready yet.");
      const safeName = `${studentName}_${selectedExamTitle || "Marksheet"}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
      await downloadResultPreviewPDF(card, `${safeName}_Report_Card.pdf`);
      toast.success(`Result PDF for ${studentName} downloaded successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Merge, deduplicate, and limit to LAST 5 incoming notices and alerts
  const last5NoticesAndAlerts = useMemo(() => {
    const combined: Array<{
      id: string | number;
      title: string;
      description: string;
      created_at: string;
      is_absent?: boolean;
      is_attendance?: boolean;
    }> = [];

    // From activeChild.notices
    if (activeChild?.notices && Array.isArray(activeChild.notices)) {
      activeChild.notices.forEach((n, idx) => {
        const isAbsent = n.is_absent || (n.description || "").toLowerCase().includes("absent");
        const isAttendance = n.is_attendance || (n.notification_type === "ATTENDANCE") || /attendance|present/i.test(n.title || "");
        combined.push({
          id: n.id || `n_${idx}`,
          title: n.title || "School Notice",
          description: n.description || "",
          created_at: n.created_at || "",
          is_absent: isAbsent,
          is_attendance: isAttendance,
        });
      });
    }

    // From attendance alerts
    if (attendanceAlerts && Array.isArray(attendanceAlerts)) {
      attendanceAlerts.forEach((a, idx) => {
        const isAbsent = (a.message || "").toLowerCase().includes("absent") || (a.title || "").toLowerCase().includes("absent");
        combined.push({
          id: a.id || `att_${idx}`,
          title: a.title || "Attendance Notice",
          description: a.message || "",
          created_at: a.created_at || "",
          is_absent: isAbsent,
          is_attendance: true,
        });
      });
    }

    // Deduplicate by title + description snippet
    const seen = new Set<string>();
    const unique = combined.filter((item) => {
      const key = `${item.title.toLowerCase().trim()}|${item.description.slice(0, 30).toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort newest first
    unique.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    // Exactly last 5 incoming notices & alerts
    return unique.slice(0, 5);
  }, [activeChild?.notices, attendanceAlerts]);

  // Metric Cards
  const cards = useMemo(() => {
    if (!activeChild) return [];
    return [
      {
        title: "Attendance Rate",
        value: `${activeChild.attendance_percentage}%`,
        note: `${activeChild.present_days} of ${activeChild.total_working_days} Days Present`,
        icon: Clock,
        tone: "green",
        href: "/parent/attendance",
      },
      {
        title: "Enrolled Grade",
        value: activeChild.school_class_name
          ? `${capitalizeWords(activeChild.school_class_name)} - ${(activeChild.division || "A").toUpperCase()}`
          : "Enrolled",
        note: `Roll No: #${activeChild.roll_no || "N/A"} · GR: ${activeChild.gr_no || "N/A"}`,
        icon: GraduationCap,
        tone: "blue",
        href: "#ward-identity",
      },
      {
        title: "Fee Settlement",
        value:
          activeChild.pending_fees > 0
            ? `₹${activeChild.pending_fees.toLocaleString()}`
            : "Paid in Full",
        note:
          activeChild.pending_fees > 0
            ? `Billed ₹${activeChild.total_fees.toLocaleString()}`
            : "All semester dues clear",
        icon: CreditCard,
        tone: activeChild.pending_fees > 0 ? "amber" : "blue",
        href: "#fee-summary",
      },
      {
        title: "School Bulletins",
        value: String(last5NoticesAndAlerts.length),
        note: latestAbsentNotice ? "Active attendance alert" : "Recent notices",
        icon: latestAbsentNotice ? AlertTriangle : Megaphone,
        tone: latestAbsentNotice ? "rose" : "sky",
        href: "#notices-feed",
      },
    ];
  }, [activeChild, last5NoticesAndAlerts.length, latestAbsentNotice]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-hidden bg-[#f4f7fc] px-3 py-4 font-sans sm:space-y-5 sm:px-5 lg:px-7">
      {/* ── HERO BANNER ── */}
      <section className="relative isolate min-h-[224px] overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-gradient-to-br from-white via-[#edf6ff] to-[#d7edff] p-5 shadow-[0_12px_36px_-24px_rgba(37,99,235,.45)] sm:min-h-[250px] sm:rounded-[2rem] sm:p-7 lg:min-h-[264px] lg:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(59,130,246,.35),transparent_42%),linear-gradient(110deg,transparent_45%,rgba(37,99,235,.45))]" />
        <div className="pointer-events-none absolute -right-20 -top-36 -z-10 h-[420px] w-[420px] rounded-full border border-white/70 bg-white/15" />

        <div className="relative z-10 max-w-full sm:max-w-[62%] lg:max-w-[60%]">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/60 px-3 py-1.5 text-[9px] font-extrabold tracking-wide text-blue-800 sm:text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" /> PARENT & WARD HUB
          </div>

          <h1 className="mt-3 text-[1.55rem] font-black leading-[1.1] tracking-tight text-[#101d4a] sm:text-3xl lg:text-4xl">
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-blue-700 to-violet-600 bg-clip-text text-transparent">
              {displayName}
            </span>{" "}
            <span aria-hidden="true">👋</span>
          </h1>

          <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-slate-600 sm:text-sm lg:text-base">
            Monitor your ward&apos;s daily attendance, published exam marksheets, fee settlements, and official notices in real time.
          </p>

          <div className="mt-4 flex flex-nowrap items-center gap-2.5 sm:mt-5">
            <Link
              href="/parent/attendance"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:brightness-105 sm:h-12 sm:px-5 sm:text-sm"
            >
              <Clock className="h-4 w-4" /> View Attendance <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white/70 text-xs font-bold text-blue-700 transition hover:bg-white disabled:opacity-60 sm:h-12 sm:w-auto sm:gap-2 sm:px-5 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Dedicated Vector Art for Parent & Ward */}
        <div className="pointer-events-none absolute bottom-[-20px] right-[2%] hidden h-[280px] w-[320px] overflow-hidden opacity-95 sm:block lg:bottom-[-25px] lg:right-[5%] lg:h-[310px] lg:w-[350px]">
          <ParentHeroIllustration />
        </div>
        <div className="pointer-events-none absolute bottom-[-15px] right-[-15px] h-[170px] w-[180px] overflow-hidden opacity-40 sm:hidden">
          <ParentHeroIllustration />
        </div>
      </section>

      {/* ── LOADING STATE ── */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xs">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700">
            Loading ward profiles & academic records...
          </p>
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 sm:p-12 text-center shadow-xs">
          <User className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-slate-900">No Student Profile Linked</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
            Your parent account is active, but no student has been assigned to your profile yet. Please contact the school office with your ward&apos;s G.R. number.
          </p>
        </div>
      ) : (
        <>
          {/* ── MULTI-WARD SWITCHER PILLS ── */}
          {children.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                Select Ward:
              </span>
              {children.map((kid, idx) => (
                <button
                  key={kid.id}
                  onClick={() => setSelectedChildIndex(idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-bold text-xs transition-all shrink-0 ${
                    selectedChildIndex === idx
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-600/30"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  {kid.name} {kid.surname} ({kid.school_class_name || "Student"})
                </button>
              ))}
            </div>
          )}

          {activeChild && (
            <div className="space-y-4 sm:space-y-5">
              {/* ── ABSENCE ALERT BANNER ── */}
              {latestAbsentNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5 shadow-xs text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-xs shrink-0">
                      <AlertTriangle className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 text-[10px] font-black uppercase tracking-wider">
                          Attendance Alert
                        </span>
                        <span className="text-xs text-rose-700 font-semibold">
                          {formatNotificationTime(latestAbsentNotice.created_at)}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-rose-950 mt-1">
                        {activeChild.name} {activeChild.surname} was marked ABSENT
                      </h4>
                      <p className="text-xs font-medium text-rose-800 mt-0.5">
                        {latestAbsentNotice.description ||
                          "Your child's attendance has been marked as Absent."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-xs font-bold text-rose-700 bg-white border border-rose-200 px-3 py-1.5 rounded-xl shadow-2xs">
                      Status: Absent
                    </span>
                  </div>
                </motion.div>
              )}

              {/* ── 4 SUMMARY METRIC CARDS ── */}
              <section
                aria-label="Parent ward summary"
                className="grid grid-cols-2 gap-3 xl:grid-cols-4"
              >
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.title}
                      href={card.href}
                      className={`group relative flex min-h-[112px] min-w-0 items-center gap-3 overflow-hidden rounded-3xl border p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[132px] sm:gap-4 sm:p-5 ${
                        card.tone === "blue"
                          ? "border-blue-100 bg-gradient-to-br from-white to-blue-50/70"
                          : card.tone === "green"
                          ? "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70"
                          : card.tone === "purple"
                          ? "border-violet-100 bg-gradient-to-br from-white to-violet-50/70"
                          : card.tone === "rose"
                          ? "border-rose-100 bg-gradient-to-br from-white to-rose-50/70"
                          : card.tone === "sky"
                          ? "border-sky-100 bg-gradient-to-br from-white to-sky-50/70"
                          : "border-amber-100 bg-gradient-to-br from-white to-amber-50/80"
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 ${
                          toneClasses[card.tone] || toneClasses.blue
                        }`}
                      >
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </span>
                      <span className="relative z-10 min-w-0 flex-1">
                        <span className="block text-[10px] font-extrabold leading-tight text-slate-800 sm:text-sm">
                          {card.title}
                        </span>
                        <span
                          className={`mt-1 block text-2xl font-black leading-none sm:text-3xl ${
                            card.tone === "amber"
                              ? "text-amber-600"
                              : card.tone === "green"
                              ? "text-emerald-700"
                              : card.tone === "purple"
                              ? "text-violet-700"
                              : card.tone === "rose"
                              ? "text-rose-600"
                              : card.tone === "sky"
                              ? "text-sky-700"
                              : "text-blue-700"
                          }`}
                        >
                          {loading ? "–" : card.value}
                        </span>
                        <span className="mt-1 hidden truncate text-[10px] text-slate-500 sm:block">
                          {card.note}
                        </span>
                      </span>
                      <ChevronRight className="absolute right-3 top-3 h-5 w-5 rounded-full bg-white/90 p-0.5 text-blue-500 shadow-sm sm:right-4 sm:top-4 sm:h-8 sm:w-8 sm:p-1.5" />
                      <span
                        className={`absolute bottom-0 right-3 flex h-7 items-end gap-1 opacity-60 sm:right-5 sm:h-10 ${
                          card.tone === "blue"
                            ? "text-sky-400"
                            : card.tone === "green"
                            ? "text-emerald-400"
                            : card.tone === "purple"
                            ? "text-violet-400"
                            : card.tone === "rose"
                            ? "text-rose-400"
                            : card.tone === "sky"
                            ? "text-sky-400"
                            : "text-amber-400"
                        }`}
                        aria-hidden="true"
                      >
                        {[35, 55, 75, 100].map((height, index) => (
                          <i
                            key={index}
                            className="w-1.5 rounded-t-full bg-current sm:w-2"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </span>
                    </Link>
                  );
                })}
              </section>

              {/* ── QUICK NAVIGATION SHORTCUTS ── */}
              <nav
                aria-label="Parent shortcuts"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
              >
                {shortcuts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:gap-3 sm:px-3.5"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${toneClasses[item.tone]}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-extrabold text-slate-900 sm:text-xs">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] text-slate-500 sm:text-[10px]">
                          {item.note}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                    </Link>
                  );
                })}
              </nav>

              {/* ── WARD IDENTITY DETAILS STRIP ── */}
              <section
                id="ward-identity"
                className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-sm shadow-blue-600/20">
                      {activeChild.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        {capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim())}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {capitalizeWords(activeChild.school_name) || "Enrolled Student Record"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeChild.is_rte && (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
                        RTE Quota (Fee Waived)
                      </span>
                    )}
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
                      Academic Year 2026-27
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "G.R. Number", value: activeChild.gr_no || "N/A" },
                    {
                      label: "Class & Section",
                      value: `${capitalizeWords(activeChild.school_class_name || "-")} (${(activeChild.division || "-").toUpperCase()})`,
                    },
                    { label: "Roll Number", value: activeChild.roll_no ? `#${activeChild.roll_no}` : "N/A" },
                    { label: "Date of Birth", value: activeChild.date_of_birth || "N/A" },
                    { label: "Admission Mode", value: activeChild.is_rte ? "RTE Quota" : "General" },
                    { label: "Attendance Record", value: `${activeChild.attendance_percentage}%` },
                  ].map((field) => (
                    <div
                      key={field.label}
                      className="bg-slate-50/80 rounded-2xl p-3 sm:p-3.5 border border-slate-100"
                    >
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {field.label}
                      </p>
                      <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5 truncate">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── TWO COLUMN GRID: FEE SUMMARY & REAL CONDUCTED EXAM MARKSHEETS ── */}
              <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2 sm:gap-5">
                {/* 1. FEE SETTLEMENT & INVOICES */}
                <article
                  id="fee-summary"
                  className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <header className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
                          <CreditCard className="h-4 w-4" />
                        </span>
                        <h2 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                          Fee Summary & Dues
                        </h2>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          activeChild.pending_fees > 0
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {activeChild.pending_fees > 0 ? "Pending Dues" : "Paid in Full"}
                      </span>
                    </header>

                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 min-w-0">
                          <p className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate">
                            Total Billed
                          </p>
                          <p className="text-xs sm:text-base font-black text-slate-900 mt-1 truncate">
                            ₹{activeChild.total_fees.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-100 min-w-0">
                          <p className="text-[10px] sm:text-xs text-emerald-700 font-semibold truncate">
                            Total Paid
                          </p>
                          <p className="text-xs sm:text-base font-black text-emerald-700 mt-1 truncate">
                            ₹{activeChild.paid_fees.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-rose-50/70 rounded-2xl p-3 border border-rose-100 min-w-0">
                          <p className="text-[10px] sm:text-xs text-rose-700 font-semibold truncate">
                            Outstanding
                          </p>
                          <p className="text-xs sm:text-base font-black text-rose-700 mt-1 truncate">
                            ₹{activeChild.pending_fees.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-bold text-slate-600">
                          <span>Payment Fulfillment</span>
                          <span>
                            {activeChild.total_fees > 0
                              ? Math.round((activeChild.paid_fees / activeChild.total_fees) * 100)
                              : 100}
                            %
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                            style={{
                              width: `${
                                activeChild.total_fees > 0
                                  ? Math.min((activeChild.paid_fees / activeChild.total_fees) * 100, 100)
                                  : 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <footer className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Direct fee receipts available at school office counter
                    </span>
                  </footer>
                </article>

                {/* 2. REAL PUBLISHED EXAM MARKSHEET (EXACT PRINCIPAL MARKSHEET) */}
                <article
                  id="exam-marksheets"
                  className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <header className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-xl bg-violet-50 p-2 text-violet-600">
                          <Award className="h-4 w-4" />
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                            Conducted Exam Marksheets
                          </h2>
                          <p className="text-[10px] text-slate-400">
                            Official report cards for {capitalizeWords(activeChild.name)}
                          </p>
                        </div>
                      </div>
                      {examTitles.length > 0 && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {examTitles.length} Exam{examTitles.length > 1 ? "s" : ""} Published
                        </span>
                      )}
                    </header>

                    {examTitles.length > 0 ? (
                      <div className="space-y-3.5">
                        {/* Exam Switcher Tabs */}
                        {examTitles.length > 1 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {examTitles.map((title) => (
                              <button
                                key={title}
                                type="button"
                                onClick={() => setSelectedExamTitle(title)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                  (selectedExamTitle || examTitles[0]) === title
                                    ? "bg-purple-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {title}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Last Published Exam Highlight Card — Click redirects to /parent/marksheets */}
                        <Link
                          href="/parent/marksheets"
                          className="group block p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-sky-50/50 to-white border border-blue-100/90 shadow-2xs hover:border-blue-300 hover:shadow-xs transition"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider bg-blue-100/80 px-2 py-0.5 rounded-md">
                                  Last Published Exam
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  {selectedExamTitle || examTitles[0]}
                                </span>
                              </div>
                              <div className="text-2xl font-black text-blue-800 font-mono mt-1">
                                {activeExamMetrics.percentage}%
                              </div>
                              <span className="text-xs text-blue-700 font-semibold">
                                Grade {activeExamMetrics.overallGrade} • Total Marks: {activeExamMetrics.totalObtained} / {activeExamMetrics.totalMax}
                              </span>
                            </div>
                            <div className="sm:text-right">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                Subjects Evaluated
                              </span>
                              <span className="text-xl font-black text-blue-700 font-mono">
                                {activeExamResults.length}
                              </span>
                              <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition sm:justify-end">
                                Open Marksheets <ArrowRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </Link>

                        {/* Subject-wise Marks Table */}
                        <div className="rounded-2xl border border-slate-100 overflow-hidden text-xs max-h-[160px] overflow-y-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100 sticky top-0">
                              <tr>
                                <th className="p-2.5 pl-3">Subject</th>
                                <th className="p-2.5 text-center">Max</th>
                                <th className="p-2.5 text-center">Obtained</th>
                                <th className="p-2.5 text-center">Grade</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeExamResults.map((r: any, idx: number) => {
                                const rawSubj = r.subject_name || r.subject || r.exam?.subject?.name || `Subject #${idx + 1}`;
                                const subj = formatSubjectName(rawSubj);
                                const max = r.max_marks || r.exam?.max_marks || "100";
                                const obtained = r.is_absent ? "AB" : (r.marks_obtained ?? "—");
                                const grade = formatGrade(r.grade) || (r.is_absent ? "F" : "—");
                                return (
                                  <tr key={r.id || idx} className="hover:bg-slate-50/50">
                                    <td className="p-2 pl-3 font-bold text-slate-800">{subj}</td>
                                    <td className="p-2 text-center text-slate-500">{max}</td>
                                    <td className={`p-2 text-center font-black ${r.is_absent ? "text-rose-600" : "text-blue-700"}`}>
                                      {obtained}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-bold text-[10px]">
                                        {grade}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[190px] flex-col items-center justify-center p-4 text-center">
                        <Award className="mb-2 h-8 w-8 text-slate-300" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          No Exam Marksheets Published Yet
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-500 max-w-xs">
                          Exam marksheets for {activeChild.name} will appear here as soon as teachers evaluate and publish term or unit test results.
                        </p>
                      </div>
                    )}
                  </div>

                  <footer className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Verified by Academic Faculty</span>
                    <Link
                      href="/parent/marksheets"
                      className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
                    >
                      <FileText className="h-3.5 w-3.5" /> Open Child Marksheet Tab
                    </Link>
                  </footer>
                </article>
              </section>

              {/* ── 3. RECENT NOTICES & ATTENDANCE ALERTS (SHOWING ONLY LAST 5 INCOMING) ── */}
              <section
                id="notices-feed"
                className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm"
              >
                <header className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-xl bg-sky-50 p-2 text-sky-600">
                      <Megaphone className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                        School Notices & Attendance Alerts
                      </h2>
                      <p className="text-[10px] text-slate-400">
                        Displaying last 5 incoming updates
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/parent/announcements"
                    className="shrink-0 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50 sm:text-xs"
                  >
                    View All Notices
                  </Link>
                </header>

                {last5NoticesAndAlerts.length > 0 ? (
                  <ul className="space-y-2.5">
                    {last5NoticesAndAlerts.map((notice) => {
                      const isAbsent = notice.is_absent;
                      const isAttendance = notice.is_attendance;

                      return (
                        <li
                          key={notice.id}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                            isAbsent
                              ? "bg-rose-50/50 border-rose-200/80 shadow-2xs hover:bg-rose-50"
                              : isAttendance
                              ? "bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70"
                              : "bg-slate-50/60 border-slate-200/70 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isAbsent
                                ? "bg-rose-100 text-rose-700"
                                : isAttendance
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {isAbsent ? (
                              <AlertTriangle className="h-4 w-4 text-rose-600" />
                            ) : isAttendance ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Megaphone className="h-4 w-4 text-blue-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {capitalizeSentence(notice.title)}
                              </span>
                              {isAbsent ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wide shrink-0">
                                  Absent Alert
                                </span>
                              ) : isAttendance ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
                                  Attendance
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
                                  Notice
                                </span>
                              )}
                            </div>

                            <p
                              className={`text-xs ${
                                isAbsent ? "text-rose-900 font-medium" : "text-slate-600"
                              }`}
                            >
                              {capitalizeSentence(notice.description)}
                            </p>

                            <p className="text-[10px] font-medium text-slate-400 pt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatNotificationTime(notice.created_at)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex min-h-36 flex-col items-center justify-center px-4 text-center">
                    <BellRing className="mb-2 h-7 w-7 text-slate-300" />
                    <p className="text-xs font-bold text-slate-800">No notices broadcasted yet</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      School notices and daily attendance alerts for your ward will appear here.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {/* ── EXACT PRINCIPAL OFFICIAL MARKSHEET MODAL & PRINT VIEW ── */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 sm:left-1/2 sm:top-1/2 sm:h-[92dvh] sm:w-[94vw] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
            {activeChild && activeExamResults.length > 0 && (
              <ResultCardPreview
                title={selectedExamTitle || (examTitles[0] ?? "Examination Result")}
                template={((activeExamResults[0]?.report_template as ResultTemplateId) || resultTemplate || "classic")}
                school={{
                  name: schoolBrand.name,
                  shortName: schoolBrand.shortName,
                  logo: schoolBrand.logo,
                  tagline: schoolBrand.tagline,
                  address: schoolBrand.address,
                  phone: schoolBrand.phone,
                  email: schoolBrand.email,
                  establishmentYear: schoolBrand.establishmentYear,
                  boardAffiliation: schoolBrand.boardAffiliation,
                  schoolCode: schoolBrand.schoolCode,
                  udiseCode: schoolBrand.udiseCode,
                  principalName: schoolBrand.principalName,
                  teacherName: schoolBrand.teacherName,
                  principalSignature: schoolBrand.principalSignature,
                  teacherSignature: schoolBrand.teacherSignature,
                  stamp: schoolBrand.stamp,
                  academicYear: "2026-27",
                }}
                student={{
                  id: activeChild.id,
                  name: capitalizeWords(`${activeChild.name} ${activeChild.surname || ""}`.trim()),
                  fatherName: activeChild.father_name ? capitalizeWords(activeChild.father_name) : undefined,
                  motherName: activeChild.mother_name ? capitalizeWords(activeChild.mother_name) : undefined,
                  rollNumber: activeChild.roll_no,
                  admissionNumber: activeChild.gr_no,
                  className: `${capitalizeWords(activeChild.school_class_name || "")}${activeChild.division ? ` - ${activeChild.division.toUpperCase()}` : ""}`.trim(),
                  dateOfBirth: activeChild.date_of_birth,
                  photo: (activeChild as any).photo || (activeChild as any).profile_photo,
                }}
                subjects={marksheetSubjects}
                totals={{
                  maximum: activeExamMetrics.totalMax,
                  obtained: activeExamMetrics.totalObtained,
                  percentage: activeExamMetrics.percentage,
                  grade: activeExamMetrics.overallGrade,
                }}
                remarks="Keep up the excellent academic performance."
              />
            )}
          </div>

          <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPrintModal(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF || !activeChild || activeExamResults.length === 0}
              className="gap-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              {isDownloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloadingPDF ? "Downloading..." : "Download PDF"}
            </Button>
            <Button
              type="button"
              onClick={handlePrintOfficialMarksheet}
              disabled={!activeChild || activeExamResults.length === 0}
              className="gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              <Printer className="h-4 w-4" /> Print Marksheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
