"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { formatDDMMYYYY, parseApiDate } from "@/lib/table-utils";
import { InlineCertificate } from "@/components/clerk/inline-certificate";
import "../clerk-workspace.css";
import {
  FileText,
  Printer,
  Search,
  CheckCircle2,
  Calendar,
  User,
  GraduationCap,
  Building2,
  ArrowLeft,
  Sparkles,
  Download,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Eye,
  RefreshCw,
  Award,
  CreditCard,
  UserCheck,
  Check,
  Copy,
  Edit2,
  School,
  Settings2,
  ChevronDown,
  Clock,
  XCircle,
  FileCheck2,
  Upload,
  ExternalLink,
  X,
  Send,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { fetchAdmissions } from "@/lib/clerk/admissions";
import {
  getClerkCertificateRequests,
  approveCertificateRequest,
  rejectCertificateRequest,
  type CertificateRequestItem,
} from "@/lib/certificate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudentItem {
  id: number | string;
  gr_number?: string;
  first_name?: string;
  last_name?: string;
  surname?: string;
  father_name?: string;
  mother_name?: string;
  student_name?: string;
  name?: string;
  gender?: string;
  school_class_name?: string;
  school_class?: any;
  division_name?: string;
  division?: any;
  roll_number?: string | number;
  date_of_birth?: string;
  admission_date?: string;
  nationality?: string;
  caste?: string;
  sub_caste?: string;
  religion?: string;
  place_of_birth?: string;
  previous_school?: string;
  mother_tongue?: string;
  address?: string;
  mobile?: string;
  primary_mobile?: string;
}

type CertificateTypeKey = "bonafide" | "leaving_certificate" | "character" | "no_dues";

// Number to Words in English
function numberToWords(num: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";
  if (num < 20) return a[num];
  if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + a[num % 10] : "");
  if (num < 1000) return a[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " and " + numberToWords(num % 100) : "");
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "");
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + numberToWords(num % 100000) : "");
  return numberToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + numberToWords(num % 10000000) : "");
}

