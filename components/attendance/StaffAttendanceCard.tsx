"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  School,
  Timer,
  RefreshCw,
  Fingerprint,
  MapPin,
  Camera,
  Sparkles,
  X,
  History,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

import {
  getTodayAttendance,
  markAttendance,
  checkFaceStatus,
  verifyFace,
  enrollFace,
} from "@/lib/teacher/attendance";
import { getLocationSettings } from "@/lib/clerk/location-settings";
import { StaffAttendanceHistoryModal } from "@/components/attendance/StaffAttendanceHistoryModal";
import type { TodayAttendance, AttendanceLocationSettings } from "@/types/teacher";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeviceLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => reject(new Error("Location access denied. Please enable GPS.")),
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

function fmtClock(d: Date) {
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function calcDuration(checkIn: string | null, checkOut: string | null): string {
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

// ─── GPS Pulse Dot ─────────────────────────────────────────────────────────────

function GpsPulse({ active }: { active: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
      {active && (
        <>
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            className="absolute w-9 h-9 rounded-full bg-emerald-400/25"
          />
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: 0.4,
              ease: "easeOut",
            }}
            className="absolute w-7 h-7 rounded-full bg-emerald-400/35"
          />
        </>
      )}
      <div
        className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
        style={{
          background: active
            ? "linear-gradient(135deg, #10b981, #059669)"
            : "#f1f5f9",
        }}
      >
        <MapPin
          className="w-4 h-4"
          style={{ color: active ? "white" : "#94a3b8" }}
        />
      </div>
    </div>
  );
}

// ─── Component Props ───────────────────────────────────────────────────────────

export interface StaffAttendanceCardProps {
  roleName?: string;
  userName?: string;
  showHistoryLink?: boolean;
  historyHref?: string;
  className?: string;
}

