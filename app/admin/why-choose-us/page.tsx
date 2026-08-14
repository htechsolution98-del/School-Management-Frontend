"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Database,
  FileText,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
// Predefined available icons for the user to select
const AVAILABLE_ICONS = [
  { name: "Lightbulb", label: "Innovation/Idea" },
  { name: "Target", label: "Complexity/Goal" },
  { name: "TrendingUp", label: "Growth/Analytics" },
  { name: "Shield", label: "Security/Trust" },
  { name: "Award", label: "Achievement/Quality" },
  { name: "Sparkles", label: "AI/Premium" },
  { name: "Zap", label: "Speed/Efficiency" },
  { name: "Users", label: "Collaboration/Community" },
  { name: "GraduationCap", label: "Education/Academics" },
  { name: "BookOpen", label: "Learning/Resources" },
  { name: "Heart", label: "Care/Support" },
  { name: "Smile", label: "Satisfaction/UX" },
  { name: "Activity", label: "Process/Monitoring" },
  { name: "CheckCircle2", label: "Success/Verification" },
];

// Predefined color themes
const COLOR_THEMES = [
  { class: "text-[#5D3FD3] bg-[#5D3FD3]/10 border-[#5D3FD3]/20", label: "Royal Purple", hex: "#5D3FD3" },
  { class: "text-[#285E89] bg-[#285E89]/10 border-[#285E89]/20", label: "Ocean Blue", hex: "#285E89" },
  { class: "text-[#FFA600] bg-[#FFA600]/10 border-[#FFA600]/20", label: "Golden Orange", hex: "#FFA600" },
  { class: "text-[#6A7626] bg-[#6A7626]/10 border-[#6A7626]/20", label: "Olive Green", hex: "#6A7626" },
  { class: "text-[#ED6708] bg-[#ED6708]/10 border-[#ED6708]/20", label: "Sunset Coral", hex: "#ED6708" },
  { class: "text-[#E63946] bg-[#E63946]/10 border-[#E63946]/20", label: "Vibrant Red", hex: "#E63946" },
];

// Dynamic Icon rendering utility
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (LucideIcons as any)[name] || HelpCircle;
  return <IconComponent className={className} />;
}

