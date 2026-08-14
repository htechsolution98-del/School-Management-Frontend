"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange, ChevronLeft, ChevronRight, BookOpen, Users, Clock, Award,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, X, TrendingUp, FileText,
  GraduationCap, ArrowLeft, Calendar, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { getSchoolExams, getExamRoster } from "@/lib/teacher";
import type { SchoolExam, SchoolExamStudent } from "@/types/teacher";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PALETTE = [
  { bg:"#eef2ff", text:"#4f46e5", dot:"#6366f1" },
  { bg:"#ecfdf5", text:"#059669", dot:"#10b981" },
  { bg:"#fff7ed", text:"#d97706", dot:"#f59e0b" },
  { bg:"#fdf2f8", text:"#9333ea", dot:"#a855f7" },
  { bg:"#fff1f2", text:"#e11d48", dot:"#f43f5e" },
  { bg:"#f0f9ff", text:"#0284c7", dot:"#38bdf8" },
];

function pct2badge(pct: number | null) {
  if (pct === null) return { bg: "bg-slate-100", text: "text-slate-500", label: "N/A" };
  if (pct >= 85) return { bg: "bg-emerald-50", text: "text-emerald-700", label: `${pct.toFixed(1)}%` };
  if (pct >= 60) return { bg: "bg-blue-50", text: "text-blue-700", label: `${pct.toFixed(1)}%` };
  if (pct >= 40) return { bg: "bg-amber-50", text: "text-amber-700", label: `${pct.toFixed(1)}%` };
  return { bg: "bg-rose-50", text: "text-rose-700", label: `${pct.toFixed(1)}%` };
}

