"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  FileText,
  BookmarkCheck,
} from "lucide-react";
import { getStudentExams } from "@/lib/student";
import { getSubjects } from "@/lib/clerk";
import type { StudentExam } from "@/types/student";
import type { Subject } from "@/types/clerk";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";

const SUBJECT_COLORS = [
  { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100/80", iconBg: "bg-indigo-100/50" },
  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100/80", iconBg: "bg-emerald-100/50" },
  { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100/80", iconBg: "bg-blue-100/50" },
  { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100/80", iconBg: "bg-amber-100/50" },
  { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100/80", iconBg: "bg-rose-100/50" },
  { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100/80", iconBg: "bg-purple-100/50" },
];

export default function StudentExamsPage() {
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [examsRes, subjectsRes] = await Promise.allSettled([
        getStudentExams(),
        getSubjects(),
      ]);

      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value);
      } else {
        throw new Error(examsRes.reason?.message || "Failed to load exam timetable.");
      }

      if (subjectsRes.status === "fulfilled") {
        setSubjects(subjectsRes.value);
      } else {
        setSubjects([
          { id: 1, name: "maths", division: null },
          { id: 2, name: "science", division: null },
          { id: 3, name: "english", division: null },
        ]);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong loading your exam timetable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map subject ID to readable name string
  const resolveSubjectName = (subjectId: number | null): string => {
    if (!subjectId) return "General / Other";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : `Subject #${subjectId}`;
  };

  // Group stats calculations
  const stats = useMemo(() => {
    const total = exams.length;
    const todayStr = new Date().toISOString().split("T")[0];
    
    let upcoming = 0;
    let today = 0;

    exams.forEach((ex) => {
      if (ex.exam_date === todayStr) {
        today++;
      } else if (ex.exam_date > todayStr) {
        upcoming++;
      }
    });

    return { total, upcoming, today };
  }, [exams]);

  // Format dates in readable Indian layout
  const formatExamDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Format times in 12-hour AM/PM
  const formatExamTime = (timeStr: string): string => {
    if (!timeStr) return "";
    try {
      const parts = timeStr.split(":");
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHours = h % 12 || 12;
      return `${displayHours.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Filtered Timetable List
  const filteredExams = useMemo(() => {
    return exams.filter((ex) => {
      const query = searchQuery.toLowerCase();
      return (
        ex.title.toLowerCase().includes(query) ||
        ex.description.toLowerCase().includes(query) ||
        resolveSubjectName(ex.subject).toLowerCase().includes(query) ||
        (ex.class_group_name || "").toLowerCase().includes(query)
      );
    });
  }, [exams, searchQuery, subjects]);

  return (
    <div
      className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 overflow-x-hidden relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`
        @import url('${FONT_URL}');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-85 h-85 bg-violet-200/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
        <div>
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">Timetable Dashboard</p>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarRange className="text-indigo-600 h-8 w-8" />
            Exam Timetable
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            View scheduled examinations, timings, dates, and instruction lists.
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-4 h-11 transition-all duration-300 font-semibold text-slate-600 self-start sm:self-auto"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-indigo-600" />
          ) : (
            <RefreshCw size={16} className="text-slate-500" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 z-10">
        <Card className="border-indigo-100/60 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm rounded-2xl overflow-hidden hover:shadow transition-all duration-300">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-indigo-100/50 text-indigo-600 shrink-0">
              <CalendarRange size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Evaluations</p>
              <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{stats.total}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100/60 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm rounded-2xl overflow-hidden hover:shadow transition-all duration-300">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-100/50 text-emerald-600 shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Upcoming Exams</p>
              <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{stats.upcoming}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100/60 bg-gradient-to-br from-rose-50/40 via-white to-white shadow-sm rounded-2xl overflow-hidden hover:shadow transition-all duration-300">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-rose-100/50 text-rose-600 shrink-0">
              <BookmarkCheck size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Today's Exams</p>
              <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{stats.today}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar Filter Section */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <Input
            placeholder="Search exams by subject title, instructions, or class division name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-indigo-500/50 text-sm w-full transition-all"
          />
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading && exams.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="border-slate-100 shadow-sm animate-pulse bg-white rounded-3xl h-[210px]" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl z-10 p-6 text-center max-w-md mx-auto">
          <AlertCircle className="text-rose-500 h-10 w-10 mx-auto mb-3 shrink-0" />
          <h2 className="text-rose-900 text-lg font-bold">Failed to load exam timetable</h2>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
          <Button onClick={loadData} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5">
            Retry Sync
          </Button>
        </Card>
      ) : filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm z-10">
          <CalendarRange className="h-14 w-14 text-slate-200 mb-3" />
          <p className="text-base font-semibold">No scheduled exams found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            There are currently no exams scheduled for your class group division. Try refining search parameters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          <AnimatePresence>
            {filteredExams.map((ex, index) => {
              const colorConfig = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
              const readableSubject = resolveSubjectName(ex.subject);
              const isToday = ex.exam_date === new Date().toISOString().split("T")[0];

              return (
                <motion.div
                  key={ex.id || index}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className={`border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-3xl h-full flex flex-col justify-between overflow-hidden group ${isToday ? "ring-2 ring-indigo-500/80" : ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${colorConfig.bg} ${colorConfig.text} shrink-0`}>
                            <BookOpen size={20} className="group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              {ex.class_group_name || "Class Group"}
                            </span>
                            <CardTitle className="text-lg text-slate-800 font-extrabold tracking-tight mt-0.5 leading-tight truncate max-w-[200px]" title={ex.title}>
                              {ex.title}
                            </CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 flex flex-col gap-4 flex-1 justify-between">
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-1" title={ex.description}>
                        {ex.description || "No description provided."}
                      </p>

                      <div className="space-y-2 pt-2 border-t border-slate-100/80">
                        {/* Subject Tag */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium flex items-center gap-1.5">
                            <FileText size={13} />
                            Evaluation
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${colorConfig.bg} ${colorConfig.text}`}>
                            {readableSubject}
                          </span>
                        </div>

                        {/* Date Tag */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium flex items-center gap-1.5">
                            <Calendar size={13} />
                            Exam Date
                          </span>
                          <span className="text-slate-700 font-bold">
                            {formatExamDate(ex.exam_date)}
                          </span>
                        </div>

                        {/* Time Tag */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium flex items-center gap-1.5">
                            <Clock size={13} />
                            Duration
                          </span>
                          <span className="text-slate-700 font-bold flex items-center gap-1">
                            {formatExamTime(ex.start_time)} – {formatExamTime(ex.end_time)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
