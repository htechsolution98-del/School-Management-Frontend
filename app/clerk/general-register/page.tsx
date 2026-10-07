"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Download,
  Printer,
  ArrowLeft,
  Filter,
  Users,
  GraduationCap,
  Calendar,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { fetchAdmissions } from "@/lib/clerk/admissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudentRecord {
  id: number | string;
  gr_number?: string;
  admission_date?: string;
  first_name?: string;
  last_name?: string;
  surname?: string;
  student_name?: string;
  name?: string;
  father_name?: string;
  mother_name?: string;
  gender?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  religion?: string;
  caste?: string;
  sub_caste?: string;
  category?: string;
  mother_tongue?: string;
  nationality?: string;
  aadhar_number?: string;
  school_class_name?: string;
  school_class?: any;
  division_name?: string;
  division?: any;
  roll_number?: string | number;
  previous_school?: string;
  date_of_leaving?: string;
  reason_for_leaving?: string;
  is_active?: boolean;
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

export default function GeneralRegisterPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState<string>("School");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("school_name");
      if (saved && saved.trim()) {
        setSchoolName(saved.trim().toUpperCase());
      }
    } catch {}

    async function loadData() {
      setLoading(true);
      try {
        const [admissionsData, stuData, clsData, profileData] = await Promise.all([
          fetchAdmissions().catch(() => []),
          fetchWithAuth(`${API_BASE_URL}/students/`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetchWithAuth(`${API_BASE_URL}/getclass/`)
            .then((r) => (r.ok ? r.json() : fetchWithAuth(`${API_BASE_URL}/schoolclass/`).then((r2) => r2.ok ? r2.json() : [])))
            .catch(() => []),
          fetchWithAuth(`${API_BASE_URL}/me/`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (profileData?.school?.name || profileData?.school_name) {
          setSchoolName(String(profileData.school?.name || profileData.school_name).toUpperCase());
        }

        const unifiedList: StudentRecord[] = [];
        const seenKeys = new Set<string>();

        // 1. Process Admissions
        if (Array.isArray(admissionsData)) {
          admissionsData.forEach((adm: any) => {
            const sName =
              getFieldValue(adm, [/student.*name/i, /full.*name/i, /first.*name/i]) ||
              `Student #${adm.admission_number || adm.id}`;
            const fName = getFieldValue(adm, [/father.*name/i, /father/i]);
            const mName = getFieldValue(adm, [/mother.*name/i, /mother/i]);
            const dob = getFieldValue(adm, [/date.*of.*birth/i, /birth.*date/i, /dob/i]);
            const caste = getFieldValue(adm, [/caste/i, /sub.*caste/i]);
            const religion = getFieldValue(adm, [/religion/i]);
            const category = getFieldValue(adm, [/category/i]);
            const gender = getFieldValue(adm, [/gender/i, /sex/i]);
            const aadhar = getFieldValue(adm, [/aadhaar/i, /aadhar/i, /uid/i]);
            const previousSchool = getFieldValue(adm, [/previous.*school/i, /last.*school/i]);
            const birthPlace = getFieldValue(adm, [/birth.*place/i, /place.*of.*birth/i]);
            const motherTongue = getFieldValue(adm, [/mother.*tongue/i, /language/i]);

            const item: StudentRecord = {
              id: `adm-${adm.id || adm.admission_number}`,
              gr_number: adm.gr_number || adm.gr_no || "",
              student_name: sName,
              name: sName,
              first_name: sName.split(" ")[0] || sName,
              last_name: sName.split(" ").slice(1).join(" ") || "",
              father_name: fName,
              mother_name: mName,
              date_of_birth: dob,
              caste,
              religion,
              category,
              gender,
              place_of_birth: birthPlace,
              mother_tongue: motherTongue,
              previous_school: previousSchool,
              aadhar_number: aadhar,
              school_class_name: adm.school_class || getFieldValue(adm, [/class/i, /standard/i]) || "Class",
              division_name: adm.division || "A",
              admission_date: adm.created_at ? new Date(adm.created_at).toISOString().split("T")[0] : "",
              is_active: adm.status !== "rejected",
            };

            const key = item.gr_number ? `gr-${item.gr_number}` : `adm-${adm.admission_number || adm.id}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              unifiedList.push(item);
            }
          });
        }

        // 2. Process Direct Students
        const directList = Array.isArray(stuData) ? stuData : stuData?.results || stuData?.data || [];
        if (Array.isArray(directList)) {
          directList.forEach((stu: any) => {
            const key = stu.gr_number ? `gr-${stu.gr_number}` : `stu-${stu.id}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
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
                category: stu.category,
                aadhar_number: stu.aadhar_number,
                mother_tongue: stu.mother_tongue,
                school_class_name: stu.school_class_name || (typeof stu.school_class === "object" ? stu.school_class?.school_class : stu.school_class) || "Class",
                division_name: stu.division_name || (typeof stu.division === "object" ? stu.division?.division_name : stu.division) || "A",
                roll_number: stu.roll_number,
                admission_date: stu.admission_date,
                previous_school: stu.previous_school,
                date_of_leaving: stu.date_of_leaving,
                reason_for_leaving: stu.reason_for_leaving,
                is_active: stu.is_active !== false,
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

        const cList = Array.isArray(clsData) ? clsData : clsData?.results || clsData?.data || [];
        setClasses(cList);
      } catch (err) {
        console.error("Failed to load General Register records:", err);
        toast.error("Could not load G.R. records.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered dataset
  const filteredList = useMemo(() => {
    return students.filter((stu) => {
      const q = searchTerm.toLowerCase();
      const fullName = `${stu.first_name || ""} ${stu.last_name || ""} ${stu.student_name || ""} ${stu.name || ""}`.toLowerCase();
      const gr = String(stu.gr_number || "").toLowerCase();
      const aadhar = String(stu.aadhar_number || "").toLowerCase();
      const caste = String(stu.caste || "").toLowerCase();
      const clsName = String(
        stu.school_class_name || (typeof stu.school_class === "object" ? stu.school_class?.school_class : stu.school_class) || ""
      ).toLowerCase();

      const matchSearch =
        !q ||
        fullName.includes(q) ||
        gr.includes(q) ||
        aadhar.includes(q) ||
        caste.includes(q) ||
        clsName.includes(q);

      const matchClass =
        selectedClass === "all" ||
        stu.school_class === selectedClass ||
        stu.school_class_name === selectedClass ||
        (typeof stu.school_class === "object" && String(stu.school_class?.id) === selectedClass);

      const matchGender =
        selectedGender === "all" ||
        String(stu.gender || "").toLowerCase() === selectedGender.toLowerCase();

      const matchStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && (stu.is_active !== false && !stu.date_of_leaving)) ||
        (selectedStatus === "left" && (stu.is_active === false || !!stu.date_of_leaving));

      return matchSearch && matchClass && matchGender && matchStatus;
    });
  }, [students, searchTerm, selectedClass, selectedGender, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.is_active !== false && !s.date_of_leaving).length;
    const left = total - active;
    const boys = students.filter((s) => String(s.gender || "").toLowerCase() === "male").length;
    const girls = students.filter((s) => String(s.gender || "").toLowerCase() === "female").length;
    return { total, active, left, boys, girls };
  }, [students]);

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      toast.error("No records to export.");
      return;
    }

    const headers = [
      "G.R. No",
      "Admission Date",
      "Student Full Name",
      "Father Name",
      "Mother Name",
      "Gender",
      "Date of Birth",
      "Birth Place",
      "Religion",
      "Caste",
      "Category",
      "Mother Tongue",
      "Aadhaar Number",
      "Class",
      "Division",
      "Previous School",
      "Date of Leaving",
      "Reason for Leaving",
      "Status",
    ];

    const rows = filteredList.map((s) => {
      const name = `${s.first_name || ""} ${s.last_name || ""} ${s.student_name || s.name || ""}`.trim();
      const cls = s.school_class_name || (typeof s.school_class === "object" ? s.school_class?.school_class : s.school_class) || "-";
      const div = s.division_name || (typeof s.division === "object" ? s.division?.division_name : s.division) || "-";
      const status = s.date_of_leaving || s.is_active === false ? "Left / TC Issued" : "Active / Studying";

      return [
        `"${s.gr_number || ""}"`,
        `"${s.admission_date || ""}"`,
        `"${name}"`,
        `"${s.father_name || ""}"`,
        `"${s.mother_name || ""}"`,
        `"${s.gender || ""}"`,
        `"${s.date_of_birth || ""}"`,
        `"${s.place_of_birth || ""}"`,
        `"${s.religion || ""}"`,
        `"${s.caste || ""}"`,
        `"${s.category || ""}"`,
        `"${s.mother_tongue || ""}"`,
        `"${s.aadhar_number || ""}"`,
        `"${cls}"`,
        `"${div}"`,
        `"${s.previous_school || ""}"`,
        `"${s.date_of_leaving || ""}"`,
        `"${s.reason_for_leaving || ""}"`,
        `"${status}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${schoolName.replace(/\s+/g, "_")}_General_Register_GR_Book_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("General Register exported to CSV successfully.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Print stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-gr-book,
          #printable-gr-book * {
            visibility: visible;
          }
          #printable-gr-book {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 12px;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Link href="/clerk" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              General Register (G.R. Book / दाखला रजिस्टर)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pl-11">
            School: <strong className="text-gray-800 dark:text-zinc-200">{schoolName}</strong> · Official legal ledger of student admissions, birth records, caste, and school leaving history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs font-semibold rounded-xl border-gray-200 dark:border-zinc-800 gap-1.5"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Export Excel/CSV
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-4 shadow-md flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Register
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500">Total Registered</span>
          <p className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-1">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Currently On Roll</span>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.active}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Left / TC Issued</span>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.left}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">Boys</span>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.boys}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">Girls</span>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">{stats.girls}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="no-print rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search GR, Name, Caste, UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs rounded-xl h-9"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 bg-white dark:bg-zinc-900 font-medium"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.school_class || c.name || String(c.id)}>
                  {c.school_class || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 bg-white dark:bg-zinc-900 font-medium"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 bg-white dark:bg-zinc-900 font-medium"
            >
              <option value="all">All Status (Active & Left)</option>
              <option value="active">Active On Roll</option>
              <option value="left">Left School (TC Issued)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* G.R. BOOK LEDGER TABLE (Standard 16-Column Legal Format) */}
      <Card id="printable-gr-book" className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Printable School Register Header */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 border-b border-gray-100 dark:border-zinc-800 text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wide">
            {schoolName} — GENERAL REGISTER OF PUPILS (G.R. BOOK)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Prescribed format under the State Education Code & Department of Education
          </p>
          <div className="flex justify-between items-center text-[11px] text-gray-400 mt-2 px-2">
            <span>Showing: <strong>{filteredList.length}</strong> Records</span>
            <span>Generated Date: <strong>{new Date().toLocaleDateString("en-IN")}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold border-b border-gray-200 dark:border-zinc-700 text-[11px] uppercase tracking-wider">
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 text-center w-14">G.R. No</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 w-24">Adm. Date</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 min-w-[180px]">Student Full Name</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 min-w-[140px]">Father&apos;s Name</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 min-w-[120px]">Mother&apos;s Name</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 w-16 text-center">Gender</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 min-w-[120px]">Religion & Caste</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 w-24">Date of Birth</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 min-w-[110px]">Birthplace</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 w-24">Class Admitted</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 min-w-[140px]">Previous School</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 w-24">Date Left</th>
                <th className="p-3 border-r border-gray-200 dark:border-zinc-700 min-w-[130px]">Reason for Leaving</th>
                <th className="p-3 text-center w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading General Register data...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-10 text-center text-gray-400">
                    No G.R. records found.
                  </td>
                </tr>
              ) : (
                filteredList.map((stu, idx) => {
                  const name = `${stu.first_name || ""} ${stu.last_name || ""} ${stu.student_name || stu.name || ""}`.trim();
                  const cls = stu.school_class_name || (typeof stu.school_class === "object" ? stu.school_class?.school_class : stu.school_class) || "-";
                  const isLeft = !!stu.date_of_leaving || stu.is_active === false;

                  return (
                    <tr
                      key={stu.id || idx}
                      className={`hover:bg-blue-50/40 dark:hover:bg-zinc-800/50 transition-colors ${
                        isLeft ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-mono font-bold text-center text-blue-700 dark:text-blue-400">
                        {stu.gr_number || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-mono text-[11px] text-gray-600 dark:text-zinc-400">
                        {stu.admission_date || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-semibold text-gray-900 dark:text-zinc-100">
                        <Link href={`/clerk/students`} className="hover:underline hover:text-blue-600">
                          {name || "Student"}
                        </Link>
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                        {stu.father_name || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                        {stu.mother_name || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-center capitalize text-gray-600 dark:text-zinc-400">
                        {stu.gender ? stu.gender.charAt(0).toUpperCase() + stu.gender.slice(1) : "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                        {stu.religion || stu.caste ? `${stu.religion || ""}${stu.caste ? " / " + stu.caste : ""}` : "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-mono text-[11px] text-gray-600 dark:text-zinc-400">
                        {stu.date_of_birth || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-zinc-400">
                        {stu.place_of_birth || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-medium">
                        {cls}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 truncate max-w-[140px]">
                        {stu.previous_school || "Direct Adm."}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-mono text-[11px] text-gray-500">
                        {stu.date_of_leaving || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 text-gray-500 truncate max-w-[130px]">
                        {stu.reason_for_leaving || "—"}
                      </td>
                      <td className="p-2.5 text-center">
                        {isLeft ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Left / TC
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
