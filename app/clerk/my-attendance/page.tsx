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
  Timer,
  History,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function ClerkPersonalAttendancePage() {
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-sky-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Staff Duty & Attendance
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Clerk Duty Attendance</h1>
            <p className="text-sky-200 max-w-xl text-sm md:text-base">
              Personal punch in / punch out, daily working hours, and shift history for administration staff.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white self-start md:self-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("punch")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "punch"
              ? "bg-sky-600 text-white shadow-md shadow-sky-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Clock className="h-4 w-4" /> Duty Punch Desk
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "history"
              ? "bg-sky-600 text-white shadow-md shadow-sky-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <History className="h-4 w-4" /> Monthly Log ({history.length})
        </button>
      </div>

      {activeTab === "punch" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-8 shadow-sm flex flex-col justify-between space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Administrative Shift</span>
                <h2 className="text-2xl font-black text-gray-900 mt-0.5">
                  {currentTime.toLocaleDateString("en-IN", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-sky-50 border border-sky-100 font-mono text-xl font-bold text-sky-700 text-center sm:text-right">
                {currentTime.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5 text-emerald-600" /> Punch In Time
                </span>
                <div className="text-lg font-bold text-gray-900">
                  {todayData?.checked_in ? fmtApiTime(todayData.check_in) : "--:-- --"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5 text-rose-600" /> Punch Out Time
                </span>
                <div className="text-lg font-bold text-gray-900">
                  {todayData?.checked_out ? fmtApiTime(todayData.check_out) : "--:-- --"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-sky-600" /> Duty Hours
                </span>
                <div className="text-lg font-bold text-sky-700">
                  {calcDuration(todayData?.check_in || null, todayData?.check_out || null)}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="h-4 w-4 text-sky-600" />
                <span>Geofenced location logged with entry.</span>
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

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-900 text-base">Office Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Days Logged</span>
                  <span className="font-bold text-gray-900">{history.length} days</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Present Shifts</span>
                  <span className="font-bold text-emerald-600">
                    {history.filter((h) => h.status === "PRESENT").length} shifts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900">Personal Attendance History</h3>
          {history.length === 0 ? (
            <div className="text-center py-12">
              <img
                src="/images/empty-folder.png"
                alt="No records found"
                className="mx-auto mb-2 h-20 w-20 object-contain"
              />
              <p className="font-semibold text-slate-700 text-sm">No records found</p>
              <p className="text-xs text-slate-400 mt-1">Your attendance punch logs will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Punch GPS</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {r.attendance_date ? new Date(r.attendance_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-mono">{fmtApiTime(r.check_in)}</td>
                      <td className="py-3 px-4 text-rose-700 font-mono">{fmtApiTime(r.check_out)}</td>
                      <td className="py-3 px-4">{calcDuration(r.check_in || null, r.check_out || null)}</td>
                      <td className="py-3 px-4 text-[11px] text-gray-500">
                        {r.check_in_latitude != null && r.check_in_longitude != null ? `In: ${r.check_in_latitude}, ${r.check_in_longitude}` : "In: not recorded"}
                        <br />
                        {r.check_out_latitude != null && r.check_out_longitude != null ? `Out: ${r.check_out_latitude}, ${r.check_out_longitude}` : "Out: not recorded"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
