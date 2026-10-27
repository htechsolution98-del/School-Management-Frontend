"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Sparkles,
  CalendarDays,
  ShieldCheck,
  Timer,
  Check,
  X,
  History,
  Search,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer";
import {
  getTodayAttendance,
  markAttendance,
  getAttendanceHistory,
} from "@/lib/teacher/attendance";
import type { TodayAttendance, AttendanceRecord } from "@/types/teacher";
import { StaffBiometricCaptureDialog } from "@/components/attendance/StaffBiometricCaptureDialog";

function getDeviceLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not available in this browser."));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("Location access is required. Enable GPS permission and try again.")),
      { timeout: 12000, enableHighAccuracy: true },
    );
  });
}

function fmtApiTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "--:-- --";
  try {
    let h: number, m: number;
    if (timeStr.includes("T") || timeStr.includes("Z")) {
      const d = new Date(timeStr);
      h = d.getHours();
      m = d.getMinutes();
    } else {
      const parts = timeStr.split(":");
      h = parseInt(parts[0]);
      m = parseInt(parts[1]);
    }
    const ampm = h >= 12 ? "PM" : "AM";
    return `${(h % 12 || 12).toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function calcDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return "--h --m";
  try {
    const inDate = checkIn.includes("T") ? new Date(checkIn) : new Date();
    if (!checkIn.includes("T")) {
      const [ih, im] = checkIn.split(":").map(Number);
      inDate.setHours(ih, im, 0, 0);
    }
    const outDate = checkOut
      ? checkOut.includes("T")
        ? new Date(checkOut)
        : new Date()
      : new Date();
    if (checkOut && !checkOut.includes("T")) {
      const [oh, om] = checkOut.split(":").map(Number);
      outDate.setHours(oh, om, 0, 0);
    }
    const diffMs = outDate.getTime() - inDate.getTime();
    if (diffMs <= 0) return "--h --m";
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  } catch {
    return "--h --m";
  }
}

export default function LibrarianAttendancePage() {
  const [activeTab, setActiveTab] = useState<"punch" | "history">("punch");
  const [todayData, setTodayData] = useState<TodayAttendance | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingAction, setPendingAction] = useState<"in" | "out" | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [todayResult, historyResult] = await Promise.allSettled([getTodayAttendance(), getAttendanceHistory()]);
    if (todayResult.status === "fulfilled") setTodayData(todayResult.value);
    else { setTodayData(null); showToast("error", todayResult.reason instanceof Error ? todayResult.reason.message : "Could not load today's attendance status."); }
    if (historyResult.status === "fulfilled") setHistory(historyResult.value);
    else { setHistory([]); showToast("error", historyResult.reason instanceof Error ? historyResult.reason.message : "Could not load attendance history."); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePunch = async () => {
    setActionLoading(true);
    try {
      const coords = await getDeviceLocation();
      const action = todayData?.checked_in ? "out" : "in";
      if (todayData?.biometric_required) {
        setPendingCoords(coords);
        setPendingAction(action);
        setShowFaceModal(true);
        return;
      }
      await markAttendance(coords);
      showToast("success", todayData?.checked_in ? "Punch Out recorded successfully!" : "Punch In recorded successfully!");
      await loadData();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to mark attendance.");
    } finally { setActionLoading(false); }
  };

  const isCheckedIn = !!todayData?.checked_in;
  const isCheckedOut = !!todayData?.checked_out;

  // Monthly stats
  const stats = useMemo(() => {
    const totalDays = history.length;
    const presentDays = history.filter((h) => h.status === "PRESENT" || h.status === "HALF_DAY").length;
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
    return { totalDays, presentDays, rate };
  }, [history]);

  // Attendance History search & pagination
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"ALL" | "PRESENT" | "HALF_DAY" | "ABSENT">("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [selectedMobileRecord, setSelectedMobileRecord] = useState<AttendanceRecord | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter((r) => {
      if (historyStatusFilter !== "ALL" && r.status !== historyStatusFilter) return false;
      if (!historySearch.trim()) return true;
      const q = historySearch.trim().toLowerCase();
      const dateStr = r.attendance_date ? new Date(r.attendance_date).toLocaleDateString() : "";
      return (
        dateStr.toLowerCase().includes(q) ||
        (r.status ? r.status.toLowerCase().includes(q) : false) ||
        (r.check_in && r.check_in.toLowerCase().includes(q)) ||
        (r.check_out && r.check_out.toLowerCase().includes(q))
      );
    });
  }, [history, historySearch, historyStatusFilter]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage, historyPageSize]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyStatusFilter]);

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4.5 pb-24 lg:pb-8 w-full min-w-0 overflow-x-hidden font-sans">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-medium ${
              notification.type === "success"
                ? "bg-emerald-600 shadow-emerald-500/20"
                : "bg-rose-600 shadow-rose-500/20"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#121B34] p-3.5 sm:p-5 text-white shadow-sm border border-[#1A2648]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#182346] text-[#93C5FD] text-[10px] font-bold tracking-wider uppercase border border-[#233366]">
              <Sparkles className="h-3 w-3 text-[#93C5FD]" /> Staff Duty & Attendance Panel
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight truncate">Librarian Attendance</h1>
            <p className="text-white/70 text-[11px] sm:text-xs leading-relaxed line-clamp-2 max-w-md">
              Daily check-in / check-out, geofenced duty confirmation, working hours tracking, and monthly attendance history.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-white/15 bg-white/10 text-white hover:bg-white/15 text-xs h-8 px-3 rounded-xl self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("punch")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "punch"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Clock className="h-4 w-4" /> Daily Punch Desk
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "history"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <History className="h-4 w-4" /> Monthly Log & History ({history.length})
        </button>
      </div>

      {/* TAB 1: DAILY PUNCH */}
      {activeTab === "punch" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Main Punch Clock Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-3.5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Duty Session
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-0.5">
                  {currentTime.toLocaleDateString("en-IN", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 font-mono text-xl font-bold text-indigo-700 text-center sm:text-right">
                {currentTime.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>
            </div>

            {/* Status Visualizer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5 text-emerald-600" /> Punch In Time
                </span>
                <div className="text-lg font-bold text-gray-900">
                  {todayData?.checked_in ? fmtApiTime(todayData.check_in) : "--:-- --"}
                </div>
                <div className="text-[11px] text-gray-400">
                  {todayData?.checked_in ? "Recorded at desk" : "Not punched in yet"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5 text-rose-600" /> Punch Out Time
                </span>
                <div className="text-lg font-bold text-gray-900">
                  {todayData?.checked_out ? fmtApiTime(todayData.check_out) : "--:-- --"}
                </div>
                <div className="text-[11px] text-gray-400">
                  {todayData?.checked_out ? "Shift closed" : "Pending checkout"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-indigo-600" /> Total Duty Hours
                </span>
                <div className="text-lg font-bold text-indigo-700">
                  {calcDuration(todayData?.check_in || null, todayData?.check_out || null)}
                </div>
                <div className="text-[11px] text-gray-400">Working duration</div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span>Geofenced location is captured automatically upon action.</span>
              </div>

              {isCheckedOut ? (
                <div className="px-5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Duty Completed for Today
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handlePunch}
                  disabled={actionLoading}
                  className={`w-full sm:w-auto px-8 font-bold shadow-lg text-white ${
                    !isCheckedIn
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : !isCheckedIn ? (
                    <LogIn className="h-5 w-5 mr-2" />
                  ) : (
                    <LogOut className="h-5 w-5 mr-2" />
                  )}
                  {!isCheckedIn ? "Punch In (Check In)" : "Punch Out (Check Out)"}
                </Button>
              )}
            </div>
          </div>

          {/* Side Summary Card */}
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
              <h3 className="font-bold text-gray-900 text-base">Monthly Overview</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Days Logged</span>
                  <span className="font-bold text-gray-900">{stats.totalDays} days</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Present Shifts</span>
                  <span className="font-bold text-emerald-600">{stats.presentDays} shifts</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Attendance Rate</span>
                  <span className="font-bold text-indigo-600">{stats.rate}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 p-6 space-y-2 text-indigo-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="h-4 w-4 text-indigo-600" /> Library Shift Policy
              </div>
              <p className="text-xs text-indigo-700/80 leading-relaxed">
                Library operations are active between standard institutional hours. Please ensure punch-in before the circulation desk opening time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY (SUPERADMIN UNIFIED TABLE CARD) */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs">
                  <Clock className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">Attendance Log</h3>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                  {filteredHistory.length} {filteredHistory.length === 1 ? "Record" : "Records"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Personal attendance records, check-in timestamps, GPS coordinates, and shift durations
              </p>
            </div>

            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Log
            </Button>
          </div>

          {/* Filter and Search Bar Directly on Top of Table Data */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
            {/* Search */}
            <div className="relative min-w-[260px] flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Search history by date, status, or time…"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 shadow-2xs"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyStatusFilter}
                onChange={(e) => {
                  setHistoryStatusFilter(e.target.value as "ALL" | "PRESENT" | "HALF_DAY" | "ABSENT");
                  setHistoryPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="HALF_DAY">Half Day Only</option>
                <option value="ABSENT">Absent Only</option>
              </select>

              <select
                value={historyPageSize}
                onChange={(e) => {
                  setHistoryPageSize(Number(e.target.value));
                  setHistoryPage(1);
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
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-xs text-slate-400 mt-2 font-medium">Loading attendance history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              {historySearch || historyStatusFilter !== "ALL"
                ? "No attendance records match your search or filter criteria."
                : "No previous attendance records found."}
            </div>
          ) : (
            <>
              {/* Desktop Full Table (Single Row, Separate Columns) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="p-4 text-center w-12">#</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Punch In</th>
                      <th className="p-4">Punch Out</th>
                      <th className="p-4">Shift Duration</th>
                      <th className="p-4">GPS Coordinates</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {paginatedHistory.map((record, idx) => (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="p-4 text-center text-slate-400 font-mono text-[11px]">
                          {(historyPage - 1) * historyPageSize + idx + 1}
                        </td>
                        <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                          {record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-4 text-emerald-700 font-mono font-bold whitespace-nowrap">
                          {fmtApiTime(record.check_in)}
                        </td>
                        <td className="p-4 text-rose-700 font-mono font-bold whitespace-nowrap">
                          {fmtApiTime(record.check_out)}
                        </td>
                        <td className="p-4 text-slate-700 font-medium whitespace-nowrap">
                          {calcDuration(record.check_in || null, record.check_out || null)}
                        </td>
                        <td className="p-4 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                          {record.check_in_latitude != null && record.check_in_longitude != null
                            ? `GPS: ${Number(record.check_in_latitude).toFixed(4)}, ${Number(record.check_in_longitude).toFixed(4)}`
                            : "Not recorded"}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              record.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : record.status === "HALF_DAY"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Single Row Compact View (Tap to Open Bottom Sheet) */}
              <div className="divide-y divide-slate-100 block md:hidden">
                {paginatedHistory.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setSelectedMobileRecord(record)}
                    className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : "—"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          In: {fmtApiTime(record.check_in)} • Out: {fmtApiTime(record.check_out)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          record.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : record.status === "HALF_DAY"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {record.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Superadmin Style Bottom Pagination */}
              <TablePagination
                currentPage={historyPage}
                totalItems={filteredHistory.length}
                pageSize={historyPageSize}
                onPageChange={setHistoryPage}
                onPageSizeChange={setHistoryPageSize}
                itemLabel="records"
              />
            </>
          )}
        </div>
      )}

      {/* Mobile Bottom Drawer for Attendance Details */}
      <MobileBottomDrawer
        isOpen={!!selectedMobileRecord}
        onClose={() => setSelectedMobileRecord(null)}
        title={selectedMobileRecord?.attendance_date ? `Attendance: ${new Date(selectedMobileRecord.attendance_date).toLocaleDateString()}` : "Attendance Record"}
        subtitle="Staff Duty Verification"
        badge={
          selectedMobileRecord ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                selectedMobileRecord.status === "PRESENT"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : selectedMobileRecord.status === "HALF_DAY"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {selectedMobileRecord.status}
            </span>
          ) : undefined
        }
      >
        {selectedMobileRecord && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400">Punch In Time</p>
                <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                  {fmtApiTime(selectedMobileRecord.check_in)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400">Punch Out Time</p>
                <p className="text-xs font-mono font-bold text-rose-700 mt-0.5">
                  {fmtApiTime(selectedMobileRecord.check_out)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400">Shift Duration</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">
                  {calcDuration(selectedMobileRecord.check_in || null, selectedMobileRecord.check_out || null)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400">Status</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">{selectedMobileRecord.status}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 col-span-2">
                <p className="text-[10px] uppercase font-bold text-gray-400">Geofence / Punch Coordinates</p>
                <p className="text-xs font-mono text-gray-600 mt-0.5">
                  Check-in GPS: {selectedMobileRecord.check_in_latitude != null && selectedMobileRecord.check_in_longitude != null
                    ? `${selectedMobileRecord.check_in_latitude}, ${selectedMobileRecord.check_in_longitude}`
                    : "Not recorded"}
                </p>
                <p className="text-xs font-mono text-gray-600 mt-0.5">
                  Check-out GPS: {selectedMobileRecord.check_out_latitude != null && selectedMobileRecord.check_out_longitude != null
                    ? `${selectedMobileRecord.check_out_latitude}, ${selectedMobileRecord.check_out_longitude}`
                    : "Not recorded"}
                </p>
              </div>
            </div>
          </div>
        )}
      </MobileBottomDrawer>

      <StaffBiometricCaptureDialog
        isOpen={showFaceModal}
        actionLabel={pendingAction === "out" ? "Check Out" : "Check In"}
        onClose={() => { setShowFaceModal(false); setPendingCoords(null); setPendingAction(null); }}
        onVerified={async (verificationToken) => {
          if (!pendingCoords || !pendingAction) throw new Error("Attendance action expired. Please try again.");
          await markAttendance({ ...pendingCoords, verification_token: verificationToken });
          showToast("success", pendingAction === "out" ? "Punch Out recorded successfully!" : "Punch In recorded successfully!");
          setShowFaceModal(false);
          setPendingCoords(null);
          setPendingAction(null);
          await loadData();
        }}
      />
    </div>
  );
}
