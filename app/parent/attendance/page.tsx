"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Users,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChildProfile,
  getParentChildren,
  getParentAttendanceNotifications,
  AttendanceNotificationItem,
} from "@/lib/parent";

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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Child School Attendance Portal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Student Attendance & Alerts</h1>
            <p className="text-emerald-100 max-w-xl text-sm md:text-base">
              Track daily presence, view attendance percentages, and receive real-time absentee alerts for your ward.
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

      {/* Child Selector Tabs */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          {children.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedChildIndex === idx
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Users className="h-4 w-4" /> {child.name} ({child.school_class_name}-{child.division})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-gray-400 mt-2">Loading attendance records...</p>
        </div>
      ) : !activeChild ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 text-gray-400 text-sm">
          No child profiles found attached to this parent account.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Attendance Rate</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">{activeChild.attendance_percentage}%</span>
                <span className={`text-xs font-bold ${activeChild.attendance_percentage >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                  {activeChild.attendance_percentage >= 75 ? "Target Achieved" : "Below 75% Requirement"}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${activeChild.attendance_percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(100, activeChild.attendance_percentage)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Days Present</span>
              <div className="text-3xl font-black text-emerald-600">{activeChild.present_days} Days</div>
              <p className="text-xs text-gray-400">Total sessions attended</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Working Days</span>
              <div className="text-3xl font-black text-gray-900">{activeChild.total_working_days} Days</div>
              <p className="text-xs text-gray-400">Academic session to date</p>
            </div>
          </div>

          {/* Absentee Alerts Stream */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Real-Time Attendance Notifications</h3>
                <p className="text-xs text-gray-500">Live alerts broadcasted when your child is marked absent or arrives late.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                {attendanceAlerts.length} Alerts
              </span>
            </div>

            {attendanceAlerts.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                No unexcused absences recorded. Your child has an excellent attendance record!
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {attendanceAlerts.map((alert, idx) => (
                  <div key={alert.id || idx} className="py-3 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold text-gray-900">{alert.title}</div>
                      <p className="text-gray-600">{alert.message}</p>
                      <span className="text-[10px] text-gray-400">
                        {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : "Recent"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
