"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText,
  UploadCloud,
  File,
  Download,
  Trash2,
  BookOpen,
  Plus,
  X,
  GraduationCap,
  Users,
  Tag,
  Calendar,
  Search,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Sparkles,
  Paperclip,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface AttachedFile {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: "pdf" | "png" | "jpg" | "jpeg" | "docx";
  fileUrl?: string;
  rawFile?: File;
}

interface StudyMaterialItem {
  id: string;
  title: string;
  className: string;
  division: string;
  subject: string;
  type: "Study Notes" | "Assignment" | "Practice Sheet" | "Reference Guide";
  files: AttachedFile[];
  uploadDate: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB Limit
const LOCAL_STORAGE_KEY = "vidya_teacher_study_materials_v3";

// ─── Category Styles ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  StudyMaterialItem["type"],
  { bg: string; text: string; border: string; dot: string }
> = {
  "Study Notes": {
    bg: "bg-[#F0EDFF]",
    text: "text-[#5B35F5]",
    border: "border-[#DDD6FE]",
    dot: "bg-[#5B35F5]",
  },
  Assignment: {
    bg: "bg-[#E0F2FE]",
    text: "text-[#0284C7]",
    border: "border-[#BAE6FD]",
    dot: "bg-[#0284C7]",
  },
  "Practice Sheet": {
    bg: "bg-[#ECFDF5]",
    text: "text-[#0BAA78]",
    border: "border-[#A7F3D0]",
    dot: "bg-[#0BAA78]",
  },
  "Reference Guide": {
    bg: "bg-[#FFFBEB]",
    text: "text-[#D97706]",
    border: "border-[#FDE68A]",
    dot: "bg-[#D97706]",
  },
};

// ─── File Extension Colors ────────────────────────────────────────────────────

function getFileBadge(ext: string) {
  const e = ext.toLowerCase();
  if (e === "pdf") {
    return { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "PDF" };
  }
  if (e === "docx" || e === "doc") {
    return { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "DOCX" };
  }
  if (e === "png" || e === "jpg" || e === "jpeg") {
    return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "IMG" };
  }
  return { bg: "bg-purple-50 text-purple-700 border-purple-200", label: e.toUpperCase() };
}