function gradeColor(g: string | null) {
  if (!g) return "text-slate-400";
  const u = g.toUpperCase();
  if (u === "A+" || u === "A") return "text-emerald-600";
  if (u === "B+" || u === "B") return "text-blue-600";
  if (u === "C+" || u === "C") return "text-amber-600";
  return "text-rose-600";
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${(h % 12 || 12).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

interface ModalProps {
  exam: SchoolExam;
  pal: typeof PALETTE[0];
  onClose: () => void;
  rosterLoading?: boolean;
}

function Modal({ exam, pal, onClose, rosterLoading }: ModalProps) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const lq = q.toLowerCase();
    if (!lq) return exam.students || [];
    return (exam.students || []).filter(
      (s) => s.student_name.toLowerCase().includes(lq) || s.gr_no.toLowerCase().includes(lq)
    );
  }, [exam.students, q]);

  const sts = useMemo(() => {
    const s = (exam.students || []).filter((s) => !s.is_absent && s.marks_obtained !== null);
    if (!s.length) return null;
    const marks = s.map((x) => x.marks_obtained as number);
    const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
    const maxM = s[0]?.max_marks || null;
    return {
      avg,
      high: Math.max(...marks),
      low: Math.min(...marks),
      pass: maxM ? (marks.filter((m) => m / maxM >= 0.33).length / marks.length) * 100 : null,
    };
  }, [exam.students]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between gap-4 border-b border-slate-100"
          style={{ background: `linear-gradient(135deg,${pal.bg} 0%,#fff 100%)` }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0" style={{ background: pal.bg, color: pal.text }}>
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: pal.dot }}>
                {exam.class_group_name} · {exam.subject_name || "General"}
              </p>
              <h2 className="text-xl font-extrabold text-slate-800">{exam.title}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(exam.exam_date).toLocaleDateString("en-IN", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={11} />
                  {formatTime(exam.start_time)} – {formatTime(exam.end_time)}
                </span>
                {exam.is_published && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Published
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Strip */}
        {sts && (
          <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/60">
            {[
              { l: "Class Average", v: sts.avg.toFixed(1), I: BarChart3, c: "text-indigo-600" },
              { l: "Highest Marks", v: `${sts.high}`, I: TrendingUp, c: "text-emerald-600" },
              { l: "Lowest Marks", v: `${sts.low}`, I: FileText, c: "text-rose-500" },
              { l: "Pass Rate", v: sts.pass !== null ? `${sts.pass.toFixed(0)}%` : "—", I: Award, c: "text-amber-600" },
            ].map((s, i) => (
              <div key={i} className="px-5 py-3 text-center">
                <div className={`flex items-center justify-center gap-1 ${s.c} mb-0.5`}>
                  <s.I size={13} />
                  <span className="text-[9px] font-black uppercase tracking-wider">{s.l}</span>
                </div>
                <p className="text-lg font-black text-slate-800">{s.v}</p>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {exam.description && (
          <div className="px-6 py-3 border-b border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">{exam.description}</p>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${exam.students?.length || 0} students...`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {rosterLoading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 size={32} className="mx-auto mb-3 animate-spin text-indigo-500" />
              <p className="text-sm font-semibold text-slate-500">Loading student marks...</p>
            </div>
          ) : !exam.students || !exam.students.length ? (
            <div className="py-16 text-center text-slate-400">
              <Users size={36} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm font-semibold">No student data available.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                <tr>
                  {["#", "Student Name", "GR No.", "Absent", "Marks", "Max", "%", "Grade", "Remarks", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-black text-[9px] uppercase tracking-widest text-indigo-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((s, i) => {
                  const pb = pct2badge(s.percentage);
                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 capitalize whitespace-nowrap">{s.student_name}</td>
                      <td className="px-4 py-3 text-slate-500 font-semibold">{s.gr_no || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {s.is_absent ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold text-[9px] border border-rose-100">Absent</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[9px] border border-emerald-100">Present</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-800 text-center">
                        {s.is_absent ? (
                          <span className="text-rose-400">—</span>
                        ) : s.marks_obtained !== null ? (
                          s.marks_obtained
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-400 text-center">{s.max_marks !== null ? s.max_marks : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {!s.is_absent && s.percentage !== null && (
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${pb.bg} ${pb.text}`}>{pb.label}</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-black text-center ${gradeColor(s.grade)}`}>{s.grade || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate" title={s.remarks || ""}>{s.remarks || "—"}</td>
                      <td className="px-4 py-3">
                        {s.is_published ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold text-[9px]"><CheckCircle2 size={10} />Published</span>
                        ) : s.marks_obtained !== null ? (
                          <span className="flex items-center gap-1 text-amber-600 font-bold text-[9px]"><Clock size={10} />Draft</span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 font-bold text-[9px]"><AlertCircle size={10} />Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-semibold">{rows.length} of {exam.students?.length || 0} students shown</p>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ClassTeacherExamsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<SchoolExam | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const load = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    try {
      const d = await getSchoolExams(m + 1, y);
      setExams(d);
    } catch (e: any) {
      setError(e?.message || "Failed to load class exams.");
      toast.error(e?.message || "Failed to load class exams.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Opens the exam detail modal, fetching the latest roster from API first
  const openExamModal = useCallback(async (ex: SchoolExam) => {
    // Show modal immediately with whatever data we have
    setSel(ex);
    setRosterLoading(true);
    try {
      const rosterRes = await getExamRoster(ex.id);
      const rawList = rosterRes.roster || [];

      // Normalize each student entry to SchoolExamStudent shape
      const students: SchoolExamStudent[] = rawList.map((r: any) => {
        const marksObtained = r.marks_obtained !== undefined && r.marks_obtained !== null
          ? Number(r.marks_obtained)
          : null;
        const maxMarks = r.max_marks !== undefined && r.max_marks !== null
          ? Number(r.max_marks)
          : null;
        const pct = marksObtained !== null && maxMarks && maxMarks > 0
          ? parseFloat(((marksObtained / maxMarks) * 100).toFixed(1))
          : null;

        // Derive letter grade from percentage
        let grade: string | null = null;
        if (pct !== null) {
          if (pct >= 90) grade = "A+";
          else if (pct >= 75) grade = "A";
          else if (pct >= 60) grade = "B+";
          else if (pct >= 50) grade = "B";
          else if (pct >= 40) grade = "C";
          else grade = "F";
        }

        return {
          student_id: r.student ?? r.student_id ?? r.id ?? 0,
          student_name:
            r.student_name ?? r.name ?? r.full_name ?? r.student_full_name ??
            `Student #${r.student ?? r.student_id ?? r.id ?? "?"}`,
          gr_no: r.gr_no ?? r.roll_no ?? r.admission_number ?? r.gr ?? "",
          marks_obtained: marksObtained,
          max_marks: maxMarks,
          is_absent: r.is_absent === true || r.is_absent === "True",
          remarks: r.remarks ?? r.comment ?? r.remark ?? null,
          is_published: r.is_published === true || r.is_published === "True",
          percentage: r.percentage !== undefined ? r.percentage : pct,
          grade: r.grade !== undefined ? r.grade : grade,
        };
      });

      // Update the selected exam with fresh student data
      setSel((prev) => prev ? { ...prev, students } : null);

      // Also update the exam in the main list so stats reflect the latest
      setExams((prev) =>
        prev.map((e) => (e.id === ex.id ? { ...e, students } : e))
      );
    } catch (err: any) {
      toast.error(`Could not load student marks: ${err?.message || "Unknown error"}`);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month, year);
  }, [month, year, load]);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setMonth(now.getMonth()); setYear(now.getFullYear()); };

  const calDays = useMemo(() => {
    const fd = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < fd; i++) days.push(null);
    for (let d = 1; d <= dim; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [month, year]);

  const byDate = useMemo(() => {
    const map: Record<string, SchoolExam[]> = {};
    exams.forEach((ex) => {
      if (!map[ex.exam_date]) map[ex.exam_date] = [];
      map[ex.exam_date].push(ex);
    });
    return map;
  }, [exams]);

  // Sorted unique dates ascending for the grouped list view
  const sortedDateGroups = useMemo(() => {
    return Object.keys(byDate).sort((a, b) => a.localeCompare(b));
  }, [byDate]);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const totalStudents = useMemo(() => {
    const ids = new Set<number>();
    exams.forEach((ex) => (ex.students || []).forEach((s) => ids.add(s.student_id)));
    return ids.size;
  }, [exams]);

  const pubCount = useMemo(() => exams.filter((e) => e.is_published).length, [exams]);

  const avgScore = useMemo(() => {
    let s = 0, c = 0;
    exams.forEach((ex) =>
      (ex.students || []).forEach((st) => {
        if (!st.is_absent && st.marks_obtained !== null && st.max_marks) {
          s += (st.marks_obtained / st.max_marks) * 100;
          c++;
        }
      })
    );
    return c > 0 ? (s / c).toFixed(1) : null;
  }, [exams]);

  const pal = (ex: SchoolExam) => PALETTE[ex.id % PALETTE.length];

  const statCards = [
    { l: "Total Exams", v: loading ? "—" : String(exams.length), I: CalendarRange, from: "from-indigo-50", border: "border-indigo-100/60", ibg: "bg-indigo-100/50", ic: "text-indigo-600" },
    { l: "Published Results", v: loading ? "—" : String(pubCount), I: CheckCircle2, from: "from-emerald-50", border: "border-emerald-100/60", ibg: "bg-emerald-100/50", ic: "text-emerald-600" },
    { l: "Students Enrolled", v: loading ? "—" : String(totalStudents), I: Users, from: "from-violet-50", border: "border-violet-100/60", ibg: "bg-violet-100/50", ic: "text-violet-600" },
    { l: "Avg Class Score", v: loading ? "—" : avgScore ? `${avgScore}%` : "N/A", I: TrendingUp, from: "from-amber-50", border: "border-amber-100/60", ibg: "bg-amber-100/50", ic: "text-amber-600" },
  ];

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 relative" style={{ fontFamily: "Outfit,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');*,*::before,*::after{box-sizing:border-box}`}</style>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-violet-200/10 rounded-full blur-3xl pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <Link href="/teacher/exams">
            <Button variant="outline" className="p-3 border border-slate-200 hover:bg-slate-50 rounded-xl h-11 w-11 flex items-center justify-center">
              <ArrowLeft size={16} className="text-slate-600" />
            </Button>
          </Link>
          <div>
            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Class Teacher · Monthly Overview</p>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <GraduationCap className="text-indigo-600 h-8 w-8" />
              School Exams Calendar
            </h1>
            <p className="text-slate-400 text-sm mt-1">Full-month exam calendar for your class — view all exams and student marks.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={() => load(month, year)}
            disabled={loading}
            className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-4 h-11 font-semibold text-slate-600"
          >
            {loading ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <RefreshCw size={16} className="text-slate-500" />}
            Refresh
          </Button>
          <Button onClick={goToday} className="h-11 px-5 font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md">
            Today
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 z-10">
        {statCards.map((c, i) => (
          <Card key={i} className={`border ${c.border} bg-gradient-to-br ${c.from} to-white rounded-2xl overflow-hidden`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3.5 rounded-xl ${c.ibg} ${c.ic} shrink-0`}><c.I size={22} /></div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{c.l}</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{c.v}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 z-10">
        <button onClick={prev} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-slate-800">{MONTH_NAMES[month]} {year}</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">{exams.length} exam{exams.length !== 1 ? "s" : ""} this month</p>
        </div>
        <button onClick={next} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"><ChevronRight size={20} /></button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-indigo-500" />
            <p className="text-sm font-semibold text-slate-500">Loading exam calendar...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-rose-100 bg-rose-50/30 rounded-2xl z-10 p-8 text-center max-w-md mx-auto">
          <AlertCircle className="text-rose-500 h-10 w-10 mx-auto mb-3" />
          <h3 className="text-rose-900 text-lg font-bold">Failed to load exams</h3>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
          <Button onClick={() => load(month, year)} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5">Retry</Button>
        </Card>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden z-10">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-indigo-600">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calDays.map((day, idx) => {
              const ds = day
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : null;
              const de = ds ? (byDate[ds] || []) : [];
              const isT = ds === todayStr;
              const isSun = idx % 7 === 0;
              const isSat = idx % 7 === 6;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 border-b border-r border-slate-100 transition-colors ${
                    !day ? "bg-slate-50/30" : isT ? "bg-indigo-50/40" : "bg-white hover:bg-slate-50/40"
                  } ${isSun || isSat ? "opacity-75" : ""}`}
                >
                  {day && (
                    <>
                      <div className="flex items-start justify-between mb-1.5">
                        <span
                          className={`text-xs font-black rounded-full h-6 w-6 flex items-center justify-center ${
                            isT ? "bg-indigo-600 text-white" : isSun || isSat ? "text-rose-400" : "text-slate-700"
                          }`}
                        >
                          {day}
                        </span>
                        {de.length > 0 && (
                          <span className="text-[8px] font-black bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5">{de.length}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {de.slice(0, 3).map((ex) => {
                          const p = pal(ex);
                          return (
                            <button
                              key={ex.id}
                              onClick={() => openExamModal(ex)}
                              className="w-full text-left px-2 py-1 rounded-lg text-[9px] font-bold truncate transition-all hover:opacity-80"
                              style={{ background: p.bg, color: p.text }}
                              title={ex.title}
                            >
                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-0.5 align-middle" style={{ background: p.dot }} />
                              {ex.title}
                            </button>
                          );
                        })}
                        {de.length > 3 && (
                          <button
                            onClick={() => openExamModal(de[3])}
                            className="text-[9px] font-bold text-indigo-500 hover:underline text-left px-2"
                          >
                            +{de.length - 3} more
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exam List — Date Grouped */}
      {!loading && !error && exams.length > 0 && (
        <div className="z-10 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-indigo-600" />
            <h2 className="text-base font-extrabold text-slate-800">All Exams — {MONTH_NAMES[month]} {year}</h2>
          </div>

          {sortedDateGroups.map((dateStr) => {
            const groupExams = byDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;

            // Format the date header label
            const dateLabel = new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <div key={dateStr} className="flex flex-col gap-3">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border ${
                      isToday
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : isPast
                        ? "bg-slate-100 text-slate-500 border-slate-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    <Calendar size={11} />
                    {isToday ? `Today — ${dateLabel}` : dateLabel}
                  </div>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] font-bold text-slate-400">
                    {groupExams.length} exam{groupExams.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Exam Cards for this date */}
                <div className="flex flex-col gap-2 pl-2">
                  <AnimatePresence>
                    {groupExams.map((ex, i) => {
                      const p = pal(ex);
                      const swm = (ex.students || []).filter((s) => !s.is_absent && s.marks_obtained !== null);
                      const ac = (ex.students || []).filter((s) => s.is_absent).length;
                      const mx = swm[0]?.max_marks || null;
                      const ap = swm.length > 0 && mx
                        ? (swm.reduce((a, s) => a + (s.marks_obtained || 0), 0) / swm.length / mx * 100).toFixed(1)
                        : null;

                      return (
                        <motion.div
                          key={ex.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <Card
                            className="border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-2xl overflow-hidden cursor-pointer group"
                            onClick={() => openExamModal(ex)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: p.dot }} />
                                <div className="p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform" style={{ background: p.bg, color: p.text }}>
                                  <BookOpen size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: p.dot }}>
                                        {ex.class_group_name} · {ex.subject_name || "General"}
                                      </p>
                                      <h3 className="text-sm font-extrabold text-slate-800 leading-tight">{ex.title}</h3>
                                    </div>
                                    {ex.is_published ? (
                                      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black">
                                        <CheckCircle2 size={9} /> Published
                                      </span>
                                    ) : (ex.students || []).some((s) => s.marks_obtained !== null) ? (
                                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-black">Draft Saved</span>
                                    ) : (
                                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-[9px] font-black">Pending</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                      <Clock size={10} />
                                      {ex.start_time ? formatTime(ex.start_time) : ""}{ex.end_time ? ` – ${formatTime(ex.end_time)}` : ""}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                      <Users size={10} />
                                      {ex.total_students ?? ex.students?.length ?? 0} students
                                    </span>
                                    {ac > 0 && (
                                      <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                                        <AlertCircle size={10} /> {ac} absent
                                      </span>
                                    )}
                                    {ap && (
                                      <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                                        <TrendingUp size={10} /> Avg {ap}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  className="shrink-0 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                                  onClick={(e) => { e.stopPropagation(); openExamModal(ex); }}
                                >
                                  View Marks
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && exams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center z-10">
          <CalendarRange size={52} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-extrabold text-slate-600">No exams this month</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
            There are no scheduled exams for {MONTH_NAMES[month]} {year}. Try navigating to a different month.
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={prev} variant="outline" className="rounded-xl border-slate-200">
              <ChevronLeft size={14} className="mr-1" /> Prev Month
            </Button>
            <Button onClick={next} variant="outline" className="rounded-xl border-slate-200">
              Next Month <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Exam Detail Modal */}
      <AnimatePresence>
        {sel && <Modal key={sel.id} exam={sel} pal={pal(sel)} onClose={() => setSel(null)} rosterLoading={rosterLoading} />}
      </AnimatePresence>
    </div>
  );
}