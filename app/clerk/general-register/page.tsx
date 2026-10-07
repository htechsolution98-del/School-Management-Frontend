"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDDMMYYYY } from "@/lib/table-utils";
import "../clerk-workspace.css";
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
  const [detailedView, setDetailedView] = useState(true);
  const [sortBy, setSortBy] = useState("gr-asc");
  const resetFilters = () => { setSearchTerm(""); setSelectedClass("all"); setSelectedGender("all"); setSelectedStatus("all"); };

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
          fetchWithAuth(`${API_BASE_URL}/student/`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetchWithAuth(`${API_BASE_URL}/getclass/`)
            .then((r) => (r.ok ? r.json() : fetchWithAuth(`${API_BASE_URL}/schoolclass/`).then((r2) => r2.ok ? r2.json() : [])))
            .catch(() => []),
          fetchWithAuth(`${API_BASE_URL}/profile/`)
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

  const sortedList = useMemo(() => [...filteredList].sort((a, b) => {
    if (sortBy === "name") return String(a.student_name || a.name || `${a.first_name || ""} ${a.last_name || ""}`).localeCompare(String(b.student_name || b.name || `${b.first_name || ""} ${b.last_name || ""}`));
    const order = String(a.gr_number || "").localeCompare(String(b.gr_number || ""), undefined, { numeric: true });
    return sortBy === "gr-desc" ? -order : order;
  }), [filteredList, sortBy]);

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

    const rows = sortedList.map((s) => {
      const name = `${s.first_name || ""} ${s.last_name || ""} ${s.student_name || s.name || ""}`.trim();
      const cls = s.school_class_name || (typeof s.school_class === "object" ? s.school_class?.school_class : s.school_class) || "-";
      const div = s.division_name || (typeof s.division === "object" ? s.division?.division_name : s.division) || "-";
      const status = s.date_of_leaving || s.is_active === false ? "Left / TC Issued" : "Active / Studying";

      return [
        `"${s.gr_number || ""}"`,
        `"${s.admission_date ? formatDDMMYYYY(s.admission_date) : ""}"`,
        `"${name}"`,
        `"${s.father_name || ""}"`,
        `"${s.mother_name || ""}"`,
        `"${s.gender || ""}"`,
        `"${s.date_of_birth ? formatDDMMYYYY(s.date_of_birth) : ""}"`,
        `"${s.place_of_birth || ""}"`,
        `"${s.religion || ""}"`,
        `"${s.caste || ""}"`,
        `"${s.category || ""}"`,
        `"${s.mother_tongue || ""}"`,
        `"${s.aadhar_number || ""}"`,
        `"${cls}"`,
        `"${div}"`,
        `"${s.previous_school || ""}"`,
        `"${s.date_of_leaving ? formatDDMMYYYY(s.date_of_leaving) : ""}"`,
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
    URL.revokeObjectURL(url);
    toast.success("General Register exported to CSV successfully.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="clerk-page register-page w-full min-w-0 space-y-6">
      {/* Print stylesheet */}
      <style jsx global>{`
        @media screen {
          .gr-compact :is(th, td):nth-child(4), .gr-compact :is(th, td):nth-child(5),
          .gr-compact :is(th, td):nth-child(7), .gr-compact :is(th, td):nth-child(9),
          .gr-compact :is(th, td):nth-child(11), .gr-compact :is(th, td):nth-child(12),
          .gr-compact :is(th, td):nth-child(13) { display: none; }
        }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          html, body, .app-workspace, .app-workspace main { height: auto !important; overflow: visible !important; display: block !important; }
          #printable-gr-book, #printable-gr-book > div { overflow: visible !important; }
          #printable-gr-book table { font-size: 8px !important; }
          #printable-gr-book :is(th, td) { min-width: 0 !important; padding: 4px !important; white-space: normal !important; }
          #printable-gr-book thead { display: table-header-group; }
          #printable-gr-book tr { break-inside: avoid; }
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

      <div className="office-actions justify-end no-print">
        <Button type="button" variant="outline" onClick={handleExportCSV} disabled={loading || filteredList.length === 0}><Download size={14} /> Export CSV</Button>
        <Button type="button" onClick={handlePrint} disabled={loading || filteredList.length === 0} className="office-primary"><Printer size={14} /> Print register</Button>
      </div>
      <section className="register-stats no-print">
        {[
          { label: "Total registered", value: stats.total, caption: "Student records", icon: BookOpen },
          { label: "On roll", value: stats.active, caption: "Currently studying", icon: CheckCircle2 },
          { label: "Left / TC issued", value: stats.left, caption: "Former students", icon: GraduationCap },
          { label: "Boys", value: stats.boys, caption: "Registered students", icon: Users },
          { label: "Girls", value: stats.girls, caption: "Registered students", icon: Users },
        ].map(stat => <div className="register-stat" key={stat.label}><div className="stat-label">{stat.label}<stat.icon size={17} /></div><p className="stat-value">{loading ? <Loader2 className="animate-spin" size={24} /> : stat.value.toLocaleString("en-IN")}</p><p className="stat-caption">{stat.caption}</p></div>)}
      </section>

      {/* Filter Bar */}
      <Card className="register-filter-card no-print rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-zinc-800"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-zinc-100"><Filter size={15} className="text-teal-600" /> Find a record</h2><button type="button" onClick={resetFilters} className="text-xs font-medium text-teal-700 hover:underline">Clear filters</button></div>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><label htmlFor="gr-search">Search students</label><div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="gr-search"
              type="text"
              aria-label="Search register by GR number, name, caste or Aadhaar"
              placeholder="Search GR, Name, Caste, UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs rounded-xl h-9"
            />
          </div></div>

          <div>
            <label htmlFor="gr-class">Class</label>
            <select id="gr-class"
              aria-label="Filter register by class"
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
            <label htmlFor="gr-gender">Gender</label>
            <select id="gr-gender"
              aria-label="Filter register by gender"
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
            <label htmlFor="gr-status">Enrollment status</label>
            <select id="gr-status"
              aria-label="Filter register by status"
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
      <div className="register-toolbar no-print flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-slate-500"><strong className="text-slate-800 dark:text-zinc-100">{filteredList.length}</strong> of {students.length} records <span className="hidden sm:inline">· Scroll horizontally to see all details</span></p>
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label="Sort register entries" value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="gr-asc">GR number: ascending</option><option value="gr-desc">GR number: descending</option><option value="name">Student name: A–Z</option></select>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">{[{ label: "Overview", value: false }, { label: "Full register", value: true }].map(item => <button type="button" key={item.label} aria-pressed={detailedView === item.value} onClick={() => setDetailedView(item.value)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${detailedView === item.value ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200" : "text-slate-500"}`}>{item.label}</button>)}</div>
        </div>
      </div>
      <Card id="printable-gr-book" className={`register-ledger rounded-2xl border-gray-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden ${detailedView ? "" : "gr-compact"}`}>
        {/* Printable School Register Header */}
        <div className="ledger-heading">
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wide">
            {schoolName} — GENERAL REGISTER OF PUPILS (G.R. BOOK)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Prescribed format under the State Education Code & Department of Education
          </p>
          <div className="flex justify-between items-center text-[11px] text-gray-400 mt-2 px-2">
            <span>Showing: <strong>{filteredList.length}</strong> Records</span>
            <span>Generated Date: <strong>{formatDDMMYYYY(new Date())}</strong></span>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto print:max-h-none print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
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
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading General Register data...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-10 text-center text-gray-400">
                    No G.R. records found.
                    <button type="button" onClick={resetFilters} className="no-print mx-auto mt-3 block text-sm font-medium text-teal-700 hover:underline">Clear filters and show all records</button>
                  </td>
                </tr>
              ) : (
                sortedList.map((stu, idx) => {
                  const name = `${stu.first_name || ""} ${stu.last_name || ""} ${stu.student_name || stu.name || ""}`.trim();
                  const cls = stu.school_class_name || (typeof stu.school_class === "object" ? stu.school_class?.school_class : stu.school_class) || "-";
                  const isLeft = !!stu.date_of_leaving || stu.is_active === false;

                  return (
                    <tr
                      key={stu.id || idx}
                      className={`hover:bg-teal-50/40 dark:hover:bg-zinc-800/50 transition-colors ${
                        isLeft ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-mono font-bold text-center text-teal-700 dark:text-teal-400">
                        {stu.gr_number || "—"}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-mono text-[11px] text-gray-600 dark:text-zinc-400">
                        {formatDDMMYYYY(stu.admission_date)}
                      </td>
                      <td className="p-2.5 border-r border-gray-100 dark:border-zinc-800 font-semibold text-gray-900 dark:text-zinc-100">
                        <Link href={`/clerk/students`} className="hover:underline hover:text-teal-600">
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
                        {formatDDMMYYYY(stu.date_of_birth)}
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
                        {formatDDMMYYYY(stu.date_of_leaving)}
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
