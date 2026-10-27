"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  CheckCircle2,
  Play,
  PlayCircle,
  Lightbulb,
  Table,
  ExternalLink,
  Sparkles,
  ChevronRight,
  HelpCircle,
  Loader2,
  Copy,
  Check,
  Compass,
  ArrowRight,
  ArrowLeft,
  FileText,
  Clock,
  Award,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Info,
  Edit3,
  Trash2,
  Plus,
  Video,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchTutorialByPath,
  saveTutorial,
  PageTutorialData,
  ROLE_SIDEBAR_PAGES,
  normalizeTutorialRole,
  normalizePath,
  getDefaultTutorial,
  TutorialStep,
} from "@/lib/tutorial";
import { Button } from "@/components/ui/button";

interface PageTutorialDialogProps {
  roleTitle?: string;
  className?: string;
  isSuperAdmin?: boolean;
}

export const PageTutorialDialog: React.FC<PageTutorialDialogProps> = ({
  roleTitle,
  className = "",
  isSuperAdmin = false,
}) => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [activeTab, setActiveTab] = useState<"steps" | "dummy" | "tips" | "related">("steps");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tutorial, setTutorial] = useState<PageTutorialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>(pathname);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Super Admin state & actions
  const [isAdminUser, setIsAdminUser] = useState(Boolean(isSuperAdmin));
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      setIsAdminUser(true);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const rolesStr = localStorage.getItem("roles");
      let hasAdmin = false;
      if (rolesStr) {
        const parsed = JSON.parse(rolesStr);
        if (
          Array.isArray(parsed) &&
          parsed.some((r: string) =>
            ["super_admin", "superadmin", "super-admin"].includes(
              String(r).toLowerCase().trim()
            )
          )
        ) {
          hasAdmin = true;
        }
      }
      const singleRole = localStorage.getItem("role");
      if (
        singleRole &&
        ["super_admin", "superadmin", "super-admin"].includes(
          singleRole.toLowerCase().trim()
        )
      ) {
        hasAdmin = true;
      }
      if (
        window.location.pathname.startsWith("/superadmin") ||
        roleTitle === "Super Admin"
      ) {
        hasAdmin = true;
      }
      setIsAdminUser(hasAdmin);
    } catch {
      // ignore
    }
  }, [isSuperAdmin, roleTitle, pathname]);

  const roleKey = normalizeTutorialRole(roleTitle);
  const rolePages = ROLE_SIDEBAR_PAGES[roleKey] || [];

  // Current page metadata
  const currentNormalizedPath = normalizePath(pathname);
  const currentPageMeta = rolePages.find(
    (p) => normalizePath(p.href) === currentNormalizedPath
  );
  const currentPageTitle = currentPageMeta?.title || formatTitleFromPath(pathname);

  const loadTutorial = useCallback(
    async (path: string) => {
      setLoading(true);
      try {
        const data = await fetchTutorialByPath(path, roleKey);
        setTutorial(data);
      } catch {
        setTutorial(getDefaultTutorial(roleKey, path));
      } finally {
        setLoading(false);
      }
    },
    [roleKey]
  );

  // Whenever the drawer opens or pathname changes, load the corresponding tutorial
  useEffect(() => {
    setSelectedRoute(pathname);
    setCurrentStepIndex(0);
    if (isOpen) {
      loadTutorial(pathname);
    }
  }, [isOpen, pathname, loadTutorial]);

  // Auto-scroll to active step card smoothly
  useEffect(() => {
    if (isOpen && activeTab === "steps" && stepRefs.current[currentStepIndex]) {
      stepRefs.current[currentStepIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentStepIndex, activeTab, isOpen]);

  // Prevent background scrolling while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key to close drawer or video modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isVideoModalOpen) {
          setIsVideoModalOpen(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isVideoModalOpen]);

  const handleSelectOtherRoute = (newPath: string) => {
    setSelectedRoute(newPath);
    setCurrentStepIndex(0);
    setActiveTab("steps");
    loadTutorial(newPath);
  };

  const handleCopySample = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    toast.success("Sample value copied to clipboard!", {
      description: text,
    });
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Super Admin: Delete video tutorial section from this particular page
  const handleDeleteVideo = async () => {
    if (!tutorial) return;
    const targetPath = tutorial?.route_path || selectedRoute;
    if (!window.confirm(`Are you sure you want to delete the video tutorial section from ${targetPath}?`)) {
      return;
    }

    setIsDeletingVideo(true);
    try {
      const payload: Partial<PageTutorialData> = {
        ...tutorial,
        role: roleKey,
        route_path: targetPath,
        show_video: false,
        video_url: "",
      };
      const saved = await saveTutorial(payload);
      setTutorial({
        ...tutorial,
        ...saved,
        show_video: false,
        video_url: "",
      });
      toast.success("Video section deleted from this page!", {
        description: `Video tutorial removed from ${targetPath}.`,
      });
    } catch (err: any) {
      console.error("Failed to delete video section:", err);
      toast.error("Failed to delete video section", {
        description: err.message || "Please try again.",
      });
    } finally {
      setIsDeletingVideo(false);
    }
  };

  // Super Admin: Add or update video tutorial URL for this particular page
  const handleSaveVideo = async () => {
    if (!newVideoUrl.trim()) {
      toast.error("Please enter a valid video URL");
      return;
    }
    if (!tutorial) return;

    setIsSavingVideo(true);
    try {
      const targetPath = tutorial?.route_path || selectedRoute;
      const payload: Partial<PageTutorialData> = {
        ...tutorial,
        role: roleKey,
        route_path: targetPath,
        show_video: true,
        video_url: newVideoUrl.trim(),
      };
      const saved = await saveTutorial(payload);
      setTutorial({
        ...tutorial,
        ...saved,
        show_video: true,
        video_url: newVideoUrl.trim(),
      });
      setIsAddingVideo(false);
      setNewVideoUrl("");
      toast.success("Video section updated for this page!", {
        description: `The video is now live on ${targetPath}.`,
      });
    } catch (err: any) {
      console.error("Failed to save video:", err);
      toast.error("Failed to save video URL", {
        description: err.message || "Please try again.",
      });
    } finally {
      setIsSavingVideo(false);
    }
  };

  const stepsList = tutorial?.steps || [];
  const totalSteps = Math.max(1, stepsList.length);
  const progressPercentage = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  const handleNextStep = () => {
    if (currentStepIndex >= totalSteps - 1) {
      toast.success("Tutorial completed!", {
        description: `You've completed the walkthrough for ${tutorial?.title || currentPageTitle}.`,
      });
      setIsOpen(false);
    } else {
      setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  // Helper to extract embeddable YouTube / Vimeo URL
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes("youtube.com/watch")) {
        const id = new URL(url).searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : url;
      }
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : url;
      }
      if (url.includes("vimeo.com/")) {
        const id = url.split("vimeo.com/")[1]?.split("?")[0];
        return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : url;
      }
      return url;
    } catch {
      return url;
    }
  };

  const embedVideoUrl = tutorial?.video_url ? getEmbedUrl(tutorial.video_url) : null;

  // Icon for page header illustration based on path/title
  const getHeaderIcon = () => {
    const p = (tutorial?.route_path || selectedRoute).toLowerCase();
    if (p.includes("certificat")) {
      return (
        <div className="relative flex items-center justify-center">
          <Award className="h-6 w-6 stroke-[2.2] text-[#2563EB]" />
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2563EB] text-white ring-2 ring-white">
            <Check className="h-2 w-2 stroke-[3]" />
          </span>
        </div>
      );
    }
    if (p.includes("librar")) return <BookOpen className="h-6 w-6 stroke-[2.2] text-[#2563EB]" />;
    if (p.includes("fee") || p.includes("ledger") || p.includes("salary")) return <FileSpreadsheet className="h-6 w-6 stroke-[2.2] text-[#2563EB]" />;
    if (p.includes("inventor") || p.includes("item")) return <Layers className="h-6 w-6 stroke-[2.2] text-[#2563EB]" />;
    return <FileText className="h-6 w-6 stroke-[2.2] text-[#2563EB]" />;
  };

  return (
    <>
      {/* ─── Circular (i) Header Trigger Button ─────────────────────── */}
      <button
        type="button"
        onClick={() => {
          setSelectedRoute(pathname);
          setIsOpen(true);
        }}
        aria-label="Open Page Tutorial Drawer"
        title="Need Help? Click for step-by-step guidance & dummy data"
        className={`group relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-sky-50 text-[#2563EB] shadow-xs transition-all duration-200 hover:scale-105 hover:border-[#2563EB] hover:shadow-md hover:shadow-blue-500/15 active:scale-95 ${className}`}
      >
        <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#2563EB]/10 transition-colors group-hover:bg-[#2563EB] group-hover:text-white">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full bg-amber-400 text-[7px] sm:text-[8px] font-black text-amber-950 shadow-xs ring-1.5 sm:ring-2 ring-white">
          ?
        </span>
      </button>

      {/* ─── Right-Side Slide-Over Tutorial Drawer (Portaled to document.body) ── */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[99999] overflow-hidden">
                {/* Backdrop with subtle blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
                  aria-hidden="true"
                />

                {/* Slide-in Drawer Container */}
                <div className="fixed inset-y-0 right-0 w-full sm:w-auto sm:max-w-[610px] flex justify-end pointer-events-none">
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 280 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:w-[610px] bg-white shadow-2xl flex flex-col h-full sm:rounded-l-3xl border-l border-slate-200/80 overflow-hidden relative z-10 pointer-events-auto"
                  >
                    {/* ─── 1. Header Design ───────────────────────────────── */}
                    <div className="bg-white border-b border-[#E2E8F0] p-3.5 sm:p-6 pb-3 sm:pb-5 shrink-0">
                      {/* Top Header Row: Badges, Studio Link & Close Button */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] whitespace-nowrap">
                            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#2563EB] shrink-0" />
                            <span>{roleTitle ? `${roleTitle} Guide` : "Guide"}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Super Admin Quick Link to Edit Content & Videos in Studio (Rendered only for Super Admin) */}
                          {isAdminUser && (
                            <Link
                              href={`/superadmin/tutorials?role=${encodeURIComponent(roleKey)}&path=${encodeURIComponent(tutorial?.route_path || selectedRoute)}`}
                              onClick={() => setIsOpen(false)}
                              title="Super Admin: Edit this guide & tutorial video in Studio"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-colors shadow-2xs cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-[#2563EB]" />
                              <span className="hidden min-[380px]:inline">Edit</span>
                              <span className="hidden sm:inline"> in Studio</span>
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                            title="Close Drawer (Esc)"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Middle Header Row: Illustration + Title + Subtitle */}
                      <div className="flex items-start gap-2.5 sm:gap-4 mt-3 sm:mt-4">
                        <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] shrink-0 shadow-2xs [&>svg]:w-4.5 [&>svg]:h-4.5 sm:[&>svg]:w-6 sm:[&>svg]:h-6">
                          {getHeaderIcon()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm sm:text-lg font-bold text-[#111B35] tracking-tight leading-snug">
                            {tutorial?.title || `${currentPageTitle} Desk`}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-[#475569] leading-relaxed mt-1 line-clamp-2 sm:line-clamp-none">
                            {tutorial?.summary ||
                              `Generate, verify, and manage official records and actions for ${currentPageTitle}.`}
                          </p>
                        </div>
                      </div>
                    </div>

                {/* ─── 2. Tutorial Navigation Tabs ────────────────────── */}
                <div className="flex items-center gap-2 sm:gap-6 px-3 sm:px-6 bg-white border-b border-[#E2E8F0] overflow-x-auto no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("steps")}
                    className={`py-2.5 sm:py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      activeTab === "steps"
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Steps</span>
                    <span className="hidden min-[380px]:inline">Guide</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("dummy")}
                    className={`py-2.5 sm:py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      activeTab === "dummy"
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Table className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Sample Data</span>
                    {tutorial?.dummy_data && tutorial.dummy_data.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-bold">
                        {tutorial.dummy_data.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("tips")}
                    className={`py-2.5 sm:py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      activeTab === "tips"
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Tips</span>
                    {tutorial?.tips && tutorial.tips.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-bold">
                        {tutorial.tips.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("related")}
                    className={`py-2.5 sm:py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      activeTab === "related"
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Related</span>
                  </button>
                </div>

                {/* ─── 3. Scrollable Content Body ─────────────────────── */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-white pb-28 sm:pb-32">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
                      <p className="text-xs font-semibold">Loading tutorial...</p>
                    </div>
                  ) : (
                    <>
                      {/* ─── TAB 1: STEP-BY-STEP GUIDE ────────────────── */}
                      {activeTab === "steps" && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                          {/* Top Video Tutorial Card (Rendered if video is enabled & configured) */}
                          {tutorial?.show_video !== false && Boolean(tutorial?.video_url && tutorial.video_url.trim()) ? (
                            <div className="bg-[#F8FAFC] border border-[#DBEAFE] rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col gap-3 relative overflow-hidden group shadow-2xs">
                              {/* Super Admin Quick Control Toolbar */}
                              {isAdminUser && (
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#DBEAFE]/90">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#DBEAFE] text-[#2563EB]">
                                      Super Admin
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                                      Video Section
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleDeleteVideo}
                                      disabled={isDeletingVideo}
                                      title="Delete video tutorial and remove this section from this particular page"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                                    >
                                      {isDeletingVideo ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      )}
                                      <span className="hidden min-[380px]:inline">Delete Video Section</span>
                                      <span className="min-[380px]:hidden">Delete</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                                {/* Left Side: Thumbnail Preview */}
                                <div
                                  onClick={() => {
                                    if (embedVideoUrl) {
                                      setIsVideoModalOpen(true);
                                    }
                                  }}
                                  className="w-full sm:w-44 h-24 sm:h-28 rounded-xl overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative shrink-0 shadow-sm border border-[#DBEAFE] flex items-center justify-center group cursor-pointer"
                                >
                                  {/* Decorative Mini Mockup in thumbnail */}
                                  <div className="absolute inset-2 rounded-lg border border-white/10 bg-white/5 p-2 flex flex-col justify-between pointer-events-none">
                                    <div className="flex items-center justify-between">
                                      <div className="h-1.5 w-12 rounded-full bg-white/30" />
                                      <div className="h-2 w-2 rounded-full bg-blue-400/60" />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="h-1 w-20 rounded-full bg-white/20" />
                                      <div className="h-1 w-16 rounded-full bg-white/15" />
                                    </div>
                                  </div>

                                  {/* Centered Play Button */}
                                  <div className="relative z-10 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/95 shadow-md flex items-center justify-center text-[#2563EB] group-hover:scale-110 transition-transform">
                                    <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current ml-0.5" />
                                  </div>

                                  {/* Duration Badge */}
                                  <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                    03:45
                                  </span>
                                </div>

                                {/* Right Side: Heading, Description & CTA */}
                                <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                                  <h3 className="text-xs sm:text-base font-bold text-[#111B35]">
                                    Watch Full Tutorial
                                  </h3>
                                  <p className="text-[11px] sm:text-xs text-[#475569] leading-relaxed">
                                    Learn how to perform official actions, verify data, and navigate {tutorial?.title || currentPageTitle} in under 4 minutes.
                                  </p>
                                  <div className="pt-1 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                    <button
                                      type="button"
                                      onClick={() => setIsVideoModalOpen(true)}
                                      className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                      <span>Play Tutorial (3:45)</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* When video is deleted or disabled, Super Admin can see an option to restore/add a video to this page */
                            isAdminUser && (
                              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-xs transition-all shadow-2xs">
                                {!isAddingVideo ? (
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-slate-600 min-w-0">
                                      <div className="h-8 w-8 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-500 shrink-0">
                                        <Video className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800 text-xs">
                                          Video Section Deleted / Disabled
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                          Super Admin: This page currently has no video tutorial card.
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsAddingVideo(true);
                                        setNewVideoUrl(tutorial?.video_url || "");
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-colors shrink-0 shadow-2xs cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Add Video Section</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                        <Video className="w-4 h-4 text-[#2563EB]" />
                                        Add Tutorial Video for {tutorial?.route_path || selectedRoute}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setIsAddingVideo(false)}
                                        className="text-slate-400 hover:text-slate-600 p-1"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                      Paste a YouTube, Vimeo, or MP4 URL. This will immediately display the video tutorial section on this particular page.
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={newVideoUrl}
                                        onChange={(e) => setNewVideoUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-[#2563EB]/30 bg-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleSaveVideo}
                                        disabled={isSavingVideo || !newVideoUrl.trim()}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                                      >
                                        {isSavingVideo ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Save className="w-3.5 h-3.5" />
                                        )}
                                        <span>Save Video</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setIsAddingVideo(false)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          )}

                          {/* Connected Step-by-Step Cards */}
                          <div className="space-y-4 sm:space-y-6 pt-1">
                            {stepsList.map((st: TutorialStep, idx: number) => {
                              const stepNumber = st.step || idx + 1;
                              const isActive = currentStepIndex === idx;

                              return (
                                <div
                                  key={idx}
                                  ref={(el) => {
                                    stepRefs.current[idx] = el;
                                  }}
                                  className="flex items-start gap-2 sm:gap-4 group"
                                >
                                  {/* Left Vertical Progress Line & Badge */}
                                  <div className="flex flex-col items-center shrink-0 self-stretch">
                                    <div
                                      onClick={() => setCurrentStepIndex(idx)}
                                      className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                                        isActive
                                          ? "bg-[#2563EB] text-white ring-2 sm:ring-4 ring-[#2563EB]/20"
                                          : currentStepIndex > idx
                                          ? "bg-[#2563EB] text-white"
                                          : "bg-slate-100 text-slate-500 border border-slate-300"
                                      }`}
                                    >
                                      {stepNumber}
                                    </div>
                                    {idx < stepsList.length - 1 && (
                                      <div
                                        className={`w-0.5 flex-1 my-1.5 sm:my-2 transition-colors ${
                                          currentStepIndex > idx ? "bg-[#2563EB]" : "bg-slate-200"
                                        }`}
                                      />
                                    )}
                                  </div>

                                  {/* Right Content Card */}
                                  <div
                                    onClick={() => setCurrentStepIndex(idx)}
                                    className={`flex-1 min-w-0 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border transition-all ${
                                      isActive
                                        ? "border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]/10"
                                        : "border-[#E2E8F0] shadow-2xs hover:border-slate-300"
                                    }`}
                                  >
                                    {/* Card Header: Step Title + Reading Time */}
                                    <div className="flex flex-col min-[340px]:flex-row min-[340px]:items-baseline justify-between gap-1 sm:gap-2">
                                      <h4 className="font-bold text-[#111B35] text-xs sm:text-sm leading-snug break-words">
                                        Step {stepNumber} — {st.title.replace(/^Step\s*\d+[:.—]?\s*/i, "")}
                                      </h4>
                                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap shrink-0 flex items-center gap-1 self-start min-[340px]:self-auto">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        {st.reading_time || (idx === 1 ? "2 min read" : "1 min read")}
                                      </span>
                                    </div>

                                    {/* Step Description */}
                                    <p className="text-[11px] sm:text-xs text-[#475569] leading-relaxed mt-1.5 break-words">
                                      {st.description}
                                    </p>

                                    {/* Contextual Panel: Soft Amber Example Panel */}
                                    {st.dummy_example && (
                                      <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs">
                                        <span className="text-[#92400E] font-bold uppercase text-[9px] sm:text-[10px] tracking-wider block mb-1">
                                          Example
                                        </span>
                                        <div className="font-mono text-[11px] sm:text-xs font-semibold text-[#78350F] bg-white/90 p-1.5 sm:p-2 rounded-md sm:rounded-lg border border-[#FDE68A]/70 flex items-center justify-between gap-2 shadow-2xs">
                                          <span className="break-all min-w-0">{st.dummy_example}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCopySample(st.dummy_example || "", `step-${idx}`);
                                            }}
                                            className="text-[#92400E] hover:text-[#78350F] p-1 rounded hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
                                            title="Copy example"
                                          >
                                            {copiedIndex === `step-${idx}` ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Contextual Panel: Light-Blue Checklist Panel */}
                                    {st.checklist && st.checklist.length > 0 && (
                                      <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] sm:text-xs space-y-1">
                                        <span className="text-[#1E40AF] font-bold uppercase text-[9px] sm:text-[10px] tracking-wider block mb-1">
                                          Verification Checklist
                                        </span>
                                        {st.checklist.map((item: string, cIdx: number) => (
                                          <div key={cIdx} className="flex items-start gap-1.5 text-[#1E40AF]">
                                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 text-[#2563EB]" />
                                            <span className="leading-snug break-words">{item}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Contextual Panel: Light-Green Options Panel */}
                                    {st.options && st.options.length > 0 && (
                                      <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[11px] sm:text-xs space-y-1">
                                        <span className="text-[#166534] font-bold uppercase text-[9px] sm:text-[10px] tracking-wider block mb-1">
                                          Available Actions
                                        </span>
                                        {st.options.map((opt: string, oIdx: number) => (
                                          <div key={oIdx} className="flex items-start gap-1.5 text-[#166534]">
                                            <span className="text-[#16A34A] font-bold shrink-0">•</span>
                                            <span className="leading-snug break-words">{opt}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ─── TAB 2: SAMPLE DUMMY DATA ─────────────────── */}
                      {activeTab === "dummy" && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569] flex items-center justify-between">
                            <span>Reference formatted values for fields on this screen.</span>
                            <span className="text-[11px] font-bold text-[#2563EB]">One-Click Copy</span>
                          </div>

                          {tutorial?.dummy_data && tutorial.dummy_data.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {tutorial.dummy_data.map((item, idx) => {
                                const isCopied = copiedIndex === `dummy-${idx}`;

                                return (
                                  <div
                                    key={idx}
                                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2 sm:space-y-2.5 transition-all hover:border-[#2563EB]/40"
                                  >
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 sm:pb-2">
                                      <span className="font-bold text-xs text-[#111B35]">
                                        {item.field}
                                      </span>
                                      <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[9px] sm:text-[10px] font-bold">
                                        Sample
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[11px] sm:text-xs font-semibold text-[#111B35] break-all select-all">
                                        {item.sample_value}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopySample(item.sample_value, `dummy-${idx}`)}
                                        className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                                          isCopied
                                            ? "bg-emerald-600 text-white border-emerald-600"
                                            : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                                        }`}
                                        title="Copy value"
                                      >
                                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>

                                    {item.instructions && (
                                      <p className="text-[10px] sm:text-[11px] text-[#475569] leading-normal">
                                        <span className="font-semibold text-slate-700">Tip:</span> {item.instructions}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-400 text-xs">
                              No specific dummy values defined for this screen.
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─── TAB 3: PRO TIPS ──────────────────────────── */}
                      {activeTab === "tips" && (
                        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-150">
                          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 flex items-center gap-2">
                            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                            <span>Recommended operational tips and shortcuts for this desk.</span>
                          </div>

                          {tutorial?.tips && tutorial.tips.length > 0 ? (
                            <div className="space-y-2 sm:space-y-2.5">
                              {tutorial.tips.map((tip, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-[#E2E8F0] text-xs sm:text-sm text-[#475569] shadow-2xs"
                                >
                                  <span className="flex h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] sm:text-xs font-black">
                                    ✓
                                  </span>
                                  <span className="leading-relaxed">{tip}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-400 text-xs">
                              No pro tips defined for this screen.
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─── TAB 4: RELATED GUIDES ────────────────────── */}
                      {activeTab === "related" && (
                        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-150">
                          <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-950 flex items-center justify-between">
                            <span>Explore related desks and workflows for your role.</span>
                            <span className="font-bold text-[#2563EB]">{rolePages.length} Desks</span>
                          </div>

                          <div className="space-y-2 sm:space-y-2.5">
                            {rolePages.map((p) => {
                              const isCurrent = normalizePath(p.href) === normalizePath(selectedRoute);

                              return (
                                <div
                                  key={p.href}
                                  onClick={() => handleSelectOtherRoute(p.href)}
                                  className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                                    isCurrent
                                      ? "bg-[#EFF6FF] border-[#2563EB] shadow-xs"
                                      : "bg-white border-[#E2E8F0] hover:border-slate-300"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs sm:text-sm text-[#111B35]">
                                        {p.title}
                                      </span>
                                      {p.category && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 uppercase">
                                          {p.category}
                                        </span>
                                      )}
                                      {isCurrent && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#2563EB] text-white">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#475569] truncate">
                                      {p.description}
                                    </p>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {p.href}
                                    </span>
                                  </div>

                                  <ChevronRight
                                    className={`w-4 h-4 shrink-0 transition-transform ${
                                      isCurrent
                                        ? "text-[#2563EB] translate-x-0.5"
                                        : "text-slate-300 group-hover:text-slate-600"
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ─── 4. Sticky Bottom Footer ────────────────────────── */}
                <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] p-2.5 sm:p-4 px-3 sm:px-6 z-20 flex items-center justify-between shrink-0 shadow-xs gap-2">
                  {/* Previous Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentStepIndex === 0}
                    onClick={handlePrevStep}
                    className="h-8 sm:h-9 px-2 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-0.5 sm:mr-1 shrink-0" />
                    <span className="hidden min-[340px]:inline">Previous</span>
                    <span className="min-[340px]:hidden">Prev</span>
                  </Button>

                  {/* Step X of Y Indicator & Horizontal Progress Bar */}
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-[#111B35] whitespace-nowrap">
                      Step {currentStepIndex + 1} of {totalSteps}
                    </span>
                    <div className="w-14 sm:w-28 h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#2563EB] transition-all duration-300 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Next / Finish Button */}
                  <Button
                    size="sm"
                    onClick={handleNextStep}
                    className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-lg sm:rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] sm:text-xs font-semibold shadow-xs cursor-pointer shrink-0"
                  >
                    {currentStepIndex >= totalSteps - 1 ? (
                      <>
                        <span className="hidden min-[340px]:inline">Finish Guide</span>
                        <span className="min-[340px]:hidden">Done</span>
                        <Check className="w-3.5 h-3.5 ml-1 shrink-0" />
                      </>
                    ) : (
                      <>
                        <span className="hidden min-[340px]:inline">Next Step</span>
                        <span className="min-[340px]:hidden">Next</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 shrink-0" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

  {/* ─── Video Player Modal (Portaled to document.body) ─────────────── */}
  {mounted &&
    isVideoModalOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsVideoModalOpen(false)}
      >
        <div
          className="relative w-full max-w-3xl rounded-2xl bg-black overflow-hidden shadow-2xl border border-white/20 aspect-video"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsVideoModalOpen(false)}
            className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/90 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {embedVideoUrl ? (
            <iframe
              src={embedVideoUrl}
              title="Tutorial Video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center space-y-3">
              <PlayCircle className="w-12 h-12 text-[#2563EB]" />
              <p className="text-base font-bold">Video Walkthrough</p>
              <p className="text-xs text-slate-400 max-w-md">
                A video tutorial is in production for this screen. Review the step-by-step cards and sample dummy values in the drawer for instant guidance.
              </p>
            </div>
          )}
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

function formatTitleFromPath(path: string): string {
  const lastPart = path.split("/").filter(Boolean).pop() || "Workspace";
  return lastPart
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
