"use client";

import React, { useState, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  Info,
  X,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Lightbulb,
  Table,
  ExternalLink,
  Search,
  Sparkles,
  ChevronRight,
  HelpCircle,
  FileText,
  Loader2,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  fetchTutorialByPath,
  PageTutorialData,
  ROLE_SIDEBAR_PAGES,
  normalizeTutorialRole,
  normalizePath,
  getDefaultTutorial,
} from "@/lib/tutorial";
import { Button } from "@/components/ui/button";

interface PageTutorialDialogProps {
  roleTitle?: string;
  className?: string;
}

export const PageTutorialDialog: React.FC<PageTutorialDialogProps> = ({
  roleTitle,
  className = "",
}) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "dummy" | "video" | "tips">("steps");
  const [tutorial, setTutorial] = useState<PageTutorialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>(pathname);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  const roleKey = normalizeTutorialRole(roleTitle);
  const rolePages = ROLE_SIDEBAR_PAGES[roleKey] || [];

  // Allowed roles check
  const isAllowedRole = ["CLERK", "PRINCIPAL", "TEACHER", "TRUSTEE", "FEES", "INVENTORY"].includes(roleKey);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedRoute(pathname);
    loadTutorial(pathname);
  }, [isOpen, pathname]);

  const loadTutorial = async (path: string) => {
    setLoading(true);
    try {
      const data = await fetchTutorialByPath(path, roleKey);
      setTutorial(data);
    } catch {
      setTutorial(getDefaultTutorial(roleKey, path));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOtherRoute = (newPath: string) => {
    setSelectedRoute(newPath);
    loadTutorial(newPath);
  };

  if (!isAllowedRole) {
    return null;
  }

  // Filter routes for search dropdown
  const filteredRoutes = rolePages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helper to extract embeddable YouTube / Vimeo URL
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes("youtube.com/watch")) {
        const id = new URL(url).searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
      }
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
      }
      if (url.includes("vimeo.com/")) {
        const id = url.split("vimeo.com/")[1]?.split("?")[0];
        return id ? `https://player.vimeo.com/video/${id}` : url;
      }
      return url;
    } catch {
      return url;
    }
  };

  const embedVideoUrl = tutorial?.video_url ? getEmbedUrl(tutorial.video_url) : null;

  return (
    <>
      {/* ─── Circular (i) Button in Header ──────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Page Tutorial and Step-by-Step Guide"
        title="Need Help? Click for step-by-step guidance & dummy data"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-[#5826df] shadow-xs transition-all duration-200 hover:scale-105 hover:border-[#5826df] hover:shadow-md hover:shadow-indigo-500/15 active:scale-95 ${className}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5826df]/10 transition-colors group-hover:bg-[#5826df] group-hover:text-white">
          <Info className="h-4 w-4 stroke-[2.5]" />
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-amber-950 shadow-xs ring-2 ring-white">
          ?
        </span>
      </button>

      {/* ─── Tutorial Modal Overlay ─────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 md:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white border-b border-white/10">
              <div className="space-y-1.5 min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 text-amber-300 border border-white/10 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    {roleTitle || "Staff"} Guide
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-black/40 text-purple-200 border border-white/10">
                    {tutorial?.route_path || selectedRoute}
                  </span>
                  {tutorial?.updated_by_name && (
                    <span className="text-[10px] text-slate-300 hidden sm:inline">
                      • Managed by Super Admin
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
                  {tutorial?.title || "Page Walkthrough & Instructions"}
                </h2>
                <p className="text-xs sm:text-sm text-purple-100/80 line-clamp-2 leading-relaxed">
                  {tutorial?.summary || "Simple step-by-step instructions and example dummy values to guide you on this screen."}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                title="Close Tutorial"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-Header: Jump / Search other pages */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-indigo-50/70 border-b border-indigo-100/80 text-xs text-slate-700">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-slate-500 font-semibold">Viewing Guide for:</span>
                <span className="font-bold text-[#5826df] bg-white px-2.5 py-1 rounded-lg border border-indigo-200/80 shadow-2xs">
                  {rolePages.find((p) => normalizePath(p.href) === normalizePath(selectedRoute))?.title || selectedRoute}
                </span>
              </div>

              {/* Select another screen */}
              {rolePages.length > 0 && (
                <div className="relative flex items-center">
                  <select
                    value={selectedRoute}
                    onChange={(e) => handleSelectOtherRoute(e.target.value)}
                    aria-label="Switch page tutorial"
                    className="pl-3 pr-8 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:ring-2 focus:ring-[#5826df]/30 cursor-pointer"
                  >
                    <option value={pathname}>📌 Current Page ({rolePages.find((p) => normalizePath(p.href) === normalizePath(pathname))?.title || "Current"})</option>
                    {rolePages.map((p) => (
                      <option key={p.href} value={p.href}>
                        {p.category ? `[${p.category}] ` : ""}{p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 px-5 pt-3 bg-white border-b border-slate-200/80 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("steps")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 ${
                  activeTab === "steps"
                    ? "border-[#5826df] text-[#5826df] bg-indigo-50/60"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#5826df]" />
                <span>1. Step-by-Step Guide</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-[#5826df] text-[10px] font-bold">
                  {tutorial?.steps?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("dummy")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 ${
                  activeTab === "dummy"
                    ? "border-[#5826df] text-[#5826df] bg-indigo-50/60"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Table className="w-4 h-4 text-emerald-600" />
                <span>2. Dummy & Sample Data</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {tutorial?.dummy_data?.length || 0}
                </span>
              </button>

              {tutorial?.video_url && (
                <button
                  type="button"
                  onClick={() => setActiveTab("video")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 ${
                    activeTab === "video"
                      ? "border-[#5826df] text-[#5826df] bg-indigo-50/60"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <PlayCircle className="w-4 h-4 text-rose-600" />
                  <span>3. Video Tutorial</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                    Watch
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("tips")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 ${
                  activeTab === "tips"
                    ? "border-[#5826df] text-[#5826df] bg-indigo-50/60"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Pro Tips & Notes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {tutorial?.tips?.length || 0}
                </span>
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-slate-50/50 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5826df]" />
                  <p className="text-xs font-semibold">Loading page tutorial...</p>
                </div>
              ) : (
                <>
                  {/* ─── TAB 1: STEPS ─────────────────────────────────── */}
                  {activeTab === "steps" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-950 text-xs flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[#5826df] shrink-0" />
                        <div>
                          <p className="font-bold">Follow these easy steps sequentially:</p>
                          <p className="text-indigo-800/80">Each step guides you through what to click, what to fill, and how to verify your entries.</p>
                        </div>
                      </div>

                      {tutorial?.steps && tutorial.steps.length > 0 ? (
                        <div className="space-y-3">
                          {tutorial.steps.map((st, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5826df] to-[#7f4efb] text-white font-black text-sm shadow-sm shadow-indigo-600/30">
                                {st.step || idx + 1}
                              </div>
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                                  {st.title}
                                </h3>
                                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                                  {st.description}
                                </p>
                                {st.dummy_example && (
                                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs font-medium">
                                    <span className="font-bold text-amber-800 uppercase text-[10px] tracking-wide">
                                      Sample Example:
                                    </span>
                                    <span className="font-mono text-slate-800">{st.dummy_example}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                          <p className="text-sm font-semibold">No steps defined yet.</p>
                          <p className="text-xs mt-1">Super Admin can configure custom steps from the Tutorial Management panel.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── TAB 2: DUMMY & SAMPLE DATA ───────────────────── */}
                  {activeTab === "dummy" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-emerald-950 text-xs flex items-center gap-3">
                        <Table className="w-5 h-5 text-emerald-700 shrink-0" />
                        <div>
                          <p className="font-bold">Sample Dummy Values Reference:</p>
                          <p className="text-emerald-800/80">Refer to these formatted sample inputs when you are entering or testing student, fee, or exam records.</p>
                        </div>
                      </div>

                      {tutorial?.dummy_data && tutorial.dummy_data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {tutorial.dummy_data.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {item.field}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-bold">
                                  Sample Input
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 font-mono text-xs font-semibold text-indigo-950 break-all select-all">
                                {item.sample_value}
                              </div>
                              {item.instructions && (
                                <p className="text-[11px] text-slate-500 leading-normal">
                                  <span className="font-semibold text-slate-700">Tip:</span> {item.instructions}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                          <p className="text-sm font-semibold">No dummy data records added yet.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── TAB 3: VIDEO TUTORIAL ────────────────────────── */}
                  {activeTab === "video" && tutorial?.video_url && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video shadow-lg relative">
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
                            <PlayCircle className="w-12 h-12 text-rose-500" />
                            <p className="text-sm font-semibold">External Video Tutorial</p>
                            <a
                              href={tutorial.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open Video Tutorial in New Tab
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <span className="font-medium truncate max-w-md">
                          Video Link: <span className="font-mono text-[#5826df]">{tutorial.video_url}</span>
                        </span>
                        <a
                          href={tutorial.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-[#5826df] hover:underline"
                        >
                          Open Directly <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* ─── TAB 4: PRO TIPS ──────────────────────────────── */}
                  {activeTab === "tips" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 text-amber-950 text-xs flex items-center gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold">Important Notes & Best Practices:</p>
                          <p className="text-amber-800/80">Keep these key tips in mind to avoid common mistakes and speed up your daily work.</p>
                        </div>
                      </div>

                      {tutorial?.tips && tutorial.tips.length > 0 ? (
                        <div className="space-y-2.5">
                          {tutorial.tips.map((tip, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs md:text-sm text-slate-700 shadow-2xs"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                                ✓
                              </span>
                              <span className="leading-relaxed">{tip}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                          <p className="text-sm font-semibold">No specific tips added for this screen yet.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:px-6 bg-white border-t border-slate-200 text-xs">
              <div className="text-slate-500 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Still have questions? Reach out to support via the Support Helpdesk.</span>
              </div>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="bg-[#5826df] hover:bg-[#4a1ec6] text-white font-semibold rounded-xl px-5 h-9"
              >
                Got it, Thanks!
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
