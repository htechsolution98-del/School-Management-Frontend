"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  PlayCircle,
  Lightbulb,
  Table,
  ExternalLink,
  Search,
  ChevronRight,
  Layers,
  Eye,
  AlertCircle,
  HelpCircle,
  Video,
  ArrowUp,
  ArrowDown,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ROLE_SIDEBAR_PAGES,
  PageTutorialData,
  TutorialStep,
  TutorialDummyField,
  fetchAllTutorials,
  saveTutorial,
  deleteTutorial,
  getDefaultTutorial,
  normalizePath,
  normalizeTutorialRole,
  RolePageRoute,
} from "@/lib/tutorial";

const ROLES_LIST = [
  { key: "CLERK", label: "Clerk", color: "from-blue-600 to-cyan-600", badgeBg: "bg-blue-100 text-blue-800" },
  { key: "PRINCIPAL", label: "Principal", color: "from-purple-600 to-indigo-600", badgeBg: "bg-purple-100 text-purple-800" },
  { key: "TEACHER", label: "Teacher", color: "from-emerald-600 to-teal-600", badgeBg: "bg-emerald-100 text-emerald-800" },
  { key: "TRUSTEE", label: "Trustee", color: "from-amber-600 to-orange-600", badgeBg: "bg-amber-100 text-amber-800" },
  { key: "FEES", label: "Fees Management", color: "from-rose-600 to-pink-600", badgeBg: "bg-rose-100 text-rose-800" },
  { key: "INVENTORY", label: "Inventory", color: "from-violet-600 to-purple-600", badgeBg: "bg-violet-100 text-violet-800" },
];

