"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Wifi,
  Bell,
  Fingerprint,
  Activity,
  Cpu,
  ShieldAlert,
  Key,
  Database,
  Sparkles,
  Smartphone,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  X,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

interface InfrastructureCard {
  title: string;
  desc: string;
  iconName: string;
  hoverBg: string;
}

const PRESET_HOVERS = [
  {
    name: "Ocean Blue (Encryption)",
    value: "hover:bg-[#429CE4] hover:border-[#429CE4] hover:shadow-xl hover:shadow-[#429CE4]/20",
    textClass: "text-[#429CE4]",
  },
  {
    name: "Mossy Green (Offline)",
    value: "hover:bg-[#6A7626] hover:border-[#6A7626] hover:shadow-xl hover:shadow-[#6A7626]/20",
    textClass: "text-[#6A7626]",
  },
  {
    name: "Radiant Orange (Alerts)",
    value: "hover:bg-[#ED6708] hover:border-[#ED6708] hover:shadow-xl hover:shadow-[#ED6708]/20",
    textClass: "text-[#ED6708]",
  },
  {
    name: "Amber Gold (Biometrics)",
    value: "hover:bg-[#FFA600] hover:border-[#FFA600] hover:shadow-xl hover:shadow-[#FFA600]/20",
    textClass: "text-[#FFA600]",
  },
  {
    name: "Deep Navy",
    value: "hover:bg-[#1D496C] hover:border-[#1D496C] hover:shadow-xl hover:shadow-[#1D496C]/20",
    textClass: "text-[#1D496C]",
  },
  {
    name: "Royal Purple",
    value: "hover:bg-[#8B5CF6] hover:border-[#8B5CF6] hover:shadow-xl hover:shadow-[#8B5CF6]/20",
    textClass: "text-[#8B5CF6]",
  },
  {
    name: "Crimson Red",
    value: "hover:bg-[#EF4444] hover:border-[#EF4444] hover:shadow-xl hover:shadow-[#EF4444]/20",
    textClass: "text-[#EF4444]",
  },
];

const ICON_OPTIONS = [
  "Lock", "Wifi", "Bell", "Fingerprint",
  "Activity", "Cpu", "ShieldAlert", "Key",
  "Database", "Sparkles", "Smartphone"
];

const getIcon = (name: string, className?: string) => {
  switch (name) {
    case "Lock": return <Lock className={className} />;
    case "Wifi": return <Wifi className={className} />;
    case "Bell": return <Bell className={className} />;
    case "Fingerprint": return <Fingerprint className={className} />;
    case "Activity": return <Activity className={className} />;
    case "Cpu": return <Cpu className={className} />;
    case "ShieldAlert": return <ShieldAlert className={className} />;
    case "Key": return <Key className={className} />;
    case "Database": return <Database className={className} />;
    case "Sparkles": return <Sparkles className={className} />;
    case "Smartphone": return <Smartphone className={className} />;
    default: return <Cpu className={className} />;
  }
};

const DEFAULT_SEEDS: InfrastructureCard[] = [
  {
    title: "Bank-Grade Encryption",
    desc: "All financial data and API transactions are locked under high-strength TLS protocols ensuring completely secure fees transactions.",
    iconName: "Lock",
    hoverBg: "hover:bg-[#429CE4] hover:border-[#429CE4] hover:shadow-xl hover:shadow-[#429CE4]/20"
  },
  {
    title: "Offline Operations Mode",
    desc: "Never lose school data inside poor networks. The application synchronizes critical homework and logs directly from local cashiers.",
    iconName: "Wifi",
    hoverBg: "hover:bg-[#6A7626] hover:border-[#6A7626] hover:shadow-xl hover:shadow-[#6A7626]/20"
  },
  {
    title: "Instant Broadcaster Alerts",
    desc: "Integrated micro-sockets delivery engine providing notifications the exact millisecond announcements go active.",
    iconName: "Bell",
    hoverBg: "hover:bg-[#ED6708] hover:border-[#ED6708] hover:shadow-xl hover:shadow-[#ED6708]/20"
  },
  {
    title: "Biometric & Geo-location",
    desc: "Security tracking logs for teacher roll-call ensuring verifiable attendance entries using mobile GPS services.",
    iconName: "Fingerprint",
    hoverBg: "hover:bg-[#FFA600] hover:border-[#FFA600] hover:shadow-xl hover:shadow-[#FFA600]/20"
  }
];

