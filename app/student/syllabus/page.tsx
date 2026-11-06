"use client";

import { StudentEmptyState } from "@/components/student/student-empty-state";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  FileText,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FlaskConical,
  Calculator,
  Globe,
  FolderOpen,
  Tag,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { getStudentSyllabus, type StudentSyllabusItem } from "@/lib/student";
import { getStudentStudyMaterials, type StudyMaterialBackendItem } from "@/lib/study-materials";
import { API_BASE_URL } from "@/lib/config";
import {
  getSyllabusStreamUrl,
  openAuthenticatedDocument,
  getDocumentBlobUrl,
} from "@/lib/document-viewer";

// ─────────────────────────────────────────────
// Subject Theme Matcher (Icons and Soft Colors)
// ─────────────────────────────────────────────
function getSubjectTheme(subjectName: string = "") {
  const name = subjectName.toLowerCase();
  if (name.includes("sci") || name.includes("bio") || name.includes("chem") || name.includes("phy")) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
      Icon: FlaskConical,
    };
  }
  if (name.includes("math") || name.includes("calc") || name.includes("algebra") || name.includes("stat")) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
      Icon: Calculator,
    };
  }
  if (name.includes("soc") || name.includes("hist") || name.includes("geo") || name.includes("civ") || name.includes("world")) {
    return {
      bg: "bg-sky-50",
      text: "text-sky-600",
      border: "border-sky-100",
      Icon: Globe,
    };
  }
  // Default (Hindi, English, Literature, etc.) - Soft blue
  return {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-100",
    Icon: BookOpen,
  };
}

