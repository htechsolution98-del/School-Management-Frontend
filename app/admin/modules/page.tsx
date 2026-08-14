"use client";

import { useEffect, useState, useRef } from "react";
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
  DollarSign,
  Star,
  CheckCircle2,
  Rocket,
  Heart,
  Sparkles,
  BookMarked,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Layers,
  HelpCircle,
  Database,
  FileText,
  Upload,
  MinusCircle,
  PlusCircle,
  Image,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Brain,
  Fingerprint,
  Laptop,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    case "DollarSign": return <DollarSign className={className} />;
    case "Star": return <Star className={className} />;
    case "CheckCircle2": return <CheckCircle2 className={className} />;
    case "Rocket": return <Rocket className={className} />;
    case "Heart": return <Heart className={className} />;
    case "Sparkles": return <Sparkles className={className} />;
    case "BookMarked": return <BookMarked className={className} />;
    case "Brain": return <Brain className={className} />;
    case "Fingerprint": return <Fingerprint className={className} />;
    case "Laptop": return <Laptop className={className} />;
    case "MessageSquare": return <MessageSquare className={className} />;
    default: return <HelpCircle className={className} />;
  }
};

const iconOptions = [
  "GraduationCap",
  "Users",
  "BookOpen",
  "Calendar",
  "Shield",
  "Bell",
  "CreditCard",
  "TrendingUp",
  "Award",
  "DollarSign",
  "Star",
  "CheckCircle2",
  "Rocket",
  "Heart",
  "Sparkles",
  "BookMarked",
  "Brain",
  "Fingerprint",
  "Laptop",
  "MessageSquare"
];

const defaultEcosystemCards = [
  {
    title: "Student Dashboard",
    emoji: "👨‍🎓",
    iconName: "GraduationCap",
    desc: "Designed to keep students organized, motivated, academic-centric, and highly engaged.",
    points: [
      "Attendance percentage",
      "Academic performance analytics",
      "Timetable & upcoming exams",
      "Homework and assignment tracker"
    ]
  },
  {
    title: "Parent Portal",
    emoji: "👨‍👩‍👧",
    iconName: "Users",
    desc: "Instant tracking companion providing real-time data sync, fee alerts, and direct chats.",
    points: [
      "Real-time student updates",
      "Fee payment alerts",
      "Direct communication with teachers",
      "Daily activity reports"
    ]
  },
  {
    title: "Online Fee Management",
    emoji: "💳",
    iconName: "CreditCard",
    desc: "Secure banking integration handling automatic reminders, instant receipts, and payouts.",
    points: [
      "UPI/card/net banking integration",
      "Auto fee reminders",
      "Downloadable receipts",
      "Pending fee analytics"
    ]
  },
  {
    title: "AI-Based Features",
    emoji: "🧠",
    iconName: "Brain",
    desc: "Smarter school intelligence systems generating predictions, notes, and report remarks.",
    points: [
      "AI chatbot for student queries",
      "Smart performance prediction",
      "Personalized study recommendations",
      "AI-generated report remarks"
    ]
  },
  {
    title: "Smart Attendance System",
    emoji: "📅",
    iconName: "Fingerprint",
    desc: "Instant roll-calls utilizing dynamic biometric readers, QR checks, and parent alerts.",
    points: [
      "Face recognition attendance",
      "RFID/QR code attendance",
      "Biometric integration",
      "Instant parent SMS alerts"
    ]
  },
  {
    title: "Learning Management Features",
    emoji: "📚",
    iconName: "Laptop",
    desc: "Comprehensive virtual classrooms allowing easy study uploads, recordings, and gradings.",
    points: [
      "Online classes integration",
      "Study materials & notes upload",
      "Assignment submission portal",
      "Recorded lecture access"
    ]
  },
  {
    title: "Communication Features",
    emoji: "💬",
    iconName: "MessageSquare",
    desc: "Integrated micro-sockets connecting chat channels, live broadcasts, and meet systems.",
    points: [
      "Teacher-parent chat",
      "Broadcast messaging",
      "Email/SMS integration",
      "Video meeting integration"
    ]
  }
];

