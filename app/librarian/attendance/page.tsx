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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTodayAttendance,
  markAttendance,
  getAttendanceHistory,
} from "@/lib/teacher/attendance";
import type { TodayAttendance, AttendanceRecord } from "@/types/teacher";

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [today, historyList] = await Promise.all([
        getTodayAttendance().catch(() => null),
        getAttendanceHistory().catch(() => []),
      ]);
      setTodayData(today);
      setHistory(historyList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePunch = async () => {
    setActionLoading(true);
    try {
      let lat = 0;
      let lng = 0;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 8000,
              enableHighAccuracy: true,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // fallback to 0 if permission denied
        }
      }

      await markAttendance({ latitude: lat, longitude: lng });
      showToast("success", todayData?.checked_in ? "Punch Out recorded successfully!" : "Punch In recorded successfully!");
      await loadData();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to mark attendance.");
    } finally {
      setActionLoading(false);
    }
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Staff Duty & Attendance Panel
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Librarian Attendance</h1>
            <p className="text-indigo-200 max-w-xl text-sm md:text-base">
              Daily check-in / check-out, geofenced duty confirmation, working hours tracking, and monthly attendance history.
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Punch Clock Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-8 shadow-sm flex flex-col justify-between space-y-8">
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
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
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

      {/* TAB 2: HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Attendance History Log</h3>
              <p className="text-xs text-gray-500">Previous punch-in / punch-out records and verified shift hours.</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
              Total {history.length} records
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No previous attendance records found.
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
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-mono">
                        {fmtApiTime(record.check_in)}
                      </td>
                      <td className="py-3 px-4 text-rose-700 font-mono">
                        {fmtApiTime(record.check_out)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {calcDuration(record.check_in || null, record.check_out || null)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
          )}
        </div>
      )}
    </div>
  );
}
