"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityLogItem,
  ActivityLogStats,
  ActivityLogFilters,
  getActivityLogs,
  getActivityLogStats,
} from "@/lib/activity-logs";
import {
  Activity,
  UserCheck,
  KeyRound,
  LogOut,
  Search,
  RefreshCw,
  Building2,
  Download,
  Clock,
  Sparkles,
  Globe,
  Code2,
  Terminal,
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Server,
  Layers,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

interface ActivityLogHubProps {
  isSuperAdmin?: boolean;
  roleTitle?: string;
  defaultSchoolId?: string | number;
}

const MODULE_OPTIONS = [
  { value: "ALL", label: "Module: All" },
  { value: "AUTH", label: "Security & Auth" },
  { value: "EVENTS", label: "Events & Holidays" },
  { value: "ANNOUNCEMENTS", label: "Announcements" },
  { value: "ACADEMICS", label: "Academics" },
  { value: "ADMISSIONS", label: "Admissions" },
  { value: "FEES", label: "Finance & Fees" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "EXAMS", label: "Exams & Results" },
  { value: "HR_LEAVES", label: "HR & Leaves" },
  { value: "SETTINGS", label: "Settings" },
  { value: "OTHER", label: "General" },
];

const ACTION_OPTIONS = [
  { value: "ALL", label: "Action: All" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "PASSWORD_CHANGE", label: "Password Change" },
  { value: "CREATE", label: "Create Record" },
  { value: "UPDATE", label: "Update Record" },
  { value: "DELETE", label: "Delete Record" },
  { value: "PUBLISH", label: "Publish Results" },
  { value: "PAYMENT", label: "Fees Payment" },
  { value: "SYSTEM", label: "System Action" },
];

const ROLE_OPTIONS = [
  { value: "ALL", label: "Role: All" },
  { value: "Super Admin", label: "Super Admin" },
  { value: "Trustee", label: "Trustee" },
  { value: "Principal", label: "Principal" },
  { value: "Clerk", label: "Clerk" },
  { value: "Teacher", label: "Teacher" },
  { value: "Student", label: "Student" },
  { value: "Parent", label: "Parent" },
  { value: "Librarian", label: "Librarian" },
  { value: "Accountant", label: "Accountant" },
];

function filterSelectClass() {
  return "h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs outline-none focus:border-[#5826df] focus:ring-2 focus:ring-[#5826df]/20 transition-all";
}

export function ActivityLogHub({
  isSuperAdmin = false,
  roleTitle = "Administrator",
  defaultSchoolId,
}: ActivityLogHubProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedSchool, setSelectedSchool] = useState<string>(
    defaultSchoolId ? String(defaultSchoolId) : "ALL"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Log Drawer
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Filtered Role Options based on viewer role
  const visibleRoleOptions = React.useMemo(() => {
    const rTitle = (roleTitle || "").toLowerCase();
    return ROLE_OPTIONS.filter((opt) => {
      if (opt.value === "ALL") return true;
      if (isSuperAdmin) return true;

      // Non-superadmin cannot see Super Admin role
      if (opt.value.toLowerCase().includes("super")) return false;

      // Principal, Clerk, Teacher, etc. cannot see Trustee role
      if (!rTitle.includes("trustee") && opt.value.toLowerCase().includes("trustee")) {
        return false;
      }

      return true;
    });
  }, [isSuperAdmin, roleTitle]);

  // Live Auto-Refresh State
  const [liveSync, setLiveSync] = useState(true);

  // Fetch Activity Logs
  const loadLogs = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      else setIsRefreshing(true);

      try {
        const filters: ActivityLogFilters = {
          page,
          page_size: pageSize,
          search: search.trim() || undefined,
          module: selectedModule !== "ALL" ? selectedModule : undefined,
          action: selectedAction !== "ALL" ? selectedAction : undefined,
          role: selectedRole !== "ALL" ? selectedRole : undefined,
          school_id:
            isSuperAdmin && selectedSchool !== "ALL"
              ? selectedSchool
              : defaultSchoolId
              ? String(defaultSchoolId)
              : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        };

        const [logsData, statsData] = await Promise.all([
          getActivityLogs(filters),
          getActivityLogStats(
            filters.school_id ? { school_id: filters.school_id } : undefined
          ),
        ]);

        setLogs(logsData.results || []);
        setTotalCount(logsData.count || 0);
        setStats(statsData);
      } catch (err: any) {
        console.error("Error fetching activity logs:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      page,
      pageSize,
      search,
      selectedModule,
      selectedAction,
      selectedRole,
      selectedSchool,
      startDate,
      endDate,
      isSuperAdmin,
      defaultSchoolId,
    ]
  );

  useEffect(() => {
    loadLogs(true);
  }, [loadLogs]);

  // Live stream auto-sync every 6 seconds
  useEffect(() => {
    if (!liveSync) return;
    const interval = setInterval(() => {
      loadLogs(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [liveSync, loadLogs]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterReset = () => {
    setSearch("");
    setSelectedModule("ALL");
    setSelectedAction("ALL");
    setSelectedRole("ALL");
    setSelectedSchool("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleCopyPayload = () => {
    if (!selectedLog) return;
    const dataStr = JSON.stringify(
      selectedLog.extra_data || {
        id: selectedLog.id,
        action: selectedLog.action,
        user: selectedLog.user_name,
        role: selectedLog.user_role,
        module: selectedLog.module,
        school: selectedLog.school_name,
        created_at: selectedLog.created_at,
      },
      null,
      2
    );
    navigator.clipboard.writeText(dataStr);
    setCopiedPayload(true);
    toast.success("Payload copied to clipboard");
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error("No logs available to export");
      return;
    }

    const headers = [
      "ID",
      "Timestamp",
      "User Name",
      "User Role",
      "School",
      "Module",
      "Action",
      "Title",
      "Description",
      "IP Address",
    ];

    const rows = logs.map((log) => [
      log.id,
      `"${new Date(log.created_at).toLocaleString()}"`,
      `"${log.user_name || "System"}"`,
      `"${log.user_role || "User"}"`,
      `"${log.school_name || "N/A"}"`,
      `"${log.module}"`,
      `"${log.action}"`,
      `"${(log.title || "").replace(/"/g, '""')}"`,
      `"${(log.description || "").replace(/"/g, '""')}"`,
      `"${log.ip_address || "127.0.0.1"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully");
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getApiInfo = (log: ActivityLogItem) => {
    const act = (log.action || "").toUpperCase();
    const mod = (log.module || "").toUpperCase();
    let method = "POST";
    let statusCode = "200 OK";
    let endpoint = `/api/v1/${log.module.toLowerCase()}/`;

    if (act.includes("CREATE")) {
      method = "POST";
      statusCode = "201 Created";
    } else if (act.includes("UPDATE") || act.includes("PASSWORD")) {
      method = "PUT / PATCH";
      statusCode = "200 OK";
    } else if (act.includes("DELETE")) {
      method = "DELETE";
      statusCode = "204 No Content";
    } else if (act === "LOGIN") {
      endpoint = "/api/api-login/";
      method = "POST";
      statusCode = "200 OK";
    } else if (act === "LOGOUT") {
      method = "POST";
      endpoint = "/api/logout/";
      statusCode = "200 OK";
    } else if (act.includes("PUBLISH")) {
      method = "POST";
      statusCode = "200 OK";
    } else if (act.includes("PAYMENT")) {
      method = "POST";
      statusCode = "200 OK";
    }

    if (mod === "EVENTS") {
      endpoint = "/api/HolidayView/";
    } else if (mod === "ANNOUNCEMENTS") {
      endpoint = "/api/announcements/";
    } else if (mod === "SETTINGS") {
      endpoint = "/api/change-password/";
    }

    return { method, statusCode, endpoint };
  };

  const getActionBadge = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CREATE")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-3 h-3 text-emerald-600" /> Created
        </span>
      );
    }
    if (act.includes("UPDATE")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <RefreshCw className="w-3 h-3 text-blue-600" /> Updated
        </span>
      );
    }
    if (act.includes("DELETE")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" /> Deleted
        </span>
      );
    }
    if (act.includes("LOGIN")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <KeyRound className="w-3 h-3 text-indigo-600" /> Signed In
        </span>
      );
    }
    if (act.includes("LOGOUT")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <LogOut className="w-3 h-3" /> Signed Out
        </span>
      );
    }
    if (act.includes("PASSWORD")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <KeyRound className="w-3 h-3 text-amber-600" /> Password Changed
        </span>
      );
    }
    if (act.includes("PUBLISH")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Layers className="w-3 h-3 text-purple-600" /> Published
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Info className="w-3 h-3" /> {action}
      </span>
    );
  };

  const getStatusBadge = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CREATE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Created
        </span>
      );
    }
    if (act.includes("UPDATE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Modified
        </span>
      );
    }
    if (act.includes("DELETE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          Deleted
        </span>
      );
    }
    if (act === "LOGIN") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          Success
        </span>
      );
    }
    if (act === "LOGOUT") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
          Success
        </span>
      );
    }
    if (act.includes("PASSWORD")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Updated
        </span>
      );
    }
    if (act.includes("PUBLISH")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          Published
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Success
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const r = (role || "").toLowerCase();
    if (r.includes("super")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (r.includes("trustee")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (r.includes("principal")) return "bg-indigo-100 text-indigo-800 border-indigo-200";
    if (r.includes("clerk")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (r.includes("teacher")) return "bg-teal-100 text-teal-800 border-teal-200";
    if (r.includes("student")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (r.includes("parent")) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return {
        formatted: `${day}/${month}/${year} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        dateStr: `${day}/${month}/${year}`,
        timeStr: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    } catch {
      return { formatted: isoString, dateStr: isoString, timeStr: "" };
    }
  };

  const hasFilters = Boolean(
    search.trim() ||
      selectedModule !== "ALL" ||
      selectedAction !== "ALL" ||
      selectedRole !== "ALL" ||
      (isSuperAdmin && selectedSchool !== "ALL") ||
      startDate ||
      endDate
  );

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5826df] via-[#6d3df5] to-[#7f4efb] text-white p-6 md:p-7 shadow-lg shadow-purple-500/10">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-purple-100 mb-3 border border-white/20">
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
              {isSuperAdmin
                ? "Enterprise Central Activity Logs (All Schools)"
                : `Comprehensive School Activity Logs • ${roleTitle}`}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Activity Logs</h1>
            <p className="text-purple-100 text-xs md:text-sm mt-1 max-w-2xl font-normal leading-relaxed">
              Real-time audit records of user logins, data changes, and administrative actions. Click any row to expand full details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLiveSync(!liveSync)}
              className={`text-xs font-semibold text-white border-white/30 backdrop-blur-sm transition-all ${
                liveSync
                  ? "bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-300/50"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-1.5 ${
                  liveSync ? "bg-emerald-300 animate-pulse" : "bg-slate-300"
                }`}
              />
              {liveSync ? "Live Stream: ON" : "Live Stream: PAUSED"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLogs(false)}
              disabled={isRefreshing || loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm transition-all text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExportCSV}
              className="bg-white text-[#5826df] hover:bg-white/90 shadow-md font-semibold transition-all text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-[#5826df]" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Metrics Counter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-purple-200 font-medium">Total Actions</div>
            <div className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight">
              {stats?.total_count?.toLocaleString() ?? totalCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-purple-200 font-medium">Today&apos;s Activities</div>
            <div className="text-xl md:text-2xl font-extrabold mt-1 text-emerald-300 tracking-tight">
              {stats?.today_count?.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-purple-200 font-medium">User Logins</div>
            <div className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight">
              {stats?.login_count?.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-purple-200 font-medium">Password & Security</div>
            <div className="text-xl md:text-2xl font-extrabold mt-1 text-amber-300 tracking-tight">
              {stats?.password_changes_count?.toLocaleString() ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Main Standard Table Card Container */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Integrated Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#5826df]" />
              <Input
                aria-label="Search activity logs"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search activity records, user, IP..."
                className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus-visible:border-[#5826df] focus-visible:ring-3 focus-visible:ring-[#5826df]/20"
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={handleFilterReset}
                className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Right-aligned Date Pickers and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-500" htmlFor="activity-from">
                From
              </label>
              <DatePicker
                id="activity-from"
                aria-label="Activity date from"
                value={startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"
              />
              <label className="text-xs text-slate-500" htmlFor="activity-to">
                To
              </label>
              <DatePicker
                id="activity-to"
                aria-label="Activity date to"
                value={endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"
              />
            </div>

            {/* Super Admin School Scope Dropdown */}
            {isSuperAdmin && (
              <select
                aria-label="School Scope"
                value={selectedSchool}
                onChange={(e) => {
                  setSelectedSchool(e.target.value);
                  setPage(1);
                }}
                className={filterSelectClass()}
              >
                <option value="ALL">School: All ({stats?.schools?.length || 0})</option>
                {stats?.schools?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Module Filter */}
            <select
              aria-label="Module"
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass()}
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Action Filter */}
            <select
              aria-label="Action Type"
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass()}
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              aria-label="User Role"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass()}
            >
              {visibleRoleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Body & Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 920 }}>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium text-left">
                  Created Date
                </th>
                <th scope="col" className="px-5 py-3 font-medium text-left">
                  ID
                </th>
                <th scope="col" className="px-5 py-3 font-medium text-left">
                  Action
                </th>
                <th scope="col" className="px-5 py-3 font-medium text-left">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-medium text-left">
                  Actor / User
                </th>
                <th scope="col" className="px-5 py-3 font-medium text-left">
                  Role
                </th>
                {isSuperAdmin && (
                  <th scope="col" className="px-5 py-3 font-medium text-left">
                    School Scope
                  </th>
                )}
                <th scope="col" className="px-5 py-3 font-medium text-left">
                  Title / Summary
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="align-middle">
                    <td className="px-5 py-4">
                      <span className="block h-3.5 w-24 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="block h-3.5 w-12 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="block h-6 w-20 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="block h-6 w-16 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="block h-3.5 w-28 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="block h-3.5 w-20 animate-pulse rounded bg-slate-100" />
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-4">
                        <span className="block h-3.5 w-24 animate-pulse rounded bg-slate-100" />
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <span className="block h-3.5 w-48 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 8 : 7}
                    className="px-5 py-14 text-center text-slate-500"
                  >
                    <div>
                      <p className="font-medium text-slate-600">No activity records found.</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {hasFilters
                          ? "No records match your active search or filters."
                          : "Audit activities will appear here in real-time as users perform actions."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const timeInfo = formatTime(log.created_at);
                  const apiInfo = getApiInfo(log);
                  const isSelected = selectedLog?.id === log.id;
                  const columnCount = isSuperAdmin ? 8 : 7;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setSelectedLog(isSelected ? null : log)}
                        className={`cursor-pointer align-middle transition-colors hover:bg-indigo-50/40 ${
                          isSelected ? "bg-purple-50/80 font-medium" : ""
                        }`}
                      >
                        {/* Created Date */}
                        <td className="px-5 py-4 whitespace-nowrap text-slate-600 text-xs">
                          <span className="font-medium text-slate-700">{timeInfo.dateStr}</span>
                          <span className="text-slate-400 text-[11px] block">{timeInfo.timeStr}</span>
                        </td>

                        {/* ID */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                          #{log.id}
                        </td>

                        {/* Action Type */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Dedicated Status Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getStatusBadge(log.action)}
                        </td>

                        {/* Actor / User */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 text-xs">
                            {log.user_name || log.user_username || "System User"}
                          </div>
                          {log.user_username &&
                            log.user_name &&
                            log.user_name !== log.user_username && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                @{log.user_username}
                              </div>
                            )}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadge(
                              log.user_role
                            )}`}
                          >
                            {log.user_role || "User"}
                          </span>
                        </td>

                        {/* School Scope (Super Admin) */}
                        {isSuperAdmin && (
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">
                            {log.school_name || "Central / Global"}
                          </td>
                        )}

                        {/* Title / Summary */}
                        <td className="px-5 py-4 text-xs">
                          <div className="font-medium text-slate-800 line-clamp-1 max-w-md">
                            {log.title}
                          </div>
                          {log.description && (
                            <div className="text-[11px] text-slate-400 line-clamp-1 max-w-md mt-0.5">
                              {log.description}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Details Drawer directly below clicked row */}
                      {isSelected && (
                        <tr className="bg-slate-50/90 border-y-2 border-y-purple-200">
                          <td colSpan={columnCount} className="p-5">
                            <div className="space-y-4 animate-in fade-in duration-150">
                              {/* Detail Card Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-[#5826df] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                    <Terminal className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-sm text-slate-900">
                                      {log.title}
                                    </span>
                                    <span className="ml-2 text-[11px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-semibold border border-purple-200">
                                      Log #{log.id}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLog(null);
                                  }}
                                  className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-800"
                                >
                                  <X className="w-3.5 h-3.5 mr-1" /> Close Details
                                </Button>
                              </div>

                              {/* 3-Column Info Cards */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                {/* Col 1: API Status & Endpoint */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2.5 font-mono">
                                  <div className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-sans">
                                    <Server className="w-3.5 h-3.5 text-purple-600" /> API Call & HTTP Status
                                  </div>

                                  <div className="flex justify-between items-center pt-1">
                                    <span className="text-slate-500 font-sans">Method:</span>
                                    <span className="font-bold px-2 py-0.5 rounded bg-slate-900 text-white text-[11px]">
                                      {apiInfo.method}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-sans">HTTP Status:</span>
                                    <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                                      {apiInfo.statusCode}
                                    </span>
                                  </div>

                                  <div className="pt-1">
                                    <span className="text-slate-500 block mb-1 font-sans">Endpoint:</span>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-800 text-[11px] break-all font-semibold">
                                      {apiInfo.endpoint}
                                    </div>
                                  </div>
                                </div>

                                {/* Col 2: Actor & Location */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
                                  <div className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                    <UserCheck className="w-3.5 h-3.5 text-purple-600" /> Actor & Environment
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">User:</span>
                                      <span className="font-bold text-slate-900">
                                        {log.user_name || "System"}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Role:</span>
                                      <span className="font-semibold text-purple-700">
                                        {log.user_role}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-slate-500">School:</span>
                                      <span className="font-medium text-slate-800">
                                        {log.school_name || "Global / Central"}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Client IP:</span>
                                      <span className="font-mono text-slate-700">
                                        {log.ip_address || "127.0.0.1"}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Logged At:</span>
                                      <span className="font-mono text-slate-600">
                                        {timeInfo.formatted}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Col 3: Request Payload / Metadata */}
                                <div className="bg-slate-900 text-purple-300 rounded-xl p-4 border border-slate-800 flex flex-col justify-between shadow-xs">
                                  <div>
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                      <span className="font-bold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                        <Code2 className="w-3.5 h-3.5 text-purple-400" /> Request Payload
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyPayload();
                                        }}
                                        className="h-5 px-1.5 text-[10px] text-purple-300 hover:text-white hover:bg-slate-800"
                                      >
                                        {copiedPayload ? (
                                          <>
                                            <Check className="w-3 h-3 mr-1 text-emerald-400" /> Copied
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3 mr-1" /> Copy JSON
                                          </>
                                        )}
                                      </Button>
                                    </div>

                                    <pre className="font-mono text-[11px] text-purple-200 overflow-x-auto max-h-24 pt-2.5 leading-relaxed whitespace-pre-wrap">
                                      {log.extra_data && Object.keys(log.extra_data).length > 0
                                        ? JSON.stringify(log.extra_data, null, 2)
                                        : JSON.stringify(
                                            {
                                              action: log.action,
                                              module: log.module,
                                              user: log.user_name,
                                              role: log.user_role,
                                              school: log.school_name,
                                            },
                                            null,
                                            2
                                          )}
                                    </pre>
                                  </div>

                                  {log.user_agent && (
                                    <div className="pt-2 text-[10px] text-slate-400 font-mono truncate border-t border-slate-800 mt-2">
                                      Agent: {log.user_agent}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Exact Standard Bottom Pagination Bar */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between bg-white">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {loading
                ? "Loading…"
                : totalCount === 0
                ? "0 records"
                : `Showing ${from}–${to} of ${totalCount}`}
            </span>
            {!loading && totalCount > 0 && (
              <label className="flex items-center gap-2">
                <span>Rows per page</span>
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-purple-300 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-200"
                >
                  {[10, 25, 50, 100].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {!loading && totalCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="whitespace-nowrap font-medium text-slate-700">
                Page <strong className="text-purple-600 font-bold">{page}</strong> of {totalPages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