export default function SuperAdminTutorialsPage() {
  const [selectedRole, setSelectedRole] = useState<string>("CLERK");
  const [selectedPath, setSelectedPath] = useState<string>("/clerk");
  const [searchFilter, setSearchFilter] = useState("");
  const [allSavedTutorials, setAllSavedTutorials] = useState<PageTutorialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [, startTransition] = useTransition();

  // Form State
  const [formData, setFormData] = useState<PageTutorialData>({
    role: "CLERK",
    route_path: "/clerk",
    title: "",
    summary: "",
    steps: [],
    dummy_data: [],
    video_url: "",
    tips: [],
  });

  // Fetch all custom tutorials from backend
  const loadTutorialsList = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTutorials("ALL");
      setAllSavedTutorials(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tutorials list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutorialsList();
  }, []);

  // When role changes, set selected path to the first page of that role
  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    const pages = ROLE_SIDEBAR_PAGES[newRole] || [];
    const firstPath = pages[0]?.href || `/${newRole.toLowerCase()}`;
    setSelectedPath(firstPath);
    loadPageData(newRole, firstPath);
  };

  // When selected route changes, populate form with either saved tutorial or rich default fallback
  const loadPageData = (roleKey: string, path: string) => {
    const normPath = normalizePath(path);
    const saved = allSavedTutorials.find(
      (t) => normalizeTutorialRole(t.role) === roleKey && normalizePath(t.route_path) === normPath
    );

    if (saved) {
      setFormData({
        ...saved,
        steps: Array.isArray(saved.steps) ? [...saved.steps] : [],
        dummy_data: Array.isArray(saved.dummy_data) ? [...saved.dummy_data] : [],
        tips: Array.isArray(saved.tips) ? [...saved.tips] : [],
      });
    } else {
      const def = getDefaultTutorial(roleKey, normPath);
      setFormData({
        ...def,
        id: undefined,
        role: roleKey,
        route_path: normPath,
        steps: [...def.steps],
        dummy_data: [...def.dummy_data],
        tips: [...def.tips],
      });
    }
  };

  // Re-sync form data when allSavedTutorials or selectedPath changes
  useEffect(() => {
    loadPageData(selectedRole, selectedPath);
  }, [selectedRole, selectedPath, allSavedTutorials]);

  const currentRolePages = ROLE_SIDEBAR_PAGES[selectedRole] || [];

  const filteredPages = currentRolePages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.href.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  // Check if a page has custom saved tutorial
  const isCustomSaved = (path: string) => {
    const normPath = normalizePath(path);
    return allSavedTutorials.some(
      (t) => normalizeTutorialRole(t.role) === selectedRole && normalizePath(t.route_path) === normPath
    );
  };

  // ─── Step Actions ──────────────────────────────────────────────────────────
  const handleAddStep = () => {
    const nextNum = (formData.steps?.length || 0) + 1;
    const newStep: TutorialStep = {
      step: nextNum,
      title: `Step ${nextNum}: New Action`,
      description: "Describe what the user should do on this step.",
      dummy_example: "",
    };
    setFormData((prev) => ({
      ...prev,
      steps: [...(prev.steps || []), newStep],
    }));
  };

  const handleUpdateStep = (index: number, field: keyof TutorialStep, val: any) => {
    setFormData((prev) => {
      const copy = [...(prev.steps || [])];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, steps: copy };
    });
  };

  const handleDeleteStep = (index: number) => {
    setFormData((prev) => {
      const copy = (prev.steps || []).filter((_, i) => i !== index);
      // Re-index steps
      const reindexed = copy.map((st, i) => ({ ...st, step: i + 1 }));
      return { ...prev, steps: reindexed };
    });
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    setFormData((prev) => {
      const copy = [...(prev.steps || [])];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      const reindexed = copy.map((st, i) => ({ ...st, step: i + 1 }));
      return { ...prev, steps: reindexed };
    });
  };

  // ─── Dummy Data Actions ───────────────────────────────────────────────────
  const handleAddDummyField = () => {
    const newField: TutorialDummyField = {
      field: "New Field Name",
      sample_value: "Example Sample Value",
      instructions: "Instructions on format or requirements.",
    };
    setFormData((prev) => ({
      ...prev,
      dummy_data: [...(prev.dummy_data || []), newField],
    }));
  };

  const handleUpdateDummyField = (index: number, field: keyof TutorialDummyField, val: string) => {
    setFormData((prev) => {
      const copy = [...(prev.dummy_data || [])];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, dummy_data: copy };
    });
  };

  const handleDeleteDummyField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      dummy_data: (prev.dummy_data || []).filter((_, i) => i !== index),
    }));
  };

  // ─── Pro Tips Actions ─────────────────────────────────────────────────────
  const handleAddTip = () => {
    setFormData((prev) => ({
      ...prev,
      tips: [...(prev.tips || []), "Add a useful tip or reminder for this page."],
    }));
  };

  const handleUpdateTip = (index: number, val: string) => {
    setFormData((prev) => {
      const copy = [...(prev.tips || [])];
      copy[index] = val;
      return { ...prev, tips: copy };
    });
  };

  const handleDeleteTip = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tips: (prev.tips || []).filter((_, i) => i !== index),
    }));
  };

  // ─── Save & Delete Handlers ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a tutorial title");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveTutorial({
        ...formData,
        role: selectedRole,
        route_path: selectedPath,
      });

      toast.success("Page tutorial saved successfully!", {
        description: `Updated walkthrough for ${formData.title}`,
      });

      // Refresh list
      await loadTutorialsList();
    } catch (err: any) {
      console.error(err);
      toast.error("Error saving tutorial", {
        description: err.message || "Failed to save tutorial",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrReset = async () => {
    if (!formData.id) {
      // Revert to system default
      const def = getDefaultTutorial(selectedRole, selectedPath);
      setFormData({
        ...def,
        id: undefined,
        role: selectedRole,
        route_path: selectedPath,
      });
      toast.info("Form reset to system default template.");
      return;
    }

    if (!confirm("Are you sure you want to delete this custom tutorial? It will revert to the system default guide.")) {
      return;
    }

    setDeleting(true);
    try {
      const ok = await deleteTutorial(formData.id);
      if (ok) {
        toast.success("Custom tutorial deleted. Reverted to default.");
        await loadTutorialsList();
      } else {
        toast.error("Failed to delete tutorial");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting tutorial");
    } finally {
      setDeleting(false);
    }
  };

  // Embed URL helper
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

  const currentRouteMeta = currentRolePages.find((p) => normalizePath(p.href) === normalizePath(selectedPath));

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden bg-slate-50">
      {/* ─── Top Studio Header ────────────────────────────────────────── */}
      <div className="flex-none p-4 md:px-6 bg-white border-b border-slate-200 shadow-2xs z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5826df] to-[#7f4efb] text-white shadow-md shadow-indigo-600/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Page Tutorial & Guidance Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5826df] text-[10px] font-extrabold uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Create and manage step-by-step instructions, sample dummy values, and tutorial video links for every role page.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "edit"
                    ? "bg-white text-[#5826df] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Visual Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "preview"
                    ? "bg-white text-[#5826df] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteOrReset}
              disabled={saving || deleting}
              className="h-9 rounded-xl border-slate-300 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
              title={formData.id ? "Delete custom tutorial and revert to default" : "Reset form to default template"}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1.5" />
              )}
              {formData.id ? "Delete & Reset" : "Reset Default"}
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || deleting}
              className="h-9 rounded-xl bg-[#5826df] hover:bg-[#4a1ec6] text-white font-bold text-xs shadow-sm shadow-indigo-600/30 px-4"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save Tutorial
            </Button>
          </div>
        </div>

        {/* ─── Role Filter Tabs Bar ───────────────────────────────────── */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0 mr-1">
            Filter by Role:
          </span>
          {ROLES_LIST.map((r) => {
            const isSelected = selectedRole === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => handleRoleChange(r.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-[#5826df] text-white shadow-sm shadow-indigo-600/25 ring-2 ring-[#5826df]/30"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                }`}
              >
                <span>{r.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600"
                  }`}
                >
                  {(ROLE_SIDEBAR_PAGES[r.key] || []).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Two-Column Layout ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Role Sidebar Pages Tree */}
        <div className="w-80 lg:w-96 flex flex-col bg-white border-r border-slate-200 shrink-0">
          <div className="p-3 border-b border-slate-200 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${selectedRole} pages...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#5826df]/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredPages.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No matching pages found for filter.
              </div>
            ) : (
              filteredPages.map((p) => {
                const isCurrent = normalizePath(p.href) === normalizePath(selectedPath);
                const hasCustom = isCustomSaved(p.href);

                return (
                  <button
                    key={p.href}
                    type="button"
                    onClick={() => {
                      setSelectedPath(p.href);
                      loadPageData(selectedRole, p.href);
                    }}
                    className={`flex items-start justify-between w-full p-2.5 rounded-xl text-left transition-all group ${
                      isCurrent
                        ? "bg-indigo-50 border border-indigo-200 text-[#5826df] shadow-2xs"
                        : "hover:bg-slate-100 text-slate-700 border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate">
                          {p.title}
                        </span>
                        {hasCustom && (
                          <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Custom tutorial saved in DB" />
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
                        {p.href}
                      </p>
                      {p.category && (
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 uppercase">
                          {p.category}
                        </span>
                      )}
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isCurrent
                          ? "text-[#5826df] translate-x-0.5"
                          : "text-slate-300 group-hover:text-slate-500"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <span>Custom DB Record</span>
            </span>
            <span>Total: {currentRolePages.length} Pages</span>
          </div>
        </div>

        {/* Right Column: Editor / Live Preview */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          {/* Active Page Header Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-[#5826df] text-xs font-bold">
                    {selectedRole} Workspace
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700">
                    {selectedPath}
                  </span>
                  {formData.id ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <Check className="w-3 h-3" /> Saved Custom
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                      System Default Template
                    </span>
                  )}
                </div>
                <h2 className="text-base md:text-lg font-black text-slate-900">
                  Editing Guide for: {currentRouteMeta?.title || selectedPath}
                </h2>
                <p className="text-xs text-slate-500">
                  {currentRouteMeta?.description}
                </p>
              </div>

              {formData.updated_at && (
                <div className="text-right text-[11px] text-slate-400">
                  <p>Last modified: {new Date(formData.updated_at).toLocaleDateString()}</p>
                  {formData.updated_by_name && <p>By: {formData.updated_by_name}</p>}
                </div>
              )}
            </div>
          </div>

          {activeTab === "edit" ? (
            /* ─── VISUAL EDITOR FORM ────────────────────────────────── */
            <div className="space-y-6">
              {/* Section 1: Basic Information & Video */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <BookOpen className="w-4 h-4 text-[#5826df]" />
                  1. General Guide Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700">
                      Tutorial Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Student Directory & Records Guide"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#5826df]/30"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700">
                      Summary & Overview (shown at the top of tutorial popup)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Explain what this screen does in simple plain language for elderly staff..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#5826df]/30 resize-y"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Video className="w-4 h-4 text-rose-500" />
                      Video Tutorial URL (Optional YouTube / Vimeo / Drive link)
                    </label>
                    <input
                      type="text"
                      value={formData.video_url || ""}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-[#5826df]/30"
                    />
                    {formData.video_url && getEmbedUrl(formData.video_url) && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video max-w-md">
                        <iframe
                          src={getEmbedUrl(formData.video_url)!}
                          title="Preview"
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Step-by-Step Instructions */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#5826df]" />
                      2. Step-by-Step Instructions ({formData.steps?.length || 0})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ordered steps explaining each action on this page.
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddStep}
                    className="h-8 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#5826df] border border-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Step
                  </Button>
                </div>

                <div className="space-y-3">
                  {(formData.steps || []).map((st, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#5826df] text-white font-black text-xs shadow-xs">
                            {st.step || idx + 1}
                          </span>
                          <input
                            type="text"
                            value={st.title}
                            onChange={(e) => handleUpdateStep(idx, "title", e.target.value)}
                            placeholder="Step Title (e.g. Select Class & Division)"
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#5826df]/30 w-72 md:w-96"
                          />
                        </div>

                        {/* Step Ordering and Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, "down")}
                            disabled={idx === (formData.steps?.length || 1) - 1}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(idx)}
                            className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Delete Step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <textarea
                          rows={2}
                          value={st.description}
                          onChange={(e) => handleUpdateStep(idx, "description", e.target.value)}
                          placeholder="Detailed step description of where to click or what to type..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#5826df]/30 resize-y"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-800 uppercase shrink-0">
                          Sample Example:
                        </span>
                        <input
                          type="text"
                          value={st.dummy_example || ""}
                          onChange={(e) => handleUpdateStep(idx, "dummy_example", e.target.value)}
                          placeholder="e.g. Select Class 8-A and click 'Fetch Roster'"
                          className="w-full px-3 py-1 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-mono text-amber-950 outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Dummy & Sample Data */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Table className="w-4 h-4 text-emerald-600" />
                      3. Dummy & Sample Form Data ({formData.dummy_data?.length || 0})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Sample inputs and format reference values for clerks/teachers.
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddDummyField}
                    className="h-8 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(formData.dummy_data || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.field}
                          onChange={(e) => handleUpdateDummyField(idx, "field", e.target.value)}
                          placeholder="Field Label (e.g. G.R. Number)"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteDummyField(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.sample_value}
                        onChange={(e) => handleUpdateDummyField(idx, "sample_value", e.target.value)}
                        placeholder="Sample Value (e.g. GR-2026-0042)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 font-mono text-xs font-bold text-emerald-950 outline-none"
                      />

                      <input
                        type="text"
                        value={item.instructions}
                        onChange={(e) => handleUpdateDummyField(idx, "instructions", e.target.value)}
                        placeholder="Instructions / Format tip..."
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Pro Tips */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      4. Pro Tips & Important Notes ({formData.tips?.length || 0})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Key advice to avoid mistakes and facilitate easier navigation.
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddTip}
                    className="h-8 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Tip
                  </Button>
                </div>

                <div className="space-y-2">
                  {(formData.tips || []).map((tip, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900 text-xs font-black">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={tip}
                        onChange={(e) => handleUpdateTip(idx, e.target.value)}
                        placeholder="Type a helpful tip..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteTip(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Sticky Save Bar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white shadow-xl">
                <div>
                  <p className="font-bold text-xs md:text-sm">Ready to update this tutorial?</p>
                  <p className="text-[11px] text-slate-300">Staff members will immediately see the updated guide when clicking the (i) button.</p>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving || deleting}
                  className="bg-[#5826df] hover:bg-[#4a1ec6] text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-indigo-500/30"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save All Changes
                </Button>
              </div>
            </div>
          ) : (
            /* ─── LIVE PREVIEW TAB ──────────────────────────────────── */
            <div className="p-6 rounded-3xl bg-slate-900/10 border-2 border-dashed border-indigo-300/80 space-y-4">
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-950 text-xs font-bold flex items-center justify-between">
                <span>Interactive Preview: This is exactly how the popup appears when staff click (i) in the header.</span>
                <span className="bg-white px-2 py-0.5 rounded-md text-[10px] text-[#5826df]">Live Preview</span>
              </div>

              {/* Modal Container Replica */}
              <div className="rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-w-4xl mx-auto">
                <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 text-amber-300">
                      {selectedRole} Guide
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-black/40 text-purple-200">
                      {selectedPath}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    {formData.title || "Page Walkthrough"}
                  </h3>
                  <p className="text-xs text-purple-100/80">
                    {formData.summary || "Summary text..."}
                  </p>
                </div>

                <div className="p-5 space-y-4 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Step-by-Step Instructions:
                  </h4>
                  <div className="space-y-2.5">
                    {(formData.steps || []).map((st, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#5826df] text-white font-black text-xs">
                          {st.step || i + 1}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{st.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{st.description}</p>
                          {st.dummy_example && (
                            <span className="mt-1.5 inline-block text-[10px] font-mono bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                              Example: {st.dummy_example}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {formData.dummy_data && formData.dummy_data.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">
                        Sample Dummy Data:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {formData.dummy_data.map((dm, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white border border-slate-200 text-xs">
                            <span className="font-bold text-slate-800">{dm.field}: </span>
                            <span className="font-mono text-indigo-700 font-semibold">{dm.sample_value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