export default function WhyChooseUsManager() {
  const confirm = useConfirm();
  const [whyChooseUs, setWhyChooseUs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Form/Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState("Lightbulb");
  const [colorClass, setColorClass] = useState("text-[#5D3FD3]");

  // Full settings doc to send in PUT
  const [fullSettings, setFullSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/landing/settings");
      const data = await res.json();
      if (res.ok && data.success) {
        setFullSettings(data.settings);
        setWhyChooseUs(data.settings?.whyChooseUs || []);
        setStorageMode(data.usingFileStore ? "file" : "mongodb");
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
    setTitle("");
    setDescription("");
    setIconName("Lightbulb");
    setColorClass("text-[#5D3FD3]");
    setIsOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = whyChooseUs[index];
    setEditingIndex(index);
    setTitle(item.title);
    setDescription(item.description);
    setIconName(item.iconName || "Lightbulb");
    // Handle mapping standard colors to classes
    setColorClass(item.color || "text-[#5D3FD3]");
    setIsOpen(true);
  };

  const handleDelete = async (index: number) => {
    if (!(await confirm("Are you sure you want to remove this value proposition card?"))) return;
    const updatedList = [...whyChooseUs];
    updatedList.splice(index, 1);
    setWhyChooseUs(updatedList);
    saveSettings(updatedList, "Card removed successfully!");
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === whyChooseUs.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updatedList = [...whyChooseUs];
    
    // Swap items
    const temp = updatedList[index];
    updatedList[index] = updatedList[targetIndex];
    updatedList[targetIndex] = temp;

    setWhyChooseUs(updatedList);
    saveSettings(updatedList, "Order updated successfully!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in the title and description");
      return;
    }

    const updatedList = [...whyChooseUs];
    const newItem = {
      title: title.trim(),
      description: description.trim(),
      iconName,
      color: colorClass,
    };

    if (editingIndex !== null) {
      updatedList[editingIndex] = newItem;
    } else {
      updatedList.push(newItem);
    }

    setWhyChooseUs(updatedList);
    setIsOpen(false);
    saveSettings(updatedList, editingIndex !== null ? "Card updated!" : "New card added!");
  };

  const saveSettings = async (updatedList: any[], successMessage: string) => {
    setIsSaving(true);
    try {
      const payload = {
        ...fullSettings,
        whyChooseUs: updatedList,
      };

      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(successMessage);
        if (data.settings) {
          setFullSettings(data.settings);
          setWhyChooseUs(data.settings.whyChooseUs || []);
        }
      } else {
        toast.error(data.message || "Failed to update changes on server");
      }
    } catch {
      toast.error("Server connection error while saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">"Why Choose Us" Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure the core USP value propositions displayed in the primary marketing grid
          </p>
        </div>
        <Button
          onClick={handleOpenNew}
          disabled={storageMode === "error" || isSaving}
          className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl shadow-lg self-start sm:self-auto"
        >
          <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add Proposition Point
        </Button>
      </div>

      {/* Storage Mode Banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0 animate-pulse" /> Connected to MongoDB — changes saved to cloud database instantly.
        </div>
      )}
      {storageMode === "file" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0" />
          File Store Mode — saved to <code className="mx-1 bg-amber-100 px-1 rounded font-mono">data/landing-content.json</code> locally.
        </div>
      )}
      {storageMode === "error" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          <HelpCircle className="h-4 w-4 shrink-0" /> Storage unavailable. Restart the dev server or verify database status.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && whyChooseUs.length === 0 && storageMode !== "error" && (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#5D3FD3]/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-[#5D3FD3]" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-700 text-base">No USP points added yet</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Add points detailing your platform's values, technology, and advantages.
              </p>
            </div>
            <Button onClick={handleOpenNew} className="bg-[#429CE4] text-white font-bold rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> Add First Point
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid containing list and visual mockup */}
      {!isLoading && whyChooseUs.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main List Management Table (Left side) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4 text-[#429CE4]" /> Value propositions list
            </h3>
            
            <div className="space-y-4">
              {whyChooseUs.map((item, idx) => {
                const matchedTheme = COLOR_THEMES.find(t => t.class.startsWith(item.color)) || COLOR_THEMES[0];
                return (
                  <Card key={idx} className="overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 bg-white rounded-2xl p-5 relative">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl border shrink-0 ${item.color || "text-[#5D3FD3] bg-[#5D3FD3]/10 border-[#5D3FD3]/20"}`}>
                        <DynamicIcon name={item.iconName || "Lightbulb"} className="h-6 w-6 stroke-[2]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-12">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-base truncate">{item.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                            Order {idx + 1}
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons (Right Top) */}
                    <div className="absolute top-4 right-4 flex gap-1 items-center bg-slate-50 border border-slate-100 rounded-lg p-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                        disabled={idx === 0 || isSaving}
                        onClick={() => handleMove(idx, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                        disabled={idx === whyChooseUs.length - 1 || isSaving}
                        onClick={() => handleMove(idx, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Action buttons (Bottom border) */}
                    <div className="border-t border-slate-50 mt-4 pt-3 flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => handleOpenEdit(idx)}
                        className="rounded-lg text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 h-8"
                      >
                        <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => handleDelete(idx)}
                        className="rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Point
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Visual Live Mockup Panel (Right side) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#FFA600]" /> Live homepage rendering preview
            </h3>

            <Card className="rounded-[2.5rem] bg-gradient-to-tr from-slate-50 to-slate-100/50 p-6 border border-slate-200 shadow-inner overflow-hidden sticky top-6">
              <div className="mb-4">
                <span className="text-[10px] bg-[#5D3FD3]/10 text-[#5D3FD3] px-3 py-1.5 rounded-full font-black uppercase tracking-widest">
                  Why Choose Us?
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-2 leading-snug">
                  VidyaSanchalan is a <span className="text-[#5D3FD3] border-b-2 border-[#5D3FD3]/30">revolution</span> in education <span className="font-extrabold text-[#285E89]">management</span>
                </h4>
              </div>

              {/* USP Point Preview Stack */}
              <div className="space-y-5 pt-2">
                {whyChooseUs.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-2xl shadow-sm border border-slate-100 transition-all hover:scale-[1.01]">
                    {/* Visual icon */}
                    <div className={`p-2.5 rounded-xl border shrink-0 ${item.color || "text-[#5D3FD3] bg-[#5D3FD3]/10 border-[#5D3FD3]/20"}`}>
                      <DynamicIcon name={item.iconName || "Lightbulb"} className="h-5 w-5 stroke-[2.5]" />
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-extrabold text-slate-900 text-sm">{item.title || "Untitled Point"}</h5>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        {item.description || "Enter a details description to show in this value proposition card."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Homepage section representation layout
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editingIndex !== null ? "Edit Proposition Point" : "Add New Value Proposition"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize titles, descriptive explanations, specific marketing icons, and colors.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title Input */}
              <div className="space-y-1.5">
                <Label htmlFor="item-title" className="text-sm font-bold text-slate-600">Proposition Title</Label>
                <Input
                  id="item-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Simplifying complexity"
                  className="rounded-xl border-slate-200"
                />
              </div>

              {/* Description Text */}
              <div className="space-y-1.5">
                <Label htmlFor="item-desc" className="text-sm font-bold text-slate-600">Short Explanation</Label>
                <Textarea
                  id="item-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Infographics & animations distill complex academic data into intuitive visuals..."
                  className="rounded-xl border-slate-200 leading-relaxed text-sm"
                />
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600">Color Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_THEMES.map((theme) => {
                    const isActive = colorClass.startsWith(theme.class.split(" ")[0]);
                    return (
                      <button
                        key={theme.label}
                        type="button"
                        onClick={() => setColorClass(theme.class)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-slate-50 border-slate-800 ring-1 ring-slate-800"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: theme.hex }}
                        />
                        <span className="truncate text-slate-700">{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Visual Grid Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600">Lucide Theme Icon</Label>
                <div className="grid grid-cols-7 gap-2 max-h-[140px] overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
                  {AVAILABLE_ICONS.map((icon) => {
                    const isSelected = iconName === icon.name;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        title={icon.label}
                        onClick={() => setIconName(icon.name)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border aspect-square transition-all ${
                          isSelected
                            ? "bg-[#429CE4] border-[#429CE4] text-white shadow"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <DynamicIcon name={icon.name} className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save & Cancel Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {editingIndex !== null ? "Update Card" : "Add Proposition"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
