"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Building2,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  School as SchoolIcon,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Layers,
  PieChart as PieChartIcon,
  X,
  Mail,
  Phone,
  BarChart3,
  Loader2,
} from "lucide-react";

import {
  getSuperAdminAnalytics,
  getSchoolDetails,
  SuperAdminAnalyticsResponse,
  SchoolDetailedStats,
} from "@/lib/superadmin";

export default function SuperAdminDashboard() {
  const [data, setData] = useState<SuperAdminAnalyticsResponse | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  /* Modal state for School Specific Demographics & Telemetry */
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [schoolStats, setSchoolStats] = useState<SchoolDetailedStats | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setIsFetching(true);
    setError("");
    try {
      const res = await getSuperAdminAnalytics();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load superadmin analytics.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleOpenSchoolStats = async (schoolId: number) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const details = await getSchoolDetails(schoolId);
      setSchoolStats(details);
    } catch (err: any) {
      console.error("Failed to load school details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const summary = data?.summary || {
    total_schools: 0,
    active_schools: 0,
    inactive_schools: 0,
    total_students: 0,
    total_boys: 0,
    total_girls: 0,
    other_gender: 0,
    total_staff: 0,
    active_staff: 0,
    teachers_count: 0,
    non_teaching_count: 0,
    total_features: 0,
  };

  const schools = data?.schools || [];

  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.code || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.state || "").toLowerCase().includes(q)
    );
  });

  const boysPercentage =
    summary.total_students > 0
      ? Math.round((summary.total_boys / summary.total_students) * 100)
      : 0;

  const girlsPercentage =
    summary.total_students > 0
      ? Math.round((summary.total_girls / summary.total_students) * 100)
      : 0;

  const teacherPercentage =
    summary.total_staff > 0
      ? Math.round((summary.teachers_count / summary.total_staff) * 100)
      : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4 text-slate-900">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
          <Building2 size={260} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Central Command & Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Multi-School Executive Overview
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Real-time aggregate telemetry across all registered school campuses, student enrollments, gender demographics, and workforce statistics.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAnalytics}
            disabled={isFetching}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/superadmin/schools" className="flex-1 md:flex-none">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-600/30 px-5 gap-2 font-semibold text-xs">
              <Building2 className="w-4 h-4" />
              Manage Schools
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Core Multi-Tenant KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Schools */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Schools</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.total_schools}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {summary.active_schools} Active
                </span>
                {summary.inactive_schools > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {summary.inactive_schools} Inactive
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
              <Building2 className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Total Boys in All Schools */}
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/40 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Boys in All School</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.total_boys}</h3>
              <p className="text-xs text-blue-700 font-semibold mt-2 flex items-center gap-1">
                <span>👦 {boysPercentage}%</span>
                <span className="text-slate-400 font-normal">of total enrolled</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-100 text-blue-700">
              <GraduationCap className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Total Girls in All Schools */}
        <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/40 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">Total Girls in All School</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.total_girls}</h3>
              <p className="text-xs text-pink-700 font-semibold mt-2 flex items-center gap-1">
                <span>👧 {girlsPercentage}%</span>
                <span className="text-slate-400 font-normal">of total enrolled</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-pink-100 text-pink-700">
              <Users className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Total Staff in All Schools */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staff in All School</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.total_staff}</h3>
              <p className="text-xs text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                <span>👨‍🏫 {summary.teachers_count} Teachers</span>
                <span className="text-slate-400 font-normal">({summary.non_teaching_count} Support)</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
              <Briefcase className="h-7 w-7" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Demographic & Operational Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Enrollment & Gender Ratio Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              Student Demographics
            </h4>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {summary.total_students} Total Students
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="text-blue-600 flex items-center gap-1">👦 Boys ({summary.total_boys})</span>
                <span>{boysPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${boysPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="text-pink-600 flex items-center gap-1">👧 Girls ({summary.total_girls})</span>
                <span>{girlsPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${girlsPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Average per Campus:</span>
            <span className="font-bold text-slate-900">
              {summary.total_schools > 0
                ? Math.round(summary.total_students / summary.total_schools)
                : 0}{" "}
              Students / School
            </span>
          </div>
        </div>

        {/* Workforce & Faculty Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Workforce Distribution
            </h4>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {summary.total_staff} Total Staff
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="text-emerald-700">Teaching Faculty ({summary.teachers_count})</span>
                <span>{teacherPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${teacherPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="text-amber-700">Administrative & Non-Teaching ({summary.non_teaching_count})</span>
                <span>{100 - teacherPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${100 - teacherPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Teacher to Student Ratio:</span>
            <span className="font-bold text-emerald-700">
              1 : {summary.teachers_count > 0 ? Math.round(summary.total_students / summary.teachers_count) : 0}
            </span>
          </div>
        </div>

        {/* SaaS Platform Capabilities */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                SaaS Modules
              </h4>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                {summary.total_features} Core Modules
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Admissions, Fees, Payroll, Inventory ERP, Library, Timetable, Exams & Result Engine, Attendance, Board Governance.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/superadmin/fetures_select" className="block">
              <Button variant="outline" className="w-full text-xs rounded-2xl border-slate-200 gap-2 hover:bg-slate-50 font-semibold">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Manage Feature Subscriptions
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Institutional Telemetry Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Schools Performance & Telemetry Matrix</h3>
            <p className="text-xs text-slate-500">Click on any school row to inspect full campus telemetry, class breakdown, and faculty roster</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by school, city, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-2xl border-slate-200 text-slate-900 bg-slate-50/50"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-4 px-5">Code</th>
                <th className="py-4 px-5">School Name</th>
                <th className="py-4 px-5">Location</th>
                <th className="py-4 px-5 text-center">Total Students</th>
                <th className="py-4 px-5 text-center text-blue-700">👦 Boys</th>
                <th className="py-4 px-5 text-center text-pink-700">👧 Girls</th>
                <th className="py-4 px-5 text-center">👨‍🏫 Staff</th>
                <th className="py-4 px-5 text-center">Modules</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <SchoolIcon className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
                    <p className="text-sm font-semibold text-slate-700">No schools matching search</p>
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => {
                  const isActive = school.is_active ?? true;
                  return (
                    <tr
                      key={school.id}
                      onClick={() => handleOpenSchoolStats(school.id)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-5 font-mono font-bold text-indigo-600 group-hover:underline">
                        {school.code}
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {school.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{school.email}</div>
                      </td>
                      <td className="py-4 px-5 text-slate-700">
                        {school.city ? `${school.city}, ${school.state || ""}` : "—"}
                      </td>
                      <td className="py-4 px-5 text-center font-bold text-slate-900 text-sm">
                        {school.total_students}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                          {school.total_boys}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-lg">
                          {school.total_girls}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">
                        {school.total_staff}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                          {school.enabled_features} Active
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-semibold rounded-xl gap-1"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          View Stats →
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 Comprehensive School Specific Telemetry & Demographics Modal */}
      <AnimatePresence>
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-4xl overflow-hidden flex flex-col relative max-h-[90vh] border border-slate-100"
            >
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSchoolStats(null);
                }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              {loadingDetail ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <p className="text-sm font-semibold text-slate-600">Loading school telemetry & demographics...</p>
                </div>
              ) : schoolStats ? (
                <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6">
                  {/* School Top Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-md">
                        <Building2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-slate-900">{schoolStats.school.name}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              schoolStats.school.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {schoolStats.school.is_active ? "Active" : "Suspended"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-indigo-600">Code: {schoolStats.school.code}</span>
                          {schoolStats.school.index_no && <span>• Index: {schoolStats.school.index_no}</span>}
                          <span>• {schoolStats.school.city}, {schoolStats.school.state}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Core Metrics for this School */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Total Students */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                      <p className="text-[11px] font-bold uppercase text-indigo-700 tracking-wider">Total Students</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_students}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {schoolStats.metrics.rte_students} RTE quota
                      </p>
                    </div>

                    {/* Total Boys */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                      <p className="text-[11px] font-bold uppercase text-blue-700 tracking-wider">👦 Total Boys</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_boys}</h4>
                      <p className="text-[11px] text-blue-700 font-semibold mt-1">
                        {schoolStats.metrics.total_students > 0
                          ? Math.round((schoolStats.metrics.total_boys / schoolStats.metrics.total_students) * 100)
                          : 0}% of school
                      </p>
                    </div>

                    {/* Total Girls */}
                    <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-100">
                      <p className="text-[11px] font-bold uppercase text-pink-700 tracking-wider">👧 Total Girls</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_girls}</h4>
                      <p className="text-[11px] text-pink-700 font-semibold mt-1">
                        {schoolStats.metrics.total_students > 0
                          ? Math.round((schoolStats.metrics.total_girls / schoolStats.metrics.total_students) * 100)
                          : 0}% of school
                      </p>
                    </div>

                    {/* Total Staff */}
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                      <p className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">👨‍🏫 Total Staff</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_staff}</h4>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                        {schoolStats.metrics.teachers_count} Teachers ({schoolStats.metrics.non_teaching_count} Support)
                      </p>
                    </div>
                  </div>

                  {/* Demographic & Staff Ratio Meters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gender Balance */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <PieChartIcon className="w-4 h-4 text-indigo-600" />
                          Gender Demographics
                        </span>
                        <span className="text-slate-500">
                          {schoolStats.metrics.total_students} Enrolled
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span className="text-blue-600">Boys ({schoolStats.metrics.total_boys})</span>
                            <span>
                              {schoolStats.metrics.total_students > 0
                                ? Math.round((schoolStats.metrics.total_boys / schoolStats.metrics.total_students) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${
                                  schoolStats.metrics.total_students > 0
                                    ? (schoolStats.metrics.total_boys / schoolStats.metrics.total_students) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span className="text-pink-600">Girls ({schoolStats.metrics.total_girls})</span>
                            <span>
                              {schoolStats.metrics.total_students > 0
                                ? Math.round((schoolStats.metrics.total_girls / schoolStats.metrics.total_students) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pink-500 rounded-full"
                              style={{
                                width: `${
                                  schoolStats.metrics.total_students > 0
                                    ? (schoolStats.metrics.total_girls / schoolStats.metrics.total_students) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teacher to Student Ratio */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-emerald-600" />
                          Faculty Telemetry
                        </span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {schoolStats.metrics.active_staff} Active Staff
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-600">Teacher : Student Ratio:</span>
                        <span className="text-sm font-bold text-emerald-700">
                          1 : {schoolStats.metrics.teachers_count > 0
                            ? Math.round(schoolStats.metrics.total_students / schoolStats.metrics.teachers_count)
                            : 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{schoolStats.school.email}</span>
                        <span className="mx-1">•</span>
                        <Phone className="w-3.5 h-3.5" />
                        <span>{schoolStats.school.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Classes & Student Distribution */}
                  {schoolStats.classes && schoolStats.classes.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        Class-wise Student Distribution ({schoolStats.classes.length} Classes)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {schoolStats.classes.map((cls) => (
                          <div key={cls.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="font-bold text-xs text-slate-900">{cls.name}</p>
                            <p className="text-sm font-black text-indigo-600 mt-1">{cls.total_students} Students</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              👦 {cls.boys} Boys • 👧 {cls.girls} Girls
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Staff Members */}
                  {schoolStats.staff && schoolStats.staff.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Campus Staff Roster
                      </h4>
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-white">
                        {schoolStats.staff.map((st) => (
                          <div key={st.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                            <div>
                              <p className="font-bold text-slate-900">{st.name}</p>
                              <p className="text-[11px] text-slate-400">{st.email} • {st.mobile}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {st.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subscribed Features */}
                  {schoolStats.features && schoolStats.features.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Subscribed SaaS Modules
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {schoolStats.features.map((feat) => (
                          <span
                            key={feat.id}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                              feat.is_enabled
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {feat.name} {feat.is_enabled ? "✓" : "(Disabled)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <p>Failed to load school telemetry details.</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-2xl text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
