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
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

// Predefined available icons for the user to select
const AVAILABLE_ICONS = [
  { name: "GraduationCap", label: "Schools/Graduation" },
  { name: "Users", label: "Students/Community" },
  { name: "BookOpen", label: "Teachers/Academics" },
  { name: "Heart", label: "Parents/Care" },
  { name: "Calendar", label: "Timetable/Schedule" },
  { name: "Shield", label: "Security/Trust" },
  { name: "Bell", label: "Notices/Announcements" },
  { name: "CreditCard", label: "Fees/Finance" },
  { name: "Award", label: "Exams/Achievements" },
  { name: "TrendingUp", label: "Progress/Growth" },
  { name: "Sparkles", label: "Premium/AI Features" },
];

// Dynamic Icon rendering utility
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (LucideIcons as any)[name] || HelpCircle;
  return <IconComponent className={className} />;
}

export default function StatsManager() {
  const confirm = useConfirm();
  const [statsList, setStatsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Form/Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState<number>(0);
  const [suffix, setSuffix] = useState("");
  const [iconName, setIconName] = useState("GraduationCap");

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
        setStatsList(data.settings?.stats || []);
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
    setLabel("");
    setTarget(0);
    setSuffix("+");
    setIconName("GraduationCap");
    setIsOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = statsList[index];
    setEditingIndex(index);
    setLabel(item.label || "");
    setTarget(item.target ?? 0);
    setSuffix(item.suffix || "");
    setIconName(item.iconName || "GraduationCap");
    setIsOpen(true);
  };

  const handleDelete = async (index: number) => {
    if (!(await confirm("Are you sure you want to remove this statistics counter?"))) return;
    const updatedList = [...statsList];
    updatedList.splice(index, 1);
    setStatsList(updatedList);
    saveSettings(updatedList, "Statistic removed successfully!");
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    if (direction === "left" && index === 0) return;
    if (direction === "right" && index === statsList.length - 1) return;

    const targetIndex = direction === "left" ? index - 1 : index + 1;
    const updatedList = [...statsList];
    
    // Swap items
    const temp = updatedList[index];
    updatedList[index] = updatedList[targetIndex];
    updatedList[targetIndex] = temp;

    setStatsList(updatedList);
    saveSettings(updatedList, "Order updated successfully!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Please fill in the statistic label");
      return;
    }

    const updatedList = [...statsList];
    const newItem = {
      label: label.trim(),
      target: Number(target) || 0,
      suffix: suffix.trim(),
      iconName,
    };

    if (editingIndex !== null) {
      updatedList[editingIndex] = newItem;
    } else {
      updatedList.push(newItem);
    }

    setStatsList(updatedList);
    setIsOpen(false);
    saveSettings(updatedList, editingIndex !== null ? "Statistic updated!" : "New statistic added!");
  };

  const saveSettings = async (updatedList: any[], successMessage: string) => {
    setIsSaving(true);
    try {
      const payload = {
        ...fullSettings,
        stats: updatedList,
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
          setStatsList(data.settings.stats || []);
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">"Homepage Stats" Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure the statistics counter banner displayed below the hero fold on your homepage
          </p>
        </div>
        <Button
          onClick={handleOpenNew}
          disabled={storageMode === "error" || isSaving}
          className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl shadow-lg self-start sm:self-auto"
        >
          <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add Statistic Counter
        </Button>
      </div>

      {/* Storage Mode Banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0" /> Connected to MongoDB — changes saved to cloud database instantly.
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
      {!isLoading && statsList.length === 0 && storageMode !== "error" && (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#429CE4]/10 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-[#429CE4]" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-700 text-base">No statistics counters added yet</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Add numbers detailing your school ERP platforms metrics like schools, students, teachers, etc.
              </p>
            </div>
            <Button onClick={handleOpenNew} className="bg-[#429CE4] text-white font-bold rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> Add First Stat
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid containing list and visual mockup */}
      {!isLoading && statsList.length > 0 && (
        <div className="space-y-8">
          
          {/* Main List Management */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4 text-[#429CE4]" /> Active statistics counters list
            </h3>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {statsList.map((item, idx) => (
                <Card key={idx} className="relative overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 bg-white rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    {/* Header with icon & order controls */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-xl border border-[#429CE4]/20 bg-[#429CE4]/5 text-[#429CE4]">
                        <DynamicIcon name={item.iconName || "GraduationCap"} className="h-5 w-5 stroke-[2.5]" />
                      </div>
                      <div className="flex gap-0.5 items-center bg-slate-50 border border-slate-100 rounded-lg p-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                          disabled={idx === 0 || isSaving}
                          onClick={() => handleMove(idx, "left")}
                          title="Move left"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                          disabled={idx === statsList.length - 1 || isSaving}
                          onClick={() => handleMove(idx, "right")}
                          title="Move right"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Numeric details */}
                    <div className="space-y-1">
                      <p className="text-3xl font-black tracking-tight text-slate-800">
                        {item.target}
                        <span className="text-[#FFA600] font-black">{item.suffix || "+"}</span>
                      </p>
                      <h4 className="font-extrabold text-slate-400 text-xs uppercase tracking-wider">{item.label}</h4>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-slate-50 mt-5 pt-3 flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() => handleOpenEdit(idx)}
                      className="rounded-lg text-[10px] font-bold text-slate-600 border-slate-200 hover:bg-slate-50 h-7"
                    >
                      <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() => handleDelete(idx)}
                      className="rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-7"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Visual Live Mockup Panel */}
          <div className="space-y-4 pt-4">
            <h3 className="text-base font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#FFA600]" /> Live homepage rendering preview
            </h3>

            {/* Exact duplicate of landing page stats card */}
            <Card className="border-0 bg-gradient-to-r from-[#1D496C] to-[#15354F] text-white shadow-xl overflow-hidden rounded-[2rem] relative">
              <div className="absolute inset-0 bg-grid-white/[0.08] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none"></div>
              <CardContent className="py-8 px-12 relative z-10">
                <div className={`grid gap-8 text-center grid-cols-2 md:grid-cols-${Math.min(4, Math.max(2, statsList.length))}`}>
                  {statsList.map((stat, i) => (
                    <div key={i} className="group hover:scale-105 transition-transform duration-300">
                      <div className="text-[#FFA600] scale-110 mb-2.5">
                        <DynamicIcon name={stat.iconName || "GraduationCap"} className="h-6 w-6 mx-auto stroke-[2.5]" />
                      </div>
                      <div className="text-3xl font-black mb-1.5 tracking-tight">
                        <span>{stat.target}</span>{stat.suffix}
                      </div>
                      <div className="text-sm font-semibold text-white/80 uppercase tracking-wider text-[11px]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Exact representation of the homepage statistics banner section
            </div>
          </div>

        </div>
      )}

      {/* Add / Edit Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
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
                {editingIndex !== null ? "Edit Statistic Counter" : "Add Metric Counter"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure numbers, count suffixes, Lucide icons, and descriptive labels.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Label Input */}
              <div className="space-y-1.5">
                <Label htmlFor="stat-label" className="text-sm font-bold text-slate-600">Metric Label</Label>
                <Input
                  id="stat-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Students, Schools, Teachers"
                  className="rounded-xl border-slate-200"
                />
              </div>

              {/* Target & Suffix inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stat-target" className="text-sm font-bold text-slate-600">Target Value</Label>
                  <Input
                    id="stat-target"
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 500, 50, 100"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stat-suffix" className="text-sm font-bold text-slate-600">Suffix Symbol</Label>
                  <Input
                    id="stat-suffix"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. +, K+, %"
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>

              {/* Icon Visual Grid Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600">Lucide Theme Icon</Label>
                <div className="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
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
                  {editingIndex !== null ? "Update Stat" : "Add Statistic"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
