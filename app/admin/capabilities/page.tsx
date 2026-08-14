"use client";

import { useEffect, useState } from "react";
import {
  PlusCircle,
  Save,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Database,
  FileText,
  HelpCircle,
  Lock,
  Wifi,
  Bell,
  Fingerprint,
  Shield,
  Activity,
  Cpu,
  Network,
  HardDrive,
  ListCollapse,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

interface CapabilityItem {
  _id?: string;
  title: string;
  desc: string;
  iconName: string;
}

const getIcon = (name: string, className?: string) => {
  switch (name) {
    case "Lock": return <Lock className={className} />;
    case "Wifi": return <Wifi className={className} />;
    case "Bell": return <Bell className={className} />;
    case "Fingerprint": return <Fingerprint className={className} />;
    case "Shield": return <Shield className={className} />;
    case "Activity": return <Activity className={className} />;
    case "Cpu": return <Cpu className={className} />;
    case "Network": return <Network className={className} />;
    case "HardDrive": return <HardDrive className={className} />;
    default: return <Sparkles className={className} />;
  }
};

const capIconOptions = ["Lock", "Wifi", "Bell", "Fingerprint", "Shield", "Activity", "Cpu", "Network", "HardDrive", "Sparkles"];

const defaultCapabilities: CapabilityItem[] = [
  {
    title: "Bank-Grade Encryption",
    desc: "All financial data and API transactions are locked under high-strength TLS protocols ensuring completely secure fees transactions.",
    iconName: "Lock",
  },
  {
    title: "Offline Operations Mode",
    desc: "Never lose school data inside poor networks. The application synchronizes critical homework and logs directly from local cashiers.",
    iconName: "Wifi",
  },
  {
    title: "Instant Broadcaster Alerts",
    desc: "Integrated micro-sockets delivery engine providing notifications the exact millisecond announcements go active.",
    iconName: "Bell",
  },
  {
    title: "Biometric & Geo-location",
    desc: "Security tracking logs for teacher roll-call ensuring verifiable attendance entries using mobile GPS services.",
    iconName: "Fingerprint",
  },
];

export default function CapabilitiesManagerPage() {
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Store full settings retrieved to prevent overwriting other ecosystem fields on save
  const [fullSettings, setFullSettings] = useState<any>({});
  const [mobileCapabilities, setMobileCapabilities] = useState<CapabilityItem[]>([]);

  // Modal Dialog Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [capTitle, setCapTitle] = useState("");
  const [capDesc, setCapDesc] = useState("");
  const [capIconName, setCapIconName] = useState("Lock");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/landing/settings");
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        setFullSettings(data.settings);
        setMobileCapabilities(data.settings.mobileCapabilities || []);
        setStorageMode(data.usingFileStore ? "file" : "mongodb");
      } else {
        setStorageMode("error");
      }
    } catch (err) {
      setStorageMode("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingIndex(null);
    setCapTitle("");
    setCapDesc("");
    setCapIconName("Lock");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = mobileCapabilities[index];
    setEditingIndex(index);
    setCapTitle(item.title);
    setCapDesc(item.desc);
    setCapIconName(item.iconName || "Lock");
    setIsModalOpen(true);
  };

  const handleDelete = async (index: number) => {
    if (!(await confirm("Are you sure you want to delete this dynamic capabilities card?"))) return;
    const updated = mobileCapabilities.filter((_, i) => i !== index);
    setMobileCapabilities(updated);
    toast.success("Capability card deleted locally. Click Save Settings below to apply permanently.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capTitle.trim() || !capDesc.trim()) {
      toast.error("Capability Title and Description copy are required!");
      return;
    }

    const item: CapabilityItem = {
      title: capTitle,
      desc: capDesc,
      iconName: capIconName,
    };

    let updated = [...mobileCapabilities];
    if (editingIndex !== null) {
      updated[editingIndex] = item;
    } else {
      updated.push(item);
    }

    setMobileCapabilities(updated);
    setIsModalOpen(false);
    toast.success("Card configuration added locally! Click Save Settings below to persist.");
  };

  const handleRestoreDefaults = async () => {
    if (await confirm("This will replace all currently listed capability cards with the 4 default system capabilities. Do you want to proceed?")) {
      setMobileCapabilities(defaultCapabilities);
      toast.success("Loaded default 4 capabilities. Click Save Settings below to apply permanently.");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storageMode === "error") {
      toast.error("Settings storage is currently offline.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...fullSettings,
        mobileCapabilities,
      };

      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Dynamic Capabilities grid settings persisted successfully!");
        if (data.settings) setFullSettings(data.settings);
      } else {
        toast.error(data.message || "Failed to update dynamic capabilities");
      }
    } catch {
      toast.error("Server connection error during request execution");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Capabilities Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Perform standalone CRUD operations, icons allocation, and default seeding for the mobile infrastructure cards grid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={handleRestoreDefaults}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4 shrink-0" /> Seed Defaults
          </Button>
          <Button
            type="button"
            className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl shadow-sm"
            onClick={handleOpenNew}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add New Card
          </Button>
        </div>
      </div>

      {/* Storage Mode Banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0" /> Connected to MongoDB — changes saved to cloud database.
        </div>
      )}
      {storageMode === "file" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0" /> File Store Mode — saved to <code className="mx-1 bg-amber-100 px-1 rounded">data/landing-content.json</code>.
        </div>
      )}
      {storageMode === "error" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          <HelpCircle className="h-4 w-4 shrink-0" /> Storage unavailable. Restart the dev server.
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent"></div>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Dashboard Capability Card Grid */}
          <Card className="shadow-sm border border-slate-100 bg-white rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-lg font-black text-[#1D496C] flex items-center gap-2">
                <ListCollapse className="h-5 w-5 text-[#FFA600]" /> Grid Capability Cards
              </CardTitle>
              <CardDescription>Click edit or delete to customize individual capabilities or add a new card above.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {mobileCapabilities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-100 rounded-2xl bg-slate-50/30">
                  <Sparkles className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-slate-500">No capability cards configured</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Click "Seed Defaults" to instantly populate the 4 brand capabilities or "Add New Card" to design custom operations cards.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {mobileCapabilities.map((item, index) => {
                    const dynamicBorders = [
                      "border-l-4 border-l-[#429CE4]",
                      "border-l-4 border-l-[#6A7626]",
                      "border-l-4 border-l-[#ED6708]",
                      "border-l-4 border-l-[#FFA600]"
                    ];
                    const borderStyle = dynamicBorders[index % dynamicBorders.length];
                    return (
                      <div
                        key={index}
                        className={`flex flex-col justify-between border border-slate-100 p-5 rounded-2xl bg-white shadow-sm hover:shadow-md hover:bg-slate-50/20 transition-all gap-4 group relative ${borderStyle}`}
                      >
                        <div className="space-y-3">
                          <div className="h-10 w-10 rounded-xl bg-[#1D496C]/5 flex items-center justify-center text-[#1D496C] group-hover:scale-110 transition-transform shadow-sm">
                            {getIcon(item.iconName || "Lock", "h-5 w-5")}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#1D496C] text-sm leading-tight">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 font-semibold mt-1.5 leading-relaxed line-clamp-3">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 border-t border-slate-100 pt-3 mt-2 justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-lg"
                            onClick={() => handleOpenEdit(index)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                            onClick={() => handleDelete(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sticky Actions bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-[#1D496C] to-[#285E89] text-white hover:opacity-95 shadow-md shadow-slate-900/10 font-bold rounded-xl px-8 py-5 flex items-center gap-2 transform hover:scale-[1.02] active:scale-95 transition-all"
            >
              {isSaving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Save className="h-4 w-4 stroke-[3]" /> Save Grid Config
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Dynamic Overlay Modal Dialog Box */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button
              variant="ghost"
              type="button"
              size="icon"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-950 rounded-full h-8 w-8"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#FFA600]" />
                {editingIndex !== null ? "Modify Capabilities Card" : "Add Capabilities Card"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure individual card details, description copies, and map customized icons.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="capTitle" className="text-xs font-black text-slate-600">Card Title</Label>
                <Input
                  id="capTitle"
                  value={capTitle}
                  onChange={(e) => setCapTitle(e.target.value)}
                  placeholder="e.g. Bank-Grade Encryption"
                  className="rounded-xl border-slate-200 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capDesc" className="text-xs font-black text-slate-600">Description copywriting</Label>
                <Textarea
                  id="capDesc"
                  value={capDesc}
                  onChange={(e) => setCapDesc(e.target.value)}
                  placeholder="All financial transactions are locked under secure TLS protocols..."
                  rows={4}
                  className="rounded-xl border-slate-200 text-xs font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capIconSelect" className="text-xs font-black text-slate-600">Lucide Icon Selector</Label>
                <select
                  id="capIconSelect"
                  value={capIconName}
                  onChange={(e) => setCapIconName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                >
                  {capIconOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#429CE4] hover:bg-[#1D496C] text-white font-bold rounded-xl px-5"
                >
                  Save Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
