"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
  XCircle,
  History,
  Search,
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer";
import {
  MobileSelectDrawer,
  MobileSelectTrigger,
  MobileSelectOption,
} from "@/components/ui/mobile-select-drawer";
import {
  getTodayAttendance,
  markAttendance,
  getAttendanceHistory,
  getStoredTodayAttendance,
  getStoredAttendanceHistory,
} from "@/lib/teacher/attendance";
import { getLocationSettings } from "@/lib/clerk/location-settings";
import type { TodayAttendance, AttendanceRecord, AttendanceLocationSettings } from "@/types/teacher";
import { StaffBiometricCaptureDialog } from "@/components/attendance/StaffBiometricCaptureDialog";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeviceLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (err) => {
        if (err.code === 1) {
          reject(new Error("Location access denied. Please enable GPS in device settings."));
        } else if (err.code === 2) {
          reject(new Error("Position unavailable. Please ensure GPS has a clear signal."));
        } else {
          reject(new Error("Location request timed out. Please try again."));
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
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
      h = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
    }
    const ampm = h >= 12 ? "PM" : "AM";
    return `${(h % 12 || 12).toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function fmtHeaderDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtHistoryDate(dateStr: string) {
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function calcDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return "--h --m";
  try {
    let inMs: number, outMs: number;
    if (checkIn.includes("T") || checkIn.includes("Z")) {
      inMs = new Date(checkIn).getTime();
      outMs = checkOut ? new Date(checkOut).getTime() : Date.now();
    } else {
      const base = new Date();
      const [ih, im, is_] = checkIn.split(":").map(Number);
      const inDate = new Date(base);
      inDate.setHours(ih, im, is_ || 0, 0);
      inMs = inDate.getTime();
      if (checkOut) {
        const [oh, om, os_] = checkOut.split(":").map(Number);
        const outDate = new Date(base);
        outDate.setHours(oh, om, os_ || 0, 0);
        outMs = outDate.getTime();
      } else {
        outMs = Date.now();
      }
    }
    const diffMs = outMs - inMs;
    if (diffMs <= 0) return "--h --m";
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  } catch {
    return "--h --m";
  }
}

export default function LibrarianAttendancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"punch" | "history">("punch");
  const [todayData, setTodayData] = useState<TodayAttendance | null>(() => getStoredTodayAttendance());
  const [history, setHistory] = useState<AttendanceRecord[]>(() => getStoredAttendanceHistory());
  const [locationSettings, setLocationSettings] = useState<AttendanceLocationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !getStoredTodayAttendance());
  const [actionLoading, setActionLoading] = useState<"in" | "out" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<"in" | "out" | null>(null);
  const [gpsPermission, setGpsPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingAction, setPendingAction] = useState<"in" | "out" | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual || !todayData) {
      setLoading(true);
    }
    try {
      const [todayResult, historyResult, locResult] = await Promise.allSettled([
        getTodayAttendance(isManual),
        getAttendanceHistory(undefined, isManual),
        getLocationSettings(),
      ]);

      if (todayResult.status === "fulfilled") {
        setTodayData(todayResult.value);
      }
      if (historyResult.status === "fulfilled" && Array.isArray(historyResult.value)) {
        setHistory(historyResult.value);
      }
      if (locResult.status === "fulfilled" && locResult.value) {
        const loc = locResult.value;
        setLocationSettings({
          latitude: String(loc.latitude),
          longitude: String(loc.longitude),
          radius: String(loc.radius),
          school_name: loc.school_name || "Campus Geofence",
          start_time: loc.start_time,
          end_time: loc.end_time,
          half_day_time: loc.half_day_time,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [todayData]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const checkedIn = !!todayData?.checked_in;
  const checkedOut = !!todayData?.checked_out;

  const workPolicyStr =
    locationSettings?.start_time && locationSettings?.end_time
      ? `${fmtApiTime(locationSettings.start_time)} – ${fmtApiTime(locationSettings.end_time)}`
      : "9:00 AM – 6:00 PM";

  const duration = calcDuration(
    todayData?.check_in ?? null,
    todayData?.check_out ?? null
  );

  // Compute Weekly Statistics from history
  const weeklyStats = useMemo(() => {
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let present = 0;
    let late = 0;
    let absent = 0;

    const thisWeekRecords = history.filter((rec) => {
      if (!rec.attendance_date) return false;
      const recDate = new Date(
        rec.attendance_date.includes("T")
          ? rec.attendance_date
          : `${rec.attendance_date}T12:00:00`
      );
      return recDate >= startOfWeek && recDate <= endOfWeek;
    });

    if (thisWeekRecords.length > 0) {
      thisWeekRecords.forEach((rec) => {
        if (rec.is_present || rec.status === "PRESENT" || rec.status === "HALF_DAY") {
          present += 1;
        } else if (rec.status?.toLowerCase() === "absent") {
          absent += 1;
        }
        if (rec.is_late) {
          late += 1;
        }
      });
    } else if (checkedIn) {
      present = 1;
    }

    return {
      presentDays: present,
      lateCount: late,
      absentCount: absent,
    };
  }, [history, checkedIn]);

  // Recent 5 history items sorted descending
  const recentHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    const sorted = [...history].sort((a, b) => {
      const dateA = new Date(a.attendance_date || a.date_time || 0).getTime();
      const dateB = new Date(b.attendance_date || b.date_time || 0).getTime();
      return dateB - dateA;
    });
    return sorted.slice(0, 5);
  }, [history]);

  // Primary Check-In / Check-Out Action Handler
  const handleAction = async (type: "in" | "out") => {
    setActionError(null);
    setActionLoading(type);
    try {
      const coords = await getDeviceLocation();
      setGpsPermission("granted");

      if (todayData?.biometric_required) {
        setPendingCoords(coords);
        setPendingAction(type);
        setShowFaceModal(true);
        return;
      }

      await markAttendance(coords);
      setJustDone(type);
      setTimeout(() => setJustDone(null), 3500);
      await loadData(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("denied")) {
          setGpsPermission("denied");
        }
        setActionError(err.message);
      } else {
        setActionError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Attendance History search & pagination
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"ALL" | "PRESENT" | "HALF_DAY" | "ABSENT">("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [selectedMobileRecord, setSelectedMobileRecord] = useState<AttendanceRecord | null>(null);
  const [activeSelectDrawer, setActiveSelectDrawer] = useState<{
    title: string;
    subtitle?: string;
    options: MobileSelectOption[];
    selectedValue: string | number;
    onSelect: (val: any) => void;
  } | null>(null);

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
    <div className="w-full max-w-lg lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 lg:py-6 space-y-3.5 sm:space-y-5 pb-3 sm:pb-5 lg:pb-8 font-['Sora',sans-serif]">
      {/* ── Sub-header: Role Pill + Headings + Date Selector & Refresh Button ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          {/* Back Button & LIBRARIAN ATTENDANCE Pill */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#2563EB] group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase">
              LIBRARIAN ATTENDANCE
            </span>
          </button>

          {/* Right Header Controls: Date Pill + Perfectly Placed Single Icon Refresh Button */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5EAF4] shadow-xs text-xs font-bold text-[#142044]">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">{fmtHeaderDate(currentTime)}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading}
              className="p-2 h-8 w-8 rounded-xl bg-white border border-[#E5EAF4] hover:bg-slate-50 text-[#142044] shadow-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
              title="Refresh attendance"
              aria-label="Refresh attendance"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-[#2563EB]", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#142044] tracking-tight leading-tight">
            Attendance &amp; Duty
          </h1>
          <p className="text-xs sm:text-[13px] text-[#7183A6] mt-0.5 font-normal">
            Track your daily check-in, check-out, working hours, and duty history.
          </p>
        </div>
      </motion.div>

      {/* ── Action Notifications ── */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 font-semibold flex-1">
                {actionError}
              </p>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-red-400 hover:text-red-700 text-base leading-none p-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {justDone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${
                justDone === "in"
                  ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]"
                  : "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="text-xs font-bold flex-1">
                {justDone === "in"
                  ? "Check-in successfully recorded!"
                  : "Check-out successfully recorded!"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF4] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("punch")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "punch"
              ? "bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/25"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Daily Punch Desk
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/25"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <History className="h-3.5 w-3.5" /> Monthly Log & History ({history.length})
        </button>
      </div>

      {/* ── TAB 1: DAILY PUNCH DESK (Teacher Attendance Style) ── */}
      {activeTab === "punch" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-start">
          {/* Left Column (7 Cols on Desktop): Main Attendance Card */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF4] shadow-[0_4px_20px_rgba(20,32,68,0.04)] overflow-hidden"
            >
              {/* Horizontal GPS & Current Time Blue Strip */}
              <div className="bg-slate-50 px-3.5 sm:px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-blue-100 shadow-xs shrink-0">
                    <MapPin
                      className={cn(
                        "w-3.5 h-3.5",
                        gpsPermission === "denied" ? "text-red-500" : "text-blue-600"
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-xs font-bold tracking-tight",
                        gpsPermission === "denied" ? "text-red-600" : "text-blue-600"
                      )}
                    >
                      {gpsPermission === "denied" ? "GPS Disabled" : "GPS Ready"}
                    </span>
                    {gpsPermission !== "denied" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#7183A6] shrink-0" />
                  <span className="text-xs sm:text-sm font-extrabold text-[#142044] tabular-nums tracking-tight">
                    {fmtClock(currentTime)}
                  </span>
                </div>
              </div>

              {/* Balanced Single-Row (2-Column) Check In & Check Out Section */}
              <div className="p-2.5 sm:p-3.5 grid grid-cols-2 gap-2 sm:gap-3">
                {/* Column 1: Check In */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-[#FBFBFE] border border-[#ECEEF5] flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <LogIn className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-[#142044] truncate">Check In</span>
                    </div>
                    <div className="shrink-0">
                      {checkedIn ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-0.5">
                    <p className="text-[10px] text-[#7183A6] font-medium uppercase tracking-wider leading-none">
                      {checkedIn ? "Recorded" : "Status"}
                    </p>
                    <p className="text-xs sm:text-sm font-extrabold text-[#142044] tabular-nums mt-1 truncate">
                      {checkedIn ? fmtApiTime(todayData?.check_in) : "Pending"}
                    </p>
                  </div>

                  {/* Check In Action Button */}
                  {!checkedIn && !checkedOut ? (
                    <button
                      type="button"
                      onClick={() => handleAction("in")}
                      disabled={actionLoading !== null}
                      className="w-full h-10 sm:h-11 bg-[#10B981] hover:bg-[#059669] active:scale-[0.99] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-70 px-1"
                    >
                      {actionLoading === "in" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span className="truncate">Verifying…</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Check In Now</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full h-10 sm:h-11 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-center gap-1 text-emerald-700 text-xs font-bold px-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{fmtApiTime(todayData?.check_in)}</span>
                    </div>
                  )}
                </div>

                {/* Column 2: Check Out */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-[#FBFBFE] border border-[#ECEEF5] flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <LogOut className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-[#142044] truncate">Check Out</span>
                    </div>
                    <div className="shrink-0">
                      {checkedOut ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          Done
                        </span>
                      ) : checkedIn ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Wait
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-0.5">
                    <p className="text-[10px] text-[#7183A6] font-medium uppercase tracking-wider leading-none">
                      {checkedOut ? "Recorded" : "Duration"}
                    </p>
                    <p className="text-xs sm:text-sm font-extrabold text-[#142044] tabular-nums mt-1 truncate">
                      {checkedOut
                        ? fmtApiTime(todayData?.check_out)
                        : checkedIn
                        ? duration !== "--h --m"
                          ? duration
                          : "In Progress"
                        : "--:--"}
                    </p>
                  </div>

                  {/* Check Out Action Button */}
                  {checkedIn && !checkedOut ? (
                    <button
                      type="button"
                      onClick={() => handleAction("out")}
                      disabled={actionLoading !== null}
                      className="w-full h-10 sm:h-11 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-70 px-1"
                    >
                      {actionLoading === "out" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span className="truncate">Verifying…</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Check Out Now</span>
                        </>
                      )}
                    </button>
                  ) : checkedOut ? (
                    <div className="w-full h-10 sm:h-11 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-center gap-1 text-[#2563EB] text-xs font-bold px-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                      <span className="truncate">{fmtApiTime(todayData?.check_out)}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full h-10 sm:h-11 bg-[#F1F5F9] text-[#94A3B8] font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed border border-[#E2E8F0] text-xs px-1"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                      <span className="truncate">Check Out</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Information Chips */}
              <div className="px-3.5 sm:px-4 py-2.5 bg-[#FAFBFD] border-t border-[#ECEEF5] grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                  <div className="min-w-0 truncate">
                    <p className="text-[10px] text-[#7183A6] leading-none font-medium">
                      Campus Zone
                    </p>
                    <p className="text-[11px] font-bold text-[#142044] truncate mt-0.5">
                      {locationSettings?.school_name || "Campus Geofence"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                  <div className="min-w-0 truncate">
                    <p className="text-[10px] text-[#7183A6] leading-none font-medium">
                      Working Hours
                    </p>
                    <p className="text-[11px] font-bold text-[#142044] truncate mt-0.5">
                      {workPolicyStr}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column (5 Cols on Desktop): Weekly Summary + Recent Attendance */}
          <div className="lg:col-span-5 space-y-3.5 sm:space-y-4">
            {/* Weekly Attendance Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-[#E5EAF4] shadow-[0_4px_20px_rgba(20,32,68,0.04)] p-3.5 sm:p-4"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-xs sm:text-sm font-bold text-[#142044]">
                    Weekly Summary
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#7183A6]">
                  This Week
                </span>
              </div>

              <div className="grid grid-cols-3 divide-x divide-[#F1F5F9] pt-2.5 text-center">
                {/* Present */}
                <div className="px-1">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Present</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-[#142044] mt-0.5 tracking-tight">
                    {weeklyStats.presentDays}{" "}
                    <span className="text-[11px] font-normal text-[#7183A6]">
                      {weeklyStats.presentDays === 1 ? "day" : "days"}
                    </span>
                  </p>
                </div>

                {/* Late */}
                <div className="px-1">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-600">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Late</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-[#142044] mt-0.5 tracking-tight">
                    {weeklyStats.lateCount}
                  </p>
                </div>

                {/* Absent */}
                <div className="px-1">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600">
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Absent</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-[#142044] mt-0.5 tracking-tight">
                    {weeklyStats.absentCount}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Recent Attendance Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-[#E5EAF4] shadow-[0_4px_20px_rgba(20,32,68,0.04)] p-3.5 sm:p-4"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-xs sm:text-sm font-bold text-[#142044]">
                    Recent Attendance
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="divide-y divide-[#F1F5F9]">
                {recentHistory.length > 0 ? (
                  recentHistory.map((item, idx) => {
                    const dateDisplay = fmtHistoryDate(
                      item.attendance_date || item.date_time || ""
                    );
                    const isPresent = item.is_present || item.status === "PRESENT";
                    const isLate = item.is_late;
                    const isHalfDay = item.is_half_day || item.status === "HALF_DAY";

                    let badgeText = "Present";
                    let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    let dotColor = "bg-emerald-500";

                    if (isLate) {
                      badgeText = "Late";
                      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                      dotColor = "bg-amber-500";
                    } else if (isHalfDay) {
                      badgeText = "Half Day";
                      badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                      dotColor = "bg-blue-600";
                    } else if (!isPresent && item.status === "ABSENT") {
                      badgeText = "Absent";
                      badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                      dotColor = "bg-rose-500";
                    }

                    const inTime = fmtApiTime(item.check_in || item.date_time);
                    const outTime = item.check_out ? fmtApiTime(item.check_out) : "--:--";

                    return (
                      <div
                        key={item.id ?? idx}
                        onClick={() => {
                          setSelectedMobileRecord(item);
                        }}
                        className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors px-1 rounded-xl cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#142044] truncate">
                            {dateDisplay}
                          </p>
                          <p className="text-[11px] text-[#7183A6] mt-0.5">
                            In: {inTime} • Out: {outTime}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${badgeColor}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            {badgeText}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <img
                      src="/images/empty-folder.png"
                      alt="No records"
                      className="w-16 h-auto object-contain mx-auto mb-2 filter drop-shadow-sm select-none pointer-events-none"
                    />
                    <p className="text-xs text-slate-500 font-medium">No recent attendance records recorded yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MONTHLY LOG & HISTORY ── */}
      {activeTab === "history" && (
        <div className="rounded-2xl sm:rounded-3xl border border-[#E5EAF4] bg-white shadow-xs overflow-hidden">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EAF4] bg-slate-50/60 p-4 sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] shadow-2xs">
                  <History className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">Attendance Log</h3>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#2563EB] border border-blue-200/60">
                  {filteredHistory.length} {filteredHistory.length === 1 ? "Record" : "Records"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Personal attendance history, punch-in timestamps, GPS coordinates, and shift durations.
              </p>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EAF4] bg-slate-50/40 p-3.5 sm:p-4">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Search history by date, status, or time…"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 shadow-2xs"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <select
                value={historyStatusFilter}
                onChange={(e) => {
                  setHistoryStatusFilter(e.target.value as "ALL" | "PRESENT" | "HALF_DAY" | "ABSENT");
                  setHistoryPage(1);
                }}
                className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#2563EB] focus:outline-none shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="HALF_DAY">Half Day Only</option>
                <option value="ABSENT">Absent Only</option>
              </select>
              <MobileSelectTrigger
                label="Status"
                valueLabel={
                  historyStatusFilter === "ALL"
                    ? "All Statuses"
                    : historyStatusFilter === "PRESENT"
                    ? "Present Only"
                    : historyStatusFilter === "HALF_DAY"
                    ? "Half Day Only"
                    : "Absent Only"
                }
                onClick={() =>
                  setActiveSelectDrawer({
                    title: "Attendance Status",
                    subtitle: "Filter records by status",
                    options: [
                      { label: "All Statuses", value: "ALL" },
                      { label: "Present Only", value: "PRESENT" },
                      { label: "Half Day Only", value: "HALF_DAY" },
                      { label: "Absent Only", value: "ABSENT" },
                    ],
                    selectedValue: historyStatusFilter,
                    onSelect: (val) => {
                      setHistoryStatusFilter(val);
                      setHistoryPage(1);
                    },
                  })
                }
              />

              <select
                value={historyPageSize}
                onChange={(e) => {
                  setHistoryPageSize(Number(e.target.value));
                  setHistoryPage(1);
                }}
                className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#2563EB] focus:outline-none shadow-2xs"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
              </select>
              <MobileSelectTrigger
                valueLabel={`${historyPageSize} per page`}
                onClick={() =>
                  setActiveSelectDrawer({
                    title: "Rows Per Page",
                    subtitle: "Choose number of attendance records to display",
                    options: [
                      { label: "5 per page", value: 5 },
                      { label: "10 per page", value: 10 },
                      { label: "20 per page", value: 20 },
                    ],
                    selectedValue: historyPageSize,
                    onSelect: (val) => {
                      setHistoryPageSize(Number(val));
                      setHistoryPage(1);
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
              <p className="text-xs text-slate-400 mt-2 font-medium">Loading attendance history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <img
                src="/images/empty-folder.png"
                alt="No attendance records"
                className="w-20 sm:w-24 h-auto object-contain mx-auto mb-3 filter drop-shadow-sm select-none pointer-events-none"
              />
              <p className="font-bold text-slate-700 text-sm">No attendance records found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {historySearch || historyStatusFilter !== "ALL"
                  ? "No attendance records match your search or filter criteria."
                  : "No previous attendance records found."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Full Table */}
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
                      <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
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

              {/* Bottom Pagination */}
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

      {/* Biometric Face Modal */}
      <StaffBiometricCaptureDialog
        isOpen={showFaceModal}
        actionLabel={pendingAction === "out" ? "Check Out" : "Check In"}
        onClose={() => {
          setShowFaceModal(false);
          setPendingCoords(null);
          setPendingAction(null);
        }}
        onVerified={async (verificationToken) => {
          if (!pendingCoords || !pendingAction) {
            throw new Error("Attendance action expired. Please try again.");
          }
          await markAttendance({
            ...pendingCoords,
            verification_token: verificationToken,
          });
          setJustDone(pendingAction);
          setTimeout(() => setJustDone(null), 3500);
          setShowFaceModal(false);
          setPendingCoords(null);
          setPendingAction(null);
          await loadData(true);
        }}
      />

      {/* Mobile Select Bottom Drawer */}
      {activeSelectDrawer && (
        <MobileSelectDrawer
          isOpen={!!activeSelectDrawer}
          onClose={() => setActiveSelectDrawer(null)}
          title={activeSelectDrawer.title}
          subtitle={activeSelectDrawer.subtitle}
          options={activeSelectDrawer.options}
          selectedValue={activeSelectDrawer.selectedValue}
          onSelect={(val) => {
            activeSelectDrawer.onSelect(val);
            setActiveSelectDrawer(null);
          }}
        />
      )}
    </div>
  );
}
