"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  PlusCircle,
  MinusCircle,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  Plus,
  X,
  Database,
  FileText,
  RotateCcw,
  Sparkles,
  Upload,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

interface MobileTab {
  tabId: string;
  badge: string;
  title: string;
  desc: string;
  points: string[];
  color: string;
  accent: string;
  image?: string;
}

const PRESET_THEMES = [
  {
    name: "Ocean Navy (Default Student)",
    color: "from-[#429CE4] to-[#1D496C]",
    accent: "text-[#429CE4] bg-white/10 border-[#429CE4]/20",
  },
  {
    name: "Amber Gold (Default Parent)",
    color: "from-[#FFA600] to-[#ED6708]",
    accent: "text-[#FFA600] bg-white/10 border-[#FFA600]/20",
  },
  {
    name: "Mossy Olive (Default Teacher)",
    color: "from-[#6A7626] to-[#4F581D]",
    accent: "text-[#E4FF4C] bg-white/10 border-white/20",
  },
  {
    name: "Royal Amethyst",
    color: "from-[#a855f7] to-[#581c87]",
    accent: "text-[#e9d5ff] bg-white/10 border-[#e9d5ff]/20",
  },
  {
    name: "Ruby Rose",
    color: "from-[#f43f5e] to-[#9f1239]",
    accent: "text-[#ffe4e6] bg-white/10 border-[#ffe4e6]/20",
  },
  {
    name: "Emerald Forrest",
    color: "from-[#10b981] to-[#064e3b]",
    accent: "text-[#a7f3d0] bg-white/10 border-[#a7f3d0]/20",
  },
];

const DEFAULT_SEEDS: MobileTab[] = [
  {
    tabId: "student",
    badge: "Student Application",
    title: "Learn Smarter, Grow Faster",
    desc: "Designed to keep students organized, motivated, and engaged.",
    points: [
      "Homework Tracker",
      "Online Examination",
      "Student Timetable",
      "Academic Analytics"
    ],
    color: "from-[#429CE4] to-[#1D496C]",
    accent: "text-[#429CE4] bg-white/10 border-[#429CE4]/20",
    image: "/mobile-1.png"
  },
  {
    tabId: "parent",
    badge: "Parent Companion App",
    title: "Your Child's Progress, In Your Pocket",
    desc: "Stay intimately connected with your child's educational journey.",
    points: [
      "Real-Time Geo-Attendance",
      "Digital Fee Desk",
      "Direct Parent-Teacher Chats",
      "Comprehensive Report Cards"
    ],
    color: "from-[#FFA600] to-[#ED6708]",
    accent: "text-[#FFA600] bg-white/10 border-[#FFA600]/20",
    image: "/mobile-2.png"
  },
  {
    tabId: "teacher",
    badge: "Teacher Dashboard",
    title: "Focus on Teaching, Automate the Rest",
    desc: "Powerful admin tools in the palm of your hand.",
    points: [
      "Geo-Fenced Biometric Attendance",
      "Mobile Grading Engine",
      "Broadcaster Bulletin",
      "Substitution Alerts"
    ],
    color: "from-[#6A7626] to-[#4F581D]",
    accent: "text-[#E4FF4C] bg-white/10 border-white/20",
    image: "/mobile-3.png"
  }
];

