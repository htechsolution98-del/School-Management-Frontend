"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Users,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
  CalendarCheck,
  Check,
  GraduationCap,
  Award,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChildProfile,
  getParentChildren,
  getParentAttendanceNotifications,
  AttendanceNotificationItem,
} from "@/lib/parent";
import { capitalizeWords, capitalizeSentence } from "@/lib/utils";

function formatAlertDate(dateStr?: string) {
  if (!dateStr) return "Recent";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatAlertTitle(title?: string) {
  if (!title) return "Attendance Notification";
  return capitalizeWords(title);
}

function formatAlertMessage(msg?: string, studentName?: string) {
  if (!msg) return "";
  let clean = msg.trim();
  if (studentName && clean.toLowerCase().startsWith(studentName.toLowerCase())) {
    clean = capitalizeWords(studentName) + clean.substring(studentName.length);
  }
  return capitalizeSentence(clean);
}

function getAttendanceStatus(alert: AttendanceNotificationItem) {
  const t = (alert.title || "").toLowerCase();
  const m = (alert.message || "").toLowerCase();
  const type = (alert.notification_type || "").toLowerCase();

  const isAbsent =
    t.includes("absent") ||
    m.includes("absent") ||
    type.includes("absent") ||
    t.includes("leave") ||
    m.includes("leave");

  if (isAbsent) {
    return {
      status: "Absent",
      isAbsent: true,
      pillClass: "bg-rose-50 text-rose-700 border-rose-200",
      cardClass: "bg-rose-50/20 border-rose-200/80 hover:bg-rose-50/40",
      iconClass: "bg-rose-100 text-rose-600",
      icon: AlertTriangle,
    };
  }

  return {
    status: "Present",
    isAbsent: false,
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cardClass: "bg-white border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/10",
    iconClass: "bg-emerald-100 text-emerald-600",
    icon: CheckCircle2,
  };
}

export default function ParentAttendancePage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [attendanceAlerts, setAttendanceAlerts] = useState<AttendanceNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "present" | "absent">("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kids, alerts] = await Promise.all([
        getParentChildren().catch(() => []),
        getParentAttendanceNotifications().catch(() => []),
      ]);
      setChildren(kids);
      setAttendanceAlerts(alerts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeChild = children[selectedChildIndex] || children[0];

  const studentFullName = activeChild
    ? `${capitalizeWords(activeChild.name)} ${capitalizeWords(activeChild.surname || "")}`.trim()
    : "Ward";

  const absentDays = activeChild
    ? Math.max(0, (activeChild.total_working_days || 0) - (activeChild.present_days || 0))
    : 0;

  // Filtered attendance notification feed
  const filteredAlerts = useMemo(() => {
    if (filterType === "all") return attendanceAlerts;
    return attendanceAlerts.filter((a) => {
      const status = getAttendanceStatus(a);
      return filterType === "absent" ? status.isAbsent : !status.isAbsent;
    });
  }, [attendanceAlerts, filterType]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto pb-6 lg:pb-10 w-full min-w-0 overflow-x-hidden">
      {/* ── 1. ROYAL BLUE EXECUTIVE HEADER BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white p-5 sm:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Sparkles className="h-3.5 w-3.5" /> Child School Attendance Portal
              </span>
              <span className="text-xs font-bold text-slate-500">
                Academic Year 2026-27
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Student Attendance & Alerts
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
              Track daily presence, verify session logs, and receive real-time absentee updates for{" "}
              <span className="font-bold text-blue-700">{studentFullName}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="rounded-2xl border-slate-200 bg-white/80 text-xs font-bold shadow-xs hover:bg-white hover:text-blue-600 transition"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2. MULTI-CHILD SELECTOR TABS ── */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto max-w-full no-scrollbar">
          {children.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm shrink-0 transition-all ${
                selectedChildIndex === idx
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="h-4 w-4" />
              {capitalizeWords(child.name)} ({capitalizeWords(child.school_class_name)}-{(child.division || "A").toUpperCase()})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        /* Shimmer Loading Skeleton */
        <div className="space-y-4">
          <div className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
        </div>
      ) : !activeChild ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm shadow-xs">
          No child profiles found attached to this parent account.
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {/* ── 3. WARD IDENTITY PROFILE BANNER ── */}
          <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-blue-500/20 shrink-0">
                  {activeChild.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      {studentFullName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      Official Ward
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {capitalizeWords(activeChild.school_name || "School")}
                  </p>
                </div>
              </div>

              {/* Identity Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">G.R. Number</span>
                  <span className="font-extrabold text-slate-800">{activeChild.gr_no || "GR-801"}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Class & Section</span>
                  <span className="font-extrabold text-slate-800">
                    {capitalizeWords(activeChild.school_class_name)} ({(activeChild.division || "A").toUpperCase()})
                  </span>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Roll Number</span>
                  <span className="font-extrabold text-slate-800">#{activeChild.roll_no || "1"}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Academic Standing</span>
                  <span className={`font-extrabold ${activeChild.attendance_percentage >= 75 ? "text-emerald-600" : "text-amber-600"}`}>
                    {activeChild.attendance_percentage >= 75 ? "Good Standing" : "Action Required"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. FOUR KEY ATTENDANCE METRICS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Metric 1: Attendance Rate */}
            <Card className="rounded-3xl border border-blue-100/90 bg-white shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Attendance Rate</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">
                {activeChild.attendance_percentage}%
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold">
                <span className={activeChild.attendance_percentage >= 75 ? "text-emerald-600" : "text-rose-600"}>
                  {activeChild.attendance_percentage >= 75 ? "Target Achieved" : "Below 75% Requirement"}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeChild.attendance_percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, activeChild.attendance_percentage)}%` }}
                />
              </div>
            </Card>

            {/* Metric 2: Days Present */}
            <Card className="rounded-3xl border border-blue-100/90 bg-white shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Days Present</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                {activeChild.present_days} Days
              </div>
              <p className="mt-2.5 text-[11px] text-slate-500 font-medium">
                Total verified classroom sessions
              </p>
              <div className="w-full bg-emerald-100/60 h-2 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
              </div>
            </Card>

            {/* Metric 3: Total Working Days */}
            <Card className="rounded-3xl border border-blue-100/90 bg-white shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Working Days</span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Calendar className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {activeChild.total_working_days} Days
              </div>
              <p className="mt-2.5 text-[11px] text-slate-500 font-medium">
                Academic session to date
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: "100%" }} />
              </div>
            </Card>

            {/* Metric 4: Days Absent / Leave */}
            <Card className="rounded-3xl border border-blue-100/90 bg-white shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Absences & Leaves</span>
                <span className={`p-2 rounded-xl ${absentDays > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                  <AlertTriangle className="h-4 w-4" />
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono ${absentDays > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {absentDays} Days
              </div>
              <p className="mt-2.5 text-[11px] text-slate-500 font-medium">
                {absentDays === 0 ? "Zero unexcused absences" : "Recorded leave or absence"}
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${absentDays > 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, (absentDays / Math.max(1, activeChild.total_working_days)) * 100)}%` }}
                />
              </div>
            </Card>
          </div>

          {/* ── 5. ATTENDANCE NOTIFICATIONS & LOGS ── */}
          <div className="bg-white rounded-3xl border border-blue-100/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Attendance Notifications & Logs
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Daily school attendance logs and official status updates for your ward.
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100 self-start sm:self-auto text-xs font-bold">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    filterType === "all" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  All ({attendanceAlerts.length})
                </button>
                <button
                  onClick={() => setFilterType("present")}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    filterType === "present" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Present
                </button>
                <button
                  onClick={() => setFilterType("absent")}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    filterType === "absent" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Absences
                </button>
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No Attendance Alerts In This Category</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Your child has consistent verified attendance. Any new biometric or teacher updates will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert, idx) => {
                  const statusInfo = getAttendanceStatus(alert);
                  const StatusIcon = statusInfo.icon;
                  const formattedTitle = formatAlertTitle(alert.title);
                  const formattedMessage = formatAlertMessage(alert.message, activeChild?.name);
                  const formattedDate = formatAlertDate(alert.created_at);

                  return (
                    <div
                      key={alert.id || idx}
                      className={`p-4 rounded-2xl border transition-all ${statusInfo.cardClass}`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${statusInfo.iconClass}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {formattedTitle}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.pillClass}`}
                            >
                              {statusInfo.isAbsent ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              {statusInfo.status}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                            {formattedMessage}
                          </p>

                          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 font-semibold">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