export function StaffAttendanceCard({
  roleName = "Staff",
  userName,
  showHistoryLink = true,
  historyHref = "/teacher/attendance",
  className = "",
}: StaffAttendanceCardProps) {
  const [now, setNow] = useState(new Date());
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [locationSettings, setLocationSettings] =
    useState<AttendanceLocationSettings | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"in" | "out" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<"in" | "out" | null>(null);

  // Face Verification Modal states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceMode, setFaceMode] = useState<"verify" | "enroll">("verify");
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceSuccess, setFaceSuccess] = useState<string | null>(null);
  const [faceConfidence, setFaceConfidence] = useState<number | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isForceEnroll, setIsForceEnroll] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setFaceError(null);
    setFaceSuccess(null);
    setFaceConfidence(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera access error:", err?.message || err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setFaceError(
          "Camera access blocked. Please click the camera icon in your address bar to allow permissions."
        );
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        setFaceError("No camera found. Please connect a webcam.");
      } else {
        setFaceError("Could not access camera. Please check permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (showFaceModal) {
      startCamera();
      if (isForceEnroll) {
        setFaceMode("enroll");
      } else {
        setFaceMode("verify");
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showFaceModal, isForceEnroll]);

  const handleFaceSubmit = async () => {
    if (!videoRef.current) return;
    setFaceError(null);
    setFaceLoading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context.");

      ctx.drawImage(videoRef.current, 0, 0, 400, 400);
      const base64 = canvas.toDataURL("image/png");

      if (faceMode === "enroll") {
        await enrollFace(base64);
        if (typeof window !== "undefined") {
          const username = localStorage.getItem("username");
          localStorage.setItem("face_enrolled", "true");
          if (username) {
            localStorage.setItem(`face_enrolled_${username}`, "true");
            localStorage.setItem(
              `face_verified_date_${username}`,
              new Date().toISOString().split("T")[0]
            );
          }
        }
        setFaceSuccess("Face enrolled successfully!");
        if (isForceEnroll) {
          setTimeout(() => {
            setShowFaceModal(false);
            setIsForceEnroll(false);
            setFaceSuccess(null);
          }, 1500);
        } else {
          setTimeout(() => {
            setFaceMode("verify");
            setFaceSuccess(null);
            handleFaceVerify(base64);
          }, 1500);
        }
      } else {
        await handleFaceVerify(base64);
      }
    } catch (err: any) {
      setFaceError(err.message || "Face operation failed.");
      setFaceLoading(false);
    }
  };

  const handleMockFaceSubmit = async () => {
    setFaceError(null);
    setFaceLoading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = "#818cf8";
        ctx.beginPath();
        ctx.arc(200, 160, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(200, 320, 110, 0, Math.PI * 2);
        ctx.fill();
      }
      const base64 = canvas.toDataURL("image/png");

      if (faceMode === "enroll") {
        try {
          await enrollFace(base64);
        } catch {}
        if (typeof window !== "undefined") {
          const username = localStorage.getItem("username");
          localStorage.setItem("face_enrolled", "true");
          if (username) {
            localStorage.setItem(`face_enrolled_${username}`, "true");
            localStorage.setItem(
              `face_verified_date_${username}`,
              new Date().toISOString().split("T")[0]
            );
          }
        }
        setFaceSuccess("Mock Face enrolled successfully!");
        setTimeout(() => {
          setShowFaceModal(false);
          setIsForceEnroll(false);
          setFaceSuccess(null);
          setFaceLoading(false);
        }, 1200);
      } else {
        setFaceConfidence(98.8);
        setFaceSuccess("Mock Face verified successfully!");
        if (typeof window !== "undefined") {
          const username = localStorage.getItem("username");
          localStorage.setItem("face_enrolled", "true");
          if (username) {
            localStorage.setItem(
              `face_verified_date_${username}`,
              new Date().toISOString().split("T")[0]
            );
          }
        }
        if (pendingCoords) {
          await markAttendance(pendingCoords);
          setJustDone("in");
          setTimeout(() => setJustDone(null), 3000);
          await loadAll();
        }
        setTimeout(() => {
          setShowFaceModal(false);
          setFaceSuccess(null);
          setFaceLoading(false);
        }, 1200);
      }
    } catch (err: any) {
      setFaceError(err?.message || "Mock scan failed.");
      setFaceLoading(false);
    }
  };

  const handleFaceVerify = async (base64: string) => {
    try {
      const res = await verifyFace(base64);
      const isVerified = res.Verified ?? res.verified ?? false;
      const confidence = res.Confidence ?? res.confidence ?? 0;

      if (isVerified) {
        setFaceConfidence(confidence);
        setFaceSuccess("Face verified successfully!");

        if (typeof window !== "undefined") {
          const username = localStorage.getItem("username");
          localStorage.setItem("face_enrolled", "true");
          if (username) {
            localStorage.setItem(
              `face_verified_date_${username}`,
              new Date().toISOString().split("T")[0]
            );
          }
        }

        const vToken = res.verification_token ?? res.token;
        if (pendingCoords) {
          await markAttendance({
            ...pendingCoords,
            ...(vToken ? { verification_token: vToken } : {}),
          });
          setJustDone("in");
          setTimeout(() => setJustDone(null), 3000);
          await loadAll();
        }

        setTimeout(() => {
          setShowFaceModal(false);
          setFaceSuccess(null);
          setFaceConfidence(null);
        }, 2000);
      } else {
        setFaceError(
          `Verification failed (Confidence: ${confidence.toFixed(
            2
          )}%). Please align your face and try again.`
        );
      }
    } catch (err: any) {
      setFaceError(err.message || "Verification failed. Please try again.");
    } finally {
      setFaceLoading(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);

    try {
      const [todayResult, locationResult] = await Promise.allSettled([
        getTodayAttendance(),
        getLocationSettings(),
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
          todayResult.reason?.message || "Could not load attendance status."
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
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const checkedIn = today?.checked_in ?? false;
  const checkedOut = today?.checked_out ?? false;

  const workTimeStr =
    locationSettings?.start_time && locationSettings?.end_time
      ? `${fmtApiTime(locationSettings.start_time)} – ${fmtApiTime(
          locationSettings.end_time
        )}`
      : "09:00 AM – 05:00 PM";

  const duration = calcDuration(
    today?.check_in ?? null,
    today?.check_out ?? null
  );

  const handleAction = async (type: "in" | "out") => {
    setActionError(null);
    setActionLoading(type);
    try {
      const { latitude, longitude } = await getDeviceLocation();
      if (type === "in") {
        setPendingCoords({ latitude, longitude });
        setShowFaceModal(true);
      } else {
        await markAttendance({ latitude, longitude });
        setJustDone(type);
        setTimeout(() => setJustDone(null), 3000);
        await loadAll();
      }
    } catch (err: any) {
      setActionError(err.message || "Something went wrong. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className={`w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden ${className}`}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Top Header / Live Clock Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 via-indigo-50/40 to-slate-50/60">
        <div className="flex items-center gap-3">
          <GpsPulse active={checkedIn && !checkedOut} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-100/70 px-2 py-0.5 rounded-full">
                {roleName} Attendance
              </span>
              {checkedIn && !checkedOut && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Session
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              {checkedIn && !checkedOut
                ? "Checked in — record your checkout before leaving"
                : checkedOut
                ? "Attendance complete for today"
                : "Record your daily check-in with GPS location"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Live Time
            </p>
            <p className="text-base sm:text-lg font-black text-violet-700 tabular-nums leading-tight">
              {fmtClock(now)}
            </p>
          </div>

          {showHistoryLink && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-violet-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-violet-500" />
              <span>Log</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── Action Alerts / Errors ── */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden px-4 pt-3"
          >
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 font-semibold flex-1">
                {actionError}
              </p>
              <button
                onClick={() => setActionError(null)}
                className="text-red-400 hover:text-red-600 text-lg leading-none"
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
            className="overflow-hidden px-4 pt-3"
          >
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border"
              style={
                justDone === "in"
                  ? { background: "#f0fdf4", borderColor: "#bbf7d0" }
                  : { background: "#f5f3ff", borderColor: "#ddd6fe" }
              }
            >
              <CheckCircle2
                className="w-4 h-4 shrink-0"
                style={{ color: justDone === "in" ? "#22c55e" : "#7c3aed" }}
              />
              <p
                className="text-xs font-bold"
                style={{ color: justDone === "in" ? "#15803d" : "#5b21b6" }}
              >
                {justDone === "in"
                  ? "Check-in recorded successfully!"
                  : "Check-out recorded successfully!"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Check In / Check Out Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-slate-100 p-4 gap-4 md:gap-0">
        {/* Check In Column */}
        <div className="md:pr-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: checkedIn ? "#d1fae5" : "#f1f5f9" }}
              >
                <LogIn
                  className="w-3.5 h-3.5"
                  style={{ color: checkedIn ? "#10b981" : "#94a3b8" }}
                />
              </div>
              <div>
                <p
                  className="text-xs font-extrabold"
                  style={{ color: checkedIn ? "#10b981" : "#64748b" }}
                >
                  Check In
                </p>
              </div>
            </div>

            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={
                checkedIn
                  ? { background: "#d1fae5", color: "#065f46" }
                  : { background: "#fef9c3", color: "#854d0e" }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: checkedIn ? "#10b981" : "#f59e0b" }}
              />
              {checkedIn ? "Recorded" : "Pending"}
            </span>
          </div>

          <div>
            <p
              className="font-black tabular-nums leading-none text-xl sm:text-2xl"
              style={{ color: checkedIn ? "#0f172a" : "#cbd5e1" }}
            >
              {checkedIn ? fmtApiTime(today?.check_in) : "--:-- --"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              {checkedIn
                ? today?.attendance_date || "Today"
                : "Not checked in yet"}
            </p>
          </div>

          {!checkedIn && !checkedOut ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAction("in")}
              disabled={actionLoading !== null || pageLoading}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-60 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {actionLoading === "in" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking In…
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" /> Check In Now
                </>
              )}
            </motion.button>
          ) : (
            <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
            </div>
          )}
        </div>

        {/* Check Out Column */}
        <div className="md:pl-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: checkedOut ? "#ede9fe" : "#f1f5f9" }}
              >
                <LogOut
                  className="w-3.5 h-3.5"
                  style={{ color: checkedOut ? "#7c3aed" : "#94a3b8" }}
                />
              </div>
              <div>
                <p
                  className="text-xs font-extrabold"
                  style={{ color: checkedOut ? "#7c3aed" : "#64748b" }}
                >
                  Check Out
                </p>
              </div>
            </div>

            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={
                checkedOut
                  ? { background: "#ede9fe", color: "#4c1d95" }
                  : checkedIn
                  ? { background: "#fff7ed", color: "#9a3412" }
                  : { background: "#f8fafc", color: "#94a3b8" }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: checkedOut
                    ? "#7c3aed"
                    : checkedIn
                    ? "#f97316"
                    : "#cbd5e1",
                }}
              />
              {checkedOut ? "Completed" : checkedIn ? "Active" : "Pending"}
            </span>
          </div>

          <div>
            <p
              className="font-black tabular-nums leading-none text-xl sm:text-2xl"
              style={{ color: checkedOut ? "#0f172a" : "#cbd5e1" }}
            >
              {checkedOut ? fmtApiTime(today?.check_out) : "--:-- --"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              {checkedOut ? "Session ended" : "Pending checkout"}
            </p>
          </div>

          {checkedIn && !checkedOut ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAction("out")}
              disabled={actionLoading !== null || pageLoading}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-60 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              {actionLoading === "out" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking
                  Out…
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" /> Check Out Now
                </>
              )}
            </motion.button>
          ) : checkedOut ? (
            <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-violet-50 text-violet-700 border border-violet-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Checked Out
            </div>
          ) : (
            <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed">
              <LogOut className="w-3.5 h-3.5" /> Check Out Now
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Information Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/70 text-xs">
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <div className="w-6 h-6 rounded-md bg-violet-100/70 flex items-center justify-center shrink-0">
            <School className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              School Zone
            </p>
            <p className="text-xs font-bold text-slate-700 truncate">
              {locationSettings?.school_name || "Authorized Campus"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <div className="w-6 h-6 rounded-md bg-sky-100/70 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Shift Timing
            </p>
            <p className="text-xs font-bold text-slate-700 truncate">
              {workTimeStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <div className="w-6 h-6 rounded-md bg-emerald-100/70 flex items-center justify-center shrink-0">
            <Timer className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Working Duration
            </p>
            <p className="text-xs font-bold text-slate-700 truncate">
              {checkedIn ? duration : "--h --m"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Face Verification Modal ── */}
      <AnimatePresence>
        {showFaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden relative p-6 space-y-6"
            >
              {!isForceEnroll && (
                <button
                  type="button"
                  onClick={() => setShowFaceModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600 z-30"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold text-slate-800">
                  {faceMode === "enroll"
                    ? "Register Face Biometrics"
                    : "Biometric Face Scan"}
                </h3>
                <p className="text-xs text-slate-400">
                  {faceMode === "enroll"
                    ? "First-time setup: please capture your face to enroll."
                    : "Please scan your face to record your check-in."}
                </p>
              </div>

              {/* Video Preview */}
              <div className="relative aspect-square max-w-[260px] mx-auto rounded-full overflow-hidden bg-slate-950 border-4 border-slate-100 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover scale-x-[-1] ${
                    faceSuccess ? "opacity-30 filter blur-sm" : "opacity-100"
                  }`}
                />

                {!faceSuccess && !faceError && (
                  <motion.div
                    animate={{ y: [0, 250, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.2,
                      ease: "easeInOut",
                    }}
                    className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent shadow-[0_0_10px_rgba(139,92,246,0.8)] z-20"
                  />
                )}

                {faceLoading && (
                  <div className="absolute inset-0 bg-slate-950/40 z-20 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest bg-slate-900/60 px-3 py-1 rounded-full">
                      Processing…
                    </p>
                  </div>
                )}

                {faceSuccess && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-emerald-500/10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
                    >
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </motion.div>
                    <p className="text-xs font-extrabold text-emerald-600 bg-white/95 px-3 py-1 rounded-full shadow-sm">
                      {faceSuccess}
                    </p>
                    {faceConfidence !== null && (
                      <p className="text-[10px] font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
                        Confidence: {faceConfidence.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              {faceError && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium leading-normal flex-1">
                    {faceError}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!faceSuccess && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleFaceSubmit}
                    disabled={faceLoading}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                  >
                    {faceMode === "enroll" ? (
                      <>
                        <Camera className="w-4 h-4" /> Capture & Enroll Face
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Verify & Check In
                      </>
                    )}
                  </button>

                  {/* Dev-Mode Mock Face Bypass */}
                  <button
                    type="button"
                    onClick={handleMockFaceSubmit}
                    disabled={faceLoading}
                    className="w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-violet-200 bg-violet-50/80 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                  >
                    {faceLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Bypass with Mock Face (Testing Mode)
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Attendance Log & Regularization Modal ── */}
      <StaffAttendanceHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        roleName={roleName}
        staffName={userName}
      />
    </div>
  );
}
