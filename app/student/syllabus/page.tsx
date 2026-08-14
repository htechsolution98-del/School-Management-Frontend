"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked,
  Search,
  FileText,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { getStudentSyllabus, type StudentSyllabusItem } from "@/lib/student";
import { getClasses, getDivisions, getSubjects } from "@/lib/clerk";
import type { Division, SchoolClass, Subject } from "@/types/clerk";
import { API_BASE_URL } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SCHOOL_CLASS_OPTIONS } from "@/lib/form-builder-config";

// Elegant gradient palettes for subject cards
const CARD_PALETTES = [
  {
    theme: "from-indigo-500 to-indigo-600",
    glow: "shadow-indigo-100/50",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
  },
  {
    theme: "from-emerald-500 to-emerald-600",
    glow: "shadow-emerald-100/50",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
  },
  {
    theme: "from-blue-500 to-blue-600",
    glow: "shadow-blue-100/50",
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
  {
    theme: "from-amber-500 to-amber-600",
    glow: "shadow-amber-100/50",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  {
    theme: "from-rose-500 to-rose-600",
    glow: "shadow-rose-100/50",
    bg: "bg-rose-50",
    text: "text-rose-600",
  },
  {
    theme: "from-purple-500 to-purple-600",
    glow: "shadow-purple-100/50",
    bg: "bg-purple-50",
    text: "text-purple-600",
  },
];

export default function StudentSyllabusPage() {
  const [syllabuses, setSyllabuses] = useState<StudentSyllabusItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (url: string, fileName: string, id: number) => {
    setDownloadingId(id);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("CORS or network error");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: open in new tab if CORS blocks direct fetch
      window.open(url, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [syllabusRes, subjectsRes, divisionsRes, classesRes] = await Promise.allSettled([
        getStudentSyllabus(),
        getSubjects(),
        getDivisions(),
        getClasses(),
      ]);

      if (syllabusRes.status === "fulfilled") {
        setSyllabuses(syllabusRes.value);
      } else {
        throw new Error(syllabusRes.reason?.message || "Failed to load syllabus items.");
      }

      if (subjectsRes.status === "fulfilled") setSubjects(subjectsRes.value);
      if (divisionsRes.status === "fulfilled") setDivisions(divisionsRes.value);
      if (classesRes.status === "fulfilled") setSchoolClasses(classesRes.value);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus data.");
      toast.error("Could not load syllabus list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Utility to resolve localhost/127.0.0.1:8000 paths to actual Render server media paths
  const resolveSyllabusUrl = (url: string | null): string => {
    if (!url) return "";
    if (url.includes("127.0.0.1:8000") || url.includes("localhost:8000")) {
      const domain = API_BASE_URL.replace("/api", "");
      return url.replace(/http:\/\/(127\.0\.0\.1|localhost):8000/, domain);
    }
    return url;
  };

  const isImageFile = (url: string | null): boolean => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return (
      cleanUrl.endsWith(".png") ||
      cleanUrl.endsWith(".jpg") ||
      cleanUrl.endsWith(".jpeg") ||
      cleanUrl.endsWith(".gif") ||
      cleanUrl.endsWith(".webp")
    );
  };

  const getDivisionLabel = (divisionId: number | null) => {
    if (divisionId === null) return "All Divisions";
    const div = divisions.find((d) => d.id === divisionId);
    if (!div) return `Division #${divisionId}`;

    const cls = schoolClasses.find((c) => c.id === div.SchoolClass);
    const classLabel = cls
      ? SCHOOL_CLASS_OPTIONS.find((o) => o.value === cls.school_class)?.label ||
        cls.school_class
      : "Unknown Class";

    return `${classLabel} - Div ${div.division}`;
  };

  const filteredSyllabuses = useMemo(() => {
    return syllabuses.filter((s) => {
      const subName = (s.subject_name || "General Subject").toLowerCase();
      const divLabel = s.school_class && s.divison_name
        ? `${s.school_class} (${s.divison_name})`.toLowerCase()
        : getDivisionLabel(s.division).toLowerCase();
      const query = searchQuery.toLowerCase();
      return subName.includes(query) || divLabel.includes(query);
    });
  }, [syllabuses, searchQuery, divisions, schoolClasses]);

  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 py-6 bg-slate-50 min-h-screen relative overflow-hidden">
      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-85 h-85 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <BookMarked className="text-indigo-600 h-8 w-8" />
            Curriculum Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access and download syllabus files assigned for your classes.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-4 py-2 hover:shadow transition-all duration-300 font-semibold text-slate-600 self-start sm:self-auto"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-indigo-600" />
          ) : (
            <RefreshCw size={16} className="text-slate-500" />
          )}
          Refresh Docs
        </Button>
      </div>

      {/* Search Input Filter */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
          <Input
            placeholder="Search by subject title or class division..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-indigo-500/50 text-sm w-full transition-all"
          />
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading && syllabuses.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="border-slate-100 shadow-sm animate-pulse bg-white rounded-3xl">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-24" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-9 bg-slate-50 rounded-xl w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl z-10">
          <CardHeader className="flex flex-row items-center gap-3">
            <AlertCircle className="text-rose-500 h-6 w-6 shrink-0" />
            <div>
              <CardTitle className="text-rose-900 text-lg">Unable to Sync Syllabus</CardTitle>
              <CardDescription className="text-rose-600">{error}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchData} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl">
              Retry Sync
            </Button>
          </CardContent>
        </Card>
      ) : filteredSyllabuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm z-10">
          <BookMarked className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-sm font-semibold">No syllabus guidelines matches</p>
          <p className="text-xs text-slate-400 mt-1">Try refining search parameters or sync the directory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          <AnimatePresence>
            {filteredSyllabuses.map((item, index) => {
              const palette = CARD_PALETTES[index % CARD_PALETTES.length];
              const resolvedUrl = resolveSyllabusUrl(item.syllabus_file);
              const fileName = resolvedUrl
                ? decodeURIComponent(resolvedUrl.split("/").pop() || "Syllabus File")
                : "Syllabus Attachment";
              const isImage = isImageFile(resolvedUrl) && !imageErrors[item.id];

              return (
                <motion.div
                  key={item.id || index}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-3xl h-full flex flex-col justify-between overflow-hidden group">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${palette.bg} ${palette.text} shrink-0`}>
                            <BookOpen size={22} className="group-hover:rotate-6 transition-transform" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-slate-800 capitalize font-extrabold tracking-tight">
                              {item.subject_name}
                            </CardTitle>
                            <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
                              {item.school_class && item.divison_name
                                ? `${item.school_class} (${item.divison_name})`
                                : getDivisionLabel(item.division)}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 flex flex-col gap-4">
                      {resolvedUrl ? (
                        <div className="flex flex-col gap-3">
                          {/* Image preview support for visual file types */}
                          {isImage ? (
                            <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100/60 bg-slate-50 flex items-center justify-center">
                              <img
                                src={resolvedUrl}
                                alt={item.subject_name}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                onError={() => {
                                  setImageErrors((prev) => ({ ...prev, [item.id]: true }));
                                }}
                              />
                            </div>
                          ) : (
                            <div className="bg-slate-50/80 p-3 rounded-2xl flex items-center gap-2.5 border border-slate-100/50">
                              <FileText className="text-indigo-500 h-5 w-5 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-600 truncate flex-1" title={fileName}>
                                {fileName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2.5 w-full">
                            <a
                              href={resolvedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <Button
                                variant="outline"
                                className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-sm transition-colors"
                              >
                                <ExternalLink size={14} />
                                View
                              </Button>
                            </a>
                            <div className="flex-1">
                              <Button
                                onClick={() => handleDownload(resolvedUrl, fileName, item.id)}
                                disabled={downloadingId === item.id}
                                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all"
                              >
                                {downloadingId === item.id ? (
                                  <Loader2 size={14} className="animate-spin text-white" />
                                ) : (
                                  <Download size={14} />
                                )}
                                {downloadingId === item.id ? "Downloading..." : "Download"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100 border-dashed">
                          <span className="text-xs text-slate-400 italic">No syllabus document attached</span>
                        </div>
                      )}
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