export default function MobileInfrastructureManager() {
  const confirm = useConfirm();
  const [settings, setSettings] = useState<any>(null);
  const [infrastructureCards, setInfrastructureCards] = useState<InfrastructureCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Dialog & Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [iconName, setIconName] = useState("Cpu");
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);

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
        const cards = data.settings.mobileInfrastructure || [];
        setInfrastructureCards(cards.length > 0 ? cards : DEFAULT_SEEDS);
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
    setDesc("");
    setIconName("Cpu");
    setSelectedThemeIndex(0);
    setIsOpen(true);
  };

  const handleOpenEdit = (card: InfrastructureCard, index: number) => {
    setEditingIndex(index);
    setTitle(card.title);
    setDesc(card.desc);
    setIconName(card.iconName);
    
    // Match preset theme
    const themeIdx = PRESET_HOVERS.findIndex(t => t.value === card.hoverBg);
    setSelectedThemeIndex(themeIdx >= 0 ? themeIdx : 0);
    
    setIsOpen(true);
  };

  const handleDelete = async (index: number) => {
    if (!(await confirm("Are you sure you want to delete this infrastructure feature card?"))) return;
    const updated = infrastructureCards.filter((_, i) => i !== index);
    setInfrastructureCards(updated);
    toast.success("Card removed locally! Click 'Save Synchronization' to make changes permanent.");
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const updated = [...infrastructureCards];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setInfrastructureCards(updated);
  };

  const handleMoveRight = (index: number) => {
    if (index === infrastructureCards.length - 1) return;
    const updated = [...infrastructureCards];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setInfrastructureCards(updated);
  };

  const handleDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Card Title is required"); return; }
    if (!desc.trim()) { toast.error("Description is required"); return; }

    const theme = PRESET_HOVERS[selectedThemeIndex];
    const newCard: InfrastructureCard = {
      title,
      desc,
      iconName,
      hoverBg: theme.value,
    };

    let updatedCards = [...infrastructureCards];
    if (editingIndex !== null) {
      updatedCards[editingIndex] = newCard;
      toast.success("Card updated locally!");
    } else {
      updatedCards.push(newCard);
      toast.success("Card added locally!");
    }

    setInfrastructureCards(updatedCards);
    setIsOpen(false);
  };

  const handleResetToDefaults = async () => {
    if (!(await confirm("Are you sure you want to reset all cards to default seeded configuration? This will discard custom modifications."))) return;
    setInfrastructureCards(DEFAULT_SEEDS);
    toast.success("Reset to default seeds! Save changes to synchronize.");
  };

  const handleSaveSync = async () => {
    if (infrastructureCards.length === 0) {
      toast.error("You must configure at least one technical capability card!");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        mobileInfrastructure: infrastructureCards,
      };

      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Mobile Infrastructure features synchronized successfully!");
        setSettings(data.settings);
        setInfrastructureCards(data.settings.mobileInfrastructure || []);
      } else {
        toast.error(data.message || "Failed to save settings");
      }
    } catch {
      toast.error("Network or connection error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mobile Infrastructure Grid Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage the "State-of-the-Art Mobile Infrastructure" capabilities cards, icons, descriptions, and hover effects
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
            <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add Grid Card
          </Button>
        </div>
      </div>

      {/* Storage mode banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0" />
          Connected to MongoDB Atlas — changes sync to dynamic school clusters.
        </div>
      )}
      {storageMode === "file" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0" />
          File Store Mode — edits save to <code className="mx-1 bg-amber-100 px-1 rounded">data/landing-content.json</code>.
        </div>
      )}
      {storageMode === "error" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Storage connection failure. Check local terminal.
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main workspace cards container */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-800">Capabilities List</CardTitle>
                <CardDescription className="text-xs">
                  Reorder cards horizontally, edit details, and commit to server
                </CardDescription>
              </div>
              {infrastructureCards.length > 0 && (
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
            <CardContent className="p-5">
              {infrastructureCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-2">
                  <Cpu className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold">No grid cards defined.</p>
                  <Button onClick={handleResetToDefaults} size="sm" variant="link" className="text-[#429CE4]">
                    Load default seeds
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {infrastructureCards.map((card, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-100 rounded-2xl p-4 flex flex-col justify-between bg-white shadow-xs hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[#1D496C] shrink-0">
                          {getIcon(card.iconName, "h-5 w-5")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-800 leading-tight">{card.title}</h4>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-extrabold border border-slate-200/50 uppercase tracking-wide">
                              Card #{idx + 1}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1.5">
                            {card.desc}
                          </p>
                        </div>
                      </div>

                      {/* Controls footer */}
                      <div className="border-t border-slate-50 pt-3 mt-4 flex items-center justify-between">
                        {/* Gradient Preview Indicator */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase">Hover color:</span>
                          <div className={`h-3 w-6 rounded-md bg-gradient-to-r ${card.hoverBg.split("hover:bg-")[1]?.split(" ")[0] ? "from-" + card.hoverBg.split("hover:bg-")[1].split(" ")[0].slice(1, -1) : "from-[#429CE4]"} to-slate-300 border border-slate-200/60`} />
                        </div>

                        {/* Arrows / Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg"
                            disabled={idx === 0}
                            onClick={() => handleMoveLeft(idx)}
                            aria-label="Move left"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg"
                            disabled={idx === infrastructureCards.length - 1}
                            onClick={() => handleMoveRight(idx)}
                            aria-label="Move right"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>

                          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-slate-600 hover:text-[#429CE4] hover:bg-[#429CE4]/5 rounded-lg px-2"
                            onClick={() => handleOpenEdit(card, idx)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg px-2"
                            onClick={() => handleDelete(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactive Live Mockup Preview */}
          <div className="space-y-4">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest block text-center">
              Real-time grid mockup preview (Hover to trigger gradients)
            </span>

            <div className="py-10 bg-slate-50 border border-slate-100 rounded-3xl px-6 relative overflow-hidden">
              <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-slate-100 rounded-full blur-[100px] pointer-events-none -z-0"></div>
              
              <div className="container mx-auto max-w-6xl relative z-10">
                <div className="text-center max-w-xl mx-auto mb-10 space-y-2.5">
                  <h3 className="text-xl font-black text-[#1D496C]">State-of-the-Art Mobile Infrastructure</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Built on powerful core frameworks delivering high uptime, fast transactions, and seamless device sync.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {infrastructureCards.map((card, i) => (
                    <Card
                      key={i}
                      className={`border border-slate-200/80 bg-white shadow-xs rounded-[1.6rem] p-4.5 transition-all duration-300 hover:-translate-y-1.5 group cursor-pointer ${card.hoverBg}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white/20 group-hover:border-transparent transition-all shadow-2xs">
                        {getIcon(card.iconName, "h-5 w-5 text-[#1D496C] group-hover:text-white transition-colors")}
                      </div>
                      <h4 className="text-sm font-extrabold text-[#1D496C] mt-3.5 group-hover:text-white transition-colors">{card.title}</h4>
                      <p className="text-[10px] font-semibold text-slate-400 group-hover:text-white/85 leading-relaxed mt-1.5 transition-colors">{card.desc}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
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
                {editingIndex !== null ? "Edit Infrastructure Card" : "Add Infrastructure Card"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure details, icon indicators, and interactive hover gradients
              </p>
            </div>

            <form onSubmit={handleDialogSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="c-title" className="text-xs font-black text-slate-600">Card Title</Label>
                <Input
                  id="c-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. End-to-End Encryption"
                  className="rounded-xl border-slate-200 font-bold"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="c-desc" className="text-xs font-black text-slate-600">Description</Label>
                <Textarea
                  id="c-desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Security algorithms safeguard child accounts..."
                  className="rounded-xl border-slate-200 font-semibold text-slate-700 min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Icon Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="c-icon" className="text-xs font-black text-slate-600">Lucide Icon</Label>
                  <select
                    id="c-icon"
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Preset Themes Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="c-theme" className="text-xs font-black text-slate-600">Hover Preset Gradient</Label>
                  <select
                    id="c-theme"
                    value={selectedThemeIndex}
                    onChange={(e) => setSelectedThemeIndex(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                  >
                    {PRESET_HOVERS.map((theme, i) => (
                      <option key={i} value={i}>{theme.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Theme Preview */}
              <div className="pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hover Color Preview:</span>
                <div className={`p-4 rounded-xl border border-slate-200 bg-white shadow-2xs group cursor-pointer transition-all duration-300 ${PRESET_HOVERS[selectedThemeIndex].value}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white/20 group-hover:border-transparent transition-all">
                      {getIcon(iconName, `h-4.5 w-4.5 text-[#1D496C] group-hover:text-white transition-colors`)}
                    </div>
                    <span className="font-extrabold text-xs text-[#1D496C] group-hover:text-white transition-colors">
                      Interactive Card Preview
                    </span>
                  </div>
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
                  {editingIndex !== null ? "Update Card" : "Add Card"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
