"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Building2, CheckCircle2, Layers3, MapPin, RefreshCw, BookOpen, Wallet, Boxes, Bus, GraduationCap, Users, ShieldCheck, ClipboardList, UserRoundCog, type LucideIcon } from "lucide-react";
import { AdminButton as Button } from "@/components/superadmin/admin-button";
import { SchoolLogo } from "@/components/superadmin/school-logo";
import { StatusBadge } from "@/components/superadmin/status-badge";
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";
import { camelCaseText } from "@/lib/table-utils";
import { getSchools, getFeatures } from "@/lib/superadmin";
import type { School, FeatureType } from "@/types/superadmin";

const overviewColumns: DataTableColumn<School>[] = [
  {
    key: "school",
    header: "School",
    sticky: true,
    search: school => [school.name, school.code],
    render: school => <div className="flex items-center gap-3"><SchoolLogo src={school.logo} name={camelCaseText(school.name)} /><div><p className="font-semibold text-slate-800">{camelCaseText(school.name) || "Unnamed school"}</p><p className="mt-0.5 text-xs text-slate-400">{school.code || "No code"}</p></div></div>,
  },
  {
    key: "location",
    header: "Location",
    search: school => [school.city, school.state, school.country],
    render: school => <span className="text-slate-500">{[school.city, school.state].filter(Boolean).map(camelCaseText).join(", ") || "Not provided"}</span>,
  },
  {
    key: "features",
    header: "Enabled features",
    numeric: true,
    search: school => [school.school_features?.filter(f => f.is_enabled).length ?? 0],
    render: school => <span className="text-slate-600">{school.school_features?.filter(f => f.is_enabled).length ?? 0}</span>,
  },
  {
    key: "status",
    header: "Status",
    search: school => [(school.is_active ?? true) ? "active" : "inactive"],
    render: school => <StatusBadge active={school.is_active ?? true} />,
  },
];

