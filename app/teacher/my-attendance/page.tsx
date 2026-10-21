"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  XCircle,
  RefreshCw,
  Fingerprint,
} from "lucide-react";

import {
  getTodayAttendance,
  getAttendanceHistory,
  markAttendance,
} from "@/lib/teacher";
import { getLocationSettings } from "@/lib/clerk/location-settings";
import { StaffBiometricCaptureDialog } from "@/components/attendance/StaffBiometricCaptureDialog";
import { cn } from "@/lib/utils";
import type {
  TodayAttendance,
  AttendanceLocationSettings,
  AttendanceRecord,
} from "@/types/teacher";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeviceLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
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

function calcDuration(
  checkIn: string | null,
  checkOut: string | null
): string {
  if (!checkIn || !checkOut) return "--h --m";
  try {
    let inMs: number, outMs: number;

    if (checkIn.includes("T") || checkIn.includes("Z")) {
      inMs = new Date(checkIn).getTime();
      outMs = new Date(checkOut).getTime();
    } else {
      const base = new Date();
      const [ih, im, is_] = checkIn.split(":").map(Number);
      const [oh, om, os_] = checkOut.split(":").map(Number);
      const inDate = new Date(base);
      const outDate = new Date(base);
      inDate.setHours(ih, im, is_ || 0, 0);
      outDate.setHours(oh, om, os_ || 0, 0);
      inMs = inDate.getTime();
      outMs = outDate.getTime();
    }

    const diffMs = outMs - inMs;
    if (diffMs <= 0) return "--h --m";

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m`;
  } catch {
    return "--h --m";
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyAttendancePage() {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [locationSettings, setLocationSettings] =
    useState<AttendanceLocationSettings | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"in" | "out" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<"in" | "out" | null>(null);

  // GPS Permission State
  const [gpsPermission, setGpsPermission] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");

  // Biometric Dialog State
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<"in" | "out" | null>(null);

  // Ticking local clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Monitor GPS permission status
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsPermission("unsupported");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          setGpsPermission(permissionStatus.state);
          permissionStatus.onchange = () => {
            setGpsPermission(permissionStatus.state);
          };
        })
        .catch(() => {
          // If query throws, default to prompt
          setGpsPermission("prompt");
        });
    }
  }, []);

  // Load all initial data
  const loadAll = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);

    try {
      const [todayResult, locationResult, historyResult] =
        await Promise.allSettled([
          getTodayAttendance(),
          getLocationSettings(),
          getAttendanceHistory(),
        ]);

      if (todayResult.status === "fulfilled") {
        setToday(
          todayResult.value ?? {
            attendance_date: "",
            checked_in: false,
            checked_out: false,
            check_in: null,
            check_out: null,
            is_present: false,
            is_half_day: false,
          }
        );
      } else {
        setPageError(
          todayResult.reason?.message || "Could not load today's attendance status."
        );
      }

      if (locationResult.status === "fulfilled" && locationResult.value) {
        const loc = locationResult.value;
        setLocationSettings({
          latitude: String(loc.latitude),
          longitude: String(loc.longitude),
          radius: String(loc.radius),
          school_name: loc.school_name || "School Zone",
          start_time: loc.start_time,
          end_time: loc.end_time,
          half_day_time: loc.half_day_time,
        });
      }

      if (historyResult.status === "fulfilled" && Array.isArray(historyResult.value)) {
        setHistory(historyResult.value);
      }
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const checkedIn = today?.checked_in ?? false;
  const checkedOut = today?.checked_out ?? false;

  const workPolicyStr =
    locationSettings?.start_time && locationSettings?.end_time
      ? `${fmtApiTime(locationSettings.start_time)} – ${fmtApiTime(locationSettings.end_time)}`
      : "9:00 AM – 6:00 PM";

  const duration = calcDuration(
    today?.check_in ?? null,
    today?.check_out ?? null
  );

  // Compute Weekly Statistics from history
  const weeklyStats = useMemo(() => {
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (dayOfWeek + 6) % 7; // days since Monday
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let present = 0;
    let late = 0;
    let absent = 0;

    // Filter records within current week
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
        if (rec.is_present) {
          present += 1;
        } else if (rec.status?.toLowerCase() === "absent") {
          absent += 1;
        }
        if (rec.is_late) {
          late += 1;
        }
      });
    } else {
      // Default fallback values if week has just begun or no historical data
      if (checkedIn) {
        present = 1;
      }
    }

    return {
      presentDays: present,
      lateCount: late,
      absentCount: absent,
    };
  }, [history, checkedIn]);

  // Recent 5 history items sorted descending
  const recentHistory = useMemo(() => {
    if (!history || history.length === 0) {
      return [];
    }
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

      if (today?.biometric_required) {
        setPendingCoords(coords);
        setPendingAction(type);
        setShowFaceModal(true);
        return;
      }

      await markAttendance(coords);
      setJustDone(type);
      setTimeout(() => setJustDone(null), 3500);
      await loadAll();
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

  // ── Loading Skeleton ──────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          >
            <Fingerprint className="w-9 h-9 text-[#2563EB]" />
          </motion.div>
          <p className="text-xs font-bold text-[#7183A6] tracking-wider uppercase">
            Loading your attendance…
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Error View ────────────────────────────────────────────────────────────────
  if (pageError) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xs w-full bg-white rounded-3xl border border-red-100 shadow-xl p-6 text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-[#142044]">Could Not Load</p>
            <p className="text-xs text-[#7183A6] mt-1 leading-relaxed">
              {pageError}
            </p>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-md hover:bg-[#1D4ED8] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main Page Content ─────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 lg:py-6 space-y-3.5 sm:space-y-5 pb-3 lg:pb-8 font-['Sora',sans-serif]">
      {/* ── Sub-header: Back Pill + Headings + Date Selector ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          {/* Back Button & MY ATTENDANCE Pill */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#2563EB] group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase">
              MY ATTENDANCE
            </span>
          </button>

          {/* Compact Date Selector Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5EAF4] shadow-xs text-xs font-bold text-[#142044]">
            <Calendar className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span className="truncate">{fmtHeaderDate(now)}</span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#142044] tracking-tight leading-tight">
            Attendance &amp; Duty
          </h1>
          <p className="text-xs sm:text-[13px] text-[#7183A6] mt-0.5 font-normal">
            Track your daily check-in and check-out.
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

      {/* ── Responsive Layout: 2 Columns on Desktop, 1 Column on Mobile ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-start">
        {/* Left Column (7 Cols on Desktop): Main Attendance Card */}
        <div className="lg:col-span-7 space-y-3.5 sm:space-y-5">
          {/* ── 3. Main Attendance Card ── */}
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
              {fmtClock(now)}
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
                {checkedIn ? fmtApiTime(today?.check_in) : "Pending"}
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
                <span className="truncate">{fmtApiTime(today?.check_in)}</span>
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
                  ? fmtApiTime(today?.check_out)
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
                <span className="truncate">{fmtApiTime(today?.check_out)}</span>
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
                {locationSettings?.school_name || "School Geofence"}
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
      {/* ── 4. Weekly Attendance Summary ── */}
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

      {/* ── 5. Recent Attendance ── */}
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
          <Link
            href="/teacher/attendance"
            className="text-xs font-bold text-[#2563EB] hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="divide-y divide-[#F1F5F9]">
          {recentHistory.length > 0 ? (
            recentHistory.map((item, idx) => {
              const dateDisplay = fmtHistoryDate(
                item.attendance_date || item.date_time
              );
              const isPresent = item.is_present;
              const isLate = item.is_late;
              const isHalfDay = item.is_half_day;

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
              } else if (!isPresent) {
                badgeText = "Absent";
                badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                dotColor = "bg-rose-500";
              }

              const inTime = fmtApiTime(item.check_in || item.date_time);
              const outTime = item.check_out ? fmtApiTime(item.check_out) : "--:--";

              return (
                <div
                  key={item.id ?? idx}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors px-1 rounded-xl"
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
            <div className="py-6 text-center text-xs text-[#7183A6] font-medium">
              No recent attendance records recorded yet.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  </div>

      {/* ── Biometric Capture Modal ── */}
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
          await loadAll();
        }}
      />
    </div>
  );
}