export default function StudyMaterialsPage() {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stored materials (starts completely empty, only populated by real user uploads)
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("Std 8");
  const [selectedDivision, setSelectedDivision] = useState("A");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [materialType, setMaterialType] = useState<StudyMaterialItem["type"]>("Study Notes");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  // Load only real stored user uploads from localStorage
  useEffect(() => {
    try {
      // Clean up all legacy mock keys completely
      localStorage.removeItem("vidya_teacher_study_materials");
      localStorage.removeItem("vidya_teacher_study_materials_v2");

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMaterials(parsed);
          setIsLoaded(true);
          return;
        }
      }
    } catch {}
    setMaterials([]);
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever materials change
  const saveMaterials = (updated: StudyMaterialItem[]) => {
    setMaterials(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // ─── File Handling ──────────────────────────────────────────────────────────

  const processIncomingFiles = (incoming: File[]) => {
    const validExtensions = ["pdf", "jpg", "jpeg", "png", "docx"];
    const validFiles: File[] = [];

    for (const file of incoming) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !validExtensions.includes(ext)) {
        toast.error(`Invalid format for "${file.name}". Allowed: PDF, JPG, PNG, DOCX.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(
          `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed is 5MB.`
        );
        continue;
      }

      if (!selectedFiles.some((f) => f.name === file.name)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      toast.success(`Attached ${validFiles.length} file(s).`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSelectedBytes = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [selectedFiles]);

  const totalSelectedMB = (totalSelectedBytes / (1024 * 1024)).toFixed(2);

  // ─── Submit Upload ──────────────────────────────────────────────────────────

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for the study material.");
      titleInputRef.current?.focus();
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Please attach at least one file (up to 5MB per file).");
      fileInputRef.current?.click();
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    // Simulated quick progress for snappy feedback
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return p + 25;
      });
    }, 120);

    setTimeout(() => {
      clearInterval(progressTimer);
      setUploadProgress(100);

      const attachedFiles: AttachedFile[] = selectedFiles.map((file, i) => {
        const ext = file.name.split(".").pop()?.toLowerCase() as AttachedFile["fileType"];
        let fileUrl: string | undefined;
        try {
          fileUrl = URL.createObjectURL(file);
        } catch {}

        return {
          id: `${Date.now()}-${i}`,
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: ext || "pdf",
          fileUrl,
          rawFile: file,
        };
      });

      const now = new Date();
      const uploadDateStr = now.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const newMaterial: StudyMaterialItem = {
        id: `mat-${Date.now()}`,
        title: title.trim(),
        className: selectedClass,
        division: selectedDivision,
        subject: selectedSubject,
        type: materialType,
        files: attachedFiles,
        uploadDate: uploadDateStr,
      };

      const nextList = [newMaterial, ...materials];
      saveMaterials(nextList);

      toast.success(`🎉 "${newMaterial.title}" with ${attachedFiles.length} file(s) published!`, {
        duration: 3000,
      });

      // Reset
      setTitle("");
      setSelectedFiles([]);
      setIsUploading(false);
      setUploadProgress(0);
    }, 600);
  };

  // ─── Download File Action ───────────────────────────────────────────────────

  const handleDownloadFile = (file: AttachedFile) => {
    let url = file.fileUrl;
    let createdTempUrl = false;

    if (!url && file.rawFile) {
      url = URL.createObjectURL(file.rawFile);
      createdTempUrl = true;
    }

    if (!url) {
      toast.error("File document is unavailable for download.");
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (createdTempUrl) {
      setTimeout(() => URL.revokeObjectURL(url!), 1000);
    }

    toast.success(`Downloading ${file.fileName}…`);
  };

  // ─── Delete Actions ─────────────────────────────────────────────────────────

  const handleDeleteMaterial = (id: string, materialTitle: string) => {
    const next = materials.filter((m) => m.id !== id);
    saveMaterials(next);
    toast.success(`Removed "${materialTitle}".`);
  };

  const handleDeleteIndividualFile = (materialId: string, fileId: string) => {
    const next = materials
      .map((m) => {
        if (m.id === materialId) {
          const updatedFiles = m.files.filter((f) => f.id !== fileId);
          return { ...m, files: updatedFiles };
        }
        return m;
      })
      .filter((m) => m.files.length > 0);

    saveMaterials(next);
    toast.success("File removed.");
  };

  // ─── Filtered Materials ─────────────────────────────────────────────────────

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (filterClass !== "ALL" && m.className !== filterClass) return false;
      if (filterType !== "ALL" && m.type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchSubject = m.subject.toLowerCase().includes(q);
        const matchFile = m.files.some((f) => f.fileName.toLowerCase().includes(q));
        if (!matchTitle && !matchSubject && !matchFile) return false;
      }
      return true;
    });
  }, [materials, filterClass, filterType, search]);

  const scrollToUpload = () => {
    titleInputRef.current?.focus();
    titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-4 sm:space-y-6 pb-24 lg:pb-8 font-['Sora',sans-serif] min-w-0 overflow-x-hidden text-[#172447]">
      {/* ── 1. Header & Page Introduction (Mobile-First Compact Hero) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#5B35F5] text-[10.5px] font-extrabold uppercase tracking-wider border border-[#DDD6FE]/60">
            <Sparkles size={11} className="text-[#5B35F5]" />
            <span>Teaching Resources</span>
          </div>

          {/* Dynamic Resource Count */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[#172447] text-xs font-bold border border-[#E4E9F5] shadow-2xs">
            <BookOpen size={12} className="text-[#5B35F5]" />
            <span>
              {materials.length} {materials.length === 1 ? "Resource" : "Resources"}
            </span>
          </div>
        </div>

        {/* Introduction Banner Card */}
        <div className="bg-white rounded-2xl border border-[#E4E9F5] p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-[#172447] tracking-tight leading-tight">
              Study Materials
            </h1>
            <p className="text-xs text-[#7180A1] mt-0.5 leading-relaxed truncate sm:whitespace-normal">
              Create, organize and share learning resources with your classes.
            </p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#5B35F5] to-[#4030D8] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#5B35F5]/30">
            <FileText size={18} />
          </div>
        </div>
      </div>

      {/* ── Main Layout: Stacked on Mobile, 2-Col on Desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* ── 2. Premium Upload Workspace (Left on Desktop, Top on Mobile) ── */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E9F5] shadow-xs overflow-hidden">
            {/* Distinctive Upload Workspace Header */}
            <div className="bg-[#F8F7FF] border-b border-[#ECEAF8] p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B35F5] to-[#4030D8] text-white flex items-center justify-center shadow-xs shrink-0">
                  <UploadCloud size={17} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black text-[#172447] tracking-tight">
                    Upload New Material
                  </h2>
                  <p className="text-[10.5px] text-[#7180A1] truncate">
                    Share notes, worksheets and reference guides
                  </p>
                </div>
              </div>

              {/* Sub-Step Indicator */}
              <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#E4E9F5] text-[10px] font-bold text-[#5B35F5] shrink-0">
                <span>01 DETAILS</span>
                <span className="text-slate-300">•</span>
                <span className="text-[#7180A1]">02 FILES</span>
              </div>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="p-3.5 sm:p-4 space-y-3.5">
              {/* Material Title */}
              <div>
                <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                  Material Title <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={titleInputRef}
                    type="text"
                    required
                    placeholder="e.g. Chapter 4 — Algebra Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-semibold text-[#172447] placeholder-[#7180A1] outline-none focus:border-[#5B35F5] focus:ring-2 focus:ring-[#5B35F5]/15 transition-all shadow-2xs"
                  />
                  <FileText className="w-4 h-4 text-[#7180A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Class & Division in Responsive 2-Col Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Class */}
                <div>
                  <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                    Class <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full h-10 pl-8 pr-7 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#5B35F5] focus:ring-2 focus:ring-[#5B35F5]/15 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="Std 1">Std 1</option>
                      <option value="Std 2">Std 2</option>
                      <option value="Std 3">Std 3</option>
                      <option value="Std 4">Std 4</option>
                      <option value="Std 5">Std 5</option>
                      <option value="Std 6">Std 6</option>
                      <option value="Std 7">Std 7</option>
                      <option value="Std 8">Std 8</option>
                      <option value="Std 9">Std 9</option>
                      <option value="Std 10">Std 10</option>
                    </select>
                    <GraduationCap className="w-3.5 h-3.5 text-[#5B35F5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-[#7180A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Division */}
                <div>
                  <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                    Division <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDivision}
                      onChange={(e) => setSelectedDivision(e.target.value)}
                      className="w-full h-10 pl-8 pr-7 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#5B35F5] focus:ring-2 focus:ring-[#5B35F5]/15 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="A">Div A</option>
                      <option value="B">Div B</option>
                      <option value="C">Div C</option>
                      <option value="D">Div D</option>
                    </select>
                    <Users className="w-3.5 h-3.5 text-[#5B35F5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-[#7180A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Subject & Category in Responsive 2-Col Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Subject */}
                <div>
                  <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full h-10 pl-8 pr-7 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#5B35F5] focus:ring-2 focus:ring-[#5B35F5]/15 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="English">English</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Computer Science">Computer Sci</option>
                    </select>
                    <BookOpen className="w-3.5 h-3.5 text-[#5B35F5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-[#7180A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Material Category */}
                <div>
                  <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value as any)}
                      className="w-full h-10 pl-8 pr-7 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#5B35F5] focus:ring-2 focus:ring-[#5B35F5]/15 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="Study Notes">Study Notes</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Practice Sheet">Practice Sheet</option>
                      <option value="Reference Guide">Reference Guide</option>
                    </select>
                    <Tag className="w-3.5 h-3.5 text-[#5B35F5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-[#7180A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ── 3. Premium File Upload Zone ── */}
              <div>
                <label className="block text-[11px] font-bold text-[#172447] uppercase tracking-wider mb-1.5">
                  Attach Documents <span className="text-rose-500">*</span>
                </label>

                {/* Dropzone Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer",
                    isDragging
                      ? "border-[#5B35F5] bg-[#F0EDFF]/60 shadow-md shadow-[#5B35F5]/10 scale-[1.01]"
                      : "border-[#DDD6FE] hover:border-[#5B35F5] bg-[#F8F7FF] hover:bg-[#F3F0FF]/60"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-[#EDE9FE] flex items-center justify-center mx-auto mb-2 text-[#5B35F5] shadow-xs">
                    <UploadCloud size={20} />
                  </div>
                  <p className="text-xs font-extrabold text-[#172447]">
                    Drop your files here
                  </p>
                  <p className="text-[11px] text-[#5B35F5] font-semibold mt-0.5 underline underline-offset-2">
                    or browse from your device
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-white/90 border border-[#E4E9F5] text-[10px] font-bold text-[#7180A1] shadow-2xs">
                    <span>PDF, DOCX, PNG, JPG</span>
                    <span>•</span>
                    <span>Max 5MB each</span>
                  </div>

                  {/* Native Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#172447] px-0.5">
                      <span className="flex items-center gap-1">
                        <Paperclip size={11} className="text-[#5B35F5]" />
                        <span>Attached Files ({selectedFiles.length})</span>
                        <span className="text-[#7180A1] font-normal">• {totalSelectedMB} MB</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-rose-600 hover:underline text-[10.5px] font-bold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar">
                      {selectedFiles.map((file, idx) => {
                        const ext = file.name.split(".").pop() || "";
                        const badge = getFileBadge(ext);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E4E9F5] shadow-2xs text-xs gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 border",
                                  badge.bg
                                )}
                              >
                                {badge.label}
                              </span>
                              <span className="truncate font-semibold text-[#172447] text-[11.5px]">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-[#7180A1] shrink-0 font-medium">
                                ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSelectedFile(idx)}
                              title="Remove this file"
                              className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#5B35F5]">
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Uploading to class library…</span>
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#5B35F5] to-[#4030D8] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ── 4. Primary Upload Button ── */}
              <button
                type="submit"
                disabled={isUploading || !title.trim() || selectedFiles.length === 0}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#5B35F5] to-[#4030D8] text-white text-xs font-bold shadow-md shadow-[#5B35F5]/25 hover:shadow-lg hover:shadow-[#5B35F5]/35 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Publishing Material…</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={15} />
                    <span>
                      Upload Study Material{" "}
                      {selectedFiles.length > 0
                        ? `(${selectedFiles.length} ${selectedFiles.length === 1 ? "File" : "Files"})`
                        : ""}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── 5. Uploaded Materials Section: Your Learning Library (Right on Desktop, Bottom on Mobile) ── */}
        <div className="lg:col-span-7 w-full space-y-3.5">
          {/* Library Header Card */}
          <div className="bg-white rounded-2xl border border-[#E4E9F5] p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#5B35F5] flex items-center justify-center shrink-0">
                  <FolderOpen size={16} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-[#172447] tracking-tight">
                    Your Learning Library
                  </h2>
                  <p className="text-[10.5px] text-[#7180A1]">
                    Materials available to students and parents
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#5B35F5] text-xs font-bold border border-[#DDD6FE]">
                {filteredMaterials.length} Items
              </span>
            </div>

            {/* Search and Filters Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-[#F1F5F9]">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0">
                <Search size={13} className="text-[#7180A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title, subject, file…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-7 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-semibold text-[#172447] placeholder-[#7180A1] outline-none focus:border-[#5B35F5] transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Class Filter */}
              <div className="relative w-full sm:w-32 shrink-0">
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full h-9 pl-7 pr-6 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#5B35F5] cursor-pointer"
                >
                  <option value="ALL">All Classes</option>
                  <option value="Std 1">Std 1</option>
                  <option value="Std 2">Std 2</option>
                  <option value="Std 3">Std 3</option>
                  <option value="Std 4">Std 4</option>
                  <option value="Std 5">Std 5</option>
                  <option value="Std 6">Std 6</option>
                  <option value="Std 7">Std 7</option>
                  <option value="Std 8">Std 8</option>
                  <option value="Std 9">Std 9</option>
                  <option value="Std 10">Std 10</option>
                </select>
                <GraduationCap className="w-3 h-3 text-[#5B35F5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3 h-3 text-[#7180A1] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Category Filter */}
              <div className="relative w-full sm:w-36 shrink-0">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-9 pl-7 pr-6 rounded-xl bg-[#F8F9FD] border border-[#E4E9F5] text-xs font-bold text-[#172447] appearance-none outline-none focus:border-[#5B35F5] cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="Study Notes">Study Notes</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Practice Sheet">Practice Sheet</option>
                  <option value="Reference Guide">Reference Guide</option>
                </select>
                <Tag className="w-3 h-3 text-[#5B35F5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3 h-3 text-[#7180A1] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ── 6. Resource Cards List ── */}
          {filteredMaterials.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E9F5] p-6 sm:p-8 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EDE9FE] text-[#5B35F5] flex items-center justify-center mx-auto shadow-2xs">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#172447]">
                  Your learning library starts here
                </h3>
                <p className="text-xs text-[#7180A1] max-w-xs mx-auto mt-1 leading-relaxed">
                  Upload notes, worksheets and reference materials to make them available to your students.
                </p>
              </div>
              <button
                type="button"
                onClick={scrollToUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B35F5] hover:bg-[#4030D8] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Plus size={13} />
                <span>Upload your first material</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMaterials.map((item) => {
                const cat = CATEGORY_CONFIG[item.type] || CATEGORY_CONFIG["Study Notes"];

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#E4E9F5] p-3.5 sm:p-4 shadow-xs hover:border-[#DDD6FE] transition-all space-y-3"
                  >
                    {/* Top Row: Category Pill, Date & Delete Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border",
                            cat.bg,
                            cat.text,
                            cat.border
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", cat.dot)} />
                          {item.type}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-[#7180A1] font-medium">
                          <Calendar size={11} className="text-[#7180A1]" />
                          <span>{item.uploadDate}</span>
                        </span>
                      </div>

                      {/* Delete Entire Material */}
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(item.id, item.title)}
                        title="Delete this material"
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Material Title */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-[#172447] leading-snug">
                        {item.title}
                      </h3>

                      {/* Metadata Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8F9FD] border border-[#E4E9F5] font-bold text-[#172447]">
                          <GraduationCap size={11} className="text-[#5B35F5]" />
                          <span>{item.className} • Div {item.division}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8F9FD] border border-[#E4E9F5] font-bold text-[#5B35F5]">
                          <BookOpen size={11} className="text-[#5B35F5]" />
                          <span>{item.subject}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8F9FD] border border-[#E4E9F5] font-medium text-[#7180A1]">
                          <Paperclip size={11} className="text-[#7180A1]" />
                          <span>{item.files.length} {item.files.length === 1 ? "file" : "files"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Files List Accordion */}
                    <div className="space-y-1.5 pt-1 border-t border-[#F1F5F9]">
                      {item.files.map((file) => {
                        const badge = getFileBadge(file.fileType);

                        return (
                          <div
                            key={file.id}
                            className="p-2 sm:p-2.5 rounded-xl bg-[#FBFBFE] border border-[#ECEEF5] flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 border",
                                  badge.bg
                                )}
                              >
                                {badge.label}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-[#172447] truncate">
                                  {file.fileName}
                                </p>
                                <p className="text-[10px] text-[#7180A1] font-mono mt-0.5">
                                  {file.fileSize}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Real Download Button */}
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file)}
                                className="h-7 px-2.5 rounded-lg bg-white hover:bg-[#EDE9FE] text-[#5B35F5] border border-[#DDD6FE] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <Download size={11} />
                                <span>Download</span>
                              </button>

                              {/* Delete Individual File */}
                              {item.files.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteIndividualFile(item.id, file.id)}
                                  title="Remove this file"
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