export default function StudentSyllabusPage() {
  const [syllabuses, setSyllabuses] = useState<StudentSyllabusItem[]>([]);
  const [materials, setMaterials] = useState<StudyMaterialBackendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingMatId, setDownloadingMatId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(9);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (url: string, fileName: string, id: number) => {
    setDownloadingId(id);
    try {
      const blobUrl = await getDocumentBlobUrl(url, url);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${fileName.replace(/\.[^.]+$/, "")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download this PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadMaterial = async (url: string, fileName: string, id: number) => {
    setDownloadingMatId(id);
    try {
      const resolved = resolveSyllabusUrl(url);
      const blobUrl = await getDocumentBlobUrl(resolved, resolved);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "study_material.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const resolved = resolveSyllabusUrl(url);
      window.open(resolved, "_blank");
    } finally {
      setDownloadingMatId(null);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setIsLoadingMaterials(true);
    setError(null);

    // Fetch Syllabus
    try {
      const sylData = await getStudentSyllabus();
      setSyllabuses(sylData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus data.");
    } finally {
      setIsLoading(false);
    }

    // Fetch Study Materials (Teacher uploaded for student's class and division)
    try {
      const matData = await getStudentStudyMaterials();
      setMaterials(matData);
    } catch (err) {
      console.error("Failed to load study materials:", err);
      setMaterials([]);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setVisibleCount(9);
  }, [searchQuery, syllabuses]);

  const resolveSyllabusUrl = (url: string | null): string => {
    if (!url) return "";
    if (url.includes("127.0.0.1:8000") || url.includes("localhost:8000")) {
      const domain = API_BASE_URL.replace("/api", "");
      return url.replace(/http:\/\/(127\.0\.0\.1|localhost):8000/, domain);
    }
    return url;
  };

  const filteredSyllabuses = useMemo(() => {
    // Deduplicate by subject so each subject appears only once in the student's curriculum view
    const seenSubjects = new Set<string>();
    const uniqueList: StudentSyllabusItem[] = [];

    for (const item of syllabuses) {
      const subjectKey = String(item.subject_name || item.subject || item.id).trim().toLowerCase();
      if (!seenSubjects.has(subjectKey)) {
        seenSubjects.add(subjectKey);
        uniqueList.push(item);
      }
    }

    return uniqueList.filter((s) => {
      const subName = (s.subject_name || "General Subject").toLowerCase();
      const classLabel = (s.school_class || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return subName.includes(query) || classLabel.includes(query);
    });
  }, [syllabuses, searchQuery]);

  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const q = searchQuery.toLowerCase();
    return materials.filter((m) => {
      const title = (m.title || "").toLowerCase();
      const subj = (m.display_subject || m.subject_name || "").toLowerCase();
      const type = (m.material_type || "").toLowerCase();
      const desc = (m.description || "").toLowerCase();
      const cls = (m.display_class || m.class_name || "").toLowerCase();
      return title.includes(q) || subj.includes(q) || type.includes(q) || desc.includes(q) || cls.includes(q);
    });
  }, [materials, searchQuery]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleCount >= filteredSyllabuses.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((count) => Math.min(count + 9, filteredSyllabuses.length));
      }
    }, { rootMargin: "240px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, filteredSyllabuses.length]);

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. Hero Card: White BG with Upper Header in Single Line & Left Paragraph
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1 min-w-0 z-10">
          {/* Upper Header in a Single Line */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              Curriculum Directory
            </h1>
          </div>

          {/* Left Side Paragraph */}
          <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-3.5 font-medium leading-relaxed max-w-[260px] sm:max-w-md">
            Access and download syllabus files assigned for your classes.
          </p>

          {/* Action Button */}
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Sync Docs</span>
          </button>
        </div>

        {/* 3D Education Books Illustration Aligned with Left Paragraph */}
        <div className="w-28 sm:w-36 md:w-44 shrink-0 flex items-center justify-end pointer-events-none select-none">
          <img
            src="/images/Books-with-calendar.png"
            alt="Curriculum Directory"
            className="w-full h-auto object-contain filter drop-shadow-md"
          />
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. Search Input Filter & Refresh Button (Fully Rounded Pills)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by subject or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-white border border-slate-100 rounded-full pl-11 pr-4 text-xs sm:text-sm text-slate-700 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          type="button"
          title="Refresh Curriculum"
          className="w-12 h-12 rounded-full bg-white border border-slate-100 text-slate-600 shadow-2xs flex items-center justify-center hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-blue-600" />
          ) : (
            <RefreshCw size={18} />
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Syllabus Cards: 3 in a Single Row on Desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
         ───────────────────────────────────────────────────────────── */}
      {isLoading && syllabuses.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs animate-pulse space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-slate-100 rounded-2xl" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 rounded-full w-28" />
                      <div className="h-3 bg-slate-100 rounded-full w-20" />
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-slate-100 rounded-full" />
                </div>
                <div className="h-12 bg-slate-50 rounded-2xl" />
              </div>
              <div className="flex gap-3 pt-2">
                <div className="flex-1 h-10 bg-slate-100 rounded-full" />
                <div className="flex-1 h-10 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-2xs text-center space-y-3">
          <AlertCircle className="text-rose-500 h-8 w-8 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">Unable to Sync Syllabus</h3>
          <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      ) : filteredSyllabuses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
          <StudentEmptyState
            title="No course materials available"
            description="Syllabus documents and learning materials will appear here once uploaded by your teachers."
            imageClassName="w-36 sm:w-44"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredSyllabuses.slice(0, visibleCount).map((item, index) => {
              const theme = getSubjectTheme(item.subject_name);
              const ThemeIcon = theme.Icon;
              const resolvedUrl = resolveSyllabusUrl(item.syllabus_file);
              const rawFileName = resolvedUrl
                ? decodeURIComponent(resolvedUrl.split("/").pop() || "syllabus.pdf")
                : "syllabus_material.pdf";
              const fileName = rawFileName.includes(".") ? rawFileName : `${rawFileName}.pdf`;

              const classDivisionLabel = item.school_class || "Class";

              return (
                <motion.div
                  key={item.id || index}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all group h-full gap-3.5"
                >
                  <div className="space-y-3.5">
                    {/* Card Top: Subject Icon, Title, Class Label & Chevron */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0 border ${theme.border} group-hover:scale-105 transition-transform`}
                        >
                          <ThemeIcon size={22} />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-800 capitalize tracking-tight">
                            {item.subject_name || "General Subject"}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {classDivisionLabel}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    {/* Middle: File Information Box */}
                    <div className="bg-slate-50/80 border border-slate-100/90 rounded-2xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          PDF • Curriculum Document
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Two Buttons in a Single Row (Fully Rounded & Pure Blue) */}
                  <div className="flex items-center gap-2.5 sm:gap-3 w-full pt-1 mt-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (/^https?:\/\//i.test(resolvedUrl) && resolvedUrl.includes("cloudinary.com")) {
                          window.open(resolvedUrl, "_blank", "noopener,noreferrer");
                          return;
                        }
                        void openAuthenticatedDocument(
                          item.id ? getSyllabusStreamUrl(item.id) : resolvedUrl,
                          item.subject_name,
                          resolvedUrl
                        );
                      }}
                      className="flex-1 py-2.5 px-3 sm:px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <ExternalLink size={14} className="text-slate-600" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(
                          item.id ? `${getSyllabusStreamUrl(item.id)}?download=1` : resolvedUrl,
                          fileName,
                          item.id
                        )
                      }
                      disabled={downloadingId === item.id}
                      className="flex-1 py-2.5 px-3 sm:px-4 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {downloadingId === item.id ? (
                        <Loader2 size={14} className="animate-spin text-white" />
                      ) : (
                        <Download size={14} />
                      )}
                      <span>{downloadingId === item.id ? "Downloading..." : "Download"}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. Study Materials Section (Uploaded by Teachers for this Class & Division)
         ───────────────────────────────────────────────────────────── */}
      <div className="mt-8 pt-8 border-t border-slate-200/80 flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FolderOpen size={18} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Class Study Materials & Learning Resources</span>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {filteredMaterials.length} Available
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Notes, worksheets, and study documents shared by teachers specifically for your class &amp; division.
              </p>
            </div>
          </div>
        </div>

        {/* Study Materials Grid */}
        {isLoadingMaterials ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs animate-pulse space-y-4"
              >
                <div className="h-4 bg-slate-100 rounded-full w-32" />
                <div className="h-10 bg-slate-50 rounded-2xl" />
                <div className="flex gap-2">
                  <div className="flex-1 h-9 bg-slate-100 rounded-full" />
                  <div className="flex-1 h-9 bg-slate-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-2xs text-center space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No study materials for your class &amp; division yet</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Any study notes, homework sheets, or revision guides uploaded by your teachers for your section will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((mat, idx) => {
              const theme = getSubjectTheme(mat.display_subject || mat.subject_name || "");
              const ThemeIcon = theme.Icon;
              const fileUrl = resolveSyllabusUrl(mat.file_url || mat.file);
              const fileName = mat.file_name || mat.title || "study_material.pdf";
              const typeColor =
                mat.material_type === "assignment"
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : mat.material_type === "worksheet"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : mat.material_type === "other"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200";

              const typeLabel =
                mat.material_type === "assignment"
                  ? "Assignment"
                  : mat.material_type === "worksheet"
                  ? "Worksheet / Practice"
                  : mat.material_type === "other"
                  ? "Reference Guide"
                  : "Study Notes";

              const uploadDate = mat.created_at
                ? new Date(mat.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "";

              return (
                <div
                  key={mat.id || idx}
                  className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all group h-full gap-3.5"
                >
                  <div className="space-y-3">
                    {/* Category badge & Date */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${typeColor}`}>
                        {typeLabel}
                      </span>
                      {uploadDate && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {uploadDate}
                        </span>
                      )}
                    </div>

                    {/* Subject Icon + Material Title + Class/Div */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0 border ${theme.border} mt-0.5`}
                      >
                        <ThemeIcon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-2">
                          {mat.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium flex-wrap">
                          <span className="font-semibold text-slate-700 capitalize">
                            {mat.display_subject || mat.subject_name || "General"}
                          </span>
                          <span>•</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600">
                            {mat.display_class || mat.class_name || "Class"}
                            {mat.division ? ` · Div ${mat.division.toUpperCase()}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {mat.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 pl-0.5">
                        {mat.description}
                      </p>
                    )}

                    {/* File Attachment Box */}
                    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {mat.file_size || "Document"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 w-full pt-1 mt-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (/^https?:\/\//i.test(fileUrl) && fileUrl.includes("cloudinary.com")) {
                          window.open(fileUrl, "_blank", "noopener,noreferrer");
                          return;
                        }
                        void openAuthenticatedDocument(fileUrl, mat.title, fileUrl);
                      }}
                      className="flex-1 py-2 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <ExternalLink size={13} className="text-slate-600" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadMaterial(fileUrl, fileName, mat.id)}
                      disabled={downloadingMatId === mat.id}
                      className="flex-1 py-2 px-3 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {downloadingMatId === mat.id ? (
                        <Loader2 size={13} className="animate-spin text-white" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span>{downloadingMatId === mat.id ? "Downloading..." : "Download"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!isLoading && !error && visibleCount < filteredSyllabuses.length && (
        <div ref={loadMoreRef} className="h-8" aria-hidden="true" />
      )}
    </div>
  );
}
