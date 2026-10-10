"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Building2,
  User,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Printer,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
  PieChart,
} from "lucide-react";
import { getLeaveReportSummary, getLeaveCycles } from "@/lib/hr-config";
import type { LeaveReportSummary, LeaveCycle } from "@/types/hr-config";

export default function ClerkLeaveReportsPage() {
  const [cycles, setCycles] = useState<LeaveCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(undefined);
  const [report, setReport] = useState<LeaveReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [utilizationFilter, setUtilizationFilter] = useState<string>("ALL");

  // Load available leave cycles
  useEffect(() => {
    let active = true;
    getLeaveCycles()
      .then((data) => {
        if (!active) return;
        setCycles(data);
        const activeCycle = data.find((c) => c.is_active);
        if (activeCycle) {
          setSelectedCycleId(activeCycle.id);
        } else if (data.length > 0) {
          setSelectedCycleId(data[0].id);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch leave cycles:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch Leave Report Summary
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaveReportSummary(selectedCycleId);
      setReport(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load leave report summary.");
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Extract unique departments from staff_summary
  const departments = useMemo(() => {
    if (!report?.staff_summary) return [];
    const depts = new Set<string>();
    report.staff_summary.forEach((s) => {
      if (s.department) depts.add(s.department);
    });
    return Array.from(depts).sort();
  }, [report]);

  // Filtered staff reports
  const filteredStaff = useMemo(() => {
    if (!report?.staff_summary) return [];
    return report.staff_summary.filter((s) => {
      if (selectedDept !== "ALL" && s.department !== selectedDept) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = (s.staff_name || "").toLowerCase().includes(query);
        const deptMatch = (s.department || "").toLowerCase().includes(query);
        const idMatch = String(s.staff_id).includes(query);
        if (!nameMatch && !deptMatch && !idMatch) return false;
      }
      const totalEntitlement = s.allocated + s.carry_forward;
      const rate = totalEntitlement > 0 ? (s.used / totalEntitlement) * 100 : 0;
      if (utilizationFilter === "HIGH" && rate < 75) return false;
      if (utilizationFilter === "EXHAUSTED" && s.available > 0) return false;
      if (utilizationFilter === "AVAILABLE" && s.available <= 0) return false;
      return true;
    });
  }, [report, selectedDept, searchQuery, utilizationFilter]);

  // Overall metrics calculation
  const totals = report?.totals || {
    total_allocated: 0,
    total_carry_forward: 0,
    total_used: 0,
    total_pending: 0,
    total_available: 0,
  };

  const reqCounts = report?.request_counts || {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    cancellation_requests: 0,
  };

  const totalPool = totals.total_allocated + totals.total_carry_forward;
  const overallUtilizationRate = totalPool > 0 ? Math.round((totals.total_used / totalPool) * 100) : 0;

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredStaff.length) return;
    const cycleName = report?.cycle?.name || "Cycle";
    const headers = [
      "Staff ID",
      "Staff Name",
      "Department",
      "Allocated Days",
      "Carry Forward Days",
      "Total Entitlement",
      "Used Days",
      "Pending Days",
      "Available Days",
      "Utilization %",
    ];

    const rows = filteredStaff.map((s) => {
      const totalEnt = s.allocated + s.carry_forward;
      const pct = totalEnt > 0 ? Math.round((s.used / totalEnt) * 100) : 0;
      return [
        s.staff_id,
        `"${s.staff_name || "—"}"`,
        `"${s.department || "General"}"`,
        s.allocated,
        s.carry_forward,
        totalEnt,
        s.used,
        s.pending,
        s.available,
        `${pct}%`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leave_utilization_report_${cycleName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              HR & Staff Oversight
            </span>
            <span className="text-xs text-slate-400">• Leave Cycle Analytics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Leave Utilization & Reports Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit staff leave allocations, utilized quotas, pending queues, and remaining balances across the institution.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Leave Cycle Selector */}
          <div className="relative">
            <select
              value={selectedCycleId ?? ""}
              onChange={(e) => setSelectedCycleId(e.target.value ? Number(e.target.value) : undefined)}
              className="pl-9 pr-8 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none shadow-sm"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_active ? "★ (Active)" : c.is_closed ? "(Closed)" : ""}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredStaff.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm disabled:opacity-50"
            title="Download CSV Summary"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* ── Cycle Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Allocated Days */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Allocated Quota</span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totals.total_allocated}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              +{totals.total_carry_forward} carry forward days
            </div>
          </div>
        </div>

        {/* Used Days */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <span>Used / Approved Days</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-200 font-mono">
              {totals.total_used}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {overallUtilizationRate}% institutional utilization
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <span>Pending In Queue</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-amber-900 dark:text-amber-200 font-mono">
              {totals.total_pending}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {reqCounts.pending} staff requests awaiting action
            </div>
          </div>
        </div>

        {/* Remaining / Available Days */}
        <div className="bg-purple-50/50 dark:bg-purple-950/20 p-5 rounded-2xl border border-purple-200/80 dark:border-purple-800/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-semibold">
            <span>Available Balance</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-purple-900 dark:text-purple-200 font-mono">
              {totals.total_available}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Remaining staff pool balance
            </div>
          </div>
        </div>
      </div>

      {/* ── Request Status Breakdown Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
          <PieChart className="w-4 h-4 text-slate-400" />
          <span>Leave Request Applications Status:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved: {reqCounts.approved}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending: {reqCounts.pending}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Rejected: {reqCounts.rejected}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
            Cancelled: {reqCounts.cancelled}
          </span>
        </div>
      </div>

      {/* ── Search and Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Utilization Filter */}
          <div className="relative">
            <select
              value={utilizationFilter}
              onChange={(e) => setUtilizationFilter(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none"
            >
              <option value="ALL">All Utilization</option>
              <option value="HIGH">High Utilization (&gt;75%)</option>
              <option value="AVAILABLE">Positive Balance Available</option>
              <option value="EXHAUSTED">Exhausted Balance (&le;0)</option>
            </select>
            <BarChart3 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Staff-wise Utilization Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Computing staff leave utilization metrics...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Unable to load leave report
            </h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button
              onClick={fetchReport}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
            >
              Retry
            </button>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No staff records found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No staff members match the selected filters for this leave cycle.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Allocated</th>
                  <th className="py-3.5 px-4 text-center">Carry Fwd</th>
                  <th className="py-3.5 px-4 text-center">Used</th>
                  <th className="py-3.5 px-4 text-center">Pending</th>
                  <th className="py-3.5 px-4 text-center">Remaining</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredStaff.map((item) => {
                  const totalEntitlement = item.allocated + item.carry_forward;
                  const utilizationPct =
                    totalEntitlement > 0
                      ? Math.min(100, Math.round((item.used / totalEntitlement) * 100))
                      : 0;

                  const isExhausted = item.available <= 0;
                  const isHigh = utilizationPct >= 80;

                  return (
                    <tr
                      key={item.staff_id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Staff Member */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {(item.staff_name || "S").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.staff_name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: #{item.staff_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        {item.department ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {item.department}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">General</span>
                        )}
                      </td>

                      {/* Allocated */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {item.allocated}
                      </td>

                      {/* Carry Forward */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {item.carry_forward > 0 ? `+${item.carry_forward}` : "0"}
                      </td>

                      {/* Used */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.used}
                      </td>

                      {/* Pending */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-amber-600 dark:text-amber-400">
                        {item.pending > 0 ? item.pending : "—"}
                      </td>

                      {/* Remaining / Available */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-extrabold text-sm ${
                            isExhausted
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {item.available}
                        </span>
                      </td>

                      {/* Utilization Bar */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {utilizationPct}%
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                isExhausted
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : isHigh
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {isExhausted ? "Exhausted" : isHigh ? "High" : "Normal"}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isExhausted
                                  ? "bg-rose-500"
                                  : isHigh
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${utilizationPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
