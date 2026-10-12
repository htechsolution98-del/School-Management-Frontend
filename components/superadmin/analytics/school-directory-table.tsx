"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  MapPin,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  Layers3,
  Calendar,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SchoolLogo } from "@/components/superadmin/school-logo";
import { StatusBadge } from "@/components/superadmin/status-badge";
import { camelCaseText } from "@/lib/table-utils";
import type { School, SuperAdminSchoolRow } from "./types";

interface SchoolDirectoryTableProps {
  schools: School[];
  analyticsSchools: SuperAdminSchoolRow[];
  selectedSchoolId?: number | null;
  onSelectSchool: (school: School) => void;
  loading?: boolean;
}

export function SchoolDirectoryTable({
  schools,
  analyticsSchools,
  selectedSchoolId,
  onSelectSchool,
  loading = false,
}: SchoolDirectoryTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  // Map analytics per school id for instant lookup
  const analyticsMap = useMemo(() => {
    const map = new Map<number, SuperAdminSchoolRow>();
    analyticsSchools.forEach((s) => map.set(s.id, s));
    return map;
  }, [analyticsSchools]);

  // Unique locations for filter dropdown
  const locationsList = useMemo(() => {
    const set = new Set<string>();
    schools.forEach((s) => {
      const loc = [s.city, s.state].filter(Boolean).map(camelCaseText).join(", ");
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [schools]);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      // Status filter
      if (statusFilter === "ACTIVE" && !s.is_active) return false;
      if (statusFilter === "INACTIVE" && s.is_active) return false;

      // Location filter
      if (locationFilter !== "ALL") {
        const loc = [s.city, s.state].filter(Boolean).map(camelCaseText).join(", ");
        if (loc !== locationFilter) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = (s.name || "").toLowerCase().includes(q);
        const codeMatch = (s.code || "").toLowerCase().includes(q);
        const cityMatch = (s.city || "").toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !cityMatch) return false;
      }

      return true;
    });
  }, [schools, statusFilter, locationFilter, search]);

  // Pagination
  const totalPages = Math.ceil(filteredSchools.length / pageSize) || 1;
  const paginatedSchools = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSchools.slice(start, start + pageSize);
  }, [filteredSchools, page, pageSize]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs">
              <Building2 className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">School Directory</h3>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
              {filteredSchools.length} {filteredSchools.length === 1 ? "School" : "Schools"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Complete institutional directory with student counts, workforce metrics, and license entitlements
          </p>
        </div>

        <Link
          href="/superadmin/schools"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs"
        >
          Manage All Schools <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
        {/* Search */}
        <div className="relative min-w-[260px] flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by school name, code, or city…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 shadow-2xs"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
          >
            <option value="ALL">All Locations</option>
            {locationsList.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <th className="p-4">School</th>
              <th className="p-4">Location</th>
              <th className="p-4 text-center">Students</th>
              <th className="p-4 text-center">Staff</th>
              <th className="p-4 text-center">Modules</th>
              <th className="p-4">Plan / Billing</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-xs text-slate-500">
                  Loading registered schools…
                </td>
              </tr>
            ) : paginatedSchools.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-xs text-slate-500">
                  No schools match your search or filter criteria.
                </td>
              </tr>
            ) : (
              paginatedSchools.map((school) => {
                const isSelected = school.id != null && selectedSchoolId === school.id;
                const anData = school.id != null ? analyticsMap.get(school.id) : undefined;
                const activeModulesCount =
                  school.school_features?.filter((f) => f.is_enabled).length ??
                  anData?.enabled_features ??
                  0;
                const studentCount = anData?.total_students ?? 0;
                const staffCount = anData?.total_staff ?? 0;
                const subPlan = anData?.subscription_plan || "Standard";

                return (
                  <tr
                    key={school.id ?? `${school.name}-${school.code}`}
                    onClick={() => onSelectSchool(school)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/60 font-semibold"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* School Name & Code */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <SchoolLogo src={school.logo} name={camelCaseText(school.name)} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {camelCaseText(school.name) || "Unnamed school"}
                            </span>
                            {isSelected && (
                              <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-2xs">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Code: {school.code || "—"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-4 text-slate-500">
                      {[school.city, school.state].filter(Boolean).map(camelCaseText).join(", ") ||
                        "Not provided"}
                    </td>

                    {/* Students */}
                    <td className="p-4 text-center font-bold text-slate-900 tabular-nums">
                      {studentCount.toLocaleString("en-IN")}
                    </td>

                    {/* Staff */}
                    <td className="p-4 text-center font-bold text-slate-900 tabular-nums">
                      {staffCount.toLocaleString("en-IN")}
                    </td>

                    {/* Enabled Modules */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/50">
                        {activeModulesCount} active
                      </span>
                    </td>

                    {/* Plan */}
                    <td className="p-4">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {subPlan}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <StatusBadge active={school.is_active ?? true} />
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSchool(school);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-2xs"
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isSelected ? "Viewing" : "View Analytics"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
        <div>
          Showing{" "}
          <strong className="text-slate-900">
            {filteredSchools.length === 0 ? 0 : (page - 1) * pageSize + 1}
          </strong>{" "}
          to{" "}
          <strong className="text-slate-900">
            {Math.min(page * pageSize, filteredSchools.length)}
          </strong>{" "}
          of <strong className="text-slate-900">{filteredSchools.length}</strong> schools
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="font-bold text-slate-700 px-1">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
