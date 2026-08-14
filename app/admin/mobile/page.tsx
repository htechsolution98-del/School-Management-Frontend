"use client";

import { useEffect, useState, useRef } from "react";
import {
  Smartphone,
  PlusCircle,
  MinusCircle,
  Save,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Database,
  FileText,
  HelpCircle,
  Upload,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Wifi,
  Bell,
  Fingerprint,
  Shield,
  Activity,
  Cpu,
  Network,
  HardDrive,
  ListCollapse
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

interface ScreenItem {
  _id?: string;
  title: string;
  image: string;
  description: string;
}

interface RoleTabContent {
  badge: string;
  title: string;
  desc: string;
  points: string[];
}

interface CapabilityItem {
  _id?: string;
  title: string;
  desc: string;
  iconName: string;
}

// Map Lucide icons dynamically
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

export default function MobileEcosystemManager() {
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Keep full settings payload to prevent deleting other fields on PUT
  const [fullSettings, setFullSettings] = useState<any>({});

  // Dynamic Mobile Ecosystem Settings
  const [mobileScreens, setMobileScreens] = useState<ScreenItem[]>([]);
  const [mobileStudent, setMobileStudent] = useState<RoleTabContent>({
    badge: "Student Application",
    title: "Learn Smarter, Grow Faster",
    desc: "Designed to keep students organized, motivated, and engaged.",
    points: ["Homework Tracker", "Online Examination", "Student Timetable", "Academic Analytics"]
  });
  const [mobileParent, setMobileParent] = useState<RoleTabContent>({
    badge: "Parent Companion App",
    title: "Your Child's Progress, In Your Pocket",
    desc: "Stay intimately connected with your child's educational journey.",
    points: ["Real-Time Geo-Attendance", "Digital Fee Desk", "Direct Parent-Teacher Chats", "Comprehensive Report Cards"]
  });
  const [mobileTeacher, setMobileTeacher] = useState<RoleTabContent>({
    badge: "Teacher Dashboard",
    title: "Focus on Teaching, Automate the Rest",
    desc: "Powerful admin tools in the palm of your hand.",
    points: ["Geo-Fenced Biometric Attendance", "Mobile Grading Engine", "Broadcaster Bulletin", "Substitution Alerts"]
  });
  const [mobileCapabilities, setMobileCapabilities] = useState<CapabilityItem[]>([]);

  // Active tab inside stats role manager ("student" | "parent" | "teacher")
  const [activeRoleTab, setActiveRoleTab] = useState<"student" | "parent" | "teacher">("parent");

  // Screenshot CRUD modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScreenIndex, setEditingScreenIndex] = useState<number | null>(null);

  // Form states for Screenshots Dialog
  const [screenTitle, setScreenTitle] = useState("");
  const [screenDesc, setScreenDesc] = useState("");
  const [screenImage, setScreenImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capabilities CRUD modal states
  const [isCapModalOpen, setIsCapModalOpen] = useState(false);
  const [editingCapIndex, setEditingCapIndex] = useState<number | null>(null);

  // Form states for Capabilities Dialog
  const [capTitle, setCapTitle] = useState("");
  const [capDesc, setCapDesc] = useState("");
  const [capIconName, setCapIconName] = useState("Lock");

  // Preview slider state
  const [previewSliderIndex, setPreviewSliderIndex] = useState(0);

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
        setMobileScreens(data.settings.mobileScreens || []);
        setMobileCapabilities(data.settings.mobileCapabilities || []);
        if (data.settings.mobileStudent) setMobileStudent(data.settings.mobileStudent);
        if (data.settings.mobileParent) setMobileParent(data.settings.mobileParent);
        if (data.settings.mobileTeacher) setMobileTeacher(data.settings.mobileTeacher);
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

  // Upload Base64 handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenImage(reader.result as string);
      toast.success("Mockup image loaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  // Role Tab Points editing helpers
  const handlePointChange = (idx: number, val: string, role: "student" | "parent" | "teacher") => {
    const updateRole = (prev: RoleTabContent) => {
      const pts = [...prev.points];
      pts[idx] = val;
      return { ...prev, points: pts };
    };
    if (role === "student") setMobileStudent(updateRole);
    if (role === "parent") setMobileParent(updateRole);
    if (role === "teacher") setMobileTeacher(updateRole);
  };

  const handleAddPointField = (role: "student" | "parent" | "teacher") => {
    const addPt = (prev: RoleTabContent) => ({
      ...prev,
      points: [...prev.points, ""]
    });
    if (role === "student") setMobileStudent(addPt);
    if (role === "parent") setMobileParent(addPt);
    if (role === "teacher") setMobileTeacher(addPt);
  };

  const handleRemovePointField = (idx: number, role: "student" | "parent" | "teacher") => {
    const removePt = (prev: RoleTabContent) => {
      if (prev.points.length <= 1) {
        toast.warning("Roles require at least 1 feature bullet point!");
        return prev;
      }
      return {
        ...prev,
        points: prev.points.filter((_, i) => i !== idx)
      };
    };
    if (role === "student") setMobileStudent(removePt);
    if (role === "parent") setMobileParent(removePt);
    if (role === "teacher") setMobileTeacher(removePt);
  };

  // Screenshot CRUD helpers
  const handleOpenNewScreen = () => {
    setEditingScreenIndex(null);
    setScreenTitle("");
    setScreenDesc("");
    setScreenImage("");
    setIsModalOpen(true);
  };

  const handleOpenEditScreen = (index: number) => {
    const item = mobileScreens[index];
    setEditingScreenIndex(index);
    setScreenTitle(item.title);
    setScreenDesc(item.description);
    setScreenImage(item.image);
    setIsModalOpen(true);
  };

  const handleDeleteScreen = async (index: number) => {
    if (!(await confirm("Are you sure you want to delete this screenshot mockup?"))) return;
    const updated = mobileScreens.filter((_, i) => i !== index);
    setMobileScreens(updated);
    toast.success("Screenshot deleted. Save settings below to apply.");
  };

  const handleSubmitScreen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenTitle.trim() || !screenDesc.trim()) {
      toast.error("Title and description are required!");
      return;
    }
    if (!screenImage) {
      toast.error("Please upload a device mockup image!");
      return;
    }

    const item: ScreenItem = {
      title: screenTitle,
      description: screenDesc,
      image: screenImage
    };

    let updated = [...mobileScreens];
    if (editingScreenIndex !== null) {
      updated[editingScreenIndex] = item;
    } else {
      updated.push(item);
    }

    setMobileScreens(updated);
    setIsModalOpen(false);
    toast.success("Screenshot layout saved! Click Save Settings below to apply.");
  };

  // Capabilities CRUD helpers
  const handleOpenNewCap = () => {
    setEditingCapIndex(null);
    setCapTitle("");
    setCapDesc("");
    setCapIconName("Lock");
    setIsCapModalOpen(true);
  };

  const handleOpenEditCap = (index: number) => {
    const item = mobileCapabilities[index];
    setEditingCapIndex(index);
    setCapTitle(item.title);
    setCapDesc(item.desc);
    setCapIconName(item.iconName || "Lock");
    setIsCapModalOpen(true);
  };

  const handleDeleteCap = async (index: number) => {
    if (!(await confirm("Are you sure you want to delete this dynamic capabilities card?"))) return;
    const updated = mobileCapabilities.filter((_, i) => i !== index);
    setMobileCapabilities(updated);
    toast.success("Infrastructure card deleted. Click Save Settings below to apply.");
  };

  const handleSubmitCap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capTitle.trim() || !capDesc.trim()) {
      toast.error("Capability Title and description copy are required!");
      return;
    }

    const item: CapabilityItem = {
      title: capTitle,
      desc: capDesc,
      iconName: capIconName
    };

    let updated = [...mobileCapabilities];
    if (editingCapIndex !== null) {
      updated[editingCapIndex] = item;
    } else {
      updated.push(item);
    }

    setMobileCapabilities(updated);
    setIsCapModalOpen(false);
    toast.success("Capability card configured! Click Save Settings below to apply.");
  };

  // Final Settings saving process
  const handleSaveEcosystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storageMode === "error") {
      toast.error("Settings storage is currently offline.");
      return;
    }

    // Filter empty checklist points
    const cleanStudent = { ...mobileStudent, points: mobileStudent.points.filter(p => p.trim() !== "") };
    const cleanParent = { ...mobileParent, points: mobileParent.points.filter(p => p.trim() !== "") };
    const cleanTeacher = { ...mobileTeacher, points: mobileTeacher.points.filter(p => p.trim() !== "") };

    setIsSaving(true);
    try {
      const payload = {
        ...fullSettings,
        mobileScreens,
        mobileCapabilities,
        mobileStudent: cleanStudent,
        mobileParent: cleanParent,
        mobileTeacher: cleanTeacher
      };

      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Mobile Ecosystem settings updated successfully!");
        if (data.settings) setFullSettings(data.settings);
      } else {
        toast.error(data.message || "Failed to update ecosystem settings");
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
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mobile Ecosystem Manager</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Perform full CRUD operations and image uploads to customize screenshots, tab role configurations, and core infrastructure cards on the Features Hub
        </p>
      </div>

      {/* Storage Banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0" /> Connected to MongoDB — changes saved to cloud database.
        </div>
      )}
      {storageMode === "file" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0" />
          File Store Mode — saved to <code className="mx-1 bg-amber-100 px-1 rounded">data/landing-content.json</code>.
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
        <form onSubmit={handleSaveEcosystem} className="space-y-8 animate-fadeIn">
          <div className="grid gap-8 lg:grid-cols-12">
            
            {/* Left Column: Role Details Copy & Checklist Bullets */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="shadow-sm border border-slate-100 bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-[#1D496C] flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#FFA600]" /> Role Tabs Copywriting
                  </CardTitle>
                  <CardDescription>Configure specific details displayed for Student, Parent, and Teacher roles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Segmented Roles Selector inside Admin Panel */}
                  <div className="bg-slate-50 border border-slate-100 p-1 rounded-xl flex max-w-sm">
                    {(["parent", "student", "teacher"] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setActiveRoleTab(role)}
                        className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg capitalize transition-all ${
                          activeRoleTab === role
                            ? "bg-[#1D496C] text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  {/* Active Role Content Inputs */}
                  {activeRoleTab === "parent" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Tab Badge Title</Label>
                        <Input
                          value={mobileParent.badge}
                          onChange={(e) => setMobileParent({ ...mobileParent, badge: e.target.value })}
                          placeholder="e.g. Parent Companion App"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Heading Title Copy</Label>
                        <Input
                          value={mobileParent.title}
                          onChange={(e) => setMobileParent({ ...mobileParent, title: e.target.value })}
                          placeholder="e.g. Your Child's Progress, In Your Pocket"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Description Subtext</Label>
                        <Textarea
                          value={mobileParent.desc}
                          onChange={(e) => setMobileParent({ ...mobileParent, desc: e.target.value })}
                          placeholder="Tab descriptive summary copy..."
                          rows={3}
                          className="rounded-xl border-slate-200 text-sm leading-relaxed"
                        />
                      </div>

                      {/* Points checklist editor */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-600">Checklist Capabilities</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-[#429CE4] hover:bg-slate-50 font-bold text-xs"
                            onClick={() => handleAddPointField("parent")}
                          >
                            <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add Point
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {mobileParent.points.map((pt, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              <Input
                                value={pt}
                                onChange={(e) => handlePointChange(idx, e.target.value, "parent")}
                                placeholder={`Feature bullet point #${idx + 1}`}
                                className="rounded-xl border-slate-200"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-rose-500 hover:bg-rose-50 rounded-lg h-9 w-9 shrink-0"
                                onClick={() => handleRemovePointField(idx, "parent")}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRoleTab === "student" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Tab Badge Title</Label>
                        <Input
                          value={mobileStudent.badge}
                          onChange={(e) => setMobileStudent({ ...mobileStudent, badge: e.target.value })}
                          placeholder="e.g. Student Application"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Heading Title Copy</Label>
                        <Input
                          value={mobileStudent.title}
                          onChange={(e) => setMobileStudent({ ...mobileStudent, title: e.target.value })}
                          placeholder="e.g. Learn Smarter, Grow Faster"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Description Subtext</Label>
                        <Textarea
                          value={mobileStudent.desc}
                          onChange={(e) => setMobileStudent({ ...mobileStudent, desc: e.target.value })}
                          placeholder="Tab descriptive summary copy..."
                          rows={3}
                          className="rounded-xl border-slate-200 text-sm leading-relaxed"
                        />
                      </div>

                      {/* Points checklist editor */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-600">Checklist Capabilities</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-[#429CE4] hover:bg-slate-50 font-bold text-xs"
                            onClick={() => handleAddPointField("student")}
                          >
                            <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add Point
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {mobileStudent.points.map((pt, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              <Input
                                value={pt}
                                onChange={(e) => handlePointChange(idx, e.target.value, "student")}
                                placeholder={`Feature bullet point #${idx + 1}`}
                                className="rounded-xl border-slate-200"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-rose-500 hover:bg-rose-50 rounded-lg h-9 w-9 shrink-0"
                                onClick={() => handleRemovePointField(idx, "student")}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRoleTab === "teacher" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Tab Badge Title</Label>
                        <Input
                          value={mobileTeacher.badge}
                          onChange={(e) => setMobileTeacher({ ...mobileTeacher, badge: e.target.value })}
                          placeholder="e.g. Teacher Dashboard"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Heading Title Copy</Label>
                        <Input
                          value={mobileTeacher.title}
                          onChange={(e) => setMobileTeacher({ ...mobileTeacher, title: e.target.value })}
                          placeholder="e.g. Focus on Teaching, Automate the Rest"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Description Subtext</Label>
                        <Textarea
                          value={mobileTeacher.desc}
                          onChange={(e) => setMobileTeacher({ ...mobileTeacher, desc: e.target.value })}
                          placeholder="Tab descriptive summary copy..."
                          rows={3}
                          className="rounded-xl border-slate-200 text-sm leading-relaxed"
                        />
                      </div>

                      {/* Points checklist editor */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-600">Checklist Capabilities</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-[#429CE4] hover:bg-slate-50 font-bold text-xs"
                            onClick={() => handleAddPointField("teacher")}
                          >
                            <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add Point
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {mobileTeacher.points.map((pt, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              <Input
                                value={pt}
                                onChange={(e) => handlePointChange(idx, e.target.value, "teacher")}
                                placeholder={`Feature bullet point #${idx + 1}`}
                                className="rounded-xl border-slate-200"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-rose-500 hover:bg-rose-50 rounded-lg h-9 w-9 shrink-0"
                                onClick={() => handleRemovePointField(idx, "teacher")}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Dynamic Technical Capabilities List CRUD Editor */}
              <Card className="shadow-sm border border-slate-100 bg-white rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-lg font-black text-[#1D496C] flex items-center gap-2">
                      <ListCollapse className="h-5 w-5 text-[#FFA600]" /> Infrastructure Capabilities (CRUD)
                    </CardTitle>
                    <CardDescription>Configure infrastructure grid cards shown under the Mobile Ecosystem tabs</CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-lg shadow-sm"
                    onClick={handleOpenNewCap}
                  >
                    <Plus className="mr-1 h-3 w-3 stroke-[3]" /> Add Card
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {mobileCapabilities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 border-slate-100 rounded-2xl bg-slate-50/30">
                      <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-500">No capability cards configured</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Click Add Card to populate the grid list</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {mobileCapabilities.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between border border-slate-100 p-4 rounded-xl bg-white shadow-sm hover:shadow hover:bg-slate-50/30 transition-all gap-4"
                        >
                          <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[#1D496C]">
                              {getIcon(item.iconName || "Lock", "h-4 w-4")}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-[#1D496C] text-xs sm:text-sm">{item.title}</h4>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed line-clamp-2">
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-0.5 shrink-0">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-500 hover:bg-slate-100 rounded-md"
                              onClick={() => handleOpenEditCap(index)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-md"
                              onClick={() => handleDeleteCap(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </CardContent>
              </Card>

            </div>

            {/* Right Column: Screenshot Slider CRUD */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="shadow-sm border border-slate-100 bg-white rounded-2xl flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
                  <div>
                    <CardTitle className="text-lg font-black text-[#1D496C] flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-[#FFA600]" /> Slide Screenshots
                    </CardTitle>
                    <CardDescription>Dynamic screenshots loaded on the interactive device carousel</CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-lg h-8 shadow-sm"
                    onClick={handleOpenNewScreen}
                  >
                    <Plus className="mr-1 h-3 w-3 stroke-[3]" /> Add Slide
                  </Button>
                </CardHeader>
                <CardContent className="py-4 space-y-4 flex-1">
                  
                  {mobileScreens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 border-slate-100 rounded-2xl bg-slate-50/30">
                      <Smartphone className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-500">No mock screenshots added</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Click Add Slide to set up slides</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mobileScreens.map((screen, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between border border-slate-100 p-3 rounded-xl bg-white shadow-inner hover:bg-slate-50/50 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-8 rounded bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                              {screen.image ? (
                                <img src={screen.image} alt={screen.title} className="h-full w-full object-cover" />
                              ) : (
                                <Smartphone className="h-4 w-4 text-slate-300" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-[#1D496C] text-xs sm:text-sm">{screen.title}</h4>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                                {screen.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-500 rounded-lg hover:bg-slate-100"
                              onClick={() => handleOpenEditScreen(idx)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                              onClick={() => handleDeleteScreen(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Live slider preview */}
                  {mobileScreens.length > 0 && (
                    <div className="border border-slate-100 rounded-2xl bg-slate-900 text-white p-5 shadow-2xl relative overflow-hidden mt-6">
                      <div className="absolute inset-0 bg-grid-white/[0.04] pointer-events-none"></div>
                      <div className="flex items-center gap-2 mb-3 text-xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px]">Mockup Carousel Preview</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-[140px] aspect-[9/19] rounded-[1.2rem] bg-slate-950 p-1 border border-slate-800 shadow-xl relative overflow-hidden shrink-0">
                          <div className="w-full h-full rounded-[1.05rem] overflow-hidden bg-slate-900 relative">
                            {mobileScreens[previewSliderIndex]?.image && (
                              <img
                                src={mobileScreens[previewSliderIndex].image}
                                alt="preview"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </div>
                        <div className="text-center space-y-1 max-w-[200px]">
                          <h5 className="text-[10px] font-black text-[#FFA600] uppercase tracking-wide">
                            {mobileScreens[previewSliderIndex]?.title}
                          </h5>
                          <p className="text-[9px] font-medium text-slate-300 leading-tight">
                            {mobileScreens[previewSliderIndex]?.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-white rounded-full"
                            onClick={() => setPreviewSliderIndex(prev => (prev - 1 + mobileScreens.length) % mobileScreens.length)}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-[8px] font-black text-slate-400 tracking-wider">
                            {previewSliderIndex + 1} / {mobileScreens.length}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-white rounded-full"
                            onClick={() => setPreviewSliderIndex(prev => (prev + 1) % mobileScreens.length)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submission and Save settings banner */}
          <div className="flex justify-end p-4 border-t border-slate-100 bg-white rounded-2xl shadow-sm">
            <Button
              type="submit"
              disabled={isSaving || storageMode === "error"}
              className="bg-[#429CE4] hover:bg-[#1D496C] text-white font-extrabold rounded-xl px-8 py-6 shadow-lg shadow-[#429CE4]/10 transition-all duration-300"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Ecosystem Settings"}
            </Button>
          </div>

        </form>
      )}

      {/* Slide Dialog Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button
              variant="ghost"
              type="button"
              size="icon"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-950 rounded-full"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editingScreenIndex !== null ? "Modify Screenshot Slide" : "Add Screenshot Slide"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure slide title, description subtext, and upload mockup screenshot image</p>
            </div>

            <form onSubmit={handleSubmitScreen} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="screenTitle" className="text-sm font-bold text-slate-600">Slide Title</Label>
                <Input
                  id="screenTitle"
                  value={screenTitle}
                  onChange={(e) => setScreenTitle(e.target.value)}
                  placeholder="e.g. Parent Companion UI, Student Portal UI"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="screenDesc" className="text-sm font-bold text-slate-600">Description copywriting</Label>
                <Textarea
                  id="screenDesc"
                  value={screenDesc}
                  onChange={(e) => setScreenDesc(e.target.value)}
                  placeholder="e.g. Instant notifications for attendance alerts, online invoice payments..."
                  rows={3}
                  className="rounded-xl border-slate-200 text-sm leading-relaxed"
                />
              </div>

              {/* Dynamic device image upload */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-sm font-bold text-slate-600">Mockup Screenshot Image</Label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="h-20 w-14 rounded bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                    {screenImage ? (
                      <img src={screenImage} alt="Uploaded mockup" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-[10px] text-slate-400 font-medium">Select a device mockup image from your local system (Max file size: 2MB)</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs font-bold"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Mockup Image
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#429CE4] hover:bg-[#1D496C] text-white font-bold rounded-xl"
                >
                  Save Slide
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Capabilities Dialog Modal Form */}
      {isCapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button
              variant="ghost"
              type="button"
              size="icon"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-950 rounded-full"
              onClick={() => setIsCapModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editingCapIndex !== null ? "Modify Capabilities Card" : "Add Capabilities Card"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure infrastructure card title, description copy, and select dynamic Lucide icon</p>
            </div>

            <form onSubmit={handleSubmitCap} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="capTitle" className="text-sm font-bold text-slate-600">Card Title</Label>
                <Input
                  id="capTitle"
                  value={capTitle}
                  onChange={(e) => setCapTitle(e.target.value)}
                  placeholder="e.g. Bank-Grade Encryption, Offline Operations Mode"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capDesc" className="text-sm font-bold text-slate-600">Description copywriting</Label>
                <Textarea
                  id="capDesc"
                  value={capDesc}
                  onChange={(e) => setCapDesc(e.target.value)}
                  placeholder="All financial transactions are locked under secure TLS protocols..."
                  rows={3}
                  className="rounded-xl border-slate-200 text-sm leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capIconSelect" className="text-sm font-bold text-slate-600">Lucide Icon Selector</Label>
                <select
                  id="capIconSelect"
                  value={capIconName}
                  onChange={(e) => setCapIconName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
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
                  onClick={() => setIsCapModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#429CE4] hover:bg-[#1D496C] text-white font-bold rounded-xl"
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
