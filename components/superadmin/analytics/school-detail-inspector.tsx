"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Wallet,
  Layers3,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SchoolLogo } from "@/components/superadmin/school-logo";
import { StatusBadge } from "@/components/superadmin/status-badge";
import { SchoolClassesFilter } from "@/components/superadmin/school-classes-filter";
import { camelCaseText } from "@/lib/table-utils";
import type { School, DetailedSchoolTelemetry } from "./types";

interface SchoolDetailInspectorProps {
  school: School | null;
  details?: any | null;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
}

export function SchoolDetailInspector({
  school,
  details: externalDetails,
  loading: externalLoading,
  error: externalError,
}: SchoolDetailInspectorProps) {
  const [detailTab, setDetailTab] = useState<"summary" | "classes" | "staff" | "modules">("summary");
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalDetails, setInternalDetails] = useState<DetailedSchoolTelemetry | null>(null);

  // Fetch full nested telemetry for the selected school if not passed externally
  useEffect(() => {
    if (externalDetails !== undefined) {
      setInternalDetails(externalDetails);
      return;
    }

    if (!school || !school.id) {
      setInternalDetails(null);
      return;
    }

    let isMounted = true;
    setInternalLoading(true);
    setInternalError(null);

    fetch(`/api/SchoolView/${school.id}/details/`, { credentials: "omit" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load school telemetry (status ${res.status})`);
        }
        return res.json();
      })
      .then((data: DetailedSchoolTelemetry) => {
        if (isMounted) setInternalDetails(data);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.warn("School details error:", err);
          setInternalError(err instanceof Error ? err.message : "Failed to load detailed telemetry");
        }
      })
      .finally(() => {
        if (isMounted) setInternalLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [school?.id, externalDetails]);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;
  const error = externalError !== undefined ? externalError : internalError;
  const details = externalDetails !== undefined ? externalDetails : internalDetails;

  if (!school) {
    return null;
  }

  const metrics = details?.summary_metrics || details?.metrics;
  const classes = details?.classes || [];
  const staff = details?.staff || [];
  const modules = details?.modules || details?.features || [];
  const fees = details?.fees_summary || details?.fees;

  const studentTeacherRatio =
    metrics && Number(metrics.teachers_count) > 0
      ? `${Math.round(Number(metrics.total_students || 0) / Number(metrics.teachers_count))}:1`
      : "—";

  return (
    <section
      id="school-inspector-section"
      className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-200"
      aria-label={`Detailed analytics for ${school.name}`}
    >
      {/* Header Banner */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* School Identity */}
          <div className="flex items-center gap-4 min-w-0">
            <SchoolLogo
              src={school.logo}
              name={camelCaseText(school.name)}
              className="h-14 w-14 rounded-2xl border border-slate-200 shadow-xs"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {camelCaseText(school.name)}
                </h3>
                <StatusBadge active={school.is_active ?? true} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                {school.code && (
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 border border-indigo-200/60">
                    Code: {school.code}
                  </span>
                )}
                {(school.city || school.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {[school.city, school.state, school.country]
                      .filter(Boolean)
                      .map(camelCaseText)
                      .join(", ")}
                  </span>
                )}
                {school.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {school.email}
                  </span>
                )}
                {school.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {school.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center rounded-xl bg-white p-1 border border-slate-200 text-xs font-bold text-slate-600 shadow-2xs">
            {(
              [
                { id: "summary", label: "Overview & Metrics" },
                { id: "classes", label: `Classes (${classes.length})` },
                { id: "staff", label: `Staff Directory (${staff.length})` },
                { id: "modules", label: `Modules (${modules.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 transition-all ${
                  detailTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                    : "hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs font-bold">Loading comprehensive school telemetry…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && details && (
          <div>
            {/* Quick 4 KPI Summary Cards with platform theme palette */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {/* Total Students */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                    Total Students
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 tabular-nums">
                  {(metrics?.total_students ?? 0).toLocaleString("en-IN")}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-sky-700">
                  {metrics?.total_boys ?? 0} Boys · {metrics?.total_girls ?? 0} Girls
                </p>
              </div>

              {/* Total Staff */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    Total Staff
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 tabular-nums">
                  {(metrics?.total_staff ?? 0).toLocaleString("en-IN")}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-purple-700">
                  {metrics?.teachers_count ?? 0} Teachers · {metrics?.active_staff ?? 0} Active
                </p>
              </div>

              {/* Classes */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    Active Classes
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 tabular-nums">
                  {classes.length}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-indigo-700">
                  Enrolled Class Groups
                </p>
              </div>

              {/* Ratio */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Student : Teacher
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 tabular-nums">
                  {studentTeacherRatio}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-amber-700">
                  Institutional Faculty Ratio
                </p>
              </div>
            </div>

            {/* TAB 1: OVERVIEW & METRICS */}
            {detailTab === "summary" && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Students Demographics Table */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-sky-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Student Demographics Breakdown
                      </h4>
                    </div>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200/60">
                      {metrics?.total_students || 0} Enrolled
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-slate-500">Total Enrolled Students</span>
                      <span className="font-extrabold text-slate-900">{metrics?.total_students || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50/40">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        <span className="text-slate-500">Male Students (Boys)</span>
                      </div>
                      <span className="font-extrabold text-slate-900">
                        {metrics?.total_boys || 0} (
                        {metrics && metrics.total_students > 0
                          ? Math.round((metrics.total_boys / metrics.total_students) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-pink-500" />
                        <span className="text-slate-500">Female Students (Girls)</span>
                      </div>
                      <span className="font-extrabold text-slate-900">
                        {metrics?.total_girls || 0} (
                        {metrics && metrics.total_students > 0
                          ? Math.round((metrics.total_girls / metrics.total_students) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50/40">
                      <span className="text-slate-500">RTE Quota Students</span>
                      <span className="font-extrabold text-slate-900">{metrics?.rte_students || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-slate-500">Active Class Groups</span>
                      <span className="font-extrabold text-slate-900">{classes.length}</span>
                    </div>
                  </div>
                </div>

                {/* Staff & Faculty Table */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Staff & Workforce Breakdown
                      </h4>
                    </div>
                    <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200/60">
                      {metrics?.total_staff || 0} Headcount
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-slate-500">Total Staff Headcount</span>
                      <span className="font-extrabold text-slate-900">{metrics?.total_staff || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50/40">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-500">Active Working Staff</span>
                      </div>
                      <span className="font-extrabold text-emerald-700">
                        {metrics?.active_staff || 0} Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-slate-500">Teaching Faculty</span>
                      </div>
                      <span className="font-extrabold text-slate-900">
                        {metrics?.teachers_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50/40">
                      <span className="text-slate-500">Non-Teaching & Support Staff</span>
                      <span className="font-extrabold text-slate-900">
                        {metrics?.non_teaching_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-slate-500">Student to Teacher Ratio</span>
                      <span className="font-extrabold text-indigo-700">{studentTeacherRatio}</span>
                    </div>
                  </div>
                </div>

                {/* School Specific Fees Analytics (if available) */}
                {fees && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-amber-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Institutional Student Fee Collections
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        School Specific Account
                      </span>
                    </div>
                    <div className="p-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          Total Assessed Fees
                        </span>
                        <p className="mt-1 text-xl font-black text-slate-900 tabular-nums">
                          ₹{fees.total.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase text-emerald-800">
                          Collected Fees
                        </span>
                        <p className="mt-1 text-xl font-black text-emerald-700 tabular-nums">
                          ₹{fees.collected.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase text-rose-800">
                          Pending Student Dues
                        </span>
                        <p className="mt-1 text-xl font-black text-rose-700 tabular-nums">
                          ₹{fees.pending.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CLASSES & STUDENTS (SchoolClassesFilter) */}
            {detailTab === "classes" && (
              <SchoolClassesFilter
                classes={classes}
                students={details.students || []}
                schoolName={school.name || undefined}
              />
            )}

            {/* TAB 3: STAFF DIRECTORY */}
            {detailTab === "staff" && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Faculty & Staff Members
                  </h4>
                  <span className="text-xs font-bold text-indigo-700">
                    {staff.length} {staff.length === 1 ? "Member" : "Members"}
                  </span>
                </div>
                {staff.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-500">
                    N/A — No teaching faculty or staff registered for this school instance.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="p-3.5">Name</th>
                          <th className="p-3.5">Designation / Role</th>
                          <th className="p-3.5">Email</th>
                          <th className="p-3.5">Mobile</th>
                          <th className="p-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {staff.map((member: any) => (
                          <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-bold text-slate-900">{member.name}</td>
                            <td className="p-3.5">
                              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                                {member.category || "Staff"}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500">{member.email || "—"}</td>
                            <td className="p-3.5 text-slate-500">{member.mobile || "—"}</td>
                            <td className="p-3.5 text-center">
                              <StatusBadge active={member.is_active ?? true} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MODULES ENTITLEMENTS */}
            {detailTab === "modules" && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Tenant Feature Entitlements
                  </h4>
                  <span className="text-xs font-bold text-indigo-700">
                    {modules.filter((m: any) => m.is_enabled).length} Enabled
                  </span>
                </div>
                {modules.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-500">
                    No specific feature records configured for this school instance.
                  </p>
                ) : (
                  <div className="p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map((feat: any) => (
                      <div
                        key={feat.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                          feat.is_enabled
                            ? "border-indigo-200 bg-indigo-50/30 shadow-2xs"
                            : "border-slate-200 bg-slate-50/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              feat.is_enabled
                                ? "bg-indigo-100 text-indigo-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Layers3 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {camelCaseText(feat.name)}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {feat.is_enabled ? "Active module" : "Access disabled"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                            feat.is_enabled
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {feat.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
