"use client";

import React from "react";
import { StaffAttendanceCard } from "@/components/attendance/StaffAttendanceCard";
import { Clock, ShieldCheck, MapPin, Sparkles } from "lucide-react";

export default function PrincipalMyAttendancePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-semibold text-indigo-300 border border-indigo-400/20 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Leadership Duty Desk</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Clock className="h-8 w-8 text-indigo-400" />
              My Attendance & Check-In
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Record your daily principal duty check-in and check-out with GPS geofence verification and biometric telemetry.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md self-start md:self-auto">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-white">Geofenced Punch-in</div>
              <div className="text-slate-400">Authorized Campus Perimeter</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Staff Attendance Widget */}
      <StaffAttendanceCard
        roleName="Principal / Leadership"
        historyHref="/principal/my-attendance"
        className="shadow-sm"
      />
    </div>
  );
}