export default function ModulesManager() {
  const confirm = useConfirm();
  const [modules, setModules] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPortal, setIsSavingPortal] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Marquee Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<"module" | "badge">("module");

  // Marquee Form inputs
  const [label, setLabel] = useState("");
  const [iconName, setIconName] = useState("GraduationCap");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Ecosystem Portal Hero States
  const [fullSettings, setFullSettings] = useState<any>({});
  const [moduleHeroBadge, setModuleHeroBadge] = useState("SMART SCHOOL ERP MODULES");
  const [moduleHeroTitle, setModuleHeroTitle] = useState("Powerful Modules for Complete School Management");
  const [moduleHeroDesc, setModuleHeroDesc] = useState("VidhyaSanchalan provides all essential school management modules in one powerful platform — from admissions and fees to attendance, examinations, homework, reports, and parent communication.");
  const [modulePoints, setModulePoints] = useState<string[]>([]);
  const [moduleScreens, setModuleScreens] = useState<string[]>([]);
  
  // Dynamic gridModules Cards state
  const [gridModules, setGridModules] = useState<any[]>([]);

  // Card modal dialog states
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [cardEmoji, setCardEmoji] = useState("💡");
  const [cardIconName, setCardIconName] = useState("GraduationCap");
  const [cardDesc, setCardDesc] = useState("");
  const [cardPoints, setCardPoints] = useState<string[]>([]);
  const [newCardPoint, setNewCardPoint] = useState("");

  // Checklist points CRUD states
  const [newPointInput, setNewPointInput] = useState("");

  // Slide preview index
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadModulesAndBadges();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/landing/settings");
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        setFullSettings(data.settings);
        setModuleHeroBadge(data.settings.moduleHeroBadge || "SMART SCHOOL ERP MODULES");
        setModuleHeroTitle(data.settings.moduleHeroTitle || "Powerful Modules for Complete School Management");
        setModuleHeroDesc(data.settings.moduleHeroDesc || "VidhyaSanchalan provides all essential school management modules in one powerful platform — from admissions and fees to attendance, examinations, homework, reports, and parent communication.");
        setModulePoints(data.settings.modulePoints || [
          "Admission Management",
          "Fee Management",
          "Attendance & Geo Tracking",
          "Homework & Assignments",
          "Timetable Management",
          "Online Examination",
          "Progress Reports",
          "Parent & Student Panels"
        ]);
        setModuleScreens(data.settings.moduleScreens || ["/moduleg.jpeg"]);
        setGridModules(data.settings.gridModules || defaultEcosystemCards);
      }
    } catch (err) {
      console.error("Failed to load ecosystem settings", err);
    }
  };

  const loadModulesAndBadges = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/landing/modules");
      const data = await res.json();
      if (res.ok && data.success) {
        setModules(data.modules || []);
        setBadges(data.badges || []);
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

  const handleOpenNewMarquee = (selectedType: "module" | "badge") => {
    setEditingId(null);
    setType(selectedType);
    setLabel("");
    setIconName(selectedType === "module" ? "GraduationCap" : "Star");
    setIsOpen(true);
  };

  const handleOpenEditMarquee = (item: any, selectedType: "module" | "badge") => {
    setEditingId(item._id);
    setType(selectedType);
    setLabel(item.label);
    setIconName(item.iconName);
    setIsOpen(true);
  };

  const handleDeleteMarquee = async (id: string, selectedType: "module" | "badge") => {
    const itemLabel = selectedType === "module" ? "ERP showcase module" : "security/trust badge";
    if (!(await confirm(`Are you sure you want to delete this ${itemLabel} from the scroll list?`))) return;

    try {
      const res = await fetch(`/api/landing/modules?id=${id}&type=${selectedType}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Removed successfully!`);
        loadModulesAndBadges();
      } else {
        toast.error(data.message || "Deletion failed");
      }
    } catch (err) {
      toast.error("Server connection error during request execution");
    }
  };

  const handleSubmitMarquee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      toast.error("Label text is required!");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = "/api/landing/modules";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        label,
        iconName,
        type,
        ...(editingId && { _id: editingId })
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Dynamic scrolling item updated!" : "New scrolling item added!");
        setIsOpen(false);
        loadModulesAndBadges();
      } else {
        toast.error(data.message || "Failed to save item");
      }
    } catch (err) {
      toast.error("Database sync layer offline");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Multiple Images Upload handler
  const handleMultipleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Image file must be under 2MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setModuleScreens((prev) => [...prev, reader.result as string]);
        toast.success(`Mockup image ${file.name} loaded locally!`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteModuleImage = (idx: number) => {
    const updated = moduleScreens.filter((_, i) => i !== idx);
    setModuleScreens(updated);
    if (previewSlideIdx >= updated.length && updated.length > 0) {
      setPreviewSlideIdx(updated.length - 1);
    }
    toast.success("Slide deleted locally. Click Save below to apply.");
  };

  // checklist points CRUD helpers
  const handleAddChecklistPoint = () => {
    if (!newPointInput.trim()) {
      toast.error("Point description copy cannot be empty!");
      return;
    }
    setModulePoints((prev) => [...prev, newPointInput.trim()]);
    setNewPointInput("");
    toast.success("Ecosystem bullet point added locally!");
  };

  const handleRemoveChecklistPoint = (idx: number) => {
    if (modulePoints.length <= 1) {
      toast.warning("Roles require at least 1 feature checkmark point!");
      return;
    }
    const updated = modulePoints.filter((_, i) => i !== idx);
    setModulePoints(updated);
    toast.success("Point removed locally.");
  };

  const handleChecklistPointChange = (idx: number, newVal: string) => {
    const updated = [...modulePoints];
    updated[idx] = newVal;
    setModulePoints(updated);
  };

  // dynamic gridModules CRUD helpers
  const handleOpenNewCard = () => {
    setEditingCardIndex(null);
    setCardTitle("");
    setCardEmoji("💡");
    setCardIconName("GraduationCap");
    setCardDesc("");
    setCardPoints([]);
    setNewCardPoint("");
    setIsCardModalOpen(true);
  };

  const handleOpenEditCard = (idx: number) => {
    const card = gridModules[idx];
    setEditingCardIndex(idx);
    setCardTitle(card.title);
    setCardEmoji(card.emoji || "💡");
    setCardIconName(card.iconName || "GraduationCap");
    setCardDesc(card.desc);
    setCardPoints(card.points || []);
    setNewCardPoint("");
    setIsCardModalOpen(true);
  };

  const handleDeleteCard = async (idx: number) => {
    if (!(await confirm("Are you sure you want to delete this dynamic grid module card?"))) return;
    const updated = gridModules.filter((_, i) => i !== idx);
    setGridModules(updated);
    toast.success("Card deleted locally. Click Save Portal Settings below to persist.");
  };

  const handleAddCardPoint = () => {
    if (!newCardPoint.trim()) return;
    setCardPoints(prev => [...prev, newCardPoint.trim()]);
    setNewCardPoint("");
    toast.success("Card point bullet added locally!");
  };

  const handleRemoveCardPoint = (idx: number) => {
    setCardPoints(cardPoints.filter((_, i) => i !== idx));
  };

  const handleCardPointValChange = (idx: number, val: string) => {
    const updated = [...cardPoints];
    updated[idx] = val;
    setCardPoints(updated);
  };

  const handleSubmitCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle.trim() || !cardDesc.trim()) {
      toast.error("Card Title and Description copywriting are required!");
      return;
    }

    const item = {
      title: cardTitle.trim(),
      emoji: cardEmoji.trim(),
      iconName: cardIconName,
      desc: cardDesc.trim(),
      points: cardPoints.filter(p => p.trim() !== "")
    };

    let updated = [...gridModules];
    if (editingCardIndex !== null) {
      updated[editingCardIndex] = item;
    } else {
      updated.push(item);
    }

    setGridModules(updated);
    setIsCardModalOpen(false);
    toast.success("Showcase module card configured locally!");
  };

  const handleRestoreDefaultCards = async () => {
    if (await confirm("This will replace all listed grid cards with the default 7 ecosystem modules. Do you want to proceed?")) {
      setGridModules(defaultEcosystemCards);
      toast.success("Loaded default 7 dynamic ecosystem modules. Click Save Portal Settings below to apply permanently.");
    }
  };

  // Consolidated Save settings persistence
  const handleSaveEcosystemPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storageMode === "error") {
      toast.error("Portal settings storage is currently offline.");
      return;
    }

    const cleanPoints = modulePoints.filter(p => p.trim() !== "");
    if (cleanPoints.length === 0) {
      toast.error("Must have at least one valid checkmark point in Hero!");
      return;
    }
    if (moduleScreens.length === 0) {
      toast.error("Must upload at least one image mockup for the laptop slider!");
      return;
    }
    if (gridModules.length === 0) {
      toast.error("Must have at least one dynamic module card in the ecosystem grid!");
      return;
    }

    setIsSavingPortal(true);
    try {
      const payload = {
        ...fullSettings,
        moduleHeroBadge,
        moduleHeroTitle,
        moduleHeroDesc,
        modulePoints: cleanPoints,
        moduleScreens,
        gridModules
      };

      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Ecosystem portal settings, slider, and dynamic grids persisted successfully!");
        if (data.settings) setFullSettings(data.settings);
      } else {
        toast.error(data.message || "Failed to update portal configurations");
      }
    } catch {
      toast.error("Server connection error during request execution");
    } finally {
      setIsSavingPortal(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Modules Manager</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure dynamic sliding elements, edit hero copy tags, and perform CRUD actions on modular points checklist or base64 uploader sliders.
        </p>
      </div>

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
        <div className="space-y-8 animate-fadeIn">
          
          {/* Section 1: Dynamic Ecosystem Portal Copy & Hero Slider Uploader */}
          <form onSubmit={handleSaveEcosystemPortal} className="space-y-6">
            <Card className="shadow-md bg-white border border-slate-100 rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-lg font-black text-[#1D496C] flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-[#FFA600]" /> Ecosystem Portal Configuration (Hero & Slide Carousel CRUD)
                </CardTitle>
                <CardDescription className="text-xs mt-1">Configure copy text, checklists points grid, and upload device mockup slideshow images for the modules header page.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                
                <div className="grid gap-8 lg:grid-cols-12">
                  
                  {/* Left Column: Hero copy and checklists grid */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Badge & Title */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="portalBadge" className="text-xs font-black text-slate-600">Hero Section Badge</Label>
                        <Input 
                          id="portalBadge"
                          value={moduleHeroBadge}
                          onChange={(e) => setModuleHeroBadge(e.target.value)}
                          placeholder="e.g. SMART SCHOOL ERP MODULES"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="portalTitle" className="text-xs font-black text-slate-600">Hero Main Title</Label>
                        <Input 
                          id="portalTitle"
                          value={moduleHeroTitle}
                          onChange={(e) => setModuleHeroTitle(e.target.value)}
                          placeholder="e.g. Powerful Modules for Complete School Management"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Hero Description */}
                    <div className="space-y-1.5">
                      <Label htmlFor="portalDesc" className="text-xs font-black text-slate-600">Hero Section Description Copywriting</Label>
                      <Textarea 
                        id="portalDesc"
                        value={moduleHeroDesc}
                        onChange={(e) => setModuleHeroDesc(e.target.value)}
                        placeholder="VidhyaSanchalan provides all essential school management modules in one powerful platform..."
                        rows={3}
                        className="rounded-xl border-slate-200 text-xs leading-relaxed font-medium"
                      />
                    </div>

                    {/* Dynamic Bullet points list CRUD */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <Label className="text-xs font-black text-slate-600">Checklist Column Points Grid</Label>
                          <p className="text-[10px] text-slate-400">Add or edit individual bullet points showing inside the left columns</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Input 
                            value={newPointInput}
                            onChange={(e) => setNewPointInput(e.target.value)}
                            placeholder="Add feature bullet..."
                            className="rounded-xl border-slate-200 text-xs h-9 w-44"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddChecklistPoint();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl h-9"
                            onClick={handleAddChecklistPoint}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 max-h-[220px] overflow-y-auto pr-1">
                        {modulePoints.map((pt, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-2 border border-slate-100 p-2 rounded-xl bg-white shadow-sm hover:shadow hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E4FF4C]/10 text-emerald-600 font-black">
                              <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                            </div>
                            <Input 
                              value={pt}
                              onChange={(e) => handleChecklistPointChange(index, e.target.value)}
                              className="border-transparent bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xs font-bold leading-none p-0 h-auto flex-1 shadow-none rounded-none"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-rose-500 hover:bg-rose-50 rounded-md shrink-0"
                              onClick={() => handleRemoveChecklistPoint(index)}
                            >
                              <MinusCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Multiple Screenshots slide upload deck & laptop slider preview */}
                  <div className="lg:col-span-5 space-y-6 lg:border-l lg:border-slate-100 lg:pl-8">
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-black text-slate-600">Laptop Mockup Slide Images</Label>
                          <p className="text-[10px] text-slate-400">Upload multiple dashboard screenshot layouts for the autoplay slider</p>
                        </div>
                        <div>
                          <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleMultipleImagesUpload}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#6A7626] text-white hover:bg-[#4F581D] font-bold rounded-xl flex items-center gap-1.5 h-8.5 text-xs shadow-sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-3.5 w-3.5" /> Upload Slides
                          </Button>
                        </div>
                      </div>

                      {/* Image decks listing */}
                      {moduleScreens.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border-dashed border-2 border-slate-100 rounded-2xl bg-slate-50/50">
                          <Image className="h-8 w-8 text-slate-300 mb-1" />
                          <p className="text-[10px] font-bold text-slate-400">No slides loaded yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 max-h-[110px] overflow-y-auto pr-1">
                          {moduleScreens.map((screen, idx) => (
                            <div 
                              key={idx}
                              className={`relative aspect-[16/10] rounded-lg border overflow-hidden group shadow-inner cursor-pointer ${
                                idx === previewSlideIdx ? "border-[#429CE4] ring-2 ring-[#429CE4]/20" : "border-slate-100"
                              }`}
                              onClick={() => setPreviewSlideIdx(idx)}
                            >
                              <img src={screen} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                className="absolute top-0.5 right-0.5 h-4 w-4 bg-rose-500 text-white rounded-md flex items-center justify-center hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteModuleImage(idx);
                                }}
                              >
                                <X className="h-2.5 w-2.5 stroke-[3]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Slider preview frame */}
                    {moduleScreens.length > 0 && (
                      <div className="border border-slate-100 rounded-2xl bg-slate-900 text-white p-4.5 shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none"></div>
                        <div className="flex items-center gap-1.5 mb-2.5 text-[9px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E4FF4C] animate-ping"></span>
                          <span className="text-slate-400 font-black tracking-wider uppercase text-[8px]">Laptop Frame Mockup Preview</span>
                        </div>

                        <div className="flex flex-col items-center justify-center space-y-3">
                          {/* Laptop outer */}
                          <div className="w-full max-w-[210px] aspect-[16/10] rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-xl overflow-hidden shrink-0 flex items-center justify-center relative">
                            {moduleScreens[previewSlideIdx] && (
                              <img 
                                src={moduleScreens[previewSlideIdx]} 
                                alt="preview" 
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                            {moduleScreens.length > 1 && (
                              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-950/60 px-2 py-0.5 rounded-full">
                                {moduleScreens.map((_, i) => (
                                  <span key={i} className={`h-1 w-1 rounded-full ${i === previewSlideIdx ? "bg-[#FFA600]" : "bg-white/40"}`}></span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-slate-400 hover:text-white rounded-full"
                              onClick={() => setPreviewSlideIdx(prev => (prev - 1 + moduleScreens.length) % moduleScreens.length)}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-[9px] font-black text-slate-400 tracking-wider">
                              Slide {previewSlideIdx + 1} / {moduleScreens.length}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-slate-400 hover:text-white rounded-full"
                              onClick={() => setPreviewSlideIdx(prev => (prev + 1) % moduleScreens.length)}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                </div>

                {/* dynamic card Grid modules section */}
                <div className="border-t border-slate-100 pt-8 mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-sm font-black text-[#1D496C] flex items-center gap-2">
                        <Layers className="h-5 w-5 text-[#FFA600]" /> Dynamic ERP Ecosystem Cards Grid (CRUD)
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Customize the individual grid module cards displayed on the modules page</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8.5 rounded-xl border-slate-200 text-xs font-bold text-slate-600"
                        onClick={handleRestoreDefaultCards}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 shrink-0" /> Reset Default Cards
                      </Button>
                      <Button
                        type="button"
                        className="bg-[#429CE4] text-white hover:bg-[#1D496C] h-8.5 text-xs font-bold rounded-xl"
                        onClick={handleOpenNewCard}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3]" /> Add Card
                      </Button>
                    </div>
                  </div>

                  {gridModules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-dashed border-2 border-slate-100 rounded-2xl bg-slate-50/20 text-center">
                      <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-500">No ecosystem cards configured</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Click Add Card or Reset Defaults to populate</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {gridModules.map((card, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col justify-between border border-slate-100 p-4 rounded-xl bg-white shadow-sm hover:shadow hover:bg-slate-50/20 transition-all gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#1D496C]">
                                {getIcon(card.iconName || "GraduationCap", "h-4.5 w-4.5")}
                              </div>
                              <span className="text-xl select-none">{card.emoji || "💡"}</span>
                            </div>
                            <div>
                              <h5 className="font-extrabold text-[#1D496C] text-xs sm:text-sm">{card.title}</h5>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed line-clamp-2">
                                {card.desc}
                              </p>
                              {card.points && card.points.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500 uppercase tracking-wider">
                                    {card.points.length} Checklist points
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 border-t border-slate-100 pt-2 mt-1 shrink-0">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-500 rounded-md hover:bg-slate-100"
                              onClick={() => handleOpenEditCard(idx)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-md"
                              onClick={() => handleDeleteCard(idx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Persist Action Bar */}
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-6">
                  <Button
                    type="submit"
                    disabled={isSavingPortal}
                    className="bg-gradient-to-r from-[#1D496C] to-[#285E89] text-white hover:opacity-95 shadow-md shadow-slate-900/10 font-bold rounded-xl px-8 py-5.5 flex items-center gap-2 transform hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {isSavingPortal ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 stroke-[3]" /> Save Portal Settings
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>
          </form>

          {/* Section 2: Horizontal Scrolling Showcase */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Showcase Modules */}
            <Card className="shadow-md bg-white border border-slate-100 rounded-[2rem] flex flex-col justify-between overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-4 flex flex-row items-center justify-between bg-slate-50/20">
                <div>
                  <CardTitle className="text-lg font-black text-[#1D496C] flex items-center gap-2">
                    <Layers className="h-5 w-5 text-[#429CE4]" /> Showcase Modules Marquee
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">Scrolling list (Right-to-Left, blue background tags)</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenNewMarquee("module")}
                  disabled={storageMode === "error"}
                  className="bg-[#429CE4]/10 hover:bg-[#429CE4] text-[#429CE4] hover:text-white font-extrabold rounded-lg h-8 text-xs border border-transparent"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" /> Add
                </Button>
              </CardHeader>
              <CardContent className="py-4 space-y-3 flex-1">
                {modules.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    className="flex items-center justify-between bg-[#429CE4]/5 border border-slate-100/60 rounded-xl p-3 shadow-inner group hover:bg-[#429CE4]/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#429CE4] text-white flex items-center justify-center shrink-0">
                        {getIcon(item.iconName, "h-4.5 w-4.5")}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[#1D496C]">{item.label}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 rounded-md" onClick={() => handleOpenEditMarquee(item, "module")}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-md" onClick={() => handleDeleteMarquee(item._id, "module")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <Card className="shadow-md bg-white border border-slate-100 rounded-[2rem] flex flex-col justify-between overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-4 flex flex-row items-center justify-between bg-slate-50/20">
                <div>
                  <CardTitle className="text-lg font-black text-[#1D496C] flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#6A7626]" /> Trust & Security Marquee
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">Scrolling list (Left-to-Right, green credentials)</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenNewMarquee("badge")}
                  disabled={storageMode === "error"}
                  className="bg-[#6A7626]/10 hover:bg-[#6A7626] text-[#6A7626] hover:text-white font-extrabold rounded-lg h-8 text-xs border border-transparent"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" /> Add
                </Button>
              </CardHeader>
              <CardContent className="py-4 space-y-3 flex-1">
                {badges.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    className="flex items-center justify-between bg-[#6A7626]/5 border border-slate-100/60 rounded-xl p-3 shadow-inner group hover:bg-[#6A7626]/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#6A7626] text-white flex items-center justify-center shrink-0">
                        {getIcon(item.iconName, "h-4.5 w-4.5")}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[#475569]">{item.label}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 rounded-md" onClick={() => handleOpenEditMarquee(item, "badge")}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-md" onClick={() => handleDeleteMarquee(item._id, "badge")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* Marquee Custom Dialog Form */}
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

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editingId ? "Modify scrolling item" : `Add new ${type === "module" ? "showcase module" : "trust badge"}`}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure scrolling title copy and icons classification</p>
            </div>

            <form onSubmit={handleSubmitMarquee} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-sm font-bold text-slate-600">Label / Name</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={type === "module" ? "e.g. Smart Fee Collection" : "e.g. ISO 27001 Secure Data"}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="iconSelect" className="text-sm font-bold text-slate-600">Icon Selector</Label>
                <select
                  id="iconSelect"
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                >
                  {iconOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {isSubmitting ? "Saving..." : "Save Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid Module Card Custom Dialog Form */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button
              variant="ghost"
              type="button"
              size="icon"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-950 rounded-full h-8 w-8"
              onClick={() => setIsCardModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-5">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-[#FFA600]" />
                {editingCardIndex !== null ? "Modify Ecosystem Card" : "Add Ecosystem Card"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure individual cards copy, select customized icons or emojis, and add checklists points.</p>
            </div>

            <form onSubmit={handleSubmitCard} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cardTitle" className="text-xs font-black text-slate-600">Card Title</Label>
                  <Input
                    id="cardTitle"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    placeholder="e.g. Student Dashboard"
                    className="rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cardEmoji" className="text-xs font-black text-slate-600">Emoji Marker</Label>
                  <Input
                    id="cardEmoji"
                    value={cardEmoji}
                    onChange={(e) => setCardEmoji(e.target.value)}
                    placeholder="e.g. 👨‍🎓"
                    className="rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cardIconSelect" className="text-xs font-black text-slate-600">Lucide Icon Select</Label>
                <select
                  id="cardIconSelect"
                  value={cardIconName}
                  onChange={(e) => setCardIconName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                >
                  {iconOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cardDesc" className="text-xs font-black text-slate-600">Card Description Copywriting</Label>
                <Textarea
                  id="cardDesc"
                  value={cardDesc}
                  onChange={(e) => setCardDesc(e.target.value)}
                  placeholder="Designed to keep students organized, motivated, academic-centric..."
                  rows={3}
                  className="rounded-xl border-slate-200 text-xs leading-relaxed font-semibold"
                />
              </div>

              {/* Sub-points manager inside modal */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-slate-600">Card Sub-Checklist</Label>
                  <div className="flex gap-1.5">
                    <Input
                      value={newCardPoint}
                      onChange={(e) => setNewCardPoint(e.target.value)}
                      placeholder="Add point..."
                      className="rounded-xl border-slate-200 text-xs h-7 w-32 font-bold"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCardPoint();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#429CE4] text-white hover:bg-[#1D496C] h-7 px-2 font-bold rounded-lg text-xs"
                      onClick={handleAddCardPoint}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {cardPoints.map((pt, pIdx) => (
                    <div key={pIdx} className="flex gap-2 items-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <Input
                        value={pt}
                        onChange={(e) => handleCardPointValChange(pIdx, e.target.value)}
                        className="rounded-lg border-slate-200 text-xs h-7.5 py-1 font-semibold"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-rose-500 hover:bg-rose-50 rounded-lg h-7 w-7 shrink-0"
                        onClick={() => handleRemoveCardPoint(pIdx)}
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCardModalOpen(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#429CE4] hover:bg-[#1D496C] text-white font-bold rounded-xl px-5 text-xs"
                >
                  Save Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Social helper icons */}
      <div className="hidden">
        <RefreshCw />
      </div>

    </div>
  );
}
