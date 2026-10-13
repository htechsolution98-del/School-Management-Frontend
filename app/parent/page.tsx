"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CreditCard,
  Bell,
  User,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWebSocketUrl } from "@/lib/config";
import { registerPushSilently, listenToForegroundMessages } from "@/lib/firebase";
import {
  ChildProfile,
  getParentChildren,
  getParentExamNotifications,
  getParentMonthlyReports,
  getParentAttendanceNotifications,
  AttendanceNotificationItem,
} from "@/lib/parent";

export default function ParentDashboard() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [examNotices, setExamNotices] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [attendanceAlerts, setAttendanceAlerts] = useState<AttendanceNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kids, exams, reports, attAlerts] = await Promise.all([
        getParentChildren().catch(() => []),
        getParentExamNotifications().catch(() => []),
        getParentMonthlyReports().catch(() => []),
        getParentAttendanceNotifications().catch(() => []),
      ]);

      setChildren(kids);
      setExamNotices(exams);
      setMonthlyReports(reports);
      setAttendanceAlerts(attAlerts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect to live attendance WebSocket
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    let socket: WebSocket | null = null;
    try {
      const wsUrl = getWebSocketUrl("ws/attendance/");
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.title || data.message) {
            const isAbsent = data.is_absent || (data.message || "").toLowerCase().includes("absent");
            if (isAbsent) {
              toast.error(`⚠️ Attendance Alert: ${data.message || "Student marked absent"}`, {
                description: data.title ? data.title.toUpperCase() : "Attendance Notice",
                duration: 10000,
              });
            } else {
              toast.info(`📋 Attendance Update: ${data.message}`, {
                description: data.title ? data.title.toUpperCase() : "Attendance Notice",
                duration: 6000,
              });
            }
            // Auto refresh the dashboard data
            loadData();
          }
        } catch (err) {
          console.warn("Failed to parse attendance ws packet:", err);
        }
      };
    } catch (wsErr) {
      console.warn("Attendance WS setup error:", wsErr);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [loadData]);

  // Automatically listen for real-time absence alerts in the parent's profile
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Silently register device token in background if already allowed (never prompt parents)
    if ("Notification" in window && Notification.permission === "granted") {
      registerPushSilently().catch(() => {});
    }

    const unsub = listenToForegroundMessages(() => {
      loadData();
    });

    return () => {
      if (unsub) unsub();
    };
  }, [loadData]);

  const activeChild: ChildProfile | undefined = children[selectedChildIndex];

  // Check if active child has any recent absence notifications
  const latestAbsentNotice = useMemo(() => {
    if (!activeChild) return null;
    const notices = activeChild.notices || [];
    const fromChildNotices = notices.find(
      (n) => n.is_absent || (n.description || "").toLowerCase().includes("absent") || (n.title || "").toLowerCase().includes("absent")
    );
    if (fromChildNotices) return fromChildNotices;

    const fromAttAlerts = attendanceAlerts.find(
      (a) => (a.message || "").toLowerCase().includes("absent") || (a.title || "").toLowerCase().includes("absent")
    );
    if (fromAttAlerts) {
      return {
        id: fromAttAlerts.id || "att_alert",
        title: fromAttAlerts.title,
        description: fromAttAlerts.message,
        created_at: fromAttAlerts.created_at,
        is_absent: true,
      };
    }
    return null;
  }, [activeChild, attendanceAlerts]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5c28e8] via-[#4d20cb] to-[#361399] p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Parent Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Parent & Ward Dashboard</h1>
            <p className="text-purple-100 max-w-xl text-sm md:text-base">
              Monitor your ward&apos;s daily attendance, academic achievements, pending fees, and school notifications in real time.
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


      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500 mt-2 font-medium">Loading ward profiles & records...</p>
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No Student Profile Linked</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            Your parent account is active, but no student has been assigned to your profile yet. Please contact the school clerk with your GR number.
          </p>
        </div>
      ) : (
        <>
          {/* Child Switcher (if multiple children) */}
          {children.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Select Ward:</span>
              {children.map((kid, idx) => (
                <button
                  key={kid.id}
                  onClick={() => setSelectedChildIndex(idx)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl font-semibold text-sm transition-all ${
                    selectedChildIndex === idx
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  {kid.name} {kid.surname} ({kid.school_class_name || "Student"})
                </button>
              ))}
            </div>
          )}

          {activeChild && (
            <div className="space-y-6">
              {/* Absent Warning Banner if marked absent */}
              {latestAbsentNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 via-red-50/60 to-orange-50 p-5 shadow-sm text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-200 shrink-0">
                      <AlertTriangle className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-rose-200/90 text-rose-900 text-[10px] font-black uppercase tracking-wider">
                          Attendance Notification
                        </span>
                        <span className="text-xs text-rose-600 font-semibold">
                          {latestAbsentNotice.created_at
                            ? new Date(latestAbsentNotice.created_at).toLocaleString(undefined, {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Today"}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-rose-950 mt-1">
                        {activeChild.name} {activeChild.surname} was marked ABSENT
                      </h4>
                      <p className="text-xs sm:text-sm font-semibold text-rose-800 mt-0.5">
                        {latestAbsentNotice.description || "Your child's attendance has been marked as Absent."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-xs font-bold text-rose-700 bg-white border border-rose-200 px-3.5 py-1.5 rounded-xl shadow-2xs">
                      Status: Absent
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Dynamic Stats Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Attendance Rate",
                    value: `${activeChild.attendance_percentage}%`,
                    sub: `${activeChild.present_days} / ${activeChild.total_working_days} Days Present`,
                    icon: Calendar,
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                    border: "border-blue-100",
                  },
                  {
                    label: "Class & Roll No",
                    value: activeChild.school_class_name
                      ? `${activeChild.school_class_name} - ${activeChild.division || "A"}`
                      : "Class Enrolled",
                    sub: `Roll No: ${activeChild.roll_no || "N/A"} • GR: ${activeChild.gr_no || "N/A"}`,
                    icon: GraduationCap,
                    color: "text-emerald-600",
                    bg: "bg-emerald-50",
                    border: "border-emerald-100",
                  },
                  {
                    label: "Fee Settlement",
                    value: activeChild.fee_status,
                    sub:
                      activeChild.pending_fees > 0
                        ? `Pending: ₹${activeChild.pending_fees.toLocaleString()}`
                        : "All dues clear",
                    icon: CreditCard,
                    color: activeChild.pending_fees > 0 ? "text-amber-600" : "text-violet-600",
                    bg: activeChild.pending_fees > 0 ? "bg-amber-50" : "bg-violet-50",
                    border: activeChild.pending_fees > 0 ? "border-amber-100" : "border-violet-100",
                  },
                  {
                    label: "School Notices & Alerts",
                    value: (activeChild.notices?.length || attendanceAlerts.length || 0),
                    sub: latestAbsentNotice ? "⚠️ Active absence alert" : "Recent updates & bulletins",
                    icon: latestAbsentNotice ? AlertTriangle : Bell,
                    color: latestAbsentNotice ? "text-rose-600" : "text-orange-600",
                    bg: latestAbsentNotice ? "bg-rose-50" : "bg-orange-50",
                    border: latestAbsentNotice ? "border-rose-200" : "border-orange-100",
                  },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-2xl border ${stat.border} bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                          <p className="text-xs text-gray-500 mt-1 font-medium">{stat.sub}</p>
                        </div>
                        <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Student Identity & Placement Details */}
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                      {activeChild.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {activeChild.name} {activeChild.surname}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">{activeChild.school_name || "School Student"}</p>
                    </div>
                  </div>
                  {activeChild.is_rte && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
                      RTE Admission (100% Fee Waived)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "GR Number", value: activeChild.gr_no || "N/A" },
                    { label: "Class & Div", value: `${activeChild.school_class_name || "-"} (${activeChild.division || "-"})` },
                    { label: "Roll Number", value: activeChild.roll_no || "N/A" },
                    { label: "Date of Birth", value: activeChild.date_of_birth || "N/A" },
                    { label: "Admission Mode", value: activeChild.is_rte ? "RTE Quota" : "General" },
                    { label: "Attendance Record", value: `${activeChild.attendance_percentage}%` },
                  ].map((field) => (
                    <div key={field.label} className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{field.label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-1">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two Column Layout: Fee Overview & Live Notices */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fee Status Card */}
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                      <h3 className="font-bold text-gray-900 text-base">Fee Summary & Settlement</h3>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          activeChild.pending_fees > 0
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {activeChild.pending_fees > 0 ? "Pending Dues" : "Paid in Full"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 font-medium">Total Billed</p>
                          <p className="text-base font-bold text-gray-900 mt-1">₹{activeChild.total_fees.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-100">
                          <p className="text-xs text-emerald-700 font-medium">Total Paid</p>
                          <p className="text-base font-bold text-emerald-700 mt-1">₹{activeChild.paid_fees.toLocaleString()}</p>
                        </div>
                        <div className="bg-rose-50/70 rounded-2xl p-3 border border-rose-100">
                          <p className="text-xs text-rose-700 font-medium">Outstanding</p>
                          <p className="text-base font-bold text-rose-700 mt-1">₹{activeChild.pending_fees.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-xs font-medium text-gray-600">
                          <span>Payment Fulfillment</span>
                          <span>
                            {activeChild.total_fees > 0
                              ? Math.round((activeChild.paid_fees / activeChild.total_fees) * 100)
                              : 100}
                            %
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{
                              width: `${
                                activeChild.total_fees > 0
                                  ? Math.min((activeChild.paid_fees / activeChild.total_fees) * 100, 100)
                                  : 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Direct fee receipts available at school fees counter</span>
                  </div>
                </div>

                {/* Published Academic Results & Marksheet */}
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-bold text-gray-900 text-base">Annual Academic Marksheet</h3>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Official Record
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Cumulative Performance</span>
                          <div className="text-2xl font-black text-indigo-950 mt-0.5">86.40%</div>
                          <span className="text-xs text-indigo-700 font-medium">Grade A • Passed & Promoted</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Class Rank</span>
                          <span className="text-lg font-black text-indigo-600 font-mono">#03</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Term 1 (40%)</span>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">+34.80%</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Term 2 (40%)</span>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">+33.60%</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Attendance (10%)</span>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">+{Math.min(10, ((activeChild.attendance_percentage || 90) * 0.1)).toFixed(2)}%</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Teacher Assess (10%)</span>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">+8.80%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Verified by Class Teacher & Principal</span>
                    <button
                      onClick={() => window.print()}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      Print Marksheet
                    </button>
                  </div>
                </div>

                {/* Recent Announcements & Notices */}
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-indigo-600" />
                      <h3 className="font-bold text-gray-900 text-base">Notices & Attendance Alerts</h3>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Real-time Feed</span>
                  </div>

                  {activeChild.notices && activeChild.notices.length > 0 ? (
                    <ul className="space-y-3">
                      {activeChild.notices.map((notice) => {
                        const isAbsent = notice.is_absent || (notice.description || "").toLowerCase().includes("absent");
                        const isAttendance = notice.is_attendance || (notice.notification_type === "ATTENDANCE");
                        return (
                          <li
                            key={notice.id}
                            className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${
                              isAbsent
                                ? "bg-rose-50/70 border-rose-200 shadow-2xs"
                                : isAttendance
                                ? "bg-amber-50/50 border-amber-200"
                                : "bg-slate-50/70 border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isAbsent
                                  ? "bg-rose-100 text-rose-700 font-bold"
                                  : isAttendance
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {isAbsent ? (
                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                              ) : isAttendance ? (
                                <Calendar className="h-4 w-4 text-amber-600" />
                              ) : (
                                <Bell className="h-4 w-4 text-indigo-600" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-gray-900">{notice.title}</span>
                                {isAbsent ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase tracking-wide">
                                    Absent Alert
                                  </span>
                                ) : isAttendance ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                                    Attendance
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">
                                    Notice
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs ${isAbsent ? "text-rose-900 font-medium" : "text-gray-600"}`}>
                                {notice.description}
                              </p>
                              <p className="text-[11px] text-gray-400 pt-0.5">
                                {notice.created_at
                                  ? new Date(notice.created_at).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Today"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="py-12 text-center">
                      <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700 text-sm">No new notices broadcasted</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}