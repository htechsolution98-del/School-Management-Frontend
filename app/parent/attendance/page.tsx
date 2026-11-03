"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      cardClass: "bg-rose-50/25 border-rose-200/90 hover:bg-rose-50/40",
      iconClass: "bg-rose-100 text-rose-600",
      icon: AlertTriangle,
    };
  }

  return {
    status: "Present",
    isAbsent: false,
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cardClass: "bg-white border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50/10",
    iconClass: "bg-emerald-100 text-emerald-600",
    icon: CheckCircle2,
  };
}

export default function ParentAttendancePage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [attendanceAlerts, setAttendanceAlerts] = useState<AttendanceNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    loadData();
  }, [loadData]);

  const activeChild = children[selectedChildIndex];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-4 lg:pb-8 w-full min-w-0 overflow-x-hidden">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-4 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Child School Attendance Portal
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Student Attendance & Alerts</h1>
            <p className="text-emerald-100 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed">
              Track daily presence, view attendance percentages, and receive attendance updates for your ward.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white self-start md:self-auto rounded-xl text-xs sm:text-sm font-bold"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Child Selector Tabs (for parents with multiple children) */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto max-w-full no-scrollbar">
          {children.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildIndex(idx)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shrink-0 transition-all ${
                selectedChildIndex === idx
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Users className="h-4 w-4" /> {capitalizeWords(child.name)} ({capitalizeWords(child.school_class_name)}-{(child.division || "").toUpperCase()})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-12 sm:p-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-xs sm:text-sm text-gray-400 mt-2 font-medium">Loading attendance records...</p>
        </div>
      ) : !activeChild ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-gray-100 text-gray-400 text-xs sm:text-sm shadow-sm">
          No child profiles found attached to this parent account.
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-6 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance Rate</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-gray-900">{activeChild.attendance_percentage}%</span>
                <span className={`text-[11px] sm:text-xs font-bold ${activeChild.attendance_percentage >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                  {activeChild.attendance_percentage >= 75 ? "Target Achieved" : "Below 75% Requirement"}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${activeChild.attendance_percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(100, activeChild.attendance_percentage)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-6 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Days Present</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">{activeChild.present_days} Days</div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Total sessions attended</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-6 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Working Days</span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Calendar className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900">{activeChild.total_working_days} Days</div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Academic session to date</p>
            </div>
          </div>

          {/* Attendance Notifications & Activity Logs */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <CalendarCheck className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">Attendance Notifications & Logs</h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                    Daily school attendance logs and official status updates for your ward.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {attendanceAlerts.length} Recorded Logs
              </span>
            </div>

            {attendanceAlerts.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                No unexcused absences recorded. Your child has an excellent attendance record!
              </div>
            ) : (
              <div className="space-y-2.5">
                {attendanceAlerts.map((alert, idx) => {
                  const statusInfo = getAttendanceStatus(alert);
                  const StatusIcon = statusInfo.icon;
                  const formattedTitle = formatAlertTitle(alert.title);
                  const formattedMessage = formatAlertMessage(alert.message, activeChild?.name);
                  const formattedDate = formatAlertDate(alert.created_at);

                  return (
                    <div
                      key={alert.id || idx}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${statusInfo.cardClass}`}
                    >
                      <div className="flex items-start gap-3 sm:gap-3.5">
                        <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 mt-0.5 ${statusInfo.iconClass}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm font-bold text-gray-900">
                              {formattedTitle}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${statusInfo.pillClass}`}
                            >
                              {statusInfo.isAbsent ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              {statusInfo.status}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed break-words">
                            {formattedMessage}
                          </p>

                          <div className="flex items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px] text-gray-400 font-semibold">
                            <Clock className="h-3 w-3 shrink-0 text-gray-400" />
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
