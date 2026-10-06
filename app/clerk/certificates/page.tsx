"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
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
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { fetchAdmissions } from "@/lib/clerk/admissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const d = new Date(dateStr);
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
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);

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

  const printRef = useRef<HTMLDivElement>(null);

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
        const res = await fetchWithAuth(`${API_BASE_URL}/profile/`).then((r) =>
          r.ok ? r : fetchWithAuth(`${API_BASE_URL}/user-profile/`)
        );
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
          fetchWithAuth(`${API_BASE_URL}/student/`)
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
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase();
    return students.filter((s) => {
      const name = `${s.first_name || ""} ${s.last_name || ""} ${s.student_name || ""} ${s.name || ""}`.toLowerCase();
      const gr = String(s.gr_number || "").toLowerCase();
      const cls = String(s.school_class_name || (typeof s.school_class === "object" ? s.school_class?.school_class : s.school_class) || "").toLowerCase();
      return name.includes(q) || gr.includes(q) || cls.includes(q);
    });
  }, [students, searchTerm]);

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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
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

      {/* Page Header (No Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Link href="/clerk" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              Certificate Issuance Desk
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pl-11">
            School: <strong className="text-gray-800 dark:text-zinc-200">{certData.schoolName}</strong> · Generate and print Bonafide, School Leaving (TC), Character, & No-Dues Certificates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handlePrint}
            disabled={!selectedStudent}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-5 py-2.5 shadow-md flex items-center gap-2"
          >
            <Printer size={15} /> Print Certificate
          </Button>
        </div>
      </div>

      {/* Certificate Type Selector Tabs (No Print) */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveCertType("bonafide");
            setCertData((p) => ({ ...p, certNumber: `BON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` }));
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCertType === "bonafide"
              ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 shadow-sm"
              : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-sm">Bonafide Certificate</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">Passport, Bank Account, Scholarships</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCertType("leaving_certificate");
            setCertData((p) => ({ ...p, certNumber: `TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` }));
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCertType === "leaving_certificate"
              ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm"
              : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span className="font-bold text-sm">Leaving / TC Certificate</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">Standard Government 16-field format</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCertType("character");
            setCertData((p) => ({ ...p, certNumber: `CHAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` }));
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCertType === "character"
              ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-sm"
              : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-bold text-sm">Character Certificate</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">Conduct, Attendance & Ethics testimonial</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCertType("no_dues");
            setCertData((p) => ({ ...p, certNumber: `NODUES-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` }));
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCertType === "no_dues"
              ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 shadow-sm"
              : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <CreditCard className="h-4 w-4 text-purple-600" />
            <span className="font-bold text-sm">Fee No-Dues / Clearance</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">Fees, Library & Sports clearance</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Student Selector & Editable Controls (No Print) */}
        <div className="no-print lg:col-span-4 space-y-4">
          {/* Student Search & Picker */}
          <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                  Select Student
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {filteredStudents.length} Students
                </Badge>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by Name, GR No, Class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs rounded-xl h-8"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-blue-600" /> Loading students...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">No students found.</div>
              ) : (
                filteredStudents.map((stu) => {
                  const isSel = selectedStudent?.id === stu.id;
                  const name = `${stu.first_name || ""} ${stu.last_name || ""} ${stu.student_name || stu.name || ""}`.trim() || "Student";
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => handleSelectStudent(stu)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        isSel
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-semibold"
                          : "hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold truncate">{name}</p>
                        <p className="text-[10px] text-gray-400">
                          GR: {stu.gr_number || "Pending GR"} | Class: {stu.school_class_name || (typeof stu.school_class === "object" ? stu.school_class?.school_class : stu.school_class) || "-"}
                        </p>
                      </div>
                      {isSel && <CheckCircle2 size={14} className="text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Certificate Parameters Config */}
          <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 border-b border-gray-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                School Header & Certificate Parameters
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">Date of Issue</label>
                  <Input
                    type="date"
                    value={certData.issueDate}
                    onChange={(e) => setCertData({ ...certData, issueDate: e.target.value })}
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
                      <Input
                        type="date"
                        value={certData.dateOfLeaving}
                        onChange={(e) => setCertData({ ...certData, dateOfLeaving: e.target.value })}
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
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="chk-duplicate" className="text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer">
                  Mark as &quot;DUPLICATE COPY&quot;
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Real-time Certificate Paper Preview & Print Canvas */}
        <div className="lg:col-span-8">
          <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-md bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="no-print bg-slate-50 dark:bg-zinc-800/40 p-3 px-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500">
              <span className="font-semibold flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
                <Eye size={14} className="text-blue-600" /> Live Print Preview (A4 Standard)
              </span>
              <span className="font-mono text-[11px] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-700">
                Ref: {certData.certNumber}
              </span>
            </div>

            {/* PRINTABLE CANVAS */}
            <div
              id="printable-certificate"
              ref={printRef}
              className="p-8 sm:p-12 bg-white text-black relative font-serif text-sm leading-relaxed border-8 border-double border-slate-700 m-4 rounded-xl min-h-[700px] flex flex-col justify-between"
            >
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
                <div className="flex justify-between items-center text-xs font-sans text-slate-600 mb-2">
                  <span><strong>Serial / Reg No:</strong> {certData.certNumber}</span>
                  <span><strong>G.R. No:</strong> {selectedStudent?.gr_number || "_______"}</span>
                  <span><strong>Date:</strong> {new Date(certData.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
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
                        {selectedStudent?.date_of_birth || "__________"}
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
                      <div>9. Date of Birth (in figures): <strong>{selectedStudent?.date_of_birth || "N/A"}</strong></div>
                      <div className="col-span-2">10. Date of Birth (in words): <strong>{formatDateToWords(selectedStudent?.date_of_birth || "") || "N/A"}</strong></div>
                      <div className="col-span-2">11. Last School Attended: <strong>{selectedStudent?.previous_school || "Admitted Directly"}</strong></div>
                      <div>12. Date of Admission: <strong>{selectedStudent?.admission_date || "N/A"}</strong></div>
                      <div>13. Class Admitted: <strong>Class {studentClassName}</strong></div>
                      <div>14. Progress in Studies: <strong>{certData.progress}</strong></div>
                      <div>15. Conduct & Behavior: <strong>{certData.conduct}</strong></div>
                      <div>16. Date of Leaving School: <strong>{certData.dateOfLeaving}</strong></div>
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
                  <div className="border-t border-slate-700 pt-1.5 mx-6 font-semibold">Prepared By (Clerk)</div>
                </div>
                <div>
                  <div className="border-t border-slate-700 pt-1.5 mx-6 font-semibold">Verified By / Head Clerk</div>
                </div>
                <div>
                  <div className="border-t border-slate-700 pt-1.5 mx-6 font-semibold">Principal / Headmaster</div>
                  <p className="text-[10px] text-slate-400 mt-1">(With Official Seal)</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