export default function MobileAppRolesManager() {
  const confirm = useConfirm();
  const [settings, setSettings] = useState<any>(null);
  const [mobileTabs, setMobileTabs] = useState<MobileTab[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Dialog & Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tabId, setTabId] = useState("");
  const [badge, setBadge] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [points, setPoints] = useState<string[]>([""]);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [image, setImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/landing/settings?t=" + Date.now(), { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        const tabs = data.settings.mobileTabs || [];
        setMobileTabs(tabs);
        setStorageMode(data.usingFileStore ? "file" : "mongodb");
        if (tabs.length > 0) {
          setActivePreviewTab(tabs[0].tabId);
        }
      } else {
        setStorageMode("error");
      }
    } catch {
      setStorageMode("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingIndex(null);
    setTabId("");
    setBadge("");
    setTitle("");
    setDesc("");
    setPoints([""]);
    setSelectedThemeIndex(0);
    setImage("");
    setIsOpen(true);
  };

  const handleOpenEdit = (tab: MobileTab, index: number) => {
    setEditingIndex(index);
    setTabId(tab.tabId);
    setBadge(tab.badge);
    setTitle(tab.title);
    setDesc(tab.desc);
    setPoints(tab.points?.length ? tab.points : [""]);
    setImage(tab.image || "");
    
    // Attempt to match existing theme
    const themeIdx = PRESET_THEMES.findIndex(t => t.color === tab.color);
    setSelectedThemeIndex(themeIdx >= 0 ? themeIdx : 0);
    
    setIsOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("context", "mobile-app");

      const res = await fetch("/api/landing/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (data.success) {
        setImage(data.url);
        toast.success("Screenshot uploaded successfully!");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch {
      toast.error("Upload error. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddPointField = () => setPoints([...points, ""]);

  const handleRemovePointField = (idx: number) => {
    if (points.length <= 1) {
      toast.warning("A tab card requires at least 1 bullet point highlight!");
      return;
    }
    setPoints(points.filter((_, i) => i !== idx));
  };

  const handlePointChange = (idx: number, val: string) => {
    const updated = [...points];
    updated[idx] = val;
    setPoints(updated);
  };

  const handleDeleteTab = async (index: number) => {
    if (!(await confirm("Are you sure you want to delete this mobile app role?"))) return;
    const updated = mobileTabs.filter((_, i) => i !== index);
    setMobileTabs(updated);
    toast.success("Role removed from list. Click 'Save Synchronization' to make changes permanent.");
    if (activePreviewTab === mobileTabs[index]?.tabId && updated.length > 0) {
      setActivePreviewTab(updated[0].tabId);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...mobileTabs];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setMobileTabs(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === mobileTabs.length - 1) return;
    const updated = [...mobileTabs];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setMobileTabs(updated);
  };

  const handleDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredPoints = points.filter(p => p.trim() !== "");
    if (!tabId.trim()) { toast.error("Role Slug ID is required"); return; }
    if (!badge.trim()) { toast.error("App Badge is required"); return; }
    if (!title.trim()) { toast.error("Header Title is required"); return; }
    if (!desc.trim()) { toast.error("App Description is required"); return; }
    if (filteredPoints.length === 0) { toast.error("Add at least one bullet point highlight"); return; }

    const slug = tabId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    // Check duplicate slug on creation
    if (editingIndex === null && mobileTabs.some(t => t.tabId === slug)) {
      toast.error(`A role with slug '${slug}' already exists!`);
      return;
    }

    const theme = PRESET_THEMES[selectedThemeIndex];
    const newTab: MobileTab = {
      tabId: slug,
      badge,
      title,
      desc,
      points: filteredPoints,
      color: theme.color,
      accent: theme.accent,
      image,
    };

    let updatedTabs = [...mobileTabs];
    if (editingIndex !== null) {
      updatedTabs[editingIndex] = newTab;
      toast.success("Role updated locally!");
    } else {
      updatedTabs.push(newTab);
      toast.success("New role added locally!");
    }

    setMobileTabs(updatedTabs);
    setIsOpen(false);
    if (!activePreviewTab) {
      setActivePreviewTab(slug);
    }
  };

  const handleResetToDefaults = async () => {
    if (!(await confirm("Are you sure you want to reset all roles to the default seeds (Student, Parent, Teacher)? This will overwrite your custom changes."))) return;
    setMobileTabs(DEFAULT_SEEDS);
    setActivePreviewTab(DEFAULT_SEEDS[0].tabId);
    toast.success("Reset to default seeds! Don't forget to click 'Save Synchronization' to submit.");
  };

  const handleSaveSync = async () => {
    if (mobileTabs.length === 0) {
      toast.error("You must have at least one mobile app role configured!");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        mobileTabs,
      };

      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Mobile app roles synchronized successfully!");
        setSettings(data.settings);
        setMobileTabs(data.settings.mobileTabs || []);
      } else {
        toast.error(data.message || "Failed to save settings");
      }
    } catch {
      toast.error("Network or database connection error");
    } finally {
      setIsSaving(false);
    }
  };

  const activePreviewData = mobileTabs.find(t => t.tabId === activePreviewTab) || mobileTabs[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mobile Ecosystem Roles Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage interactive mobile tabs, application mockups, themes, and descriptions on the features page
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            onClick={handleResetToDefaults}
            variant="outline"
            disabled={isLoading || storageMode === "error"}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
          >
            <RotateCcw className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Reset to Seeds
          </Button>
          <Button
            onClick={handleOpenNew}
            disabled={isLoading || storageMode === "error"}
            className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl shadow-lg shadow-[#429CE4]/10"
          >
            <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add New Role
          </Button>
        </div>
      </div>

      {/* Storage mode banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0" />
          Connected to MongoDB — changes are saved to the cloud database.
        </div>
      )}
      {storageMode === "file" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0" />
          File Store Mode — changes saved to <code className="mx-1 bg-amber-100 px-1 rounded">data/landing-content.json</code>.
          Connect MongoDB Atlas for cloud storage.
        </div>
      )}
      {storageMode === "error" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          <X className="h-4 w-4 shrink-0" />
          Storage unavailable. Please check backend logs.
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: List & CRUD */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border border-slate-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800">Ecosystem Roles List</CardTitle>
                  <CardDescription className="text-xs">
                    Reorder or modify roles. Synchronize changes to save.
                  </CardDescription>
                </div>
                {mobileTabs.length > 0 && (
                  <Button
                    onClick={handleSaveSync}
                    disabled={isSaving}
                    className="bg-[#FFA600] hover:bg-[#ED6708] text-white font-bold rounded-xl shadow-md px-4 py-1.5 text-xs h-9"
                  >
                    <Save className="mr-1 h-3.5 w-3.5 stroke-[2.5]" />
                    {isSaving ? "Saving..." : "Save Synchronization"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {mobileTabs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 gap-2">
                    <Smartphone className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-semibold">No roles defined yet.</p>
                    <Button onClick={handleResetToDefaults} size="sm" variant="link" className="text-[#429CE4]">
                      Load defaults
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileTabs.map((tab, idx) => (
                      <div
                        key={tab.tabId}
                        onClick={() => setActivePreviewTab(tab.tabId)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                          activePreviewTab === tab.tabId
                            ? "border-[#429CE4] bg-[#429CE4]/5 shadow-sm"
                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {tab.image ? (
                            <div className="h-10 w-7 rounded overflow-hidden border border-slate-200 bg-slate-900 shrink-0 shadow-sm flex items-center justify-center">
                              <img src={tab.image} alt={tab.badge} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-r ${tab.color} shrink-0 flex items-center justify-center text-white text-[10px] font-black uppercase`}>
                              {tab.tabId.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-800 capitalize">{tab.tabId}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200/50">
                                {tab.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5 max-w-sm">
                              {tab.title} — {tab.desc}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-1 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {/* Reordering */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveUp(idx);
                            }}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg"
                            disabled={idx === mobileTabs.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveDown(idx);
                            }}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>

                          {/* Divider */}
                          <div className="w-[1px] h-4 bg-slate-200 mx-1 hidden sm:block" />

                          {/* Edit / Delete */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-slate-600 hover:text-[#429CE4] hover:bg-[#429CE4]/5 rounded-lg px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(tab, idx);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTab(idx);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hint Box */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-slate-500 space-y-1.5">
              <span className="text-[#FFA600] font-black flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> Dynamic Integration
              </span>
              <p>
                When you add, edit, or reorder roles here, the changes reflect instantaneously in the segmented selectors on the public features page.
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Note: Standard screenshots (student, parent, teacher) are linked based on the slug. For custom roles, screenshots will render gracefully with smart system mockups!
              </p>
            </div>
          </div>

          {/* Right panel: Phone simulator preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">
              Real-time Mobile preview
            </span>

            {activePreviewData ? (
              <div className="w-full max-w-[310px]">
                {/* Sleek Simulated Phone Container */}
                <div className="relative w-full aspect-[9/18.5] rounded-[2.5rem] bg-slate-950 p-[8px] shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-slate-800">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[85px] h-[18px] bg-slate-900 rounded-full z-40 flex items-center justify-between px-3">
                    <div className="w-1.5 h-1.5 bg-slate-950 rounded-full"></div>
                    <div className="w-5 h-1 bg-slate-950 rounded-full"></div>
                  </div>

                  {/* Speaker Bar */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-slate-800 rounded-full z-40"></div>

                  {/* Screen Content Wrapper */}
                  <div className="w-full h-full rounded-[2.1rem] overflow-hidden bg-slate-900 relative flex flex-col justify-between p-5 text-white select-none">
                    {activePreviewData.image ? (
                      <>
                        <img
                          src={activePreviewData.image}
                          alt={activePreviewData.title}
                          className="w-full h-full object-cover absolute inset-0 pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
                      </>
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-b ${activePreviewData.color} opacity-95 -z-10`} />
                    )}

                    {/* Top status bar mock */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-white/70 px-1 pt-1.5 z-10">
                      <span>9:41</span>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2.5 rounded-sm bg-white/70"></span>
                        <span className="h-2 w-3.5 rounded-sm border border-white/70 flex items-center justify-start p-0.5"><span className="h-full w-2 bg-white/70 rounded-2xs"></span></span>
                      </div>
                    </div>

                    {!activePreviewData.image ? (
                      <>
                        {/* App badge & main details */}
                        <div className="mt-8 space-y-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-black tracking-wider uppercase ${activePreviewData.accent}`}>
                            {activePreviewData.badge || "System App"}
                          </span>
                          <div>
                            <h3 className="text-lg font-black leading-tight text-white">{activePreviewData.title}</h3>
                            <p className="text-[11px] text-white/80 font-medium leading-relaxed mt-1.5">
                              {activePreviewData.desc}
                            </p>
                          </div>
                        </div>

                        {/* Highlights Points List */}
                        <div className="flex-1 mt-6 overflow-y-auto pr-1 space-y-2 max-h-[170px] scrollbar-thin">
                          {activePreviewData.points?.map((point, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white/15 text-white mt-0.5">
                                <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />
                              </div>
                              <span className="text-[10px] font-extrabold text-white leading-tight">{point}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1" />
                    )}

                    {/* Bottom home bar indicator */}
                    <div className="w-full flex justify-center pb-0.5 z-10">
                      <div className="w-20 h-1 bg-white/30 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-xs font-bold text-slate-500 capitalize">
                    {activePreviewData.tabId} Mockup Preview
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-[400px] w-[260px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Smartphone className="h-10 w-10 text-slate-300 mb-2" />
                <span className="text-xs font-semibold">Select a role in the list to display simulator preview</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-5">
              <h3 className="text-lg font-black text-slate-800">
                {editingIndex !== null ? "Edit Mobile Role" : "Add Ecosystem Role"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure role badge, description details, highlights, and custom presets
              </p>
            </div>

            <form onSubmit={handleDialogSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Slug / tabId */}
                <div className="space-y-1.5">
                  <Label htmlFor="t-slug" className="text-xs font-black text-slate-600">Role ID / Slug</Label>
                  <Input
                    id="t-slug"
                    value={tabId}
                    onChange={(e) => setTabId(e.target.value)}
                    placeholder="e.g. principal"
                    disabled={editingIndex !== null}
                    className="rounded-xl border-slate-200 font-bold"
                  />
                </div>

                {/* Badge */}
                <div className="space-y-1.5">
                  <Label htmlFor="t-badge" className="text-xs font-black text-slate-600">App Badge Label</Label>
                  <Input
                    id="t-badge"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. Trustee Portal"
                    className="rounded-xl border-slate-200 font-semibold"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="t-title" className="text-xs font-black text-slate-600">Header Title</Label>
                <Input
                  id="t-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Supervise Your Institution Securely"
                  className="rounded-xl border-slate-200 font-bold"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="t-desc" className="text-xs font-black text-slate-600">App Description</Label>
                <Textarea
                  id="t-desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Provide a concise description of the application benefits..."
                  className="rounded-xl border-slate-200 font-medium text-slate-700 min-h-[60px]"
                />
              </div>

              {/* Theme Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-600">Color Gradient Theme</Label>
                <select
                  value={selectedThemeIndex}
                  onChange={(e) => setSelectedThemeIndex(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                >
                  {PRESET_THEMES.map((theme, i) => (
                    <option key={i} value={i}>{theme.name}</option>
                  ))}
                </select>
                {/* Theme Color Preview */}
                <div className={`h-2.5 rounded-full bg-gradient-to-r ${PRESET_THEMES[selectedThemeIndex].color} mt-1`} />
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-600">Mobile Screenshot (Optional)</Label>
                <div className="flex items-center gap-4">
                  {image ? (
                    <div className="relative h-20 w-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group">
                      <img
                        src={image}
                        alt="Screenshot preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImage("")}
                        className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-20 w-12 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                      <Smartphone className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="rounded-xl border-slate-200 text-xs font-bold py-1.5 h-9"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Screenshot
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Upload a custom app screen image. Default screenshots will be used if left blank.
                    </p>
                  </div>
                </div>
              </div>

              {/* Points checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <Label className="text-xs font-black text-slate-600">Bullet Highlights List</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-[#429CE4] hover:bg-slate-50 font-bold text-xs"
                    onClick={handleAddPointField}
                  >
                    <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add Highlight
                  </Button>
                </div>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {points.map((point, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-[10px] font-black text-slate-400 w-5">#{idx + 1}</span>
                      <Input
                        value={point}
                        onChange={(e) => handlePointChange(idx, e.target.value)}
                        placeholder={`e.g. Real-Time Analytics`}
                        className="rounded-xl border-slate-200 text-xs font-semibold"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-rose-500 hover:bg-rose-50 rounded-lg shrink-0 h-8 w-8"
                        onClick={() => handleRemovePointField(idx)}
                      >
                        <MinusCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl text-xs"
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  {editingIndex !== null ? "Update Role" : "Add Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
