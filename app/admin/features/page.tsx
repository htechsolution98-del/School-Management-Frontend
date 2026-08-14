"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Users,
  CreditCard,
  Calendar,
  BookOpen,
  TrendingUp,
  Bell,
  Shield,
  Award,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  CheckCircle2,
  Database,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

// Mapping names to icons
const getIcon = (name: string, className?: string) => {
  switch (name) {
    case "GraduationCap": return <GraduationCap className={className} />;
    case "Users": return <Users className={className} />;
    case "BookOpen": return <BookOpen className={className} />;
    case "Calendar": return <Calendar className={className} />;
    case "Shield": return <Shield className={className} />;
    case "Bell": return <Bell className={className} />;
    case "CreditCard": return <CreditCard className={className} />;
    case "TrendingUp": return <TrendingUp className={className} />;
    case "Award": return <Award className={className} />;
    default: return <HelpCircle className={className} />;
  }
};

const iconOptions = [
  "GraduationCap", "Users", "BookOpen", "Calendar",
  "Shield", "Bell", "CreditCard", "TrendingUp", "Award"
];

const colorOptions = [
  { label: "Deep Navy Blue", value: "from-[#1D496C] to-[#1A3F5C]" },
  { label: "Ocean Light Blue", value: "from-[#429CE4] to-[#2E85CC]" },
  { label: "Earthy Olive Green", value: "from-[#6A7626] to-[#596420]" },
  { label: "Vibrant Orange", value: "from-[#ED6708] to-[#CD5804]" },
  { label: "Warm Gold Yellow", value: "from-[#FFA600] to-[#E09200]" },
  { label: "Soft Navy Indigo", value: "from-[#285E89] to-[#1E486B]" },
];