const moduleIcons: Record<string, LucideIcon> = {
  teacher: GraduationCap, clerk: ClipboardList, librarian: BookOpen, library: BookOpen,
  feesmanagement: Wallet, feemanagement: Wallet, inventory: Boxes, transportation: Bus,
  principal: ShieldCheck, viceprincipal: UserRoundCog, assistantclerk: Users,
};

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [features, setFeatures] = useState<FeatureType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reduceMotion = useReducedMotion();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [schoolData, featureData] = await Promise.all([getSchools(), getFeatures()]);
      setSchools(schoolData);
      setFeatures(featureData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
    { label: "Total schools", value: schools.length, detail: "Registered on the platform", icon: Building2, color: "bg-slate-100 text-slate-600" },
    { label: "Active schools", value: active, detail: `${inactive} inactive schools`, icon: CheckCircle2, color: "bg-slate-100 text-slate-600" },
    { label: "Platform features", value: features.length, detail: `${assignments} enabled school assignments`, icon: Layers3, color: "bg-slate-100 text-slate-600" },
    { label: "Cities covered", value: locations, detail: "Based on school addresses", icon: MapPin, color: "bg-slate-100 text-slate-600" },
  ];
  const reveal = (delay = 0) => ({
    initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : delay },
  });
  const unavailable = loading || !!error;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#1D496C]">Platform overview</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Superadmin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Your schools, feature access and platform coverage at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>

        </div>
      </div>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<Button variant="outline" onClick={load}>Try again</Button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
        {stats.map((stat, i) => <motion.div key={stat.label} {...reveal(i * 0.06)} whileHover={reduceMotion ? undefined : { y: -3 }} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{stat.label}</p><div className={`rounded-xl p-2.5 ${stat.color}`}><stat.icon className="h-5 w-5" /></div></div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{unavailable ? "—" : stat.value.toLocaleString("en-IN")}</p>
          <p className="mt-2 text-xs text-slate-500">{unavailable ? (loading ? "Loading live data…" : "Data unavailable") : stat.detail}</p>
        </motion.div>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.65fr]">
        <motion.section {...reveal(0.12)} className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">School status</h2><p className="mt-1 text-xs text-slate-500">Active and inactive registrations</p>
          {unavailable ? <div className="flex h-56 items-center justify-center text-sm text-slate-400">{loading ? "Loading school status…" : "Data unavailable"}</div> : <>
            <div className="relative mx-auto my-6 h-44 w-44">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${active} active schools, ${inactive} inactive schools`}>
                <circle cx="60" cy="60" r="49" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                <motion.circle cx="60" cy="60" r="49" fill="none" stroke="#1D496C" strokeWidth="12" strokeLinecap={active ? "round" : "butt"} strokeDasharray="307.876 307.876" initial={{ strokeDashoffset: reduceMotion ? 307.876 * (1 - coverage / 100) : 307.876 }} animate={{ strokeDashoffset: 307.876 * (1 - coverage / 100) }} transition={{ duration: reduceMotion ? 0 : 0.7 }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold text-slate-900">{coverage}%</span><span className="mt-1 text-xs text-slate-500">Active schools</span></div>
            </div>
            <div className="flex justify-center gap-6 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#1D496C]" />Active <strong>{active}</strong></span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" />Inactive <strong>{inactive}</strong></span></div>
            {!schools.length && <p className="mt-4 text-center text-xs text-slate-400">Add your first school to get started.</p>}
          </>}
        </motion.section>

        <motion.section {...reveal(0.18)} className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><h2 className="font-semibold text-slate-900">Platform modules</h2><p className="mt-1 text-xs text-slate-500">School services and access coverage</p></div><Link href="/superadmin/fetures_select" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D496C] hover:underline">Manage modules <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          <div className="p-5">
            {unavailable ? <p className="py-16 text-center text-sm text-slate-400">{loading ? "Loading modules…" : "Data unavailable"}</p> : !features.length ? <p className="py-16 text-center text-sm text-slate-400">No modules configured yet.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featureUsage.map(feature => {
                const Icon = moduleIcons[feature.name.toLowerCase().replace(/[^a-z]/g, "")] ?? Layers3;
                return <Link key={feature.id} href="/superadmin/fetures_select" className="group flex items-center gap-3 rounded-lg border border-slate-200/80 px-3.5 py-3 transition-colors hover:border-[#1D496C]/25 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#1D496C]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:text-[#1D496C]"><Icon className="h-[18px] w-[18px]" /></span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium leading-5 text-slate-800">{camelCaseText(feature.name)}</p><p className="mt-0.5 text-xs text-slate-500">Enabled in <span className="font-medium text-slate-700">{feature.count}</span> {feature.count === 1 ? "school" : "schools"}</p></div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-[#1D496C]" />
                </Link>;
              })}
            </div>}
          </div>
        </motion.section>
      </div>

      <motion.section {...reveal(0.24)} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><h2 className="font-semibold text-slate-900">School overview</h2><p className="mt-1 text-xs text-slate-500">A snapshot of registered schools</p></div><Link href="/superadmin/schools" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1D496C] hover:underline">Manage Schools <ArrowUpRight className="h-4 w-4" /></Link></div>
        <div className="border-0 [&>section]:rounded-none [&>section]:border-0">
          <DataTable
            data={schools}
            columns={overviewColumns}
            getRowId={school => school.id ?? school.name ?? ""}
            createdDate
            createdDateRange
            search
            searchPlaceholder="Search schools or code"
            searchAriaLabel="Search schools"
            loading={loading || unavailable}
            error={error ? "Data unavailable" : ""}
            loadingLabel="Loading schools…"
            emptyTitle="No schools registered yet."
            emptyDescription="Add your first school to get started."
            noResultsTitle="No schools match your search."
            caption="School overview"
            minWidth={760}
            pageSize={5}
            filters={[{
              key: "status",
              label: "Status",
              options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
              match: (school, value) => (value === "active") === (school.is_active ?? true),
            }, {
              key: "location",
              label: "Location",
              optionsFrom: rows => dynamicOptions(rows, school => [school.city, school.state].filter(Boolean).join(", ") || null),
              match: (school, value) => [school.city, school.state].filter(Boolean).join(", ") === value,
            }]}
          />
        </div>
      </motion.section>
    </div>
  );
}
