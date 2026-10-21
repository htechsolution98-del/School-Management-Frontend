"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  Users,
  Building2,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Eye,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { getStaffAttendance, getAttendanceCalendarStatus } from "@/lib/teacher/attendance";
import { getDepartments, getStaffList } from "@/lib/staff";
import { getAllLeaveRequests, type LeaveRequest } from "@/lib/clerk/leaves";
import { StaffAttendanceHistoryModal } from "@/components/attendance/StaffAttendanceHistoryModal";
import type { AttendanceRecord } from "@/types/teacher";

interface DepartmentItem {
  id: number;
  name: string;
}

interface StaffAttendanceRegisterProps {
  roleTitle?: "Principal" | "Clerk" | "Admin";
  pageTitle?: string;
}

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: "TEACHER", label: "Teachers" },
  { value: "CLERK", label: "Clerks & Admin" },
  { value: "LIBRARIAN", label: "Librarians" },
  { value: "FEE MANAGEMENT", label: "Fee Management" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "OTHER", label: "Other Staff" },
];

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; className: string; bgSoft: string; icon: any }
> = {
  PRESENT: {
    label: "Present",
    className: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    bgSoft: "bg-emerald-500",
    icon: CheckCircle2,
  },
  LATE: {
    label: "Late",
    className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    bgSoft: "bg-amber-500",
    icon: Clock,
  },
  HALF_DAY: {
    label: "Half Day",
    className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    bgSoft: "bg-orange-500",
    icon: AlertTriangle,
  },
  ABSENT: {
    label: "Absent",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    bgSoft: "bg-red-500",
    icon: XCircle,
  },
  LEAVE: {
    label: "On Leave",
    className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    bgSoft: "bg-blue-500",
    icon: Calendar,
  },
  HOLIDAY: {
    label: "Holiday",
    className: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    bgSoft: "bg-teal-500",
    icon: Calendar,
  },
  WEEK_OFF: {
    label: "Week Off",
    className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    bgSoft: "bg-slate-400",
    icon: Calendar,
  },
  MISSING_PUNCH: {
    label: "Missing Punch",
    className: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    bgSoft: "bg-rose-500",
    icon: HelpCircle,
  },
};

function formatDisplayTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  try {
    let h: number, m: number;
    if (timeStr.includes("T") || timeStr.includes("Z")) {
      const d = new Date(timeStr);
      h = d.getHours();
      m = d.getMinutes();
    } else {
      const parts = timeStr.split(":");
      h = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
    }
    const ampm = h >= 12 ? "PM" : "AM";
    return `${(h % 12 || 12).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StaffAttendanceRegister({
  roleTitle = "Principal",
  pageTitle = "School-Wide Staff Attendance Register",
}: StaffAttendanceRegisterProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeStatusTab, setActiveStatusTab] = useState<string>("ALL");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal inspection
  const [inspectRecord, setInspectRecord] = useState<AttendanceRecord | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historyModalStaffName, setHistoryModalStaffName] = useState<string>("");
  const [historyModalStaffId, setHistoryModalStaffId] = useState<number | undefined>();

  // Load departments
  useEffect(() => {
    let active = true;
    getDepartments()
      .then((data) => {
        if (active && Array.isArray(data)) {
          setDepartments(data);
        }
      })
      .catch((err) => {
        console.warn("Could not load departments:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch Attendance Records
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof getStaffAttendance>[0] = {
        date: selectedDate,
      };
      if (selectedCategory !== "ALL") {
        params.category = selectedCategory;
      }
      if (selectedDepartment !== "ALL") {
        params.department = selectedDepartment;
      }

      const [attendance, staffRoster, leaveRequests, calendarStatus] = await Promise.all([
        getStaffAttendance(params),
        getStaffList(),
        getAllLeaveRequests(),
        getAttendanceCalendarStatus(selectedDate),
      ]);
      const departmentNames = new Map(
        departments.map((department) => [department.id, department.name]),
      );
      const attendanceByStaff = new Map(attendance.map((record) => [record.staff, record]));
      const rosterRows: AttendanceRecord[] = staffRoster
        .filter((staff) => {
          const joiningDate = staff.joining_date;
          const exitDate = staff.exit_date;
          const employedOnSelectedDate =
            (!joiningDate || joiningDate <= selectedDate) &&
            (!exitDate || exitDate >= selectedDate) &&
            (staff.is_active || Boolean(exitDate));
          const categoryMatches =
            selectedCategory === "ALL" ||
            String(staff.category || "OTHER").trim().toUpperCase() === selectedCategory;
          const departmentMatches =
            selectedDepartment === "ALL" ||
            departmentNames.get(Number(staff.department)) === selectedDepartment;
          return employedOnSelectedDate && categoryMatches && departmentMatches;
        })
        .map((staff) => {
          const recordedAttendance = attendanceByStaff.get(staff.id);
          if (recordedAttendance) return recordedAttendance;

          const approvedLeave = leaveRequests.some((request: LeaveRequest) => {
            if (request.staff !== staff.id) return false;
            const leaveDays = request.leave_days || request.days || [];
            const selectedLeaveDay = leaveDays.find((day) => day.date === selectedDate);
            if (selectedLeaveDay) return String(selectedLeaveDay.status || "").toUpperCase() === "APPROVED";
            if (leaveDays.length > 0) return false;
            const requestApproved = String(request.status || "").toUpperCase() === "APPROVED";
            return requestApproved && request.start_date <= selectedDate && request.end_date >= selectedDate;
          });
          const category = String(staff.category || "").trim().toUpperCase();
          const applicableCalendarEntry = calendarStatus.entries.find((entry) => {
            const audience = String(entry.target_audience || "ALL").trim().toUpperCase();
            if (audience === "ALL" || audience === "STAFF") return true;
            return audience === "TEACHER" && category.includes("TEACHER");
          });
          const noPunchStatus = applicableCalendarEntry?.classification ||
            (calendarStatus.is_sunday_week_off ? "WEEK_OFF" : (approvedLeave ? "LEAVE" : "ABSENT"));

          return {
            id: -staff.id,
            school: staff.school || 0,
            staff: staff.id,
            attendance_date: selectedDate,
            date_time: "",
            name: staff.name || `Staff #${staff.id}`,
            category: String(staff.category || "OTHER"),
            is_present: false,
            is_half_day: false,
            check_in: null,
            check_out: null,
            is_late: false,
            is_early_exit: false,
            working_hours: null,
            source: applicableCalendarEntry?.reason || (calendarStatus.is_sunday_week_off ? "Sunday" : (approvedLeave ? "Approved Leave" : "No Punch")),
            status: noPunchStatus,
            department_name: departmentNames.get(Number(staff.department)) || null,
            check_in_latitude: null,
            check_in_longitude: null,
            check_out_latitude: null,
            check_out_longitude: null,
            is_roster_placeholder: true,
          };
        });
      setRecords(rosterRows);
    } catch (err: any) {
      setError(err?.message || "Failed to load staff attendance roll call.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedCategory, selectedDepartment, departments]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Quick Date Navigation
  const shiftDate = (days: number) => {
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const curr = new Date(y, m - 1, d);
      curr.setDate(curr.getDate() + days);
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, "0");
      const day = String(curr.getDate()).padStart(2, "0");
      setSelectedDate(`${year}-${month}-${day}`);
    } catch {
      setSelectedDate(getTodayString());
    }
  };

  // Derive canonical status helper
  const resolveStatus = (r: AttendanceRecord): string => {
    const raw = (r.status || "").toUpperCase();
    if (STATUS_BADGE_CONFIG[raw]) return raw;
    if (r.check_in && !r.check_out) return "MISSING_PUNCH";
    if (r.is_late) return "LATE";
    if (r.is_half_day) return "HALF_DAY";
    if (!r.is_present) return "ABSENT";
    return "PRESENT";
  };

  // Metrics
  const metrics = useMemo(() => {
    let present = 0;
    let late = 0;
    let halfDay = 0;
    let leave = 0;
    let absent = 0;
    let missingPunch = 0;

    records.forEach((r) => {
      const st = resolveStatus(r);
      if (st === "PRESENT") present++;
      else if (st === "LATE") late++;
      else if (st === "HALF_DAY") halfDay++;
      else if (st === "LEAVE") leave++;
      else if (st === "ABSENT") absent++;
      else if (st === "MISSING_PUNCH") missingPunch++;
    });

    const total = records.length;
    const attendanceExpected = records.filter((record) => {
      const status = resolveStatus(record);
      return status !== "LEAVE" && status !== "HOLIDAY" && status !== "WEEK_OFF";
    }).length;
    const presentRate = attendanceExpected > 0
      ? Math.round(((present + late + halfDay * 0.5) / attendanceExpected) * 100)
      : 0;

    return {
      total,
      attendanceExpected,
      present,
      late,
      halfDay,
      leave,
      absent,
      missingPunch,
      presentRate,
    };
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const st = resolveStatus(r);
      if (activeStatusTab !== "ALL" && st !== activeStatusTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = (r.name || "").toLowerCase().includes(query);
        const catMatch = (r.category || "").toLowerCase().includes(query);
        const deptMatch = (r.department_name || "").toLowerCase().includes(query);
        if (!nameMatch && !catMatch && !deptMatch) {
          return false;
        }
      }
      return true;
    });
  }, [records, activeStatusTab, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ["Staff Name", "Category", "Department", "Date", "Status", "Check In", "Check Out", "Working Hours", "Source"];
    const rows = filteredRecords.map((r) => [
      `"${r.name || "—"}"`,
      `"${r.category || "—"}"`,
      `"${r.department_name || "—"}"`,
      `"${r.attendance_date || selectedDate}"`,
      `"${resolveStatus(r)}"`,
      `"${formatDisplayTime(r.check_in)}"`,
      `"${formatDisplayTime(r.check_out)}"`,
      `"${r.working_hours ?? "—"}"`,
      `"${r.source || "System"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_attendance_register_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {roleTitle} Control Desk
            </span>
            <span className="text-xs text-slate-400">• Daily Roll Call</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            {pageTitle}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional daily attendance oversight, real-time punches, and roll-call verification.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm disabled:opacity-60"
            title="Refresh Attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm disabled:opacity-50"
            title="Download CSV Spreadsheet"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
            title="Print Attendance Sheet"
          >
            <Printer className="w-4 h-4" />
            Print Roll Call
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Date Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Attendance Date
            </label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                onClick={() => shiftDate(1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(getTodayString())}
                className="px-2.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Today
              </button>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Department
            </label>
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Staff Category Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Staff Category
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Staff Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Status Filter Pills ── */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {[
            { key: "ALL", label: "All Records", count: metrics.total },
            { key: "PRESENT", label: "Present", count: metrics.present },
            { key: "LATE", label: "Late", count: metrics.late },
            { key: "HALF_DAY", label: "Half Day", count: metrics.halfDay },
            { key: "LEAVE", label: "On Leave", count: metrics.leave },
            { key: "ABSENT", label: "Absent", count: metrics.absent },
            { key: "MISSING_PUNCH", label: "Missing Punch", count: metrics.missingPunch },
          ].map((tab) => {
            const isActive = activeStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveStatusTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-indigo-800 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Roll Call</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Staff on record</div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            <span>Present</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{metrics.present}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.presentRate}% turn-out rate</div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 shadow-sm">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span>Late Arrivals</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-1">{metrics.late}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">After grace threshold</div>
        </div>

        <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200/80 dark:border-orange-800/40 shadow-sm">
          <div className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center justify-between">
            <span>Half Day</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-200 mt-1">{metrics.halfDay}</div>
          <div className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">0.5 day duty</div>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/40 shadow-sm">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center justify-between">
            <span>On Leave</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{metrics.leave}</div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Approved applications</div>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-800/40 shadow-sm">
          <div className="text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center justify-between">
            <span>Missing Punch</span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-rose-900 dark:text-rose-200 mt-1">{metrics.missingPunch}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">In without out punch</div>
        </div>
      </div>

      {/* ── Main Data Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Fetching roll call punches for {selectedDate}...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Unable to load attendance</h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button
              onClick={fetchAttendance}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
            >
              Retry
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-16 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No attendance entries found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No staff members match the selected filters for {selectedDate}. Staff punches may not have been logged yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Canonical Status</th>
                  <th className="py-3.5 px-4">Punch In</th>
                  <th className="py-3.5 px-4">Punch Out</th>
                  <th className="py-3.5 px-4">Working Hours</th>
                  <th className="py-3.5 px-4">Punch GPS</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRecords.map((record) => {
                  const statusKey = resolveStatus(record);
                  const statusConfig = STATUS_BADGE_CONFIG[statusKey] || STATUS_BADGE_CONFIG.PRESENT;
                  const StatusIcon = statusConfig.icon;

                  const initials = (record.name || "S")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Staff Member */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {record.name || `Staff #${record.staff}`}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="capitalize">{record.category?.toLowerCase() || "Staff"}</span>
                              <span>•</span>
                              <span>ID: #{record.staff}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        {record.department_name ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {record.department_name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">General</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.className}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-medium text-xs font-mono">
                            {formatDisplayTime(record.check_in)}
                          </span>
                        </div>
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <LogOut className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium text-xs font-mono">
                            {formatDisplayTime(record.check_out)}
                          </span>
                        </div>
                      </td>

                      {/* Working Hours */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {record.working_hours ? `${record.working_hours} hrs` : "—"}
                        </span>
                      </td>

                      {/* Recorded GPS coordinates */}
                      <td className="py-3.5 px-4 text-[10px] text-slate-500 whitespace-nowrap">
                        <div>In: {record.check_in_latitude != null && record.check_in_longitude != null
                          ? `${record.check_in_latitude}, ${record.check_in_longitude}` : "not recorded"}</div>
                        <div>Out: {record.check_out_latitude != null && record.check_out_longitude != null
                          ? `${record.check_out_latitude}, ${record.check_out_longitude}` : "not recorded"}</div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          {record.source || "Biometric"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!record.is_roster_placeholder && (
                            <>
                              <button
                                onClick={() => setInspectRecord(record)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                                title="Inspect Punch Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setHistoryModalStaffName(record.name || `Staff #${record.staff}`);
                                  setHistoryModalStaffId(record.staff);
                                  setHistoryModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                              >
                                History
                              </button>
                            </>
                          )}
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

      {/* ── Inspection Modal / Details Drawer ── */}
      <AnimatePresence>
        {inspectRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Punch Audit Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Attendance Record #{inspectRecord.id} • {inspectRecord.attendance_date}
                  </p>
                </div>
                <button
                  onClick={() => setInspectRecord(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <div>
                    <span className="text-xs text-slate-400 block">Staff Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {inspectRecord.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Category</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {inspectRecord.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Department</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {inspectRecord.department_name || "General"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Status</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {resolveStatus(inspectRecord)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                      Punch In
                    </span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                      {formatDisplayTime(inspectRecord.check_in)}
                    </div>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-amber-500" />
                      Punch Out
                    </span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                      {formatDisplayTime(inspectRecord.check_out)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex justify-between">
                    <span>Punch Source:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {inspectRecord.source || "Biometric"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Working Hours:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {inspectRecord.working_hours ? `${inspectRecord.working_hours} hours` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date Time Logged:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {inspectRecord.date_time || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    const name = inspectRecord.name || "";
                    setInspectRecord(null);
                    setHistoryModalStaffName(name);
                    setHistoryModalStaffId(inspectRecord.staff);
                    setHistoryModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
                >
                  View Staff History
                </button>
                <button
                  onClick={() => setInspectRecord(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Attendance History Modal */}
      <StaffAttendanceHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        staffName={historyModalStaffName}
        staffId={historyModalStaffId}
        roleName={roleTitle}
      />
    </div>
  );
}