export default function FeaturesManager() {
  const confirm = useConfirm();
  const [features, setFeatures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Dialog & Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [iconName, setIconName] = useState("GraduationCap");
  const [color, setColor] = useState("from-[#1D496C] to-[#1A3F5C]");
  const [points, setPoints] = useState<string[]>([""]);
  const [order, setOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/landing/features");
      const data = await res.json();
      if (res.ok && data.success) {
        setFeatures(data.features || []);
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
    setEditingId(null);
    setTitle("");
    setIconName("GraduationCap");
    setColor("from-[#1D496C] to-[#1A3F5C]");
    setPoints([""]);
    setOrder(features.length);
    setIsOpen(true);
  };

  const handleOpenEdit = (feature: any) => {
    setEditingId(feature._id);
    setTitle(feature.title);
    setIconName(feature.iconName);
    setColor(feature.color || "from-[#1D496C] to-[#1A3F5C]");
    setPoints(feature.points?.length ? feature.points : [""]);
    setOrder(feature.order ?? 0);
    setIsOpen(true);
  };

  const handleAddPointField = () => setPoints([...points, ""]);

  const handleRemovePointField = (idx: number) => {
    if (points.length <= 1) {
      toast.warning("A feature card requires at least 1 bullet point!");
      return;
    }
    setPoints(points.filter((_, i) => i !== idx));
  };

  const handlePointChange = (idx: number, val: string) => {
    const updated = [...points];
    updated[idx] = val;
    setPoints(updated);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Are you sure you want to delete this feature card?"))) return;
    try {
      const res = await fetch(`/api/landing/features?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Feature card deleted!");
        loadFeatures();
      } else {
        toast.error(data.message || "Failed to delete");
      }
    } catch {
      toast.error("Server error during delete");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredPoints = points.filter(p => p.trim() !== "");
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (filteredPoints.length === 0) { toast.error("Add at least one bullet point"); return; }

    setIsSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const payload = {
        title, iconName, color,
        points: filteredPoints,
        order,
        ...(editingId && { _id: editingId }),
      };
      const res = await fetch("/api/landing/features", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Feature updated!" : "Feature added!");
        setIsOpen(false);
        loadFeatures();
      } else {
        toast.error(data.message || "Save failed");
      }
    } catch {
      toast.error("Server connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Homepage Features Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Add, edit, or remove feature cards shown on the landing page
          </p>
        </div>
        <Button
          onClick={handleOpenNew}
          disabled={storageMode === "error"}
          className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl shadow-lg shadow-[#429CE4]/10 self-start sm:self-auto"
        >
          <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add Feature Card
        </Button>
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
          <HelpCircle className="h-4 w-4 shrink-0" />
          Storage unavailable. Please restart the dev server.
        </div>
      )}

      {/* Empty state — seed prompt */}
      {!isLoading && features.length === 0 && storageMode !== "error" && (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#429CE4]/10 flex items-center justify-center">
              <Database className="h-7 w-7 text-[#429CE4]" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-700 text-base">No features found</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Click <strong>"Seed Database"</strong> on the Dashboard page first to load default features, or add your own below.
              </p>
            </div>
            <Button onClick={handleOpenNew} className="bg-[#429CE4] text-white font-bold rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> Add First Feature Card
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent" />
        </div>
      )}

      {/* Feature Cards Grid */}
      {!isLoading && features.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <Card
              key={feature._id || idx}
              className="overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between bg-white rounded-2xl"
            >
              <div>
                <div className={`h-2.5 w-full bg-gradient-to-r ${feature.color || "from-[#1D496C] to-[#1A3F5C]"}`} />
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Card Module • Order #{feature.order ?? idx}
                    </span>
                    <CardTitle className="text-lg font-black text-[#1D496C] mt-1 leading-tight">
                      {feature.title}
                    </CardTitle>
                  </div>
                  <div className="rounded-xl bg-[#1D496C]/5 text-[#1D496C] p-2 shrink-0">
                    {getIcon(feature.iconName, "h-5 w-5")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5 mb-2">
                    Bullet Descriptions
                  </div>
                  <ul className="space-y-2 pl-0.5">
                    {feature.points?.map((point: string, pIdx: number) => (
                      <li key={pIdx} className="flex items-start gap-2 text-xs font-semibold text-slate-600 leading-relaxed">
                        <CheckCircle2 className="h-4 w-4 text-[#6A7626] shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="border-t border-slate-50 p-4 bg-slate-50/50 flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(feature)}
                  className="rounded-lg text-slate-600 border-slate-200 hover:bg-slate-100"
                >
                  <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(feature._id)}
                  className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
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

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editingId ? "Edit Feature Card" : "Add New Feature Card"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure icon, gradient color, and bullet points
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="f-title" className="text-sm font-bold text-slate-600">Card Title</Label>
                <Input
                  id="f-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Admission Management"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Icon */}
                <div className="space-y-1.5">
                  <Label htmlFor="f-icon" className="text-sm font-bold text-slate-600">Icon</Label>
                  <select
                    id="f-icon"
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                  >
                    {iconOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {/* Order */}
                <div className="space-y-1.5">
                  <Label htmlFor="f-order" className="text-sm font-bold text-slate-600">Order #</Label>
                  <Input
                    id="f-order"
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value))}
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <Label htmlFor="f-color" className="text-sm font-bold text-slate-600">Gradient Color</Label>
                <select
                  id="f-color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                >
                  {colorOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {/* Color preview */}
                <div className={`h-2 rounded-full bg-gradient-to-r ${color} mt-1`} />
              </div>

              {/* Bullet Points */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <Label className="text-sm font-bold text-slate-600">Bullet Points</Label>
                  <Button type="button" size="sm" variant="ghost" className="text-[#429CE4] hover:bg-slate-50 font-bold" onClick={handleAddPointField}>
                    <PlusCircle className="mr-1 h-4 w-4" /> Add Line
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {points.map((point, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs font-extrabold text-slate-400 w-5">#{idx + 1}</span>
                      <Input
                        value={point}
                        onChange={(e) => handlePointChange(idx, e.target.value)}
                        placeholder={`Bullet point #${idx + 1}`}
                        className="rounded-xl border-slate-200"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-rose-500 hover:bg-rose-50 rounded-lg shrink-0 h-9 w-9"
                        onClick={() => handleRemovePointField(idx)}
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {isSubmitting ? "Saving..." : editingId ? "Update Card" : "Add Card"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
