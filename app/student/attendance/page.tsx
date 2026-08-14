"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Info,
  TrendingUp,
  UserCheck,
  Clock,
  ArrowUpRight,
  Award,
  Check,
  X,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { getStudentAttendance, type StudentAttendanceRecord } from "@/lib/student";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar State: Defaults to current month & year
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const fetchAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStudentAttendance();
      // Sort records by date descending
      const sorted = data.sort((a, b) => 
        new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
      );
      setRecords(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance records.");
      toast.error("Could not load attendance records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Compute Overall Stats
  const stats = useMemo(() => {
    if (records.length === 0) {
      return { present: 0, absent: 0, unmarked: 0, rate: 0, total: 0 };
    }
    
    let present = 0;
    let absent = 0;
    let unmarked = 0;

    records.forEach((record) => {
      if (record.is_present) {
        present++;
      } else if (record.is_absent) {
        absent++;
      } else {
        unmarked++;
      }
    });

    const totalMarked = present + absent;
    const rate = totalMarked > 0 ? (present / totalMarked) * 100 : 0;

    return {
      present,
      absent,
      unmarked,
      rate,
      total: records.length,
    };
  }, [records]);

  // Calendar calculations
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayIndex = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1; // Shifts Sunday to last and Monday to first
  }, [currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const daysArray = [];

    // Empty spaces for the previous month's padding
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }

    // Days of the actual month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      // Find matching attendance record
      const match = records.find((r) => r.attendance_date === dateString);
      daysArray.push({
        day,
        dateString,
        record: match,
      });
    }

    return daysArray;
  }, [currentYear, currentMonth, daysInMonth, firstDayIndex, records]);

  // Helper to handle month transition
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Helper for formatting list display
  const formatDateString = (dateStr: string) => {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 py-6 bg-slate-50 min-h-screen relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarIcon className="text-indigo-600 h-8 w-8" />
            Attendance Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time verification of your presence, metrics, and calendar.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchAttendance}
          disabled={isLoading}
          className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-4 py-2 hover:shadow transition-all duration-300 font-semibold text-slate-600 self-start sm:self-auto"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-indigo-600" />
          ) : (
            <RefreshCw size={16} className="text-slate-500" />
          )}
          Sync Log
        </Button>
      </div>

      {isLoading && records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center text-slate-400 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500/40" />
          <p className="text-sm font-semibold">Pulling records from server...</p>
        </div>
      ) : error ? (
        <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-3">
            <AlertCircle className="text-rose-500 h-6 w-6 shrink-0" />
            <div>
              <CardTitle className="text-rose-900 text-lg">Failed to Sync Attendance</CardTitle>
              <CardDescription className="text-rose-600">{error}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchAttendance} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl">
              Retry Sync
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6 z-10">
          {/* Stats Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Overall Rate Card (Vibrant Primary Gradient) */}
            <motion.div
              className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col justify-between"
              whileHover={{ y: -5, boxShadow: "0 15px 30px rgba(99,102,241,0.3)" }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold text-indigo-200/90 uppercase tracking-widest">Attendance Rate</span>
                  <p className="text-4xl font-black mt-2 tracking-tight">
                    {stats.rate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white/20 p-2.5 rounded-2xl">
                  <TrendingUp size={22} className="text-indigo-100" />
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs text-indigo-200 font-medium">
                  <span>Target: 75%</span>
                  <span className="font-bold">{stats.rate >= 75 ? "On Track 🎉" : "Action Needed ⚠️"}</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${stats.rate}%` }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Present Count Card */}
            <motion.div
              className="bg-gradient-to-br from-emerald-50/50 via-white to-white rounded-3xl shadow-sm border border-emerald-100/60 p-6 flex flex-row items-center justify-between hover:shadow-md hover:border-emerald-200/80 transition-all duration-300"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-700/80 uppercase tracking-wider">Days Present</span>
                <p className="text-4xl font-black text-emerald-600 tracking-tight mt-1">{stats.present}</p>
                <p className="text-xs text-slate-400 font-medium">Marked verified</p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-600 p-4 rounded-2xl border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
            </motion.div>

            {/* Absent Count Card */}
            <motion.div
              className="bg-gradient-to-br from-rose-50/50 via-white to-white rounded-3xl shadow-sm border border-rose-100/60 p-6 flex flex-row items-center justify-between hover:shadow-md hover:border-rose-200/80 transition-all duration-300"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-rose-700/80 uppercase tracking-wider">Days Absent</span>
                <p className="text-4xl font-black text-rose-600 tracking-tight mt-1">{stats.absent}</p>
                <p className="text-xs text-slate-400 font-medium">Needs justification</p>
              </div>
              <div className="bg-rose-500/10 text-rose-600 p-4 rounded-2xl border border-rose-100 flex items-center justify-center">
                <XCircle size={24} />
              </div>
            </motion.div>

            {/* Total Marked Card */}
            <motion.div
              className="bg-gradient-to-br from-indigo-50/50 via-white to-white rounded-3xl shadow-sm border border-indigo-100/60 p-6 flex flex-row items-center justify-between hover:shadow-md hover:border-indigo-200/80 transition-all duration-300"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-700/80 uppercase tracking-wider">Total Logs</span>
                <p className="text-4xl font-black text-slate-700 tracking-tight mt-1">{stats.total}</p>
                <p className="text-xs text-slate-400 font-medium">Over current term</p>
              </div>
              <div className="bg-indigo-500/10 text-indigo-600 p-4 rounded-2xl border border-indigo-100 flex items-center justify-center">
                <CalendarIcon size={24} />
              </div>
            </motion.div>
          </div>

          {/* Calendar & History Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Calendar Card Component */}
            <Card className="lg:col-span-7 border-slate-200/60 shadow-sm overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl">
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Monthly Tracker</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Visualize your attendance pattern day-by-day</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white rounded-lg" onClick={handlePrevMonth}>
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-xs font-extrabold text-slate-700 w-24 text-center">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white rounded-lg" onClick={handleNextMonth}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Weekdays Header */}
                <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <span key={day} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2.5">
                  {calendarDays.map((item, idx) => {
                    if (!item) {
                      return <div key={`empty-${idx}`} className="h-12 sm:h-14 bg-slate-50/20 rounded-xl" />;
                    }

                    const { day, dateString, record } = item;
                    
                    // Decide if today
                    const isTodayCell = 
                      today.getDate() === day && 
                      today.getMonth() === currentMonth && 
                      today.getFullYear() === currentYear;

                    let cellStyle = "bg-slate-50/50 text-slate-600 hover:bg-slate-100/60 border-slate-200/40";
                    let statusIcon = null;

                    if (record) {
                      if (record.is_present) {
                        cellStyle = "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 font-bold border border-emerald-500/20";
                        statusIcon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 absolute bottom-1.5 right-1.5" />;
                      } else if (record.is_absent) {
                        cellStyle = "bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 font-bold border border-rose-500/20";
                        statusIcon = <XCircle className="h-3.5 w-3.5 text-rose-600 absolute bottom-1.5 right-1.5" />;
                      } else {
                        cellStyle = "bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 font-bold border border-amber-500/20";
                        statusIcon = <AlertCircle className="h-3.5 w-3.5 text-amber-600 absolute bottom-1.5 right-1.5" />;
                      }
                    }

                    return (
                      <motion.div
                        key={day}
                        className={`h-12 sm:h-14 rounded-xl flex flex-col justify-start items-start p-2 border text-xs relative cursor-pointer group transition-all ${cellStyle} ${isTodayCell ? 'ring-2 ring-indigo-600 ring-offset-1 ring-offset-white' : ''}`}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 350, damping: 15 }}
                      >
                        <span className="font-extrabold text-[11px] sm:text-xs">{day}</span>
                        {statusIcon}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center justify-start gap-4 mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-medium">Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-medium">Absent</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-medium">Unspecified</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto text-slate-400 font-semibold">
                    <Info size={13} />
                    <span>Term limits apply</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Timeline Activity List */}
            <Card className="lg:col-span-5 border-slate-200/60 shadow-sm overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl">
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Timeline Activity</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Verify submissions chronologically</CardDescription>
                </div>
                <Badge className="bg-slate-100 text-slate-600 shadow-none rounded-lg text-xs font-semibold px-2 py-0.5">
                  Latest first
                </Badge>
              </CardHeader>
              <CardContent className="p-5">
                <div className="max-h-[400px] overflow-y-auto pr-2 pl-4 scrollbar-thin">
                  {records.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                      <CalendarIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold">No attendance entries</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-100 pl-8 space-y-6 py-2">
                      {records.map((record) => {
                        const isPres = record.is_present;
                        const isAbs = record.is_absent;
                        
                        return (
                          <div key={record.id} className="relative group/item">
                            {/* Circle Timeline Bullet */}
                            <div className={`absolute -left-[44px] top-1.5 rounded-full w-6 h-6 border-2 border-white flex items-center justify-center text-white shadow-sm transition-all ${
                              isPres ? 'bg-emerald-500 ring-4 ring-emerald-50' : 
                              isAbs ? 'bg-rose-500 ring-4 ring-rose-50' : 
                              'bg-amber-500 ring-4 ring-amber-50'
                            }`}>
                              {isPres ? (
                                <Check size={12} className="stroke-[3]" />
                              ) : isAbs ? (
                                <X size={12} className="stroke-[3]" />
                              ) : (
                                <Minus size={12} className="stroke-[3]" />
                              )}
                            </div>
                            
                            {/* Inner Container */}
                            <div className="flex flex-col gap-1 hover:bg-slate-50/50 p-2.5 rounded-2xl transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800">
                                  {formatDateString(record.attendance_date)}
                                </span>
                                <Badge className={`text-[10px] font-bold shadow-none rounded-lg px-2 py-0.5 ${
                                  isPres ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                  isAbs ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {isPres ? "Present" : isAbs ? "Absent" : "Unspecified"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                <UserCheck size={12} className="text-slate-400" />
                                <span>Instructor Log (Staff #{record.attendance_by})</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
