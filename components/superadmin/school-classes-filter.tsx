"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Filter,
  X,
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldAlert,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  SlidersHorizontal,
  IdCard,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SchoolLogo } from "@/components/superadmin/school-logo";
import type { SchoolStudent } from "@/lib/superadmin";

interface ClassStat {
  id: number;
  name: string;
  total_students: number;
  boys: number;
  girls: number;
}

interface SchoolClassesFilterProps {
  classes: ClassStat[];
  students?: SchoolStudent[];
  schoolName?: string;
  schoolLogo?: string | null;
}

export function SchoolClassesFilter({ classes = [], students = [], schoolName, schoolLogo }: SchoolClassesFilterProps) {
  const [activeView, setActiveView] = useState<"roster" | "stats">("roster");
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedRte, setSelectedRte] = useState<string>("all");
  const [selectedVerification, setSelectedVerification] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Student Detail Modal
  const [inspectStudent, setInspectStudent] = useState<SchoolStudent | null>(null);

  // Active filter count
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedClassId !== "all" ||
    selectedGender !== "all" ||
    selectedRte !== "all" ||
    selectedVerification !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClassId("all");
    setSelectedGender("all");
    setSelectedRte("all");
    setSelectedVerification("all");
    setCurrentPage(1);
  };

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (st.name || "").toLowerCase().includes(query);
        const matchesRoll = (st.roll_no || "").toLowerCase().includes(query);
        const matchesGr = (st.gr_no || "").toLowerCase().includes(query);
        const matchesFather = (st.father_name || "").toLowerCase().includes(query);
        const matchesMother = (st.mother_name || "").toLowerCase().includes(query);
        const matchesMobile = (st.mobile || "").toLowerCase().includes(query);
        const matchesAadhar = (st.aadhar_number || "").toLowerCase().includes(query);
        const matchesClass = (st.class_name || "").toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesRoll &&
          !matchesGr &&
          !matchesFather &&
          !matchesMother &&
          !matchesMobile &&
          !matchesAadhar &&
          !matchesClass
        ) {
          return false;
        }
      }

      // 2. Class Filter
      if (selectedClassId !== "all") {
        if (selectedClassId === "unassigned") {
          if (st.class_id !== null && st.class_id !== undefined) return false;
        } else {
          if (String(st.class_id) !== selectedClassId && st.class_name !== selectedClassId) {
            return false;
          }
        }
      }

      // 3. Gender Filter
      if (selectedGender !== "all") {
        const gender = (st.gender || "").toLowerCase();
        if (selectedGender === "male" && gender !== "male" && gender !== "boy" && gender !== "m") return false;
        if (selectedGender === "female" && gender !== "female" && gender !== "girl" && gender !== "f") return false;
        if (selectedGender === "other" && gender !== "other") return false;
      }

      // 4. RTE Filter
      if (selectedRte !== "all") {
        const isRte = Boolean(st.is_rte);
        if (selectedRte === "rte" && !isRte) return false;
        if (selectedRte === "general" && isRte) return false;
      }

      // 5. Verification Filter
      if (selectedVerification !== "all") {
        const isVerified = Boolean(st.is_verified);
        if (selectedVerification === "verified" && !isVerified) return false;
        if (selectedVerification === "pending" && isVerified) return false;
      }

      return true;
    });
  }, [students, searchQuery, selectedClassId, selectedGender, selectedRte, selectedVerification]);

  // Reset page when filter changes
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Top Header Controls: Title & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Classes & Student Directory
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Filter and inspect any student across class divisions in real-time
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveView("roster")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeView === "roster"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Students Roster ({filteredStudents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("stats")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeView === "stats"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Class Overview ({classes.length})</span>
          </button>
        </div>
      </div>

      {/* Interactive Quick Class Filter Pills */}
      {classes.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedClassId("all");
              setCurrentPage(1);
            }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedClassId === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>All Classes</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                selectedClassId === "all" ? "bg-indigo-700/80 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {students.length}
            </span>
          </button>

          {classes.map((c) => {
            const isSelected = selectedClassId === String(c.id) || selectedClassId === c.name;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClassId(isSelected ? "all" : String(c.id));
                  setCurrentPage(1);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                    isSelected ? "bg-indigo-700/80 text-white" : "bg-indigo-50 text-indigo-700 font-semibold"
                  }`}
                >
                  {c.total_students}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* FILTER CONTROLS BAR (Only active in roster view or for quick search) */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5">
        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* 1. Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Name, Roll No, GR No, Mobile..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Class Select */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-2xs"
            >
              <option value="all">Class: All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} ({c.total_students})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Gender Select */}
          <div>
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-2xs"
            >
              <option value="all">Gender: All Genders</option>
              <option value="male">Boys / Male</option>
              <option value="female">Girls / Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* 4. RTE Quota Filter */}
          <div>
            <select
              value={selectedRte}
              onChange={(e) => {
                setSelectedRte(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-2xs"
            >
              <option value="all">RTE: All Students</option>
              <option value="rte">RTE Quota Only</option>
              <option value="general">Non-RTE / General</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Showing <strong className="text-slate-900 font-bold">{filteredStudents.length}</strong> of{" "}
              <strong className="text-slate-900">{students.length}</strong> students
            </span>
            {selectedClassId !== "all" && (
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 text-[11px]">
                {classes.find((c) => String(c.id) === selectedClassId)?.name || "Selected Class"}
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
            >
              <X className="h-3 w-3" /> Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* ROSTER VIEW: Filterable Student Data Table */}
      {activeView === "roster" && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-2xs">
          {filteredStudents.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No students match your filter criteria</h4>
              <p className="mt-1 text-xs text-slate-500">
                Try searching with different keywords or clear active class/gender filters.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
                >
                  <X className="h-3.5 w-3.5" /> Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Class / Division</th>
                    <th className="p-3.5">Roll No</th>
                    <th className="p-3.5">GR No</th>
                    <th className="p-3.5">Gender</th>
                    <th className="p-3.5">Mobile</th>
                    <th className="p-3.5">RTE Quota</th>
                    <th className="p-3.5">Verification</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedStudents.map((st) => {
                    const initials = (st.name || "S")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const isBoy = (st.gender || "").toLowerCase() === "male" || (st.gender || "").toLowerCase() === "boy";
                    const isGirl = (st.gender || "").toLowerCase() === "female" || (st.gender || "").toLowerCase() === "girl";

                    return (
                      <tr key={st.id} className="hover:bg-indigo-50/30 transition-colors">
                        {/* Student Name + Initials */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black ${
                                isBoy
                                  ? "bg-blue-100 text-blue-700"
                                  : isGirl
                                  ? "bg-pink-100 text-pink-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{st.name}</p>
                              {(st.father_name || st.mother_name) && (
                                <p className="text-[10px] text-slate-400 truncate">
                                  {st.father_name ? `F: ${st.father_name}` : ""}
                                  {st.father_name && st.mother_name ? " · " : ""}
                                  {st.mother_name ? `M: ${st.mother_name}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Class & Division */}
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 text-[11px]">
                            {st.class_name}
                            {st.division && <span className="text-indigo-400">({st.division})</span>}
                          </span>
                        </td>

                        {/* Roll No */}
                        <td className="p-3.5">
                          <span className="font-mono font-semibold text-slate-700">{st.roll_no || "—"}</span>
                        </td>

                        {/* GR No */}
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-indigo-600 bg-slate-50 px-1.5 py-0.5 rounded">
                            {st.gr_no || "—"}
                          </span>
                        </td>

                        {/* Gender */}
                        <td className="p-3.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isBoy
                                ? "bg-blue-50 text-blue-700"
                                : isGirl
                                ? "bg-pink-50 text-pink-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {st.gender || "—"}
                          </span>
                        </td>

                        {/* Mobile */}
                        <td className="p-3.5 text-slate-600">
                          {st.mobile && st.mobile !== "—" ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {st.mobile}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* RTE */}
                        <td className="p-3.5">
                          {st.is_rte ? (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 border border-amber-200">
                              RTE Quota
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Regular</span>
                          )}
                        </td>

                        {/* Verification */}
                        <td className="p-3.5">
                          {st.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                              <Clock className="h-3.5 w-3.5" /> Pending
                            </span>
                          )}
                        </td>

                        {/* View Action */}
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectStudent(st)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-2xs"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredStudents.length > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium">
                  Page <strong className="text-slate-900">{safeCurrentPage}</strong> of{" "}
                  <strong className="text-slate-900">{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATS VIEW: Class-Wise Aggregates */}
      {activeView === "stats" && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-2xs">
          {!classes.length ? (
            <p className="p-8 text-center text-xs text-slate-400 font-medium">
              No class divisions configured yet for this school.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3.5">Class / Division</th>
                    <th className="p-3.5">Total Students</th>
                    <th className="p-3.5">Boys</th>
                    <th className="p-3.5">Girls</th>
                    <th className="p-3.5">Gender Ratio</th>
                    <th className="p-3.5 text-right">Quick Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {classes.map((cls) => {
                    const total = cls.total_students || 0;
                    const boysPct = total > 0 ? Math.round(((cls.boys || 0) / total) * 100) : 0;
                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{cls.name}</td>
                        <td className="p-3.5">
                          <span className="font-black text-indigo-600">{total}</span>
                        </td>
                        <td className="p-3.5 text-blue-600 font-semibold">{cls.boys || 0}</td>
                        <td className="p-3.5 text-pink-600 font-semibold">{cls.girls || 0}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2 max-w-[140px]">
                            <div className="h-2 flex-1 rounded-full bg-pink-200 overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${boysPct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{boysPct}% B</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassId(String(cls.id));
                              setActiveView("roster");
                              setCurrentPage(1);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                          >
                            Filter Students ({total}) →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STUDENT DETAILS INSPECTION MODAL */}
      <Dialog open={!!inspectStudent} onOpenChange={(open) => !open && setInspectStudent(null)}>
        <DialogContent className="admin-scroll-area max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Student Profile</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {schoolName ? `${schoolName} · ` : ""}Academic & Personal Records
            </DialogDescription>
          </DialogHeader>

          {inspectStudent && (
            <div className="space-y-4 pt-2">
              {/* Profile Card Header */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-base shadow-sm">
                  {(inspectStudent.name || "S").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-slate-900 truncate">{inspectStudent.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                      {inspectStudent.class_name}
                      {inspectStudent.division ? ` - ${inspectStudent.division}` : ""}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Roll: {inspectStudent.roll_no || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid of Student Details */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">General Register No (GR)</p>
                  <p className="mt-0.5 font-bold font-mono text-slate-800">{inspectStudent.gr_no || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Gender</p>
                  <p className="mt-0.5 font-bold text-slate-800">{inspectStudent.gender || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Father's Name</p>
                  <p className="mt-0.5 font-bold text-slate-800">{inspectStudent.father_name || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Mother's Name</p>
                  <p className="mt-0.5 font-bold text-slate-800">{inspectStudent.mother_name || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Mobile Contact</p>
                  <p className="mt-0.5 font-bold text-slate-800">{inspectStudent.mobile || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Aadhar / National ID</p>
                  <p className="mt-0.5 font-bold font-mono text-slate-800">{inspectStudent.aadhar_number || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Date of Birth</p>
                  <p className="mt-0.5 font-bold text-slate-800">{inspectStudent.dob || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Admission Date</p>
                  <p className="mt-0.5 font-bold text-slate-800">{inspectStudent.admission_date || "—"}</p>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500 font-medium">Category Status:</span>
                <div className="flex items-center gap-2">
                  {inspectStudent.is_rte ? (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-700 text-xs border border-amber-200">
                      RTE Quota Student
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 text-xs">
                      General Category
                    </span>
                  )}
                  {inspectStudent.is_verified ? (
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 text-xs border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 text-xs flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Pending Verification
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
