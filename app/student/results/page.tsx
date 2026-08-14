"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  FileText,
  BookmarkCheck,
  Download,
  Award,
  Users,
  CheckCircle2,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getStudentResults, getExamRankings, getStudentExams, getStudentAttendance } from "@/lib/student";
import type { StudentResult, StudentExam, RankingEntry } from "@/types/student";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100/80" },
  B: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100/80" },
  C: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100/80" },
  D: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100/80" },
  E: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100/80" },
  F: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100/80" },
};

const DEFAULT_GRADE_STYLE = { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" };

export default function StudentResultsPage() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardTitle, setLeaderboardTitle] = useState("");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);

  // Fetch page details
  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [resultsRes, examsRes, attendanceRes] = await Promise.allSettled([
        getStudentResults(),
        getStudentExams(),
        getStudentAttendance(),
      ]);

      if (resultsRes.status === "fulfilled") {
        setResults(resultsRes.value);
      } else {
        throw new Error(resultsRes.reason?.message || "Failed to load academic results.");
      }

      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value);
      }

      // Try to determine the student ID from attendance records
      if (attendanceRes.status === "fulfilled" && attendanceRes.value.length > 0) {
        setStudentId(attendanceRes.value[0].student);
      }

    } catch (err: any) {
      setError(err?.message || "Something went wrong loading academic performance card.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Handle PDF report card download
  const handleDownloadReportCard = async () => {
    if (!studentId) {
      // If we don't have studentId yet, try fetching again
      try {
        setDownloadingReport(true);
        const attendance = await getStudentAttendance();
        if (attendance.length > 0) {
          const sId = attendance[0].student;
          setStudentId(sId);
          await downloadPDF(sId);
        } else {
          toast.error("Could not retrieve student ID for report card.");
        }
      } catch (err) {
        toast.error("Failed to determine student ID.");
      } finally {
        setDownloadingReport(false);
      }
      return;
    }

    setDownloadingReport(true);
    try {
      await downloadPDF(studentId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF report card.");
    } finally {
      setDownloadingReport(false);
    }
  };

  // Helper download trigger
  const downloadPDF = async (sId: number) => {
    const url = `${API_BASE_URL}/results/report-card/${sId}/`;
    const response = await fetchWithAuth(url);

    if (!response.ok) {
      throw new Error("Report card file is not available yet.");
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `Report_Card_${sId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
    toast.success("Report card downloaded successfully!");
  };

  // Match exam title from result to actual scheduled exam ID
  const findExamIdByTitle = (title: string): number | null => {
    const matched = exams.find((e) => e.title.toLowerCase() === title.toLowerCase());
    return matched ? matched.id : null;
  };

  // Fetch and display exam leaderboard rankings
  const handleOpenLeaderboard = async (title: string, examId: number) => {
    setLeaderboardTitle(title);
    setShowLeaderboard(true);
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setRankings([]);

    try {
      const res = await getExamRankings(examId);
      setRankings(res.ranking || []);
    } catch (err: any) {
      setLeaderboardError(err?.message || "Failed to load ranking details.");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Filtered and sorted results (latest first based on exam date)
  const filteredResults = useMemo(() => {
    const filtered = results.filter((r) => {
      const query = searchQuery.toLowerCase();
      return (
        r.exam_title.toLowerCase().includes(query) ||
        r.subject.toLowerCase().includes(query) ||
        (r.grade || "").toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      const examA = exams.find((e) => e.title.toLowerCase() === a.exam_title.toLowerCase());
      const examB = exams.find((e) => e.title.toLowerCase() === b.exam_title.toLowerCase());
      
      const dateA = examA ? new Date(examA.exam_date).getTime() : 0;
      const dateB = examB ? new Date(examB.exam_date).getTime() : 0;
      
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return a.exam_title.localeCompare(b.exam_title);
    });
  }, [results, exams, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    if (results.length === 0) return { avgPercentage: 0, completed: 0, gradeDistribution: {} };

    let totalObtained = 0;
    let totalMax = 0;
    let completed = 0;

    results.forEach((r) => {
      if (!r.is_absent) {
        totalObtained += parseFloat(r.marks_obtained || "0");
        totalMax += parseFloat(r.max_marks || "0");
        completed++;
      }
    });

    const avgPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

    return { avgPercentage, completed };
  }, [results]);

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
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">Academic Records</p>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Trophy className="text-indigo-600 h-8 w-8 animate-bounce-slow" />
            My Results
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your semester marks, view leaderboard rankings, and download report cards.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={loadPageData}
            disabled={isLoading}
            className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-4 h-11 transition-all duration-300 font-semibold text-slate-600"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-indigo-600" />
            ) : (
              <RefreshCw size={16} className="text-slate-500" />
            )}
            Refresh
          </Button>

          <Button
            onClick={handleDownloadReportCard}
            disabled={downloadingReport || results.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-md px-5 h-11 font-bold transition-all duration-300"
          >
            {downloadingReport ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <Download size={16} className="text-white" />
            )}
            Report Card PDF
          </Button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 z-10">
        <Card className="border-indigo-100/60 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm rounded-2xl overflow-hidden hover:shadow transition-all duration-300">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-indigo-100/50 text-indigo-600 shrink-0">
              <Award size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Average Performance</p>
              <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">
                {stats.avgPercentage}%
              </h2>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100/60 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm rounded-2xl overflow-hidden hover:shadow transition-all duration-300">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-100/50 text-emerald-600 shrink-0">
              <BookmarkCheck size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Completed Evaluations</p>
              <h2 className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{stats.completed}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar Filter Section */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <Input
            placeholder="Search results by subject or exam title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-indigo-500/50 text-sm w-full transition-all"
          />
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading && results.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="border-slate-100 shadow-sm animate-pulse bg-white rounded-3xl h-[210px]" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl z-10 p-6 text-center max-w-md mx-auto">
          <AlertCircle className="text-rose-500 h-10 w-10 mx-auto mb-3 shrink-0" />
          <h2 className="text-rose-900 text-lg font-bold">Failed to sync results</h2>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
          <Button onClick={loadPageData} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5">
            Retry Sync
          </Button>
        </Card>
      ) : filteredResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm z-10">
          <Trophy className="h-14 w-14 text-slate-200 mb-3" />
          <p className="text-base font-semibold">No published results found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            There are currently no published exams or marks entries available. Contact your class teacher for details.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          <AnimatePresence>
            {filteredResults.map((res, index) => {
              const gradeStyle = GRADE_STYLES[res.grade.toUpperCase()] || DEFAULT_GRADE_STYLE;
              const examId = findExamIdByTitle(res.exam_title);

              const marksObt = parseFloat(res.marks_obtained || "0");
              const marksMax = parseFloat(res.max_marks || "1");
              const percentage = Math.round((marksObt / marksMax) * 100);

              return (
                <motion.div
                  key={res.exam_title + index}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-3xl h-full flex flex-col justify-between overflow-hidden group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0`}>
                            <BookOpen size={20} className="group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 capitalize">
                              {res.subject}
                            </span>
                            <CardTitle className="text-lg text-slate-800 font-extrabold tracking-tight mt-0.5 leading-tight truncate max-w-[150px]" title={res.exam_title}>
                              {res.exam_title}
                            </CardTitle>
                          </div>
                        </div>

                        <span className={`h-8 w-8 flex items-center justify-center rounded-full border font-black text-xs shrink-0 ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.border}`}>
                          {res.grade || "—"}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 flex flex-col gap-4 flex-1 justify-between">
                      <div>
                        {/* Progress slider bar */}
                        <div className="space-y-1.5 mt-1">
                          <div className="flex justify-between text-xs font-bold text-slate-600">
                            <span>Score</span>
                            <span>
                              {res.is_absent ? "Absent" : `${marksObt} / ${marksMax}`}
                            </span>
                          </div>
                          {!res.is_absent && (
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {res.remarks && (
                          <p className="text-xs text-slate-400 italic mt-3.5 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50" title={res.remarks}>
                            &ldquo;{res.remarks}&rdquo;
                          </p>
                        )}
                      </div>

                      {examId !== null && (
                        <Button
                          onClick={() => handleOpenLeaderboard(res.exam_title, examId)}
                          className="w-full mt-3 h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group-hover:border-indigo-200"
                        >
                          <Users size={14} className="text-indigo-500" />
                          View Leaderboard
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden flex flex-col relative"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  {leaderboardTitle} Leaderboard
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Top performing students ranked by marks.</p>
              </div>
              <button
                onClick={() => {
                  setShowLeaderboard(false);
                  setRankings([]);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {leaderboardLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syncing Rankings...</span>
                </div>
              ) : leaderboardError ? (
                <div className="py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                  <p className="text-slate-800 text-xs font-bold">{leaderboardError}</p>
                </div>
              ) : rankings.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold">No ranking entries found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rankings.map((rank) => {
                    const isCurrentUser = studentId && rank.student === studentId;
                    const gradeStyle = GRADE_STYLES[rank.grade.toUpperCase()] || DEFAULT_GRADE_STYLE;

                    return (
                      <div
                        key={rank.student}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          isCurrentUser
                            ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200/50 shadow-sm"
                            : "bg-white border-slate-100/80 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              rank.rank === 1
                                ? "bg-amber-100 text-amber-800"
                                : rank.rank === 2
                                ? "bg-slate-100 text-slate-800"
                                : rank.rank === 3
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-50 text-slate-500"
                            }`}
                          >
                            #{rank.rank}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 capitalize flex items-center gap-1.5">
                              {rank.student_name}
                              {isCurrentUser && (
                                <span className="bg-indigo-600 text-white font-bold text-[8px] tracking-wide uppercase px-1.5 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">Score: {rank.marks_obtained} / {rank.max_marks}</p>
                          </div>
                        </div>

                        <span className={`h-7 w-7 flex items-center justify-center rounded-full border font-black text-[10px] shrink-0 ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.border}`}>
                          {rank.grade}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
