"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Layers3,
  MapPin,
  RefreshCw,
  BookOpen,
  Wallet,
  Boxes,
  Bus,
  GraduationCap,
  Users,
  ShieldCheck,
  ClipboardList,
  UserRoundCog,
  Sparkles,
  Eye,
  Mail,
  Phone,
  Check,
  X,
  AlertCircle,
  Loader2,
  Tag,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { SchoolLogo } from "@/components/superadmin/school-logo";
import { StatusBadge } from "@/components/superadmin/status-badge";
import { SchoolClassesFilter } from "@/components/superadmin/school-classes-filter";
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";
import { camelCaseText } from "@/lib/table-utils";
import {
  getSchools,
  getFeatures,
  getSuperAdminAnalytics,
  getSchoolDetails,
  type SuperAdminAnalyticsSummary,
  type SchoolDetailedStats,
} from "@/lib/superadmin";
import type { School, FeatureType } from "@/types/superadmin";

const moduleIcons: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  teacher: { icon: GraduationCap, bg: "bg-orange-50 text-orange-600", text: "text-orange-600" },
  clerk: { icon: ClipboardList, bg: "bg-cyan-50 text-cyan-600", text: "text-cyan-600" },
  librarian: { icon: BookOpen, bg: "bg-amber-50 text-amber-600", text: "text-amber-600" },
  library: { icon: BookOpen, bg: "bg-amber-50 text-amber-600", text: "text-amber-600" },
  feesmanagement: { icon: Wallet, bg: "bg-emerald-50 text-emerald-600", text: "text-emerald-600" },
  feemanagement: { icon: Wallet, bg: "bg-emerald-50 text-emerald-600", text: "text-emerald-600" },
  inventory: { icon: Boxes, bg: "bg-purple-50 text-purple-600", text: "text-purple-600" },
  transportation: { icon: Bus, bg: "bg-indigo-50 text-indigo-600", text: "text-indigo-600" },
  principal: { icon: ShieldCheck, bg: "bg-rose-50 text-rose-600", text: "text-rose-600" },
  viceprincipal: { icon: UserRoundCog, bg: "bg-sky-50 text-sky-600", text: "text-sky-600" },
  assistantclerk: { icon: Users, bg: "bg-teal-50 text-teal-600", text: "text-teal-600" },
};

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [features, setFeatures] = useState<FeatureType[]>([]);
  const [summary, setSummary] = useState<SuperAdminAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reduceMotion = useReducedMotion();

  // Selected school state for the details table at the bottom
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetailedStats | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailTab, setDetailTab] = useState<"summary" | "classes" | "staff" | "features">("summary");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [schoolData, featureData, analytics] = await Promise.all([
        getSchools(),
        getFeatures(),
        getSuperAdminAnalytics(),
      ]);
      setSchools(schoolData);
      setFeatures(featureData);
      setSummary(analytics.summary);

      // Auto-select the first school if none selected
      if (schoolData.length > 0 && !selectedSchool) {
        setSelectedSchool(schoolData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [selectedSchool]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Load detailed statistics for the selected school
  useEffect(() => {
    if (!selectedSchool?.id) {
      setSchoolDetails(null);
      return;
    }
    let active = true;
    setDetailsLoading(true);
    setDetailsError("");
    getSchoolDetails(selectedSchool.id)
      .then((data) => {
        if (active) setSchoolDetails(data);
      })
      .catch((err) => {
        if (active) setDetailsError(err instanceof Error ? err.message : "Unable to load school details.");
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSchool?.id]);

  const active = schools.filter(s => s.is_active ?? true).length;
  const inactive = schools.length - active;
  const coverage = schools.length ? Math.round(active / schools.length * 100) : 0;
  const assignments = schools.reduce((total, s) => total + (s.school_features?.filter(f => f.is_enabled).length ?? 0), 0);
  const locations = new Set(schools.map(s => s.city?.trim()).filter(Boolean)).size;

  const featureUsage = features.map(feature => ({
    ...feature,
    count: schools.filter(s => s.school_features?.some(f => f.feature === feature.id && f.is_enabled)).length,
  })).sort((a, b) => b.count - a.count);

  const stats = [
    {
      label: "Total Schools",
      value: schools.length,
      detail: "Registered on the platform",
      icon: Building2,
      iconBg: "bg-blue-50 text-blue-600 ring-1 ring-blue-500/15",
      accent: "bg-gradient-to-r from-blue-500 to-indigo-500",
    },
    {
      label: "Active Schools",
      value: active,
      detail: `${inactive} inactive schools`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15",
      accent: "bg-gradient-to-r from-emerald-500 to-teal-500",
    },
    {
      label: "Platform Features",
      value: features.length,
      detail: `${assignments} enabled assignments`,
      icon: Layers3,
      iconBg: "bg-purple-50 text-purple-600 ring-1 ring-purple-500/15",
      accent: "bg-gradient-to-r from-purple-500 to-indigo-600",
    },
    {
      label: "Cities Covered",
      value: locations,
      detail: "Across registered schools",
      icon: MapPin,
      iconBg: "bg-amber-50 text-amber-600 ring-1 ring-amber-500/15",
      accent: "bg-gradient-to-r from-amber-500 to-orange-500",
    },
    {
      label: "Total Students",
      value: summary?.total_students ?? 0,
      detail: `${summary?.total_boys ?? 0} boys · ${summary?.total_girls ?? 0} girls`,
      icon: GraduationCap,
      iconBg: "bg-sky-50 text-sky-600 ring-1 ring-sky-500/15",
      accent: "bg-gradient-to-r from-sky-500 to-blue-600",
    },
    {
      label: "Staff & Faculty",
      value: summary?.total_staff ?? 0,
      detail: `${summary?.active_staff ?? 0} active · ${summary?.teachers_count ?? 0} teachers`,
      icon: Users,
      iconBg: "bg-rose-50 text-rose-600 ring-1 ring-rose-500/15",
      accent: "bg-gradient-to-r from-rose-500 to-pink-600",
    },
  ];

  const overviewColumns: DataTableColumn<School>[] = [
    {
      key: "school",
      header: "School",
      sticky: true,
      search: school => [school.name, school.code],
      render: school => {
        const isSelected = selectedSchool?.id === school.id;
        return (
          <div className="flex items-center gap-3">
            <SchoolLogo src={school.logo} name={camelCaseText(school.name)} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900">{camelCaseText(school.name) || "Unnamed school"}</p>
                {isSelected && (
                  <span className="inline-flex items-center rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                    Selected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-400">{school.code || "No code"}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      search: school => [school.city, school.state, school.country],
      render: school => (
        <span className="text-slate-600 font-medium">
          {[school.city, school.state].filter(Boolean).map(camelCaseText).join(", ") || "Not provided"}
        </span>
      ),
    },
    {
      key: "features",
      header: "Enabled features",
      numeric: true,
      search: school => [school.school_features?.filter(f => f.is_enabled).length ?? 0],
      render: school => (
        <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
          {school.school_features?.filter(f => f.is_enabled).length ?? 0} active
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      search: school => [(school.is_active ?? true) ? "active" : "inactive"],
      render: school => <StatusBadge active={school.is_active ?? true} />,
    },
    {
      key: "action",
      header: "Details",
      render: school => {
        const isSelected = selectedSchool?.id === school.id;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSchool(school);
              document.getElementById("school-breakdown-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isSelected
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            {isSelected ? "Inspecting" : "View Breakdown"}
          </button>
        );
      },
    },
  ];

  const reveal = (delay = 0) => ({
    initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : delay },
  });

  const unavailable = loading || !!error;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600">
              Super Admin Workspace
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Superadmin Dashboard
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Platform overview, school instances, and interactive student/staff metrics breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-60 active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="text-xs font-bold text-red-700 underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Global Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-busy={loading}>
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            {...reveal(i * 0.05)}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            className="group relative rounded-2xl border border-slate-100 bg-white p-4 shadow-xs transition-all duration-200 hover:shadow-lg hover:border-slate-200 overflow-hidden cursor-default"
          >
            <div className={`absolute top-0 inset-x-0 h-1 opacity-80 ${stat.accent}`} />
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 duration-200 ${stat.iconBg}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
              {unavailable ? "—" : stat.value.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-400 truncate">
              {unavailable ? (loading ? "Loading…" : "Unavailable") : stat.detail}
            </p>
          </motion.div>
        ))}
      </div>

      {/* School Status + Platform Modules */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.65fr]">
        <motion.section {...reveal(0.12)} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">School Status</h2>
          <p className="mt-0.5 text-xs text-slate-500">Active and inactive registrations</p>
          {unavailable ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400 font-medium">
              {loading ? "Loading school status…" : "Data unavailable"}
            </div>
          ) : (
            <>
              <div className="relative mx-auto my-6 h-44 w-44">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${active} active schools, ${inactive} inactive schools`}>
                  <circle cx="60" cy="60" r="49" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="49"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="12"
                    strokeLinecap={active ? "round" : "butt"}
                    strokeDasharray="307.876 307.876"
                    initial={{ strokeDashoffset: reduceMotion ? 307.876 * (1 - coverage / 100) : 307.876 }}
                    animate={{ strokeDashoffset: 307.876 * (1 - coverage / 100) }}
                    transition={{ duration: reduceMotion ? 0 : 0.7 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">{coverage}%</span>
                  <span className="mt-0.5 text-xs font-semibold text-slate-500">Active schools</span>
                </div>
              </div>
              <div className="flex justify-center gap-6 text-xs font-bold">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  Active <strong>{active}</strong>
                </span>
                <span className="flex items-center gap-2 text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  Inactive <strong>{inactive}</strong>
                </span>
              </div>
              {!schools.length && <p className="mt-4 text-center text-xs text-slate-400">Add your first school to get started.</p>}
            </>
          )}
        </motion.section>

        <motion.section {...reveal(0.18)} className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Platform Modules</h2>
              <p className="mt-0.5 text-xs text-slate-500">School services and access coverage</p>
            </div>
            <Link href="/superadmin/fetures_select" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Manage modules <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-5">
            {unavailable ? (
              <p className="py-16 text-center text-sm text-slate-400">{loading ? "Loading modules…" : "Data unavailable"}</p>
            ) : !features.length ? (
              <p className="py-16 text-center text-sm text-slate-400">No modules configured yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featureUsage.map(feature => {
                  const mod = moduleIcons[feature.name.toLowerCase().replace(/[^a-z]/g, "")] ?? { icon: Layers3, bg: "bg-indigo-50 text-indigo-600", text: "text-indigo-600" };
                  const Icon = mod.icon;
                  return (
                    <Link
                      key={feature.id}
                      href="/superadmin/fetures_select"
                      className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${mod.bg} transition-transform group-hover:scale-105`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{camelCaseText(feature.name)}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          <span className="font-bold text-indigo-600">{feature.count}</span> {feature.count === 1 ? "school" : "schools"}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* School Overview Table */}
      <motion.section {...reveal(0.24)} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">School Directory</h2>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                Click any row to inspect details below
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Select any registered school to view its real-time student, staff, and class metrics.</p>
          </div>
          <Link
            href="/superadmin/schools"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            Manage Schools <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="border-0 [&>section]:rounded-none [&>section]:border-0 p-2">
          <DataTable
            data={schools}
            columns={overviewColumns}
            getRowId={school => school.id ?? school.name ?? ""}
            createdDate
            createdDateRange
            search
            searchPlaceholder="Search schools by name, code or city…"
            searchAriaLabel="Search schools"
            loading={loading || unavailable}
            error={error ? "Data unavailable" : ""}
            loadingLabel="Loading schools…"
            emptyTitle="No schools registered yet."
            emptyDescription="Add your first school to get started."
            noResultsTitle="No schools match your search."
            caption="School overview"
            minWidth={850}
            pageSize={5}
            onRowClick={(school) => {
              setSelectedSchool(school);
              document.getElementById("school-breakdown-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            rowClassName={(school) =>
              selectedSchool?.id === school.id
                ? "bg-indigo-50/60 font-semibold cursor-pointer hover:bg-indigo-50/90"
                : "cursor-pointer hover:bg-slate-50"
            }
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ],
                match: (school, value) => (value === "active") === (school.is_active ?? true),
              },
              {
                key: "location",
                label: "Location",
                optionsFrom: rows => dynamicOptions(rows, school => [school.city, school.state].filter(Boolean).join(", ") || null),
                match: (school, value) => [school.city, school.state].filter(Boolean).join(", ") === value,
              },
            ]}
          />
        </div>
      </motion.section>

      {/* ================= DETAILED SCHOOL BREAKDOWN TABLE SECTION ================= */}
      <AnimatePresence mode="wait">
        {selectedSchool && (
          <motion.section
            id="school-breakdown-section"
            key={selectedSchool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-xl shadow-indigo-950/5 scroll-mt-6"
          >
            {/* School Header Banner */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/30 to-white px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SchoolLogo src={selectedSchool.logo} name={camelCaseText(selectedSchool.name)} className="h-14 w-14 rounded-2xl shadow-sm border border-white" />
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        {camelCaseText(selectedSchool.name)}
                      </h2>
                      <StatusBadge active={selectedSchool.is_active ?? true} />
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                      {selectedSchool.code && (
                        <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Code: {selectedSchool.code}
                        </span>
                      )}
                      {(selectedSchool.city || selectedSchool.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {[selectedSchool.city, selectedSchool.state, selectedSchool.country].filter(Boolean).map(camelCaseText).join(", ")}
                        </span>
                      )}
                      {selectedSchool.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {selectedSchool.email}
                        </span>
                      )}
                      {selectedSchool.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {selectedSchool.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs for Table views */}
                <div className="flex items-center gap-1 bg-slate-100/90 rounded-2xl p-1 text-xs font-bold">
                  {(
                    [
                      { id: "summary", label: "Overview & Metrics" },
                      { id: "classes", label: `Classes (${schoolDetails?.classes?.length ?? 0})` },
                      { id: "staff", label: `Staff Directory (${schoolDetails?.staff?.length ?? 0})` },
                      { id: "features", label: `Modules (${schoolDetails?.features?.length ?? 0})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`rounded-xl px-3.5 py-2 transition-all ${
                        detailTab === tab.id
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {detailsLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-xs font-bold text-slate-500">Loading comprehensive school statistics…</p>
                </div>
              )}

              {detailsError && (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{detailsError}</span>
                </div>
              )}

              {!detailsLoading && !detailsError && schoolDetails && (
                <div>
                  {/* Quick Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Total Students</span>
                        <GraduationCap className="h-4 w-4 text-blue-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">
                        {schoolDetails.metrics.total_students.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                        {schoolDetails.metrics.total_boys} Boys · {schoolDetails.metrics.total_girls} Girls
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Total Staff</span>
                        <Users className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">
                        {schoolDetails.metrics.total_staff.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                        {schoolDetails.metrics.teachers_count} Teachers · {schoolDetails.metrics.active_staff} Active
                      </p>
                    </div>

                    <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Classes</span>
                        <BookOpen className="h-4 w-4 text-purple-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">
                        {schoolDetails.classes?.length ?? 0}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                        Class divisions active
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Student:Teacher</span>
                        <UserCheck className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">
                        {schoolDetails.metrics.teachers_count > 0
                          ? `1 : ${Math.round(schoolDetails.metrics.total_students / schoolDetails.metrics.teachers_count)}`
                          : "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                        Faculty ratio
                      </p>
                    </div>
                  </div>

                  {/* TAB 1: SUMMARY TABLES (Students & Staff Details in pure Table Format) */}
                  {detailTab === "summary" && (
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Students Breakdown Table */}
                      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-blue-600" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Student Demographics Table
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {schoolDetails.metrics.total_students} Enrolled
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          <div className="flex items-center justify-between p-3.5 text-xs">
                            <span className="font-semibold text-slate-600">Total Enrolled Students</span>
                            <span className="font-black text-slate-900">{schoolDetails.metrics.total_students}</span>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs bg-slate-50/30">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                              <span className="font-semibold text-slate-600">Male Students (Boys)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{schoolDetails.metrics.total_boys}</span>
                              <span className="text-[10px] font-bold text-slate-400">
                                ({schoolDetails.metrics.total_students > 0 ? Math.round((schoolDetails.metrics.total_boys / schoolDetails.metrics.total_students) * 100) : 0}%)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-pink-500" />
                              <span className="font-semibold text-slate-600">Female Students (Girls)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{schoolDetails.metrics.total_girls}</span>
                              <span className="text-[10px] font-bold text-slate-400">
                                ({schoolDetails.metrics.total_students > 0 ? Math.round((schoolDetails.metrics.total_girls / schoolDetails.metrics.total_students) * 100) : 0}%)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs bg-slate-50/30">
                            <span className="font-semibold text-slate-600">RTE Quota Students</span>
                            <span className="font-black text-slate-900">{schoolDetails.metrics.rte_students || 0}</span>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs">
                            <span className="font-semibold text-slate-600">Active Class Groups</span>
                            <span className="font-black text-slate-900">{schoolDetails.classes?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Staff Breakdown Table */}
                      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-emerald-600" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Staff & Workforce Table
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {schoolDetails.metrics.total_staff} Staff Members
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          <div className="flex items-center justify-between p-3.5 text-xs">
                            <span className="font-semibold text-slate-600">Total Staff Headcount</span>
                            <span className="font-black text-slate-900">{schoolDetails.metrics.total_staff}</span>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs bg-slate-50/30">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="font-semibold text-slate-600">Active Staff</span>
                            </div>
                            <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {schoolDetails.metrics.active_staff} Active
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-orange-500" />
                              <span className="font-semibold text-slate-600">Teaching Faculty</span>
                            </div>
                            <span className="font-black text-slate-900">{schoolDetails.metrics.teachers_count}</span>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs bg-slate-50/30">
                            <span className="font-semibold text-slate-600">Support / Non-Teaching Staff</span>
                            <span className="font-black text-slate-900">{schoolDetails.metrics.non_teaching_count}</span>
                          </div>
                          <div className="flex items-center justify-between p-3.5 text-xs">
                            <span className="font-semibold text-slate-600">Student to Teacher Ratio</span>
                            <span className="font-black text-indigo-600">
                              {schoolDetails.metrics.teachers_count > 0
                                ? `1 Teacher : ${Math.round(schoolDetails.metrics.total_students / schoolDetails.metrics.teachers_count)} Students`
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CLASS-WISE ENROLLMENT & STUDENT FILTER */}
                  {detailTab === "classes" && (
                    <SchoolClassesFilter
                      classes={schoolDetails.classes || []}
                      students={schoolDetails.students || []}
                      schoolName={selectedSchool.name || undefined}
                    />
                  )}

                  {/* TAB 3: STAFF DIRECTORY TABLE */}
                  {detailTab === "staff" && (
                    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-2xs">
                      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Staff Members & Roles
                        </h3>
                      </div>
                      {!schoolDetails.staff?.length ? (
                        <p className="p-8 text-center text-xs text-slate-400 font-medium">No staff members listed for this school instance.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="p-3.5">Name</th>
                                <th className="p-3.5">Category / Designation</th>
                                <th className="p-3.5">Email</th>
                                <th className="p-3.5">Mobile</th>
                                <th className="p-3.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {schoolDetails.staff.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3.5 font-bold text-slate-900">{member.name}</td>
                                  <td className="p-3.5">
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                      {member.category || "Staff"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-slate-500">{member.email || "—"}</td>
                                  <td className="p-3.5 text-slate-500">{member.mobile || "—"}</td>
                                  <td className="p-3.5">
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

                  {/* TAB 4: ENABLED FEATURES TABLE */}
                  {detailTab === "features" && (
                    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-2xs">
                      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Module Access Permissions
                        </h3>
                      </div>
                      {!schoolDetails.features?.length ? (
                        <p className="p-8 text-center text-xs text-slate-400 font-medium">No specific feature records assigned.</p>
                      ) : (
                        <div className="p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {schoolDetails.features.map((feat) => {
                            const mod = moduleIcons[feat.name.toLowerCase().replace(/[^a-z]/g, "")] ?? {
                              icon: Layers3,
                              bg: "bg-indigo-50 text-indigo-600",
                              text: "text-indigo-600",
                            };
                            const Icon = mod.icon;
                            return (
                              <div
                                key={feat.id}
                                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                                  feat.is_enabled
                                    ? "border-indigo-100 bg-indigo-50/30"
                                    : "border-slate-200 bg-slate-50/50 opacity-60"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${mod.bg}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{camelCaseText(feat.name)}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {feat.is_enabled ? "Active module" : "Access disabled"}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                                    feat.is_enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {feat.is_enabled ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