function formatDateToWords(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = parseApiDate(dateStr);
    if (!d) return "";
    if (isNaN(d.getTime())) return "";
    const day = d.getDate();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${numberToWords(day)} ${month} ${numberToWords(year)}`;
  } catch {
    return "";
  }
}

// Extract field value from admission
function getFieldValue(adm: any, patterns: RegExp[]): string {
  if (!adm.field_values || !Array.isArray(adm.field_values)) return "";
  for (const pattern of patterns) {
    const found = adm.field_values.find((f: any) => {
      const label = (f.field_label || f.label || f.field?.label || "").toLowerCase();
      const map = (f.field?.map_to_student_field || "").toLowerCase();
      return pattern.test(label) || pattern.test(map);
    });
    if (found && found.value) return String(found.value).trim();
  }
  return "";
}

export default function CertificateIssuancePage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const drafts = useRef<Record<string, string>>({});
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [activeRequest, setActiveRequest] = useState<CertificateRequestItem | null>(null);
  const [isSendingDigitalCopy, setIsSendingDigitalCopy] = useState(false);

  // Active School Name
  const [activeSchoolName, setActiveSchoolName] = useState<string>("School");

  // Selected Certificate Type
  const [activeCertType, setActiveCertType] = useState<CertificateTypeKey>("bonafide");
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Certificate Editable Parameters (including dynamic School Details)
  const [certData, setCertData] = useState({
    schoolName: "MG SCHOOL",
    schoolSubtitle: "Affiliated to State Board & CBSE | Recognized by Education Dept.",
    schoolAddress: "Main Campus, Education City | Phone: 022-25890000 | Email: office@school.edu.in",
    certNumber: `BON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    issueDate: new Date().toISOString().split("T")[0],
    purpose: "Passport / Government Verification",
    academicYear: "2026-2027",
    conduct: "Good",
    progress: "Satisfactory",
    reasonForLeaving: "Parents Transfer / Completed Studies",
    dateOfLeaving: new Date().toISOString().split("T")[0],
    duesClearedUpTo: "March 2027",
    remarks: "Passed and Promoted",
  });

  const draftKey = `${selectedStudent?.id ?? "preview"}:${activeCertType}`;
  const classOptions = useMemo(() => [...new Set(students.map(s => String(s.school_class_name || "")))].filter(Boolean).sort(), [students]);
  const divisionOptions = useMemo(() => [...new Set(students.filter(s => classFilter === "all" || String(s.school_class_name) === classFilter).map(s => String(s.division_name || "")))].filter(Boolean).sort(), [students, classFilter]);

  // Load School Details from localStorage / user profile
  useEffect(() => {
    try {
      const savedSchool = localStorage.getItem("school_name");
      if (savedSchool && savedSchool.trim()) {
        const formatted = savedSchool.trim();
        setActiveSchoolName(formatted);
        setCertData((prev) => ({
          ...prev,
          schoolName: formatted.toUpperCase(),
        }));
      }
    } catch {}

    async function loadSchoolProfile() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/me/`);
        if (res.ok) {
          const profile = await res.json();
          const sName = profile?.school?.name || profile?.school_name || profile?.school;
          if (sName) {
            const formatted = String(sName).trim();
            setActiveSchoolName(formatted);
            setCertData((prev) => ({
              ...prev,
              schoolName: formatted.toUpperCase(),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load school profile:", err);
      }
    }
    loadSchoolProfile();
  }, []);

  // Load unified student list from both Admissions and Student API
  useEffect(() => {
    async function loadUnifiedStudents() {
      setLoading(true);
      try {
        const [admissionsRes, studentsRes] = await Promise.all([
          fetchAdmissions().catch(() => []),
          fetchWithAuth(`${API_BASE_URL}/students/`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);

        const unifiedList: StudentItem[] = [];
        const seenIds = new Set<string>();

        // 1. Process Admissions (Primary source for Clerk portal)
        if (Array.isArray(admissionsRes)) {
          admissionsRes.forEach((adm: any) => {
            const sName =
              getFieldValue(adm, [/student.*name/i, /full.*name/i, /first.*name/i]) ||
              `Student #${adm.admission_number || adm.id}`;
            const fName = getFieldValue(adm, [/father.*name/i, /father/i]);
            const mName = getFieldValue(adm, [/mother.*name/i, /mother/i]);
            const dob = getFieldValue(adm, [/date.*of.*birth/i, /birth.*date/i, /dob/i]);
            const caste = getFieldValue(adm, [/caste/i, /sub.*caste/i]);
            const religion = getFieldValue(adm, [/religion/i]);
            const gender = getFieldValue(adm, [/gender/i, /sex/i]);
            const phone = getFieldValue(adm, [/mobile/i, /phone/i, /contact/i]);
            const address = getFieldValue(adm, [/address/i, /residence/i]);
            const previousSchool = getFieldValue(adm, [/previous.*school/i, /last.*school/i]);
            const birthPlace = getFieldValue(adm, [/birth.*place/i, /place.*of.*birth/i]);

            const item: StudentItem = {
              id: `adm-${adm.id || adm.admission_number}`,
              gr_number: adm.gr_number || adm.gr_no || "",
              student_name: sName,
              name: sName,
              father_name: fName,
              mother_name: mName,
              date_of_birth: dob,
              caste,
              religion,
              gender,
              mobile: phone,
              address,
              place_of_birth: birthPlace,
              previous_school: previousSchool,
              school_class_name: adm.school_class || getFieldValue(adm, [/class/i, /standard/i]) || "Class",
              division_name: adm.division || "A",
              admission_date: adm.created_at ? new Date(adm.created_at).toISOString().split("T")[0] : "",
            };

            const key = item.gr_number ? `gr-${item.gr_number}` : `adm-${adm.admission_number || adm.id}`;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              unifiedList.push(item);
            }
          });
        }

        // 2. Process Direct Students if any
        const directList = Array.isArray(studentsRes)
          ? studentsRes
          : studentsRes?.results || studentsRes?.data || [];

        if (Array.isArray(directList)) {
          directList.forEach((stu: any) => {
            const key = stu.gr_number ? `gr-${stu.gr_number}` : `stu-${stu.id}`;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              unifiedList.push({
                id: stu.id,
                gr_number: stu.gr_number || stu.gr_no || "",
                student_name: stu.student_name || stu.name || `${stu.first_name || ""} ${stu.last_name || ""}`.trim() || "Student",
                name: stu.name || stu.student_name || `${stu.first_name || ""} ${stu.last_name || ""}`.trim(),
                first_name: stu.first_name,
                last_name: stu.last_name,
                father_name: stu.father_name,
                mother_name: stu.mother_name,
                gender: stu.gender,
                date_of_birth: stu.date_of_birth,
                place_of_birth: stu.place_of_birth,
                religion: stu.religion,
                caste: stu.caste,
                school_class_name: stu.school_class_name || (typeof stu.school_class === "object" ? stu.school_class?.school_class : stu.school_class) || "Class",
                division_name: stu.division_name || (typeof stu.division === "object" ? stu.division?.division_name : stu.division) || "A",
                roll_number: stu.roll_number,
                mobile: stu.mobile || stu.primary_mobile,
                admission_date: stu.admission_date,
              });
            }
          });
        }

        // 3. Filter ONLY students with assigned GR numbers & sort ascending
        const validGrStudents = unifiedList
          .filter((s) => s.gr_number && s.gr_number.trim() !== "" && s.gr_number.trim() !== "-")
          .sort((a, b) => {
            const numA = parseInt(String(a.gr_number).replace(/\D/g, ""), 10);
            const numB = parseInt(String(b.gr_number).replace(/\D/g, ""), 10);
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
              return numA - numB;
            }
            return String(a.gr_number).localeCompare(String(b.gr_number));
          });

        setStudents(validGrStudents);
        if (validGrStudents.length > 0) {
          setSelectedStudent(validGrStudents[0]);
        }
      } catch (err) {
        console.error("Failed to load unified students:", err);
        toast.error("Could not load student list.");
      } finally {
        setLoading(false);
      }
    }
    loadUnifiedStudents();
  }, []);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      const name = `${s.first_name || ""} ${s.last_name || ""} ${s.student_name || ""} ${s.name || ""}`.toLowerCase();
      const gr = String(s.gr_number || "").toLowerCase();
      const cls = String(s.school_class_name || (typeof s.school_class === "object" ? s.school_class?.school_class : s.school_class) || "").toLowerCase();
      const matchesSearch = name.includes(q) || gr.includes(q) || cls.includes(q) || String(s.roll_number || "").toLowerCase().includes(q) || String(s.mobile || "").includes(q);
      return matchesSearch && (classFilter === "all" || String(s.school_class_name) === classFilter) && (divisionFilter === "all" || String(s.division_name) === divisionFilter);
    });
  }, [students, searchTerm, classFilter, divisionFilter]);

  // When in student request mode, show strictly ONLY that requested student
  const displayedStudents = useMemo(() => {
    if (activeRequest && selectedStudent) {
      return [selectedStudent];
    }
    return filteredStudents;
  }, [activeRequest, selectedStudent, filteredStudents]);

  // Derived student attributes
  const currentStudentName = useMemo(() => {
    if (!selectedStudent) return "Student Full Name";
    if (selectedStudent.student_name) return selectedStudent.student_name;
    if (selectedStudent.first_name || selectedStudent.last_name) {
      return `${selectedStudent.first_name || ""} ${selectedStudent.father_name ? selectedStudent.father_name + " " : ""}${selectedStudent.last_name || selectedStudent.surname || ""}`.trim();
    }
    return selectedStudent.name || "Student Full Name";
  }, [selectedStudent]);

  const studentClassName = useMemo(() => {
    if (!selectedStudent) return "Class 10";
    if (selectedStudent.school_class_name) return selectedStudent.school_class_name;
    if (typeof selectedStudent.school_class === "object" && selectedStudent.school_class !== null) {
      return selectedStudent.school_class.school_class || selectedStudent.school_class.name || "Class";
    }
    return String(selectedStudent.school_class || "Class");
  }, [selectedStudent]);

  const studentDivision = useMemo(() => {
    if (!selectedStudent) return "A";
    if (selectedStudent.division_name) return selectedStudent.division_name;
    if (typeof selectedStudent.division === "object" && selectedStudent.division !== null) {
      return selectedStudent.division.division_name || selectedStudent.division.name || "A";
    }
    return String(selectedStudent.division || "A");
  }, [selectedStudent]);

  const handlePrint = () => {
    window.print();
  };

  const handleSelectStudent = (stu: StudentItem) => {
    setSelectedStudent(stu);
    setCertData((prev) => ({
      ...prev,
      certNumber: `${activeCertType === "leaving_certificate" ? "TC" : activeCertType === "bonafide" ? "BON" : "CERT"}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  };

  // Top-Level Workspace Tabs & Request Management
  const [activeMainTab, setActiveMainTab] = useState<"requests" | "generator">("requests");
  const [clerkRequests, setClerkRequests] = useState<CertificateRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reqStatusFilter, setReqStatusFilter] = useState("ALL");
  const [reqSearch, setReqSearch] = useState("");
  const [approvalModal, setApprovalModal] = useState<CertificateRequestItem | null>(null);
  const [approvalFile, setApprovalFile] = useState<File | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState<number | null>(null);

  const loadClerkRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await getClerkCertificateRequests();
      setClerkRequests(data);
    } catch (err: any) {
      console.error("Failed to load certificate requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadClerkRequests();
  }, [loadClerkRequests]);

  const handleApprove = async () => {
    if (!approvalModal) return;
    setIsApproving(true);
    try {
      await approveCertificateRequest(approvalModal.id, approvalFile);
      toast.success(`Certificate for "${approvalModal.student_name}" approved and issued!`);
      setApprovalModal(null);
      setApprovalFile(null);
      await loadClerkRequests();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve certificate.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (reqId: number) => {
    if (!confirm("Are you sure you want to reject this certificate request?")) return;
    setIsRejecting(reqId);
    try {
      await rejectCertificateRequest(reqId);
      toast.success("Certificate request marked as rejected.");
      await loadClerkRequests();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject certificate.");
    } finally {
      setIsRejecting(null);
    }
  };

  const handleOpenInGenerator = (req: CertificateRequestItem) => {
    setActiveRequest(req);

    // Find student or synthesize from request
    const grMatch = req.student_gr_no
      ? students.find((s) => String(s.gr_number) === String(req.student_gr_no))
      : null;
    const nameMatch = students.find((s) => {
      const sName = `${s.first_name || ""} ${s.last_name || ""} ${s.student_name || ""} ${s.name || ""}`.toLowerCase();
      return sName.includes(req.student_name.toLowerCase()) || req.student_name.toLowerCase().includes(sName.trim());
    });
    let targetStudent = grMatch || nameMatch;
    if (!targetStudent) {
      targetStudent = {
        id: req.student || `req-${req.id}`,
        gr_number: req.student_gr_no || "",
        student_name: req.student_name,
        name: req.student_name,
        school_class_name: req.student_class || "Class",
        division_name: "A",
      };
    }
    setSelectedStudent(targetStudent);

    const tName = (req.certificate_type_name || String(req.certificate_type)).toLowerCase();
    if (tName.includes("leaving") || tName.includes("tc") || tName.includes("transfer")) {
      setActiveCertType("leaving_certificate");
      setCertData((prev) => ({
        ...prev,
        certNumber: `TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
    } else if (tName.includes("character") || tName.includes("conduct")) {
      setActiveCertType("character");
      setCertData((prev) => ({
        ...prev,
        certNumber: `CHAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
    } else if (tName.includes("due") || tName.includes("clearance")) {
      setActiveCertType("no_dues");
      setCertData((prev) => ({
        ...prev,
        certNumber: `ND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
    } else {
      setActiveCertType("bonafide");
      setCertData((prev) => ({
        ...prev,
        certNumber: `BON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
    }

    setActiveMainTab("generator");
    toast.info(`Generator loaded exclusively for ${req.student_name} (${req.certificate_type_name || "Certificate"})`);
  };

  const handleSendDigitalCopy = async () => {
    if (!activeRequest || !selectedStudent) return;
    setIsSendingDigitalCopy(true);
    try {
      const el = document.getElementById("printable-certificate");
      const htmlContent = el?.innerHTML || drafts.current[draftKey] || "";

      const certTypeName =
        activeCertType === "leaving_certificate"
          ? "School Leaving Certificate"
          : activeCertType === "character"
          ? "Character Certificate"
          : activeCertType === "no_dues"
          ? "Fee Clearance / No Dues Certificate"
          : "Bonafide Certificate";

      const digitalPayload = {
        html: htmlContent,
        certNumber: certData.certNumber,
        certType: activeCertType,
        certTypeName: certTypeName,
        studentName: currentStudentName,
        studentGrNo: selectedStudent.gr_number || "",
        studentClass: studentClassName,
        studentDivision: studentDivision,
        issueDate: certData.issueDate,
        academicYear: certData.academicYear,
        schoolName: certData.schoolName,
        schoolSubtitle: certData.schoolSubtitle,
        schoolAddress: certData.schoolAddress,
        isDuplicate,
        issuedAt: new Date().toISOString(),
      };

      await approveCertificateRequest(
        activeRequest.id,
        null,
        digitalPayload,
        certData.certNumber
      );

      toast.success(`Digital certificate sent successfully to ${currentStudentName} and parent!`);
      setActiveRequest(null);
      await loadClerkRequests();
      setActiveMainTab("requests");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send digital certificate copy.");
    } finally {
      setIsSendingDigitalCopy(false);
    }
  };

  const pendingRequestsCount = useMemo(() => {
    return clerkRequests.filter((r) => r.status === "PENDING").length;
  }, [clerkRequests]);

  const filteredClerkRequests = useMemo(() => {
    return clerkRequests.filter((r) => {
      const q = reqSearch.toLowerCase();
      const matchSearch =
        r.student_name.toLowerCase().includes(q) ||
        (r.student_gr_no && r.student_gr_no.toLowerCase().includes(q)) ||
        (r.certificate_type_name && r.certificate_type_name.toLowerCase().includes(q)) ||
        (r.certificate_number && r.certificate_number.toLowerCase().includes(q));
      const matchStatus =
        reqStatusFilter === "ALL" || r.status.toUpperCase() === reqStatusFilter.toUpperCase();
      return matchSearch && matchStatus;
    });
  }, [clerkRequests, reqSearch, reqStatusFilter]);

  return (
    <div className="clerk-page certificate-page w-full min-w-0 space-y-6">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body, .app-workspace, .app-workspace main { height: auto !important; overflow: visible !important; display: block !important; }
          #printable-certificate { border-radius: 0 !important; min-height: 0 !important; }
          body * {
            visibility: hidden;
          }
          #printable-certificate,
          #printable-certificate * {
            visibility: visible;
          }
          #printable-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Workspace Tab Selector (Requests vs Generator) */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveMainTab("requests")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeMainTab === "requests"
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Student & Parent Requests
            {pendingRequestsCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-amber-400 text-amber-950 font-extrabold">
                {pendingRequestsCount} Pending
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab("generator")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeMainTab === "generator"
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <Award className="w-4 h-4" />
            Certificate Generator & Print Desk
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === "requests" && (
            <button
              onClick={() => loadClerkRequests()}
              disabled={loadingRequests}
              className="p-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? "animate-spin" : ""}`} />
              Refresh Requests
            </button>
          )}
        </div>
      </div>

      {/* REQUESTS MANAGEMENT TAB CONTENT */}
      {activeMainTab === "requests" && (
        <div className="no-print space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Received</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{clerkRequests.length}</div>
            </div>
            <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Action</div>
              <div className="text-2xl font-extrabold text-amber-700 mt-1">{pendingRequestsCount}</div>
            </div>
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved / Issued</div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                {clerkRequests.filter((r) => r.status === "APPROVED").length}
              </div>
            </div>
            <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs">
              <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">Declined</div>
              <div className="text-2xl font-extrabold text-rose-700 mt-1">
                {clerkRequests.filter((r) => r.status === "REJECTED").length}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student, GR number, or certificate..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setReqStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      reqStatusFilter === st
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {loadingRequests ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-teal-600" />
                <p className="text-xs font-medium">Loading requests...</p>
              </div>
            ) : filteredClerkRequests.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Award className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No certificate requests found</p>
                <p className="text-xs text-slate-400 mt-0.5">Requests submitted by students and parents will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">GR No / Class</th>
                      <th className="py-3 px-4">Certificate Type</th>
                      <th className="py-3 px-4">Requested At</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Certificate No.</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClerkRequests.map((req) => {
                      const isPending = req.status === "PENDING";
                      const isApproved = req.status === "APPROVED";
                      const isRejected = req.status === "REJECTED";

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {req.student_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="font-mono">{req.student_gr_no || "—"}</span>
                            {req.student_class && (
                              <span className="ml-1 text-[11px] text-slate-400">({req.student_class})</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {req.certificate_type_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {formatDDMMYYYY(req.created_at)}
                          </td>
                          <td className="py-3.5 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            {req.certificate_number ? (
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                {req.certificate_number}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleOpenInGenerator(req)}
                                    className="px-2.5 py-1 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] transition-colors"
                                    title="Open this student and certificate in the generator desk"
                                  >
                                    Generate
                                  </button>
                                  <button
                                    onClick={() => setApprovalModal(req)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors shadow-xs"
                                  >
                                    Approve / Issue
                                  </button>
                                  <button
                                    onClick={() => handleReject(req.id)}
                                    disabled={isRejecting === req.id}
                                    className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition-colors"
                                  >
                                    {isRejecting === req.id ? "..." : "Reject"}
                                  </button>
                                </>
                              )}
                              {isApproved && req.certificate_file && (
                                <a
                                  href={req.certificate_file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                                >
                                  <Download className="w-3 h-3" /> Download File
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GENERATOR TAB CONTENT */}
      {activeMainTab === "generator" && (
        <>
          {/* Certificate Type Selector Tabs (No Print) */}
          <div className="no-print flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Start with a template</h2><p className="mt-1 text-xs text-slate-500">Designed for your everyday school paperwork.</p></div>
            <Badge variant="outline">4 templates</Badge>
          </div>
      <div className="template-gallery no-print">
        {([
          { type: "bonafide", title: "Bonafide Certificate", description: "Identity, scholarships and bank applications", icon: Award, prefix: "BON" },
          { type: "leaving_certificate", title: "School Leaving / TC", description: "Transfer and school leaving records", icon: GraduationCap, prefix: "TC" },
          { type: "character", title: "Character & Conduct", description: "Student conduct and character reference", icon: UserCheck, prefix: "CHAR" },
          { type: "no_dues", title: "No-Dues / Clearance", description: "School fees and other dues clearance", icon: CreditCard, prefix: "ND" },
        ] as const).map(template => {
          const selected = activeCertType === template.type;
          const Icon = template.icon;
          return <button key={template.type} type="button" aria-pressed={selected} onClick={() => {
            setActiveCertType(template.type);
            setCertData(prev => ({ ...prev, certNumber: `${template.prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` }));
          }} className={`template-choice ${selected ? "border-teal-300 bg-teal-50 ring-1 ring-teal-200 dark:border-teal-700 dark:bg-teal-950/30 dark:ring-teal-800" : "border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900"}`}>
            <div aria-hidden="true" className="template-thumbnail flex shrink-0 flex-col items-center gap-1.5 rounded border border-slate-200 bg-white p-2 shadow-sm">
              <Icon className="mb-1 h-4 w-4 text-teal-700" /><span className="h-0.5 w-full bg-slate-300" /><span className="h-0.5 w-full bg-slate-200" /><span className="h-0.5 w-3/4 bg-slate-200" /><span className="mt-auto h-0.5 w-1/2 self-end bg-slate-400" />
            </div>
            <div className="min-w-0"><p className="pr-3 text-sm font-semibold text-slate-900 dark:text-zinc-100">{template.title}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">{template.description}</p><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300">{selected ? <><CheckCircle2 size={12} /> Selected template</> : "Use template"}</span></div>
          </button>;
        })}
      </div>

      <div className="certificate-workbench">
        {/* LEFT COLUMN: Student Selector & Editable Controls (No Print) */}
        <div className="certificate-sidebar no-print space-y-4">
          {/* Student Search & Picker */}
          <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900 overflow-hidden">
            {activeRequest ? (
              <CardHeader className="p-4 pb-3 border-b border-indigo-100 bg-indigo-50/70 dark:bg-indigo-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                      Request Fulfillment
                    </CardTitle>
                  </div>
                  <Badge className="bg-indigo-600 text-white text-[10px] font-mono">
                    Req #{activeRequest.id}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Editing exclusively for this student request. No other student data is shown.
                </p>
                {selectedStudent && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-200/80 shadow-2xs">
                    <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      {currentStudentName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      GR: {selectedStudent.gr_number || "N/A"} · Class: {studentClassName} {studentDivision ? `· Div ${studentDivision}` : ""}
                    </p>
                    <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                      Requested: {activeRequest.certificate_type_name || "Certificate"}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="mt-2 text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  <X size={12} /> Exit Request Mode (Show All Students)
                </button>
              </CardHeader>
            ) : (
              <CardHeader className="p-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    Find your student
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {filteredStudents.length} Students
                  </Badge>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    type="text"
                    aria-label="Search students by name, GR number, roll number or phone"
                    placeholder="Name, GR number, roll or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs rounded-xl h-8"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs text-slate-500">Class
                    <select aria-label="Filter students by class" value={classFilter} onChange={e => { setClassFilter(e.target.value); setDivisionFilter("all"); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      <option value="all">All classes</option>{classOptions.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-slate-500">Division
                    <select aria-label="Filter students by division" value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      <option value="all">All divisions</option>{divisionOptions.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                </div>
                <button type="button" onClick={() => { setSearchTerm(""); setClassFilter("all"); setDivisionFilter("all"); }} className="mt-2 text-left text-xs font-medium text-teal-700 hover:underline">Clear filters</button>
                {selectedStudent && <p className="mt-2 rounded-lg bg-teal-50 p-2 text-xs text-teal-800 dark:bg-teal-950 dark:text-teal-200">Selected: {currentStudentName} · GR {selectedStudent.gr_number}</p>}
              </CardHeader>
            )}
            <CardContent className="p-2 max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-teal-600" /> Loading students...
                </div>
              ) : displayedStudents.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">No students found.</div>
              ) : (
                displayedStudents.map((stu) => {
                  const isSel = selectedStudent?.id === stu.id;
                  const name = `${stu.first_name || ""} ${stu.last_name || ""} ${stu.student_name || stu.name || ""}`.trim() || "Student";
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      aria-pressed={isSel}
                      onClick={() => handleSelectStudent(stu)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        isSel
                          ? "bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-100 font-semibold"
                          : "hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold truncate">{name}</p>
                        <p className="text-[10px] text-gray-400">
                          GR: {stu.gr_number || "Pending GR"} | Class: {stu.school_class_name || (typeof stu.school_class === "object" ? stu.school_class?.school_class : stu.school_class) || "-"}
                        </p>
                      </div>
                      {isSel && <CheckCircle2 size={14} className="text-teal-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Optional document settings */}
          <details className="document-settings"><summary><Settings2 size={16} /> Document settings <ChevronDown size={14} /></summary>
          <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 border-b border-gray-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Header & document details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Dynamic School Header Config */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">School Name on Header</label>
                <Input
                  value={certData.schoolName}
                  onChange={(e) => setCertData({ ...certData, schoolName: e.target.value })}
                  className="text-xs font-bold h-8 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">School Affiliation / Tagline</label>
                <Input
                  value={certData.schoolSubtitle}
                  onChange={(e) => setCertData({ ...certData, schoolSubtitle: e.target.value })}
                  className="text-xs h-8 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Certificate / Serial No.</label>
                <Input
                  value={certData.certNumber}
                  onChange={(e) => setCertData({ ...certData, certNumber: e.target.value })}
                  className="text-xs font-mono h-8 rounded-lg"
                />
              </div>
              <label className="block space-y-1 text-xs text-slate-500">School address / contact
                <Input value={certData.schoolAddress} onChange={e => setCertData(prev => ({ ...prev, schoolAddress: e.target.value }))} className="text-xs" />
              </label>
              {activeCertType === "leaving_certificate" && <label className="block space-y-1 text-xs text-slate-500">General remarks
                <Input value={certData.remarks} onChange={e => setCertData(prev => ({ ...prev, remarks: e.target.value }))} className="text-xs" />
              </label>}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Date of Issue</label>
                  <DatePicker
                    value={certData.issueDate}
                    required
                    onChange={value => setCertData({ ...certData, issueDate: value })}
                    className="text-xs h-8 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Academic Year</label>
                  <Input
                    value={certData.academicYear}
                    onChange={(e) => setCertData({ ...certData, academicYear: e.target.value })}
                    className="text-xs h-8 rounded-lg"
                  />
                </div>
              </div>

              {activeCertType === "bonafide" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Purpose of Certificate</label>
                  <Input
                    value={certData.purpose}
                    onChange={(e) => setCertData({ ...certData, purpose: e.target.value })}
                    placeholder="e.g. Passport, Bank Account Opening..."
                    className="text-xs h-8 rounded-lg"
                  />
                </div>
              )}

              {activeCertType === "leaving_certificate" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Reason for Leaving</label>
                    <Input
                      value={certData.reasonForLeaving}
                      onChange={(e) => setCertData({ ...certData, reasonForLeaving: e.target.value })}
                      className="text-xs h-8 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Date of Leaving</label>
                      <DatePicker
                        value={certData.dateOfLeaving}
                        required
                        onChange={value => setCertData({ ...certData, dateOfLeaving: value })}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Student Progress</label>
                      <Input
                        value={certData.progress}
                        onChange={(e) => setCertData({ ...certData, progress: e.target.value })}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {(activeCertType === "bonafide" || activeCertType === "character" || activeCertType === "leaving_certificate") && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Conduct / Character</label>
                  <select
                    value={certData.conduct}
                    onChange={(e) => setCertData({ ...certData, conduct: e.target.value })}
                    className="w-full text-xs h-8 rounded-lg border border-gray-200 dark:border-zinc-700 px-2 bg-white dark:bg-zinc-900"
                  >
                    <option value="Exemplary">Exemplary</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                  </select>
                </div>
              )}

              {activeCertType === "no_dues" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">All Dues Cleared Up To</label>
                  <Input
                    value={certData.duesClearedUpTo}
                    onChange={(e) => setCertData({ ...certData, duesClearedUpTo: e.target.value })}
                    className="text-xs h-8 rounded-lg"
                  />
                </div>
              )}

              {/* Watermark checkbox */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <input
                  type="checkbox"
                  id="chk-duplicate"
                  checked={isDuplicate}
                  onChange={(e) => setIsDuplicate(e.target.checked)}
                  className="h-4 w-4 text-teal-600 rounded cursor-pointer"
                />
                <label htmlFor="chk-duplicate" className="text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer">
                  Mark as &quot;DUPLICATE COPY&quot;
                </label>
              </div>
            </CardContent>
          </Card>
          </details>
        </div>

        {/* RIGHT COLUMN: Real-time Certificate Paper Preview & Print Canvas */}
        <div className="certificate-preview">
          <Card className="certificate-preview-card">
            <div className="certificate-toolbar no-print">
              <div><span className="editor-status" /><span className="font-semibold">Live document</span><span className="editor-paper-label">A4 / Click text to edit</span></div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={!selectedStudent} onClick={() => document.getElementById("printable-certificate")?.focus()}><Edit2 size={14} /> Edit text</Button>
                <Button type="button" variant="ghost" size="sm" disabled={!selectedStudent} onClick={() => { delete drafts.current[draftKey]; setCanvasRevision(value => value + 1); }}><RefreshCw size={14} /> Reset</Button>
                <Button type="button" className="office-primary" disabled={!selectedStudent} onClick={handlePrint}><Printer size={15} /> Print</Button>
                {activeRequest && (
                  <Button
                    type="button"
                    disabled={!selectedStudent || isSendingDigitalCopy}
                    onClick={handleSendDigitalCopy}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    {isSendingDigitalCopy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Digital Copy to Student & Parent
                  </Button>
                )}
              </div>
            </div>
            <div className="certificate-paper-stage">
            <InlineCertificate documentKey={draftKey} revision={canvasRevision} readDraft={() => drafts.current[draftKey]} onSave={html => { drafts.current[draftKey] = html; }} editable={!!selectedStudent && !loading}>
              {/* Optional Duplicate Watermark */}
              {isDuplicate && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none z-0">
                  <span className="text-7xl font-extrabold rotate-[-35deg] text-red-600 border-8 border-red-600 p-6 rounded-3xl">
                    DUPLICATE
                  </span>
                </div>
              )}

              {/* DYNAMIC SCHOOL HEADER */}
              <div className="text-center pb-4 border-b-2 border-slate-800 relative z-10">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <GraduationCap className="h-8 w-8 text-slate-800" />
                  <h2 className="text-2xl font-bold uppercase tracking-wide font-sans">
                    {certData.schoolName || "SCHOOL NAME"}
                  </h2>
                </div>
                <p className="text-xs font-sans text-slate-600">
                  {certData.schoolSubtitle}
                </p>
                <p className="text-[11px] font-sans text-slate-500">
                  {certData.schoolAddress}
                </p>
              </div>

              {/* CERTIFICATE TITLE & REF */}
              <div className="py-4 text-center relative z-10">
                <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-sans text-slate-600 mb-2">
                  <span><strong>Serial / Reg No:</strong> {certData.certNumber}</span>
                  <span><strong>G.R. No:</strong> {selectedStudent?.gr_number || "_______"}</span>
                  <span><strong>Date:</strong> {formatDDMMYYYY(certData.issueDate)}</span>
                </div>

                <div className="inline-block px-6 py-1.5 border-b-2 border-t-2 border-slate-800 my-2">
                  <h3 className="text-lg font-bold uppercase tracking-widest font-sans">
                    {activeCertType === "bonafide" && "BONAFIDE CERTIFICATE"}
                    {activeCertType === "leaving_certificate" && "SCHOOL LEAVING CERTIFICATE"}
                    {activeCertType === "character" && "CHARACTER & CONDUCT CERTIFICATE"}
                    {activeCertType === "no_dues" && "FEE CLEARANCE & NO-DUES CERTIFICATE"}
                  </h3>
                </div>
              </div>

              {/* BODY TEMPLATES */}
              <div className="py-4 space-y-4 text-justify relative z-10 leading-loose">
                {activeCertType === "bonafide" && (
                  <>
                    <p>
                      This is to certify that Master / Miss{" "}
                      <strong className="underline underline-offset-4 font-bold text-base px-1">
                        {currentStudentName}
                      </strong>
                      , son/daughter of Mr.{" "}
                      <strong className="underline underline-offset-4 px-1">
                        {selectedStudent?.father_name || "__________________"}
                      </strong>{" "}
                      and Mrs.{" "}
                      <strong className="underline underline-offset-4 px-1">
                        {selectedStudent?.mother_name || "__________________"}
                      </strong>
                      , is a bonafide student of this institution studying in{" "}
                      <strong className="underline underline-offset-4 px-1">
                        Class {studentClassName} - Division {studentDivision}
                      </strong>{" "}
                      (Roll No. {selectedStudent?.roll_number || "___"}) during the Academic Year{" "}
                      <strong className="underline underline-offset-4 px-1">{certData.academicYear}</strong>.
                    </p>

                    <p>
                      As per the School General Register (G.R. No. <strong>{selectedStudent?.gr_number || "______"}</strong>),
                      his/her Date of Birth recorded in our register is{" "}
                      <strong className="underline underline-offset-4 px-1">
                        {selectedStudent?.date_of_birth ? formatDDMMYYYY(selectedStudent.date_of_birth) : "__________"}
                      </strong>{" "}
                      {selectedStudent?.date_of_birth && (
                        <span>
                          (in words:{" "}
                          <strong className="underline underline-offset-4 px-1">
                            {formatDateToWords(selectedStudent.date_of_birth)}
                          </strong>
                          )
                        </span>
                      )}
                      .
                    </p>

                    <p>
                      To the best of our knowledge and school records, his/her general conduct and character have been{" "}
                      <strong className="underline underline-offset-4 px-1">{certData.conduct}</strong>.
                    </p>

                    <p>
                      This certificate is issued upon the request of his/her parents/guardian for the purpose of{" "}
                      <strong className="underline underline-offset-4 px-1">{certData.purpose}</strong>.
                    </p>
                  </>
                )}

                {activeCertType === "leaving_certificate" && (
                  <div className="space-y-2 text-xs font-sans">
                    <div className="grid grid-cols-2 gap-y-2 border border-slate-400 p-3 rounded bg-slate-50/50 text-[12px]">
                      <div>1. General Register (G.R.) No: <strong>{selectedStudent?.gr_number || "N/A"}</strong></div>
                      <div>2. Student UID / Aadhaar: <strong>{selectedStudent?.gr_number || "____________"}</strong></div>
                      <div className="col-span-2">3. Full Name of Pupil: <strong>{currentStudentName}</strong></div>
                      <div>4. Father&apos;s / Guardian&apos;s Name: <strong>{selectedStudent?.father_name || "N/A"}</strong></div>
                      <div>5. Mother&apos;s Name: <strong>{selectedStudent?.mother_name || "N/A"}</strong></div>
                      <div>6. Nationality: <strong>{selectedStudent?.nationality || "Indian"}</strong></div>
                      <div>7. Religion & Caste: <strong>{selectedStudent?.religion || "-"} / {selectedStudent?.caste || "-"}</strong></div>
                      <div>8. Place of Birth: <strong>{selectedStudent?.place_of_birth || "N/A"}</strong></div>
                      <div>9. Date of Birth (in figures): <strong>{formatDDMMYYYY(selectedStudent?.date_of_birth)}</strong></div>
                      <div className="col-span-2">10. Date of Birth (in words): <strong>{formatDateToWords(selectedStudent?.date_of_birth || "") || "N/A"}</strong></div>
                      <div className="col-span-2">11. Last School Attended: <strong>{selectedStudent?.previous_school || "Admitted Directly"}</strong></div>
                      <div>12. Date of Admission: <strong>{formatDDMMYYYY(selectedStudent?.admission_date)}</strong></div>
                      <div>13. Class Admitted: <strong>Class {studentClassName}</strong></div>
                      <div>14. Progress in Studies: <strong>{certData.progress}</strong></div>
                      <div>15. Conduct & Behavior: <strong>{certData.conduct}</strong></div>
                      <div>16. Date of Leaving School: <strong>{formatDDMMYYYY(certData.dateOfLeaving)}</strong></div>
                      <div className="col-span-2">17. Reason for Leaving School: <strong>{certData.reasonForLeaving}</strong></div>
                      <div className="col-span-2">18. General Remarks: <strong>{certData.remarks}</strong></div>
                    </div>
                    <p className="text-center font-serif text-[11px] pt-1">
                      Certified that the above information is in accordance with the School General Register.
                    </p>
                  </div>
                )}

                {activeCertType === "character" && (
                  <>
                    <p>
                      This is to certify that Master / Miss{" "}
                      <strong className="underline underline-offset-4 font-bold text-base px-1">
                        {currentStudentName}
                      </strong>
                      , G.R. No. <strong>{selectedStudent?.gr_number || "_______"}</strong>, has been a bonafide student of this school in{" "}
                      <strong className="underline underline-offset-4 px-1">Class {studentClassName}</strong> during the academic term{" "}
                      <strong className="underline underline-offset-4 px-1">{certData.academicYear}</strong>.
                    </p>

                    <p>
                      During his/her tenure at this institution, he/she has displayed{" "}
                      <strong className="underline underline-offset-4 px-1">{certData.conduct}</strong> conduct, moral character, and active participation in school co-curricular activities. He/she bears an unblemished moral character.
                    </p>

                    <p>We wish him/her all success in his/her future endeavors and studies.</p>
                  </>
                )}

                {activeCertType === "no_dues" && (
                  <>
                    <p>
                      This is to certify that all school fees, tuition charges, examination fees, library books, and laboratory equipment dues against Master / Miss{" "}
                      <strong className="underline underline-offset-4 font-bold text-base px-1">
                        {currentStudentName}
                      </strong>{" "}
                      (G.R. No. <strong>{selectedStudent?.gr_number || "_______"}</strong>, Class{" "}
                      <strong className="underline underline-offset-4 px-1">
                        {studentClassName} - {studentDivision}
                      </strong>
                      ) have been fully settled and cleared up to{" "}
                      <strong className="underline underline-offset-4 px-1">{certData.duesClearedUpTo}</strong>.
                    </p>

                    <p>There are no outstanding liabilities or financial dues pending against the student on our accounts records.</p>
                  </>
                )}
              </div>

              {/* FOOTER SIGNATURES */}
              <div className="pt-12 grid grid-cols-3 text-center text-xs font-sans relative z-10">
                <div>
                  <div className="border-t border-slate-700 pt-1.5 mx-2 sm:mx-6 font-semibold">Prepared By (Clerk)</div>
                </div>
                <div>
                  <div className="border-t border-slate-700 pt-1.5 mx-2 sm:mx-6 font-semibold">Verified By / Head Clerk</div>
                </div>
                <div>
                  <div className="border-t border-slate-700 pt-1.5 mx-2 sm:mx-6 font-semibold">Principal / Headmaster</div>
                  <p className="text-[10px] text-slate-400 mt-1">(With Official Seal)</p>
                </div>
              </div>
            </InlineCertificate>
            </div>
          </Card>
        </div>
      </div>
      </>
      )}

      {/* Clerk Approval & Issue Modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Issue & Approve Certificate</h3>
                <p className="text-xs text-slate-500">
                  Student: {approvalModal.student_name} · {approvalModal.certificate_type_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setApprovalModal(null);
                  setApprovalFile(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Attach Certificate File (Optional PDF / Scan)
                </label>
                <input
                  type="file"
                  onChange={(e) => setApprovalFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  You can upload a signed or stamped certificate file for student and parent download.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                Approving this request will generate an official certificate number and make it ready/issued
                for both the student and parent.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setApprovalModal(null);
                    setApprovalFile(null);
                  }}
                  disabled={isApproving}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Issuing Certificate...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Approve & Issue Certificate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
