"use client";

import React, { useState } from "react";
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  UserCheck,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  Wallet,
  Layers3,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { SchoolLogo } from "@/components/superadmin/school-logo";
import { StatusBadge } from "@/components/superadmin/status-badge";
import { SchoolClassesFilter } from "@/components/superadmin/school-classes-filter";
import { camelCaseText } from "@/lib/table-utils";
import type { School, SchoolDetailedStats } from "./types";

interface SchoolDetailInspectorProps {
  school: School;
  details: SchoolDetailedStats | null;
  loading?: boolean;
  error?: string;
}

export function SchoolDetailInspector({
  school,
  details,
  loading = false,
  error,
}: SchoolDetailInspectorProps) {
  const [detailTab, setDetailTab] = useState<"summary" | "classes" | "staff" | "modules">("summary");

  const metrics = details?.metrics;
  const classes = details?.classes || [];
  const staff = details?.staff || [];
  const modules = details?.features || [];
  const fees = details?.fees;

  const studentTeacherRatio =
    metrics && metrics.teachers_count > 0
      ? `1 : ${Math.round(metrics.total_students / metrics.teachers_count)}`
      : "N/A — No faculty";

  return (
    <section
      id="school-breakdown-section"
      className="overflow-hidden rounded-2xl border border-[#E5EAE5] bg-white shadow-xs scroll-mt-6"
    >
      {/* School Header Banner */}
      <div className="border-b border-[#E5EAE5] bg-[#F7F8F5]/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SchoolLogo
              src={school.logo}
              name={camelCaseText(school.name)}
              className="h-14 w-14 rounded-2xl border border-[#E5EAE5] shadow-xs"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl font-black text-[#202923] tracking-tight">
                  {camelCaseText(school.name)}
                </h3>
                <StatusBadge active={school.is_active ?? true} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#687568] font-medium">
                {school.code && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-[#16834A] border border-emerald-200/60">
                    Code: {school.code}
                  </span>
                )}
                {(school.city || school.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#687568]" />
                    {[school.city, school.state, school.country]
                      .filter(Boolean)
                      .map(camelCaseText)
                      .join(", ")}
                  </span>
                )}
                {school.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-[#687568]" />
                    {school.email}
                  </span>
                )}
                {school.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-[#687568]" />
                    {school.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center rounded-xl bg-white p-1 border border-[#E5EAE5] text-xs font-bold text-[#687568]">
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
                    ? "bg-[#16834A] text-white shadow-xs font-extrabold"
                    : "hover:text-[#202923]"
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
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#687568]">
            <Loader2 className="h-8 w-8 animate-spin text-[#16834A]" />
            <p className="text-xs font-bold">Loading comprehensive school telemetry…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-[#DC2626]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && details && (
          <div>
            {/* Quick 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {/* Total Students */}
              <div className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687568]">
                    Total Students
                  </span>
                  <GraduationCap className="h-4 w-4 text-[#16834A]" />
                </div>
                <p className="text-2xl font-black text-[#202923] tabular-nums">
                  {metrics?.total_students.toLocaleString("en-IN") || 0}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-[#687568]">
                  {metrics?.total_boys || 0} Boys · {metrics?.total_girls || 0} Girls
                </p>
              </div>

              {/* Total Staff */}
              <div className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687568]">
                    Total Staff
                  </span>
                  <Users className="h-4 w-4 text-[#16834A]" />
                </div>
                <p className="text-2xl font-black text-[#202923] tabular-nums">
                  {metrics?.total_staff.toLocaleString("en-IN") || 0}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-[#687568]">
                  {metrics?.teachers_count || 0} Teachers · {metrics?.active_staff || 0} Active
                </p>
              </div>

              {/* Classes */}
              <div className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687568]">
                    Active Classes
                  </span>
                  <BookOpen className="h-4 w-4 text-[#16834A]" />
                </div>
                <p className="text-2xl font-black text-[#202923] tabular-nums">
                  {classes.length}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-[#687568]">
                  Enrolled Class Groups
                </p>
              </div>

              {/* Ratio */}
              <div className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687568]">
                    Student : Teacher
                  </span>
                  <UserCheck className="h-4 w-4 text-[#16834A]" />
                </div>
                <p className="text-2xl font-black text-[#202923] tabular-nums">
                  {studentTeacherRatio}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-[#687568]">
                  Institutional Faculty Ratio
                </p>
              </div>
            </div>

            {/* TAB 1: OVERVIEW & METRICS */}
            {detailTab === "summary" && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Students Demographics Table */}
                <div className="rounded-xl border border-[#E5EAE5] bg-white overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#E5EAE5] bg-[#F7F8F5] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-[#16834A]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#202923]">
                        Student Demographics Breakdown
                      </h4>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#16834A]">
                      {metrics?.total_students || 0} Enrolled
                    </span>
                  </div>
                  <div className="divide-y divide-[#E5EAE5]/60 text-xs">
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-[#687568]">Total Enrolled Students</span>
                      <span className="font-extrabold text-[#202923]">{metrics?.total_students || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-[#F7F8F5]/30">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#16834A]" />
                        <span className="text-[#687568]">Male Students (Boys)</span>
                      </div>
                      <span className="font-extrabold text-[#202923]">
                        {metrics?.total_boys || 0} (
                        {metrics && metrics.total_students > 0
                          ? Math.round((metrics.total_boys / metrics.total_students) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                        <span className="text-[#687568]">Female Students (Girls)</span>
                      </div>
                      <span className="font-extrabold text-[#202923]">
                        {metrics?.total_girls || 0} (
                        {metrics && metrics.total_students > 0
                          ? Math.round((metrics.total_girls / metrics.total_students) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-[#F7F8F5]/30">
                      <span className="text-[#687568]">RTE Quota Students</span>
                      <span className="font-extrabold text-[#202923]">{metrics?.rte_students || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-[#687568]">Active Class Groups</span>
                      <span className="font-extrabold text-[#202923]">{classes.length}</span>
                    </div>
                  </div>
                </div>

                {/* Staff & Faculty Table */}
                <div className="rounded-xl border border-[#E5EAE5] bg-white overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#E5EAE5] bg-[#F7F8F5] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#16834A]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#202923]">
                        Staff & Workforce Breakdown
                      </h4>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#16834A]">
                      {metrics?.total_staff || 0} Headcount
                    </span>
                  </div>
                  <div className="divide-y divide-[#E5EAE5]/60 text-xs">
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-[#687568]">Total Staff Headcount</span>
                      <span className="font-extrabold text-[#202923]">{metrics?.total_staff || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-[#F7F8F5]/30">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#16834A]" />
                        <span className="text-[#687568]">Active Working Staff</span>
                      </div>
                      <span className="font-extrabold text-[#16834A]">
                        {metrics?.active_staff || 0} Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#202923]" />
                        <span className="text-[#687568]">Teaching Faculty</span>
                      </div>
                      <span className="font-extrabold text-[#202923]">
                        {metrics?.teachers_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-[#F7F8F5]/30">
                      <span className="text-[#687568]">Non-Teaching & Support Staff</span>
                      <span className="font-extrabold text-[#202923]">
                        {metrics?.non_teaching_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-[#687568]">Student to Teacher Ratio</span>
                      <span className="font-extrabold text-[#16834A]">{studentTeacherRatio}</span>
                    </div>
                  </div>
                </div>

                {/* School Specific Fees Analytics (if available) */}
                {fees && (
                  <div className="rounded-xl border border-[#E5EAE5] bg-white overflow-hidden shadow-2xs lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-[#E5EAE5] bg-[#F7F8F5] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[#16834A]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#202923]">
                          Institutional Student Fee Collections
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-[#687568]">
                        School Specific Account
                      </span>
                    </div>
                    <div className="p-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-[#E5EAE5] bg-[#F7F8F5] p-3">
                        <span className="text-[10px] font-bold uppercase text-[#687568]">
                          Total Assessed Fees
                        </span>
                        <p className="mt-1 text-xl font-black text-[#202923] tabular-nums">
                          ₹{fees.total.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#E5EAE5] bg-[#F7F8F5] p-3">
                        <span className="text-[10px] font-bold uppercase text-[#16834A]">
                          Collected Fees
                        </span>
                        <p className="mt-1 text-xl font-black text-[#16834A] tabular-nums">
                          ₹{fees.collected.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#E5EAE5] bg-[#F7F8F5] p-3">
                        <span className="text-[10px] font-bold uppercase text-[#DC2626]">
                          Pending Student Dues
                        </span>
                        <p className="mt-1 text-xl font-black text-[#DC2626] tabular-nums">
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
              <div className="rounded-xl border border-[#E5EAE5] bg-white overflow-hidden shadow-2xs">
                <div className="border-b border-[#E5EAE5] bg-[#F7F8F5] px-5 py-3.5 flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#202923]">
                    Faculty & Staff Members
                  </h4>
                  <span className="text-xs font-bold text-[#16834A]">
                    {staff.length} {staff.length === 1 ? "Member" : "Members"}
                  </span>
                </div>
                {staff.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#687568]">
                    N/A — No teaching faculty or staff registered for this school instance.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E5EAE5] bg-[#F7F8F5] text-[10px] font-black uppercase tracking-wider text-[#687568]">
                        <tr>
                          <th className="p-3.5">Name</th>
                          <th className="p-3.5">Designation / Role</th>
                          <th className="p-3.5">Email</th>
                          <th className="p-3.5">Mobile</th>
                          <th className="p-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EAE5] font-medium text-[#202923]">
                        {staff.map((member) => (
                          <tr key={member.id} className="hover:bg-[#F7F8F5]/80 transition-colors">
                            <td className="p-3.5 font-bold text-[#202923]">{member.name}</td>
                            <td className="p-3.5">
                              <span className="rounded-md border border-[#E5EAE5] bg-[#F7F8F5] px-2 py-0.5 text-[11px] font-semibold text-[#202923]">
                                {member.category || "Staff"}
                              </span>
                            </td>
                            <td className="p-3.5 text-[#687568]">{member.email || "—"}</td>
                            <td className="p-3.5 text-[#687568]">{member.mobile || "—"}</td>
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
              <div className="rounded-xl border border-[#E5EAE5] bg-white overflow-hidden shadow-2xs">
                <div className="border-b border-[#E5EAE5] bg-[#F7F8F5] px-5 py-3.5 flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#202923]">
                    Tenant Feature Entitlements
                  </h4>
                  <span className="text-xs font-bold text-[#16834A]">
                    {modules.filter((m) => m.is_enabled).length} Enabled
                  </span>
                </div>
                {modules.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#687568]">
                    No specific feature records configured for this school instance.
                  </p>
                ) : (
                  <div className="p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map((feat) => (
                      <div
                        key={feat.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                          feat.is_enabled
                            ? "border-emerald-200 bg-emerald-50/30"
                            : "border-[#E5EAE5] bg-[#F7F8F5]/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#16834A]">
                            <Layers3 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#202923]">
                              {camelCaseText(feat.name)}
                            </p>
                            <p className="text-[10px] text-[#687568] font-medium">
                              {feat.is_enabled ? "Active module" : "Access disabled"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                            feat.is_enabled
                              ? "bg-emerald-100 text-[#16834A]"
                              : "bg-[#E5EAE5] text-[#687568]"
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
