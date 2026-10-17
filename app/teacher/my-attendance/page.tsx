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
            <Fingerprint className="w-9 h-9 text-[#5436F5]" />
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
            className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-[#5436F5] text-white text-xs font-bold shadow-md hover:bg-[#4326DE] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main Page Content ─────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-full max-w-lg mx-auto px-3.5 sm:px-5 py-3 sm:py-5 space-y-4 pb-28 lg:pb-8">
      {/* ── Sub-header: Back Pill + Headings ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5"
      >
        {/* Back Button & MY ATTENDANCE Pill */}
        <div className="inline-flex items-center">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#5436F5] hover:bg-[#DDD6FE] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#5436F5] group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase">
              MY ATTENDANCE
            </span>
          </button>
        </div>

        {/* Heading */}
        <h1 className="text-[22px] sm:text-2xl font-black text-[#142044] tracking-tight leading-tight">
          Attendance &amp; Duty
        </h1>

        {/* Subtitle */}
        <p className="text-[13px] text-[#7183A6] font-normal leading-normal">
          Track your daily check-in and check-out.
        </p>

        {/* Date Selector Pill */}
        <div className="pt-1.5">
          <div className="w-full bg-white border border-[#E5EAF4] rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_2px_8px_rgba(20,32,68,0.03)] hover:border-[#5436F5]/40 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-4 h-4 text-[#5436F5] shrink-0" />
              <span className="text-sm font-bold text-[#142044] truncate">
                {fmtHeaderDate(now)}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#7183A6] shrink-0" />
          </div>
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
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
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
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border ${
                justDone === "in"
                  ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]"
                  : "bg-[#F5F3FF] border-[#DDD6FE] text-[#5436F5]"
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

      {/* ── 3. Main Attendance Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-3xl border border-[#E5EAF4] shadow-[0_4px_24px_rgba(20,32,68,0.05)] overflow-hidden"
      >
        {/* Section A: GPS & Current Time Lavender Panel */}
        <div className="bg-[#F6F4FF] px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#EBE8F8]">
          {/* GPS Readiness Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs border border-purple-100 shrink-0">
              <MapPin
                className={`w-5 h-5 ${
                  gpsPermission === "denied"
                    ? "text-[#EF4444]"
                    : "text-[#5436F5]"
                }`}
              />
            </div>
            <div>
              <p
                className={`text-[11px] font-black uppercase tracking-wider ${
                  gpsPermission === "denied"
                    ? "text-[#EF4444]"
                    : "text-[#5436F5]"
                }`}
              >
                {gpsPermission === "denied" ? "GPS DISABLED" : "GPS READY"}
              </p>
              <p className="text-[11px] text-[#7183A6] font-medium leading-tight">
                {gpsPermission === "denied"
                  ? "Enable location permission"
                  : "Mark your attendance"}
              </p>
            </div>
          </div>

          {/* Current Local Time */}
          <div className="text-right">
            <p className="text-[10px] font-bold text-[#7183A6] uppercase tracking-wider">
              Current Time
            </p>
            <p className="text-[19px] sm:text-xl font-black text-[#5436F5] tracking-tight tabular-nums leading-tight">
              {fmtClock(now)}
            </p>
          </div>
        </div>

        {/* Section B: Check In & Check Out Stepper Flow */}
        <div className="px-4 sm:px-5 py-4 space-y-3.5">
          {/* Step 1: Check In */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4 text-[#5436F5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142044] leading-tight">
                    Check In
                  </h3>
                  {checkedIn ? (
                    <p className="text-[11px] text-[#16A34A] font-semibold mt-0.5">
                      {fmtApiTime(today?.check_in)}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Status Pill Badge */}
              <div className="shrink-0">
                {checkedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    Checked In
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    Pending
                  </span>
                )}
              </div>
            </div>

            {/* Check In Action Button */}
            {!checkedIn && !checkedOut ? (
              <button
                type="button"
                onClick={() => handleAction("in")}
                disabled={actionLoading !== null}
                className="w-full bg-[#10B981] hover:bg-[#059669] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl shadow-[0_4px_14px_rgba(16,185,129,0.32)] flex items-center justify-center gap-2 transition-all cursor-pointer text-sm disabled:opacity-70"
              >
                {actionLoading === "in" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying &amp; Checking In…</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Check In Now</span>
                  </>
                )}
              </button>
            ) : null}
          </div>

          {/* Dotted Stepper Connector */}
          <div className="flex items-center pl-4 -my-1">
            <div className="h-5 border-l-2 border-dashed border-[#CBD5E1]" />
          </div>

          {/* Step 2: Check Out */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    checkedIn && !checkedOut ? "bg-[#EDE9FE]" : "bg-[#F1F5F9]"
                  }`}
                >
                  <LogOut
                    className={`w-4 h-4 ${
                      checkedIn && !checkedOut
                        ? "text-[#5436F5]"
                        : "text-[#7183A6]"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142044] leading-tight">
                    Check Out
                  </h3>
                  {checkedOut ? (
                    <p className="text-[11px] text-[#5436F5] font-semibold mt-0.5">
                      {fmtApiTime(today?.check_out)}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Status Pill Badge */}
              <div className="shrink-0">
                {checkedOut ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#5436F5] text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5436F5]" />
                    Completed
                  </span>
                ) : checkedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                    Not started
                  </span>
                )}
              </div>
            </div>

            {/* Check Out Action Button */}
            {checkedIn && !checkedOut ? (
              <button
                type="button"
                onClick={() => handleAction("out")}
                disabled={actionLoading !== null}
                className="w-full bg-[#5436F5] hover:bg-[#4326DE] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl shadow-[0_4px_14px_rgba(84,54,245,0.32)] flex items-center justify-center gap-2 transition-all cursor-pointer text-sm disabled:opacity-70"
              >
                {actionLoading === "out" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying &amp; Checking Out…</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Check Out Now</span>
                  </>
                )}
              </button>
            ) : !checkedOut ? (
              <button
                type="button"
                disabled
                className="w-full bg-[#F1F5F9] text-[#94A3B8] font-semibold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed border border-[#E2E8F0] text-sm"
              >
                <LogOut className="w-4 h-4 text-[#94A3B8]" />
                <span>Check Out</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Section C: Footer Info Tiles */}
        <div className="border-t border-[#E5EAF4] grid grid-cols-2 divide-x divide-[#E5EAF4] bg-[#FAFBFF]">
          {/* Tile 1: Location Status */}
          <div className="px-3.5 sm:px-4 py-3 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[#7183A6] leading-none">
                Location Status
              </p>
              <p className="text-[11px] font-bold text-[#10B981] mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0 inline-block" />
                <span>
                  {gpsPermission === "denied"
                    ? "Location Disabled"
                    : "Location Enabled"}
                </span>
              </p>
            </div>
          </div>

          {/* Tile 2: Attendance Policy */}
          <div className="px-3.5 sm:px-4 py-3 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[#7183A6] leading-none">
                Attendance Policy
              </p>
              <p className="text-[11px] font-bold text-[#142044] mt-0.5 truncate">
                {workPolicyStr}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 4. Weekly Summary Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl border border-[#E5EAF4] shadow-[0_4px_24px_rgba(20,32,68,0.05)] p-4 sm:p-5"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[#5436F5]" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-sm font-bold text-[#142044]">This Week</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#142044]" />
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#7183A6]" />
        </div>

        {/* 3 Stats Columns */}
        <div className="grid grid-cols-3 divide-x divide-[#F1F5F9] pt-3.5 text-center">
          {/* Present */}
          <div className="px-2">
            <div className="flex items-center justify-center gap-1 text-[#142044] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span>Present</span>
            </div>
            <p className="text-base sm:text-lg font-extrabold text-[#142044] mt-1 tracking-tight">
              {weeklyStats.presentDays}{" "}
              <span className="text-xs font-medium text-[#7183A6]">
                {weeklyStats.presentDays === 1 ? "day" : "days"}
              </span>
            </p>
          </div>

          {/* Late */}
          <div className="px-2">
            <div className="flex items-center justify-center gap-1 text-[#142044] text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span>Late</span>
            </div>
            <p className="text-base sm:text-lg font-extrabold text-[#142044] mt-1 tracking-tight">
              {weeklyStats.lateCount}
            </p>
          </div>

          {/* Absent */}
          <div className="px-2">
            <div className="flex items-center justify-center gap-1 text-[#142044] text-xs font-semibold">
              <XCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
              <span>Absent</span>
            </div>
            <p className="text-base sm:text-lg font-extrabold text-[#142044] mt-1 tracking-tight">
              {weeklyStats.absentCount}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 5. Attendance History Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl border border-[#E5EAF4] shadow-[0_4px_24px_rgba(20,32,68,0.05)] p-4 sm:p-5"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#5436F5]" />
            </div>
            <h2 className="text-sm font-bold text-[#142044]">
              Attendance History
            </h2>
          </div>
          <Link
            href="/teacher/attendance"
            className="text-xs font-bold text-[#5436F5] hover:underline"
          >
            View All
          </Link>
        </div>

        {/* History List Items */}
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
              let badgeColor = "bg-[#DCFCE7] text-[#16A34A]";
              let dotColor = "bg-[#16A34A]";

              if (isLate) {
                badgeText = "Late";
                badgeColor = "bg-[#FEF3C7] text-[#D97706]";
                dotColor = "bg-[#F59E0B]";
              } else if (isHalfDay) {
                badgeText = "Half Day";
                badgeColor = "bg-[#EDE9FE] text-[#5436F5]";
                dotColor = "bg-[#5436F5]";
              } else if (!isPresent) {
                badgeText = "Absent";
                badgeColor = "bg-[#FEE2E2] text-[#DC2626]";
                dotColor = "bg-[#EF4444]";
              }

              return (
                <div
                  key={item.id ?? idx}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors px-1 rounded-xl"
                >
                  <p className="text-xs sm:text-sm font-semibold text-[#142044]">
                    {dateDisplay}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeColor}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      {badgeText}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                </div>
              );
            })
          ) : (
            // Default sample rows as per mockup when new user has no records yet
            <>
              <div className="py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors px-1 rounded-xl">
                <p className="text-xs sm:text-sm font-semibold text-[#142044]">
                  Fri, 16 Oct, 2026
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    Present
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </div>
              </div>
              <div className="py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors px-1 rounded-xl">
                <p className="text-xs sm:text-sm font-semibold text-[#142044]">
                  Thu, 15 Oct, 2026
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    Present
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

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
